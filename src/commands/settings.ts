import { Menu, MenuOptions } from '@grammyjs/menu';
import { getDb } from '../database/database';
import { ConversationContext, MyContext, MyConversation } from '../types';
import { sql } from 'kysely';
import { Composer, InlineKeyboard } from 'grammy';
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import { withUpdatedAt } from '../database/helpers/with-updated-at';
import { waitForTextMessage } from './helpers/wait-message';
import { resetMenu } from './helpers/reset-menu';

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
  .text(
    async (ctx) => {
      if (!ctx.chat) throw new Error('Missing chat in menu context');
      const db = getDb();
      const { ianaTimezone, dailyOffset } =
        (await db
          .selectFrom('chats')
          .where('id', '=', ctx.chat.id)
          .select(['ianaTimezone', 'dailyOffset'])
          .executeTakeFirst()) ?? {};

      return `Timezone: ${ianaTimezone} (${dailyOffset})`;
    },
    async (ctx) => {
      await ctx.conversation.enter('setTimezoneConversation');
    },
  )
  .row()
  .text(
    async (ctx) => {
      if (!ctx.chat) throw new Error('Missing chat in menu context');
      const db = getDb();
      const { sendTime } =
        (await db
          .selectFrom('chats')
          .where('id', '=', ctx.chat.id)
          .select('sendTime')
          .executeTakeFirst()) ?? {};

      return `Daily sending time: ${sendTime}`;
    },
    async (ctx) => {
      await ctx.conversation.enter('setTimeConversation');
    },
  );

export const setTimeConversation = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'set_time';
  });
  const hourSelectKeyboard = new InlineKeyboard();
  for (let hour = 0; hour < 24; ++hour) {
    const hourString = String(hour).padStart(2, '0');
    hourSelectKeyboard.text(`${hour}`, `hour:${hourString}`);
    if ((hour + 1) % 8 === 0) {
      hourSelectKeyboard.row();
    }
  }
  const hourSelectMsg = await ctx.reply(
    'Select hour at which the message will be sent:',
    {
      reply_markup: hourSelectKeyboard,
    },
  );
  const chatId = hourSelectMsg.chat.id;
  const hourCtx = await conversation
    .waitFor('callback_query', {
      otherwise: async (ctx) => {
        if (ctx.has('message')) {
          if (ctx.message.text?.startsWith('/')) {
            await conversation.external(async (ctx) => {
              await resetMenu(ctx, chatId, hourSelectMsg.message_id);
              if (!ctx.hasCommand('cancel')) {
                ctx.session.activeConversation = null;
              }
            });
            await conversation.halt({ next: true });
          }
          await ctx.reply(
            'Please select the hour from the message above or send /cancel to abort operation.',
          );
        }
      },
    })
    .and(
      (ctx) => (ctx.callbackQuery.data?.startsWith('hour:') ? true : false),
      {
        otherwise: async (ctx) => {
          await conversation.external(async (ctx) => {
            await resetMenu(ctx, chatId, hourSelectMsg.message_id);
            ctx.session.activeConversation = null;
          });
          await ctx.reply('Current operation cancelled.');
          await conversation.halt({ next: true });
        },
      },
    );

  const hour = hourCtx.callbackQuery.data?.split(':')[1];
  await conversation.external(async (ctx) => {
    await resetMenu(ctx, chatId, hourSelectMsg.message_id);
  });

  const minuteSelectKeyboard = new InlineKeyboard();
  for (let i = 0; i < 4; i++) {
    const minuteString = String(i * 15).padStart(2, '0');
    minuteSelectKeyboard.text(
      `${hour}:${minuteString}`,
      `minute:${minuteString}`,
    );
    if ((i + 1) % 2 === 0) {
      minuteSelectKeyboard.row();
    }
  }
  const minuteSelectMsg = await ctx.reply(
    'Select the precise time from variants below:',
    {
      reply_markup: minuteSelectKeyboard,
    },
  );
  const minuteCtx = await conversation
    .waitFor('callback_query', {
      otherwise: async (ctx) => {
        if (ctx.has('message')) {
          if (ctx.message.text?.startsWith('/')) {
            await conversation.external(async (ctx) => {
              await resetMenu(ctx, chatId, minuteSelectMsg.message_id);
              if (!ctx.hasCommand('cancel')) {
                ctx.session.activeConversation = null;
              }
            });
            await conversation.halt({ next: true });
          }
          await ctx.reply(
            'Please select the sending time from the message above or send /cancel to abort operation.',
          );
        }
      },
    })
    .and(
      (ctx) => (ctx.callbackQuery.data?.startsWith('minute:') ? true : false),
      {
        otherwise: async (ctx) => {
          await conversation.external(async (ctx) => {
            await resetMenu(ctx, chatId, minuteSelectMsg.message_id);
            ctx.session.activeConversation = null;
          });
          await ctx.reply('Current operation cancelled.');
          await conversation.halt({ next: true });
        },
      },
    );

  const minute = minuteCtx.callbackQuery.data?.split(':')[1];
  await conversation.external(async (ctx) => {
    await resetMenu(ctx, chatId, minuteSelectMsg.message_id);
  });

  const sendTime = `${hour}:${minute}`;
  const db = getDb();
  await conversation.external(async () => {
    await db
      .updateTable('chats')
      .set(withUpdatedAt({ sendTime }))
      .where('id', '=', chatId)
      .execute();
  });

  await ctx.reply(`I've set your daily message time to ${sendTime}!`);
  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

