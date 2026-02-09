import { Composer } from 'grammy';
import { MyContext } from '../types';
import { getDb } from '../database/database';
import { ConversationContext, MyConversation } from '../types';
import { waitForTextMessage } from './helpers/wait-message';
import { sanitizeInput } from './helpers/sanitize-input';

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
  const quoteCtx = await waitForTextMessage(conversation, quotePrompt);
  const sourcePrompt = 'Enter the quote source:';
  await quoteCtx.reply(sourcePrompt);
  const sourceCtx = await waitForTextMessage(conversation, sourcePrompt);

  const chatId = sourceCtx.chat.id;
  const quoteText = sanitizeInput(quoteCtx.message.text);
  const source = sanitizeInput(sourceCtx.message.text);
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
