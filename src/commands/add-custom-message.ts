import { MyContext } from '../types';
import { getDb } from '../database/database';
import { ConversationContext, MyConversation } from '../types';
import { Composer } from 'grammy';
import { waitForTextMessage } from './helpers/wait-message';
import { sanitizeInput } from './helpers/sanitize-input';

export const addCustomMessageModule = new Composer<MyContext>();

export const addCustomMessage = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'add_custom_message';
  });
  const db = getDb();
  const prompt =
    'Enter new custom message that will be displayed before quote:';
  await ctx.reply(prompt);
  const customCtx = await waitForTextMessage(conversation, prompt);
  const chatId = customCtx.chat.id;
  const text = sanitizeInput(customCtx.message.text);
  await conversation.external(async () => {
    await db
      .insertInto('chats')
      .values({ id: chatId })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  });
  await conversation.external(async () => {
    await db.insertInto('customMessages').values({ text, chatId }).execute();
  });

  await ctx.reply("I've remembered your message!");
  await conversation.external((ctx) => {
    ctx.session.activeConversation = null;
  });
};

addCustomMessageModule.command('add_custom_message', async (ctx) => {
  const lastMenu = ctx.session.customMessages.lastMenuMsgId;
  if (lastMenu) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, lastMenu);
    } catch {
      // proceed anyway
    }
  }
  await ctx.conversation.enter('addCustomMessage');
});
