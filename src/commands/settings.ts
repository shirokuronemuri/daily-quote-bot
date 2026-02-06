import { Menu, MenuOptions } from '@grammyjs/menu';
import { getDb } from '../database/database';
import { ConversationContext, MyContext, MyConversation } from '../types';
import { sql } from 'kysely';
import { Composer, InlineKeyboard } from 'grammy';
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import { withUpdatedAt } from 'src/database/helpers/with-updated-at';

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
        .set(withUpdatedAt({ sendDailyQuote: sql`NOT send_daily_quote` }))
        .where('id', '=', ctx.chat.id)
        .execute();

      await ctx.menu.update({ immediate: true });
    },
  )
  .row()
  .text('Timezone settings', async (ctx) => {
    await ctx.conversation.enter('timezoneConversation');
  });

export const timezoneConversation = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  const conversationStart = conversation.checkpoint();
  const db = getDb();
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'set_timezone';
  });
  const settingsMenuMsg = await ctx.reply(
    "Please send your geolocation for me to deduce your timezone (you don't have to select precisely where you are as long as the timezone region is the same) or press the button below to select the timezone manually. Send /cancel to stop the setup process",
    {
      reply_markup: new InlineKeyboard().text('Select manually', 'tz_manual'),
    },
  );
  const chatId = settingsMenuMsg.chat.id;
  const filteredCtx = await conversation
    .waitFor(['message', 'callback_query'])
    .and(
      (ctx) =>
        ctx.callbackQuery?.data === 'tz_manual' || ctx.has('message:location'),
      {
        otherwise: async (ctx) => {
          if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
            await conversation.external(async (ctx) => {
              try {
                await ctx.api.editMessageReplyMarkup(
                  chatId,
                  settingsMenuMsg.message_id,
                  {
                    reply_markup: undefined,
                  },
                );
              } catch {
                // continue regardless
              }
            });
            if (ctx.callbackQuery) {
              await ctx.reply('Current operation cancelled.');
            }
            await conversation.halt({ next: true });
          }
          await ctx.reply(
            'Please send me the geolocation, press the manual select button or send /cancel.',
          );
        },
      },
    );

  await conversation.external(async (ctx) => {
    try {
      await ctx.api.editMessageReplyMarkup(chatId, settingsMenuMsg.message_id, {
        reply_markup: undefined,
      });
    } catch {
      // continue regardless
    }
  });
  if (filteredCtx.has('message:location')) {
    const { latitude, longitude } = filteredCtx.message.location;
    const timezone = tzlookup(latitude, longitude);
    const offset = DateTime.now().setZone(timezone).toFormat('ZZ');

    const confirmMenuCtx = await filteredCtx.reply(
      `I detected your timezone as ${timezone} (${offset}). Is that correct?`,
      {
        reply_markup: new InlineKeyboard()
          .text('Yes! ☺️', 'tz_save')
          .text('No 🥺', 'tz_retry'),
      },
    );
    const callback = await conversation
      .waitFor(['message', 'callback_query'])
      .and(
        (ctx) =>
          ['tz_save', 'tz_retry'].includes(ctx.callbackQuery?.data ?? ''),
        {
          otherwise: async (ctx) => {
            if (ctx.message?.text?.startsWith('/')) {
              await conversation.halt({ next: true });
            }
            if (ctx.callbackQuery) {
              await ctx.reply('Current operation cancelled.');
              await conversation.halt({ next: true });
            }
            await ctx.reply(
              'Please confirm your timezone choice or send /cancel.',
            );
          },
        },
      );

    await conversation.external(async (ctx) => {
      try {
        await ctx.api.editMessageReplyMarkup(
          chatId,
          confirmMenuCtx.message_id,
          { reply_markup: undefined },
        );
      } catch {
        // continue regardless
      }
    });
    if (callback.callbackQuery?.data === 'tz_save') {
      await conversation.external(async () => {
        await db
          .updateTable('chats')
          .set(withUpdatedAt({ ianaTimezone: timezone, dailyOffset: offset }))
          .where('id', '=', chatId)
          .execute();
      });
      await ctx.reply(`Your timezone has been set to ${timezone} (${offset})!`);
    } else {
      await conversation.rewind(conversationStart);
    }
  }
  if (filteredCtx.callbackQuery?.data === 'tz_manual') {
    const manualSearchCheckpoint = conversation.checkpoint();
    await filteredCtx.reply(
      'Type the name of your timezone city or its part to apply search: (example: <code>Kyiv</code>; <code>tokyo</code>; <code>new_york</code>; minimum 3 characters long)',
      { parse_mode: 'HTML' },
    );
    const searchTermCtx = await conversation
      .waitFor(['message', 'callback_query'])
      .and(
        (ctx) => {
          if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
            return false;
          }
          return ctx.has('message:text');
        },
        {
          otherwise: async (ctx) => {
            if (ctx.message?.text?.startsWith('/')) {
              await conversation.halt({ next: true });
            }
            if (ctx.callbackQuery) {
              await ctx.reply('Current operation cancelled.');
              await conversation.halt({ next: true });
            }
            await ctx.reply(
              'Please confirm your timezone choice or send /cancel.',
            );
          },
        },
      );
    const searchTerm = searchTermCtx.message?.text;
    if (!searchTerm) throw new Error('Failed to filter settings callback');
    if (searchTerm.length < 3) {
      await ctx.reply(
        'Search term should be at least 3 characters long, please try again!',
      );
      await conversation.rewind(manualSearchCheckpoint);
    }

    const timezoneList = Intl.supportedValuesOf('timeZone').flatMap((zone) => {
      const [region, rawCity] = zone.split('/', 2);

      if (!region || !rawCity) return [];
      const city = rawCity === 'Kiev' ? 'Kyiv' : rawCity;
      return [
        {
          fullName: `${region}/${city}`,
          region,
          city,
        },
      ];
    });
    const timezoneMatches = timezoneList.filter((zone) =>
      zone.city.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    if (timezoneMatches.length === 0) {
      await ctx.reply(
        `No timezones found by <code>${searchTerm}</code>, please make sure you entered it correctly and try again, or /cancel and retry the timezone setup sending your location instead.`,
        { parse_mode: 'HTML' },
      );
      await conversation.rewind(manualSearchCheckpoint);
    } else {
      const searchResultsMenu = new InlineKeyboard()
        .text('Search again', 'tz_manual')
        .row();
      timezoneMatches.forEach((timezone, index) => {
        searchResultsMenu
          .text(
            `${timezone.fullName} (${DateTime.now().setZone(timezone.fullName).toFormat('ZZ')})`,
            `tz_res:${index}`,
          )
          .row();
      });

      const searchResultsMsg = await ctx.reply(
        `Total matches: ${timezoneMatches.length}\n\nSelect the timezone below or press 'Search again':`,
        { reply_markup: searchResultsMenu },
      );

      const callback = await conversation
        .waitFor(['message', 'callback_query'])
        .and(
          (ctx) =>
            ctx.callbackQuery?.data === 'tz_manual' ||
            ctx.callbackQuery?.data?.startsWith('tz_res:')
              ? true
              : false,
          {
            otherwise: async (ctx) => {
              if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
                await conversation.external(async (ctx) => {
                  try {
                    await ctx.api.editMessageReplyMarkup(
                      chatId,
                      searchResultsMsg.message_id,
                      {
                        reply_markup: undefined,
                      },
                    );
                  } catch {
                    // continue regardless
                  }
                });
                if (ctx.callbackQuery) {
                  await ctx.reply('Current operation cancelled.');
                }
                await conversation.halt({ next: true });
              }
              await ctx.reply(
                'Please confirm your timezone choice or send /cancel.',
              );
            },
          },
        );

      await conversation.external(async (ctx) => {
        try {
          await ctx.api.editMessageReplyMarkup(
            chatId,
            searchResultsMsg.message_id,
            { reply_markup: undefined },
          );
        } catch {
          // continue regardless
        }
      });
      if (callback.callbackQuery?.data === 'tz_manual') {
        await conversation.rewind(manualSearchCheckpoint);
      } else {
        const timezoneIndex = Number(
          callback.callbackQuery?.data?.split(':')[1],
        );
        const timezone = timezoneMatches[timezoneIndex];
        const offset = DateTime.now()
          .setZone(timezone?.fullName)
          .toFormat('ZZ');
        await conversation.external(async () => {
          await db
            .updateTable('chats')
            .set(
              withUpdatedAt({
                ianaTimezone: timezone?.fullName,
                dailyOffset: offset,
              }),
            )
            .where('id', '=', chatId)
            .execute();
        });
        await ctx.reply(
          `Your timezone has been set to ${timezone?.fullName} (${offset})!`,
        );
      }
    }
  }
  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

settingsModule.command('settings', async (ctx) => {
  const lastMenu = ctx.session.settings.lastMenuMsgId;
  if (lastMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastMenu);
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