export const setTimezoneConversation = async (
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
              await resetMenu(ctx, chatId, settingsMenuMsg.message_id);
              if (!ctx.hasCommand('cancel')) {
                ctx.session.activeConversation = null;
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
    await resetMenu(ctx, chatId, settingsMenuMsg.message_id);
  });
  if (filteredCtx.has('message:location')) {
    const { latitude, longitude } = filteredCtx.message.location;
    const timezone = tzlookup(latitude, longitude).replace('Kiev', 'Kyiv');
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
      .waitFor('callback_query', {
        otherwise: async (ctx) => {
          if (ctx.has('message')) {
            if (ctx.message.text?.startsWith('/')) {
              await conversation.external(async (ctx) => {
                await resetMenu(ctx, chatId, confirmMenuCtx.message_id);
                if (!ctx.hasCommand('cancel')) {
                  ctx.session.activeConversation = null;
                }
              });
              await conversation.halt({ next: true });
            }
            await ctx.reply(
              'Please confirm your timezone choice or send /cancel.',
            );
          }
        },
      })
      .and(
        (ctx) => ['tz_save', 'tz_retry'].includes(ctx.callbackQuery.data ?? ''),
        {
          otherwise: async (ctx) => {
            await conversation.external(async (ctx) => {
              await resetMenu(ctx, chatId, confirmMenuCtx.message_id);
              ctx.session.activeConversation = null;
            });
            await ctx.reply('Current operation cancelled.');
            await conversation.halt({ next: true });
          },
        },
      );

    await conversation.external(async (ctx) => {
      await resetMenu(ctx, chatId, confirmMenuCtx.message_id);
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
    const searchTermCtx = await waitForTextMessage(
      conversation,
      'Please search for your timezone city or send /cancel to abort operation.',
    );
    const searchTerm = searchTermCtx.message.text;
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
        .waitFor('callback_query', {
          otherwise: async (ctx) => {
            if (ctx.has('message')) {
              if (ctx.message.text?.startsWith('/')) {
                await conversation.external(async (ctx) => {
                  await resetMenu(ctx, chatId, searchResultsMsg.message_id);
                  if (!ctx.hasCommand('cancel')) {
                    ctx.session.activeConversation = null;
                  }
                });
                await conversation.halt({ next: true });
              }
              await ctx.reply(
                'Please confirm your timezone choice or send /cancel.',
              );
            }
          },
        })
        .and(
          (ctx) =>
            ctx.callbackQuery.data === 'tz_manual' ||
            ctx.callbackQuery.data?.startsWith('tz_res:')
              ? true
              : false,
          {
            otherwise: async (ctx) => {
              await conversation.external(async (ctx) => {
                await resetMenu(ctx, chatId, searchResultsMsg.message_id);
                ctx.session.activeConversation = null;
              });
              await ctx.reply('Current operation cancelled.');
              await conversation.halt({ next: true });
            },
          },
        );

      await conversation.external(async (ctx) => {
        await resetMenu(ctx, chatId, searchResultsMsg.message_id);
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
