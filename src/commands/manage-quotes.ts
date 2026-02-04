import { Menu, MenuOptions } from '@grammyjs/menu';
import { Composer } from 'grammy';
import { getDb } from '../database/database';
import { MyContext } from '../types';
import { ConversationContext, MyConversation } from '../types';
import { waitText } from './helpers/wait-text';

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
      'Select quote you want to manage:\n\n' +
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

export const editQuote = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'manage_quotes';
  });
  const db = getDb();
  await ctx.reply('Enter updated quote:');
  const quoteCtx = await waitText(conversation);
  await quoteCtx.reply('Enter the quote source:');
  const sourceCtx = await waitText(conversation);

  const quoteId = await conversation.external(
    (ctx) => ctx.session.selectedQuoteId,
  );
  await conversation.external(() =>
    db
      .updateTable('quotes')
      .set({
        quoteText: quoteCtx.msg.text,
        source: sourceCtx.msg.text,
      })
      .where('id', '=', quoteId)
      .execute(),
  );

  await ctx.reply("I've updated your quote!");

  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

const menuOptions: MenuOptions<MyContext> = {
  fingerprint: (ctx) => {
    // 48 hours
    const menuTimeLimitMs = 1000 * 60 * 60 * 48;
    const isTooOld = Date.now() - ctx.session.menuFingerprint > menuTimeLimitMs;
    return isTooOld ? 'expired' : String(ctx.session.menuFingerprint);
  },
  onMenuOutdated: async (ctx) => {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } catch {
      // continue regardless
    }
    await ctx.answerCallbackQuery({
      text: 'The menu is outdated, please use /manage_quotes again.',
      show_alert: true,
    });
  },
};

export const quotesMenu = new Menu<MyContext>('quotesMenu', menuOptions)
  .text('◀ prev', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
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
  .text('next ▶', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const totalPages = Math.ceil(ctx.session.quoteCount / pageSize);
    if (ctx.session.quotePage < totalPages - 1) {
      ctx.session.quotePage++;
      const newText = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
      await ctx.editMessageText(newText);
    } else {
      await ctx.answerCallbackQuery('You are on the last page!');
    }
  })
  .row()
  .dynamic(async (ctx, range) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const offset = ctx.session.quotePage * pageSize;
    const quotes = await getQuotes(ctx.chat.id, ctx.session.quotePage);
    for (const [index, quote] of quotes.entries()) {
      range.text(`#${offset + index + 1}`, async (ctx) => {
        ctx.session.selectedQuoteId = quote.id;
        const detailsText = `Selected quote #${offset + index + 1}:\n\nContents:\n${quote.quoteText}\n\nSource:\n${quote.source}\n\nSelect action below:`;
        await ctx.editMessageText(detailsText);
        await ctx.menu.nav('quoteDetailsMenu', { immediate: true });
      });

      if (index + 1 === Math.ceil(quotes.length / 2)) {
        range.row();
      }
    }
  });

export const quoteDetailsMenu = new Menu<MyContext>(
  'quoteDetailsMenu',
  menuOptions,
)
  .text('↩ back to list', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const newText = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
    await ctx.editMessageText(newText);
    await ctx.menu.nav('quotesMenu', { immediate: true });
  })
  .row()
  .text('✏️ edit', async (ctx) => {
    if (ctx.session.lastQuoteMenuMessageId === ctx.msgId) {
      try {
        await ctx.deleteMessage();
      } catch {
        ctx.session.lastQuoteMenuMessageId = null;
      }
    }
    await ctx.conversation.enter('editQuote');
  })
  .row()
  .text('🗑 delete', async (ctx) => {
    const db = getDb();
    const quoteId = ctx.session.selectedQuoteId;
    if (!quoteId) return;
    await db.deleteFrom('quotes').where('id', '=', quoteId).execute();
    ctx.session.quoteCount--;
    if (ctx.session.quotePage > 0 && ctx.session.quoteCount % pageSize === 0) {
      ctx.session.quotePage--;
    }
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const newText = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
    await ctx.editMessageText(newText);
    await ctx.menu.nav('quotesMenu', { immediate: true });
    await ctx.answerCallbackQuery('Quote deleted from list!');
  });

quotesMenu.register(quoteDetailsMenu);

manageQuotesModule.command('manage_quotes', async (ctx) => {
  const lastQuoteMenu = ctx.session.lastQuoteMenuMessageId;
  if (lastQuoteMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastQuoteMenu);
    } catch {
      // continue regardless
    }
  }
  ctx.session.menuFingerprint = Date.now();
  ctx.session.quotePage = 0;
  const quotes = await getQuoteText(ctx.chat.id, ctx.session.quotePage);
  const quoteCount = await getQuoteCount(ctx);
  ctx.session.quoteCount = quoteCount;
  const msg = await ctx.reply(quotes, {
    ...(quoteCount > 0 ? { reply_markup: quotesMenu } : {}),
  });
  ctx.session.lastQuoteMenuMessageId = msg.message_id;
});
