import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('customMessages')
    .renameColumn('customMessage', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('customMessages')
    .renameColumn('text', 'customMessage')
    .execute();
}
