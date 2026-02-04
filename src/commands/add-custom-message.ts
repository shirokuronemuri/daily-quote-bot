import { MyContext } from 'src/types';
import { getDb } from '../database/database';
import { ConversationContext, MyConversation } from '../types';
import { waitText } from './helpers/wait-text';
import { Composer } from 'grammy';

export const addCustomMessageModule = new Composer<MyContext>();

export const addCustomMessage = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await conversation.external((ctx) => {
    ctx.session.activeConversation = 'add_custom_message';
  });
  const db = getDb();
  await ctx.reply(
    'Enter new custom message that will be displayed before quote:',
  );
  const customCtx = await waitText(conversation);

  const chatId = customCtx.chat.id;
  await conversation.external(() =>
    db
      .insertInto('chats')
      .values({ id: chatId })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute(),
  );
  await conversation.external(() =>
    db
      .insertInto('customMessages')
      .values({
        customMessage: customCtx.msg.text,
        chatId,
      })
      .execute(),
  );

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
