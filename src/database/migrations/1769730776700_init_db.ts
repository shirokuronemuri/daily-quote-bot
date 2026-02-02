import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('chats')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('createdAt', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updatedAt', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable('quotes')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('chatId', 'integer', (col) =>
      col.notNull().references('chats.id').onDelete('cascade'),
    )
    .addColumn('quoteText', 'text', (col) => col.notNull())
    .addColumn('source', 'text', (col) => col.notNull())
    .addColumn('createdAt', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updatedAt', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable('customMessages')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('chatId', 'integer', (col) =>
      col.notNull().references('chats.id').onDelete('cascade'),
    )
    .addColumn('customMessage', 'text', (col) => col.notNull())
    .addColumn('createdAt', 'text', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn('updatedAt', 'text', (col) =>
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
  await db.schema.dropTable('customMessages').execute();
  await db.schema.dropTable('session').execute();
}
