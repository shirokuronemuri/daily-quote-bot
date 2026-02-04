import { ConversationFlavor } from '@grammyjs/conversations';
import { CronJob } from 'cron';
import { Bot, Context } from 'grammy';
import { getDb } from './database/database';
import { sql } from 'kysely';
import { jsonObjectFrom } from 'kysely/helpers/sqlite';

export const initDailyQuoteCron = (bot: Bot<ConversationFlavor<Context>>) => {
  // todo: handle all timezones and custom times
  CronJob.from({
    cronTime: '*/10 * * * * *',
    onTick: async () => {
      await sendDailyQuote(bot);
    },
    start: true,
    timeZone: 'Europe/Kyiv',
  });
};

const sendDailyQuote = async (bot: Bot<ConversationFlavor<Context>>) => {
  const db = getDb();
  const chats = await db
    .selectFrom('chats')
    .select([
      'id',
      (qb) =>
        jsonObjectFrom(
          qb
            .selectFrom('quotes')
            .select(['quoteText', 'source'])
            .whereRef('quotes.chatId', '=', 'chats.id')
            .orderBy(sql`random()`)
            .limit(1),
        ).as('quote'),
      (qb) =>
        qb
          .selectFrom('customMessages')
          .select('customMessage')
          .whereRef('customMessages.chatId', '=', 'chats.id')
          .orderBy(sql`random()`)
          .limit(1)
          .as('customMessage'),
    ])
    .execute();

  const defaultMessage = "Good morning, oniichan! Here's your daily quote:";
  for (const chat of chats) {
    if (!chat.quote) continue;
    const message = `${chat.customMessage ?? defaultMessage}\n\n${chat.quote.quoteText}\n\nー ${chat.quote.source}`;
    await bot.api.sendMessage(chat.id, message);
  }
};
