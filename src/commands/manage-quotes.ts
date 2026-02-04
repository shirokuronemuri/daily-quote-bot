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

const getQuoteCount = async (chatId: number) => {
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
    (ctx) => ctx.session.quotes.selectedId,
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
    const isTooOld =
      Date.now() - ctx.session.quotes.menuFingerprint > menuTimeLimitMs;
    return isTooOld ? 'expired' : String(ctx.session.quotes.menuFingerprint);
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
    if (ctx.session.quotes.page > 0) {
      ctx.session.quotes.page--;
      const newText = await getQuoteText(ctx.chat.id, ctx.session.quotes.page);
      await ctx.editMessageText(newText);
    } else {
      await ctx.answerCallbackQuery('You are on the first page!');
    }
  })
  .text(
    (ctx) => `Page ${ctx.session.quotes.page + 1}`,
    (ctx) => ctx.answerCallbackQuery(),
  )
  .text('next ▶', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const totalPages = Math.ceil(ctx.session.quotes.totalCount / pageSize);
    if (ctx.session.quotes.page < totalPages - 1) {
      ctx.session.quotes.page++;
      const newText = await getQuoteText(ctx.chat.id, ctx.session.quotes.page);
      await ctx.editMessageText(newText);
    } else {
      await ctx.answerCallbackQuery('You are on the last page!');
    }
  })
  .row()
  .dynamic(async (ctx, range) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const offset = ctx.session.quotes.page * pageSize;
    const quotes = await getQuotes(ctx.chat.id, ctx.session.quotes.page);
    for (const [index, quote] of quotes.entries()) {
      range.text(`#${offset + index + 1}`, async (ctx) => {
        ctx.session.quotes.selectedId = quote.id;
        const detailsText = `Selected quote #${offset + index + 1}:\n\n<blockquote>${quote.quoteText}\n\nー \n${quote.source}</blockquote>\n\nSelect action below:`;
        await ctx.editMessageText(detailsText, { parse_mode: 'HTML' });
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
    const newText = await getQuoteText(ctx.chat.id, ctx.session.quotes.page);
    await ctx.editMessageText(newText);
    await ctx.menu.nav('quotesMenu', { immediate: true });
  })
  .row()
  .text('✏️ edit', async (ctx) => {
    if (ctx.session.quotes.lastMenuMsgId === ctx.msgId) {
      try {
        await ctx.deleteMessage();
      } catch {
        ctx.session.quotes.lastMenuMsgId = null;
      }
    }
    await ctx.conversation.enter('editQuote');
  })
  .row()
  .text('🗑 delete', async (ctx) => {
    if (!ctx.chat) throw new Error('Missing chat in menu context');
    const db = getDb();
    const quoteId = ctx.session.quotes.selectedId;
    if (!quoteId) return;
    await db.deleteFrom('quotes').where('id', '=', quoteId).execute();
    ctx.session.quotes.totalCount--;
    if (
      ctx.session.quotes.page > 0 &&
      ctx.session.quotes.totalCount % pageSize === 0
    ) {
      ctx.session.quotes.page--;
    }
    const newText = await getQuoteText(ctx.chat.id, ctx.session.quotes.page);
    await ctx.editMessageText(newText);
    await ctx.menu.nav('quotesMenu', { immediate: true });
    await ctx.answerCallbackQuery('Quote deleted from list!');
  });

quotesMenu.register(quoteDetailsMenu);

manageQuotesModule.command('manage_quotes', async (ctx) => {
  const lastQuoteMenu = ctx.session.quotes.lastMenuMsgId;
  if (lastQuoteMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastQuoteMenu);
    } catch {
      // continue regardless
    }
  }
  ctx.session.quotes.menuFingerprint = Date.now();
  ctx.session.quotes.page = 0;
  const quotes = await getQuoteText(ctx.chat.id, ctx.session.quotes.page);
  const quoteCount = await getQuoteCount(ctx.chat.id);
  ctx.session.quotes.totalCount = quoteCount;
  const msg = await ctx.reply(quotes, {
    ...(quoteCount > 0 ? { reply_markup: quotesMenu } : {}),
  });
  ctx.session.quotes.lastMenuMsgId = msg.message_id;
});
