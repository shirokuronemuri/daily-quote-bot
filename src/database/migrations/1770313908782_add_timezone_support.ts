import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('chats')
    .addColumn('sendDailyQuote', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .execute();
  await db.schema
    .alterTable('chats')
    .addColumn('sendTime', 'text', (col) => col.notNull().defaultTo('10:00'))
    .execute();
  await db.schema
    .alterTable('chats')
    .addColumn('ianaTimezone', 'text', (col) => col.notNull().defaultTo('UTC'))
    .execute();
  await db.schema
    .alterTable('chats')
    .addColumn('dailyOffset', 'text', (col) =>
      col.notNull().defaultTo('+00:00'),
    )
    .execute();
  await db.schema
    .alterTable('chats')
    .addColumn('lastSentDate', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('chats').dropColumn('sendDailyQuote').execute();
  await db.schema.alterTable('chats').dropColumn('sendTime').execute();
  await db.schema.alterTable('chats').dropColumn('ianaTimezone').execute();
  await db.schema.alterTable('chats').dropColumn('dailyOffset').execute();
  await db.schema.alterTable('chats').dropColumn('lastSentDate').execute();
}
