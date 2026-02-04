import SQLite from 'better-sqlite3';
import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  SqliteDialect,
} from 'kysely';
import { config } from '../config';
import { Database } from './schema';

let db: Kysely<Database> | undefined;

export const getDb = () => {
  if (!db) {
    const nativeDb = new SQLite(config.dbPath);
    nativeDb.pragma('journal_mode = WAL');
    nativeDb.pragma('synchronous = NORMAL');
    nativeDb.pragma('foreign_keys = ON');
    nativeDb.pragma('busy_timeout = 5000');

    const dialect = new SqliteDialect({
      database: nativeDb,
    });

    db = new Kysely<Database>({
      dialect,
      plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
    });
  }

  return db;
};
