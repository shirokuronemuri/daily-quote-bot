import { Composer } from 'grammy';
import { MyContext } from 'src/types';
import { getDb } from '../database/database';
import { ConversationContext, MyConversation } from '../types';
import { waitText } from './helpers/wait-text';

export const addQuoteModule = new Composer<MyContext>();

export const addQuote = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'add_quote';
  });
  const db = getDb();
  await ctx.reply('Enter new quote:');
  const quoteCtx = await waitText(conversation);
  await quoteCtx.reply('Enter the quote source:');
  const sourceCtx = await waitText(conversation);

  const chatId = sourceCtx.chat.id;
  await conversation.external(() =>
    db
      .insertInto('chats')
      .values({ id: chatId })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute(),
  );
  await conversation.external(() =>
    db
      .insertInto('quotes')
      .values({
        quoteText: quoteCtx.msg.text,
        source: sourceCtx.msg.text,
        chatId,
      })
      .execute(),
  );

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
