import { Composer } from 'grammy';
import { MyContext } from 'src/types';
import { getDb } from '../database/database';
import { ConversationContext, MyConversation } from '../types';

export const addQuoteModule = new Composer<MyContext>();

export const addQuote = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'add_quote';
  });
  const db = getDb();
  const quotePrompt = 'Enter new quote:';
  await ctx.reply(quotePrompt);
  const quoteCtx = await conversation
    .waitFor(['message', 'callback_query'])
    .and(
      (ctx) => {
        if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
          return false;
        }
        return ctx.has('message:text');
      },
      {
        otherwise: async (ctx) => {
          if (ctx.message?.text?.startsWith('/')) {
            await conversation.halt({ next: true });
          }
          if (ctx.callbackQuery) {
            await ctx.reply('Current operation cancelled.');
            await conversation.halt({ next: true });
          }
          await ctx.reply(quotePrompt);
        },
      },
    );

  const sourcePrompt = 'Enter the quote source:';
  await quoteCtx.reply(sourcePrompt);
  const sourceCtx = await conversation
    .waitFor(['message', 'callback_query'])
    .and(
      (ctx) => {
        if (ctx.message?.text?.startsWith('/') || ctx.callbackQuery) {
          return false;
        }
        return ctx.has('message:text');
      },
      {
        otherwise: async (ctx) => {
          if (ctx.message?.text?.startsWith('/')) {
            await conversation.halt({ next: true });
          }
          if (ctx.callbackQuery) {
            await ctx.reply('Current operation cancelled.');
            await conversation.halt({ next: true });
          }
          await ctx.reply(sourcePrompt);
        },
      },
    );

  const chatId = sourceCtx.chat?.id;
  const quoteText = quoteCtx.message?.text;
  const source = sourceCtx.message?.text;
  if (!chatId || !quoteText || !source) {
    throw new Error('Missing chat in conversation');
  }
  await conversation.external(async () => {
    await db
      .insertInto('chats')
      .values({ id: chatId })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  });
  await conversation.external(async () => {
    await db
      .insertInto('quotes')
      .values({
        quoteText,
        source,
        chatId,
      })
      .execute();
  });

  await conversation.external((ctx) => ctx.session.quotes.totalCount++);
  await ctx.reply("I've written down your quote!");
  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

addQuoteModule.command('add_quote', async (ctx) => {
  const lastQuoteMenu = ctx.session.quotes.lastMenuMsgId;
  if (lastQuoteMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastQuoteMenu);
    } catch {
      // proceed anyway
    }
  }
  await ctx.conversation.enter('addQuote');
});
