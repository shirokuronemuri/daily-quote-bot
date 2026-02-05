import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('chats')
    .addColumn('sendDailyQuote', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn('sendTime', 'text', (col) => col.notNull().defaultTo('10:00'))
    .addColumn('ianaTimezone', 'text', (col) =>
      col.notNull().defaultTo('Europe/Kyiv'),
    )
    .addColumn('dailyOffset', 'text', (col) =>
      col.notNull().defaultTo('+00:00'),
    )
    .addColumn('lastSentDate', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('chats')
    .dropColumn('sendDailyQuote')
    .dropColumn('sendTime')
    .dropColumn('ianaTimezone')
    .dropColumn('dailyOffset')
    .dropColumn('lastSentDate')
    .execute();
}
