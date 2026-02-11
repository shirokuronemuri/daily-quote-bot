import { StorageAdapter } from 'grammy';
import { Kysely } from 'kysely';
import { Database } from 'src/database/schema';

export class KyselyAdapter<T> implements StorageAdapter<T> {
  private client: Kysely<Database>;

  constructor(client: Kysely<Database>) {
    this.client = client;
  }

  async read(key: string) {
    const session = await this.client
      .selectFrom('session')
      .selectAll()
      .where('key', '=', key)
      .executeTakeFirst();
    return session?.value ? (JSON.parse(session.value) as T) : undefined;
  }

  async write(key: string, data: T) {
    const value = JSON.stringify(data);
    await this.client
      .insertInto('session')
      .values({ key, value })
      .onConflict((oc) => oc.column('key').doUpdateSet({ value }))
      .execute();
  }

  async delete(key: string) {
    await this.client.deleteFrom('session').where('key', '=', key).execute();
  }
}
