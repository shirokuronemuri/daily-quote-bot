import dotenv from 'dotenv';
import path from 'node:path';
import fs, { constants } from 'node:fs';
import z from 'zod';

const nodeEnv = process.env.NODE_ENV ?? 'development';
dotenv.config({
  path: `.env.${nodeEnv}`,
});

// const emptyToUndefined = (v: unknown) =>
//   typeof v === 'string' && v.trim() === '' ? undefined : v;

const envSchema = z.object({
  BOT_TOKEN: z.string().trim().nonempty(),
  DB_DIR: z.string().trim().nonempty(),
});

const validateConfig = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      'Failed parsing environment variables:',
      z.flattenError(parsed.error).fieldErrors,
    );
    throw new Error('Invalid environment configuration');
  }
  validateDBDir(parsed.data.DB_DIR);
  return parsed.data;
};

const validateDBDir = (dir: string) => {
  try {
    fs.accessSync(dir, constants.F_OK | constants.W_OK);
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        throw new Error(`Failed creating database directory at ${dir}`);
      }
    } else {
      throw new Error(`No write access to database directory at ${dir}`);
    }
  }
};

export const initConfig = () => {
  const env = validateConfig();
  const dbFilename =
    nodeEnv === 'production' ? 'db.prod.sqlite' : 'db.dev.sqlite';
  return {
    botToken: env.BOT_TOKEN,
    dbPath: path.resolve(env.DB_DIR, dbFilename),
  };
};

export const config = initConfig();
