import dotenv from 'dotenv';
import z from 'zod';

const nodeEnv = process.env.NODE_ENV ?? 'development';

dotenv.config({
  path: `.env.${nodeEnv}`,
});

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const envSchema = z.object({
  BOT_TOKEN: z.string().trim().nonempty(),
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
  return parsed.data;
};

const env = validateConfig();

export const config = {
  botToken: env.BOT_TOKEN,
} as const;
