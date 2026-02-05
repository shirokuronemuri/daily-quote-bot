import { Menu, MenuOptions } from '@grammyjs/menu';
import { getDb } from '../database/database';
import { ConversationContext, MyContext, MyConversation } from '../types';
import { sql } from 'kysely';
import { Composer } from 'grammy';
import { Conversation } from '@grammyjs/conversations';

export const settingsModule = new Composer<MyContext>();

const menuOptions: MenuOptions<MyContext> = {
  fingerprint: (ctx) => {
    // 48 hours
    const menuTimeLimitMs = 1000 * 60 * 60 * 48;
    const isTooOld =
      Date.now() - ctx.session.settings.menuFingerprint > menuTimeLimitMs;
    return isTooOld ? 'expired' : String(ctx.session.settings.menuFingerprint);
  },
  onMenuOutdated: async (ctx) => {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // continue regardless
    }
    await ctx.answerCallbackQuery({
      text: 'The menu is outdated, please use /settings again.',
      show_alert: true,
    });
  },
};

export const settingsMenu = new Menu<MyContext>('settingsMenu', menuOptions)
  .text(
    async (ctx) => {
      if (!ctx.chat) throw new Error('Missing chat in menu context');
      const db = getDb();
      const { sendDailyQuote } =
        (await db
          .selectFrom('chats')
          .where('id', '=', ctx.chat.id)
          .select('sendDailyQuote')
          .executeTakeFirst()) ?? {};

      return `Send daily quote: ${sendDailyQuote ? 'enabled ✅' : 'disabled ⛔️'}`;
    },
    async (ctx) => {
      if (!ctx.chat) throw new Error('Missing chat in menu context');
      const db = getDb();
      await db
        .updateTable('chats')
        .set({ sendDailyQuote: sql`NOT send_daily_quote` })
        .where('id', '=', ctx.chat.id)
        .execute();

      await ctx.menu.update({ immediate: true });
    },
  )
  .row()
  .text('Timezone settings', (ctx) => {});

export const initialTimezoneMenu = new Menu(
  'initialTimezoneMenu',
  menuOptions,
).text('Specify timezone manually', (ctx) => {});

export const initialTimezoneConversation = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await ctx.reply('');
  await conversation.waitFor(['callback_query:data', 'message:location'], {
    otherwise: async (ctx) => {},
  });
};

settingsModule.command('settings', async (ctx) => {
  const lastSettingsMenu = ctx.session.settings.lastMenuMsgId;
  if (lastSettingsMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastSettingsMenu);
    } catch {
      // continue regardless
    }
  }

  const db = getDb();
  await db
    .insertInto('chats')
    .values({ id: ctx.chat.id })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
  ctx.session.settings.menuFingerprint = Date.now();
  const msg = await ctx.reply(
    'Click on the corresponding button to change the settings below ⬇️',
    {
      reply_markup: settingsMenu,
    },
  );
  ctx.session.settings.lastMenuMsgId = msg.message_id;
});
