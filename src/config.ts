import 'dotenv/config';
import z from 'zod';

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const envSchema = z.object({
  BOT_TOKEN: z.string().trim().nonempty(),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().default(4500)),
});

const validateConfig = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Failed parsing environment variables:');
    console.error(JSON.stringify(parsed.error.issues, null, 2));
    throw new Error('Invalid environment configuration', {
      cause: parsed.error,
    });
  }
  return parsed.data;
};

const env = validateConfig();

export const config = {
  botToken: env.BOT_TOKEN,
  port: env.PORT,
} as const;
