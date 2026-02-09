import { Composer } from 'grammy';
import { MyContext } from '../types';
import { getDb } from '../database/database';
import { sql } from 'kysely';

export const randomQuoteModule = new Composer<MyContext>();

randomQuoteModule.command('random_quote', async (ctx) => {
  const db = getDb();
  const randomQuote = await db
    .selectFrom('quotes')
    .select(['quoteText', 'source'])
    .where('chatId', '=', ctx.chat.id)
    .limit(1)
    .orderBy(sql`random()`)
    .executeTakeFirst();

  if (!randomQuote) {
    await ctx.reply("You don't have any saved quotes.");
  } else {
    await ctx.reply(`${randomQuote.quoteText}\n\nー${randomQuote.source}`);
  }
});
