import { Menu } from '@grammyjs/menu';
import { Composer } from 'grammy';
import { getDb } from '../database/database';
import { MyContext } from '../types';

export const manageQuotesModule = new Composer<MyContext>();

const pageSize = 10;

const getQuotes = async (chatId: number, page: number) => {
  const db = getDb();
  const offset = page * pageSize;

  const quotes = await db
    .selectFrom('quotes')
    .where('chatId', '=', chatId)
    .selectAll()
    .limit(pageSize)
    .offset(offset)
    .execute();

  return quotes;
};

const getQuoteText = async (chatId: number, page: number) => {
  const offset = page * pageSize;
  const quotes = await getQuotes(chatId, page);
  if (quotes.length === 0) {
    return 'No quotes found  >.<';
  } else {
    return (
      'Your quotes:\n\n' +
      quotes
        .map((q, i) => `${offset + i + 1}. ${q.quoteText} (${q.source})`)
        .join('\n\n')
    );
  }
};

const getQuoteCount = async (ctx: MyContext) => {
  const chatId = ctx.chat?.id;
  if (!chatId) throw new Error('No chatId in getQuotes');

  const db = getDb();
  const result = await db
    .selectFrom('quotes')
    .select(db.fn.countAll<number>().as('count'))
    .where('chatId', '=', chatId)
    .executeTakeFirst();

  return result?.count ?? 0;
};

export const quotesMenu = new Menu<MyContext>('manage_quotes')
  .text('◀ prev', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    ctx.session.quoteCount = await getQuoteCount(ctx);
    if (ctx.session.quotePage > 0) {
      ctx.session.quotePage--;
      const newText = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
      await ctx.editMessageText(newText);
    } else {
      await ctx.answerCallbackQuery('You are on the first page!');
    }
  })
  .text(
    (ctx) => `Page ${ctx.session.quotePage + 1}`,
    (ctx) => ctx.answerCallbackQuery(),
  )
  .text('▶ next', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    ctx.session.quoteCount = await getQuoteCount(ctx);
    const totalPages = Math.ceil(ctx.session.quoteCount / pageSize);
    if (ctx.session.quotePage < totalPages - 1) {
      console.log('here');
      ctx.session.quotePage++;
      const newText = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
      await ctx.editMessageText(newText);
    } else {
      console.log('max');
      await ctx.answerCallbackQuery('You are on the last page!');
      // todo debug this thing it doesn't update buttons and one page is abundant
      // todo and also delete old menu when creating new one
    }
  })
  .row()
  .dynamic(async (ctx, range) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const quotes = await getQuotes(ctx.chat.id, ctx.session.quotePage);
    for (const [index, quote] of quotes.entries()) {
      range.text(`#${index + 1}`, (ctx) => {
        ctx.session.selectedQuoteId = quote.id;
        // await ctx.menu.nav
      });
    }
  });

manageQuotesModule.command('manage_quotes', async (ctx) => {
  ctx.session.quotePage = 0;
  const quotes = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
  ctx.session.quoteCount = await getQuoteCount(ctx);
  console.log(ctx.session.quoteCount);
  await ctx.reply(quotes, { reply_markup: quotesMenu });
});
