import { ConversationFlavor } from '@grammyjs/conversations';
import { CronJob } from 'cron';
import { Bot, Context } from 'grammy';
import { getDb } from './database/database';
import { sql } from 'kysely';

export const initDailyQuoteCron = (bot: Bot<ConversationFlavor<Context>>) => {
  // todo: handle all timezones and custom times
  CronJob.from({
    cronTime: '0 10 * * *',
    onTick: async () => {
      await sendDailyQuote(bot);
    },
    start: true,
    timeZone: 'Europe/Kyiv',
  });
};

const sendDailyQuote = async (bot: Bot<ConversationFlavor<Context>>) => {
  const db = getDb();
  const randomQuotes = await db
    .selectFrom('quotes')
    .select(['chatId', 'quoteText', 'source'])
    .where((eb) =>
      eb('id', 'in', (subquery) =>
        subquery
          .selectFrom('quotes as q2')
          .select('q2.id')
          .whereRef('q2.chatId', '=', 'quotes.chatId')
          .orderBy(sql`random()`)
          .limit(1),
      ),
    )
    .execute();

  for (const quote of randomQuotes) {
    const message = `Good morning, oniichan! Here's your daily quote:\n\n${quote.quoteText}\n\nー ${quote.source}`;
    await bot.api.sendMessage(quote.chatId, message);
  }
};
