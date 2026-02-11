import { CronJob } from 'cron';
import { Bot } from 'grammy';
import { getDb } from './database/database';
import { ParseJSONResultsPlugin, sql } from 'kysely';
import { jsonObjectFrom } from 'kysely/helpers/sqlite';
import { MyContext } from './types';
import { DateTime } from 'luxon';
import { withUpdatedAt } from './database/helpers/with-updated-at';

const updateDailyOffsets = async () => {
  const db = getDb();
  const chats = await db
    .selectFrom('chats')
    .select(['id', 'ianaTimezone'])
    .execute();
  const updates = chats.map((chat) => {
    const currentOffset = DateTime.now()
      .setZone(chat.ianaTimezone)
      .toFormat('ZZ');

    return {
      id: chat.id,
      currentOffset,
    };
  });

  await db.transaction().execute(async (trx) => {
    for (const update of updates) {
      await trx
        .updateTable('chats')
        .set(withUpdatedAt({ dailyOffset: update.currentOffset }))
        .where('id', '=', update.id)
        .execute();
    }
  });
};

export const initDailyQuoteCron = (bot: Bot<MyContext>) => {
  CronJob.from({
    cronTime: '1 */15 * * * *',
    onTick: async () => {
      await sendDailyQuote(bot);
    },
    start: true,
    timeZone: 'UTC',
  });
};

const sendDailyQuote = async (bot: Bot<MyContext>) => {
  console.log(
    `[${DateTime.now().toFormat('HH:mm')}]: running sendDailyQuote cron job`,
  );
  const now = DateTime.utc();
  if (now.hour === 3 && now.minute === 0) {
    console.log('Starting daily offsets update...');
    await updateDailyOffsets();
  }

  const db = getDb();
  const chats = await db
    .selectFrom('chats')
    .where((eb) =>
      eb.and([
        eb(
          sql`strftime('%H:%M', 'now', chats.daily_offset)`,
          '=',
          eb.ref('chats.sendTime'),
        ),
        eb.or([
          eb('lastSentDate', 'is', null),
          eb(
            'lastSentDate',
            '!=',
            sql<string>`date('now', chats.daily_offset)`,
          ),
        ]),
      ]),
    )
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
          .select('text')
          .whereRef('customMessages.chatId', '=', 'chats.id')
          .orderBy(sql`random()`)
          .limit(1)
          .as('customMessage'),
    ])
    .withPlugin(new ParseJSONResultsPlugin())
    .execute();

  const defaultMessage = "Good morning, oniichan! Here's your daily quote:";
  for (const chat of chats) {
    if (!chat.quote) continue;
    const message = `${chat.customMessage ?? defaultMessage}\n\n${chat.quote.quoteText}\n\nー ${chat.quote.source}`;
    await bot.api.sendMessage(chat.id, message);
  }
  await db.transaction().execute(async (trx) => {
    for (const chat of chats) {
      await trx
        .updateTable('chats')
        .set(
          withUpdatedAt({ lastSentDate: sql`date('now', chats.daily_offset)` }),
        )
        .where('id', '=', chat.id)
        .execute();
    }
  });
};
