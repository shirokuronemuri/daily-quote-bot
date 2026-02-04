import { Menu, MenuOptions } from '@grammyjs/menu';
import { Composer } from 'grammy';
import { getDb } from '../database/database';
import { MyContext } from '../types';
import { ConversationContext, MyConversation } from '../types';
import { waitText } from './helpers/wait-text';

export const manageCustomMessagesModule = new Composer<MyContext>();

const pageSize = 10;

const getCustomMessages = async (chatId: number, page: number) => {
  const db = getDb();
  const offset = page * pageSize;

  const customMessages = await db
    .selectFrom('customMessages')
    .where('chatId', '=', chatId)
    .selectAll()
    .limit(pageSize)
    .offset(offset)
    .execute();

  return customMessages;
};

const getCustomMessageText = async (chatId: number, page: number) => {
  const offset = page * pageSize;
  const customMessages = await getCustomMessages(chatId, page);
  if (customMessages.length === 0) {
    return 'No custom messages found  >.<';
  } else {
    return (
      'Select custom message that you want to manage:\n\n' +
      customMessages
        .map(
          (msg, i) => `${offset + i + 1}. <blockquote>${msg.text}</blockquote>`,
        )
        .join('\n\n')
    );
  }
};

const getCustomMessageCount = async (chatId: number) => {
  const db = getDb();
  const result = await db
    .selectFrom('customMessages')
    .select(db.fn.countAll<number>().as('count'))
    .where('chatId', '=', chatId)
    .executeTakeFirst();

  return result?.count ?? 0;
};

export const editCustomMessage = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'manage_custom_messages';
  });
  const db = getDb();
  await ctx.reply('Enter updated custom message:');
  const customMessageCtx = await waitText(conversation);

  const customMessageId = await conversation.external(
    (ctx) => ctx.session.customMessages.selectedId,
  );
  await conversation.external(() =>
    db
      .updateTable('customMessages')
      .set({
        text: customMessageCtx.msg.text,
      })
      .where('id', '=', customMessageId)
      .execute(),
  );

  await ctx.reply("I've updated your custom message!");

  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

const menuOptions: MenuOptions<MyContext> = {
  fingerprint: (ctx) => {
    // 48 hours
    const menuTimeLimitMs = 1000 * 60 * 60 * 48;
    const isTooOld =
      Date.now() - ctx.session.customMessages.menuFingerprint > menuTimeLimitMs;
    return isTooOld
      ? 'expired'
      : String(ctx.session.customMessages.menuFingerprint);
  },
  onMenuOutdated: async (ctx) => {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // continue regardless
    }
    await ctx.answerCallbackQuery({
      text: 'The menu is outdated, please use /manage_custom_messages again.',
      show_alert: true,
    });
  },
};

export const customMessagesMenu = new Menu<MyContext>(
  'customMessagesMenu',
  menuOptions,
)
  .text('◀ prev', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    if (ctx.session.customMessages.page > 0) {
      ctx.session.customMessages.page--;
      const newText = await getCustomMessageText(
        ctx.chat.id,
        ctx.session.customMessages.page,
      );
      await ctx.editMessageText(newText, { parse_mode: 'HTML' });
    } else {
      await ctx.answerCallbackQuery('You are on the first page!');
    }
  })
  .text(
    (ctx) => `Page ${ctx.session.customMessages.page + 1}`,
    (ctx) => ctx.answerCallbackQuery(),
  )
  .text('next ▶', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const totalPages = Math.ceil(
      ctx.session.customMessages.totalCount / pageSize,
    );
    if (ctx.session.customMessages.page < totalPages - 1) {
      ctx.session.customMessages.page++;
      const newText = await getCustomMessageText(
        ctx.chat.id,
        ctx.session.customMessages.page,
      );
      await ctx.editMessageText(newText, { parse_mode: 'HTML' });
    } else {
      await ctx.answerCallbackQuery('You are on the last page!');
    }
  })
  .row()
  .dynamic(async (ctx, range) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const offset = ctx.session.customMessages.page * pageSize;
    const customMessages = await getCustomMessages(
      ctx.chat.id,
      ctx.session.customMessages.page,
    );
    for (const [index, msg] of customMessages.entries()) {
      range.text(`#${offset + index + 1}`, async (ctx) => {
        ctx.session.customMessages.selectedId = msg.id;
        const detailsText = `Selected custom message #${offset + index + 1}:\n\n<blockquote>${msg.text}</blockquote>\n\nSelect action below:`;
        await ctx.editMessageText(detailsText, { parse_mode: 'HTML' });
        await ctx.menu.nav('customMessageDetailsMenu', { immediate: true });
      });

      if (index + 1 === Math.ceil(customMessages.length / 2)) {
        range.row();
      }
    }
  });

export const customMessageDetailsMenu = new Menu<MyContext>(
  'customMessageDetailsMenu',
  menuOptions,
)
  .text('↩ back to list', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const newText = await getCustomMessageText(
      ctx.chat.id,
      ctx.session.customMessages.page,
    );
    await ctx.editMessageText(newText, { parse_mode: 'HTML' });
    await ctx.menu.nav('customMessagesMenu', { immediate: true });
  })
  .row()
  .text('✏️ edit', async (ctx) => {
    if (ctx.session.customMessages.lastMenuMsgId === ctx.msgId) {
      try {
        await ctx.deleteMessage();
      } catch {
        ctx.session.customMessages.lastMenuMsgId = null;
      }
    }
    await ctx.conversation.enter('editCustomMessage');
  })
  .row()
  .text('🗑 delete', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const db = getDb();
    const customMessageId = ctx.session.customMessages.selectedId;
    if (!customMessageId) return;
    await db
      .deleteFrom('customMessages')
      .where('id', '=', customMessageId)
      .execute();
    ctx.session.customMessages.totalCount--;
    if (
      ctx.session.customMessages.page > 0 &&
      ctx.session.customMessages.totalCount % pageSize === 0
    ) {
      ctx.session.customMessages.page--;
    }
    const newText = await getCustomMessageText(
      ctx.chat.id,
      ctx.session.customMessages.page,
    );
    await ctx.editMessageText(newText, { parse_mode: 'HTML' });
    await ctx.menu.nav('customMessagesMenu', { immediate: true });
    await ctx.answerCallbackQuery('Custom message deleted from list!');
  });

customMessagesMenu.register(customMessageDetailsMenu);

manageCustomMessagesModule.command('manage_custom_messages', async (ctx) => {
  const lastMenu = ctx.session.customMessages.lastMenuMsgId;
  if (lastMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastMenu);
    } catch {
      // continue regardless
    }
  }
  ctx.session.customMessages.menuFingerprint = Date.now();
  ctx.session.customMessages.page = 0;
  const customMessages = await getCustomMessageText(
    ctx.chat.id,
    ctx.session.customMessages.page,
  );
  const customMessageCount = await getCustomMessageCount(ctx.chat.id);
  ctx.session.customMessages.totalCount = customMessageCount;
  const msg = await ctx.reply(customMessages, {
    parse_mode: 'HTML',
    ...(customMessageCount > 0 ? { reply_markup: customMessagesMenu } : {}),
  });
  ctx.session.customMessages.lastMenuMsgId = msg.message_id;
});
