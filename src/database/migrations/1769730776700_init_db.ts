import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('chats')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable('quotes')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('chat_id', 'integer', (col) =>
      col.notNull().references('chats.id').onDelete('cascade'),
    )
    .addColumn('quote_text', 'text', (col) => col.notNull())
    .addColumn('source', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable('custom_messages')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('chat_id', 'integer', (col) =>
      col.notNull().references('chats.id').onDelete('cascade'),
    )
    .addColumn('custom_message', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable('session')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('key', 'text', (col) => col.notNull().unique())
    .addColumn('value', 'text', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('chats').execute();
  await db.schema.dropTable('quotes').execute();
  await db.schema.dropTable('custom_messages').execute();
  await db.schema.dropTable('session').execute();
}
