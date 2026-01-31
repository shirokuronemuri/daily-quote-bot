import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { config } from '../config';
import { Database } from './schema';

let db: Kysely<Database> | undefined;

export const getDb = () => {
  if (!db) {
    const dialect = new SqliteDialect({
      database: new SQLite(config.dbPath),
    });

    db = new Kysely<Database>({
      dialect,
    });
  }

  return db;
};
