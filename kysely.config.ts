import { defineConfig } from 'kysely-ctl';
import { getDb } from './src/database/database';

export default defineConfig({
  kysely: getDb(),
  migrations: {
    migrationFolder: './src/database/migrations',
  },
});
