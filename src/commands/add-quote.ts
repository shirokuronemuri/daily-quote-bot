import { Conversation } from '@grammyjs/conversations';
import { waitText } from './helpers/wait-text';
import { ConversationContext, MyContext } from 'src/types';
import { getDb } from 'src/database/database';
import { Composer } from 'grammy';

export const addQuoteModule = new Composer<MyContext>();

export const addQuote = async (
  conversation: Conversation,
  ctx: ConversationContext,
) => {
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

  await ctx.reply("I've written down your quote!");
};

addQuoteModule.command('add_quote', async (ctx) => {
  await ctx.conversation.enter('addQuote');
});
