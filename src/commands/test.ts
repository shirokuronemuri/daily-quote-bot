import { ConversationContext, MyContext, MyConversation } from '../types';
import { waitText } from './helpers/wait-text';
import { Composer } from 'grammy';

export const testModule = new Composer<MyContext>();

export const testConversation = async (
  conversation: MyConversation,
  ctx: ConversationContext,
) => {
  await ctx.reply('oniichan!');
  ctx = await waitText(conversation);
  await ctx.reply('I see, I see!');
};

testModule.command('test', async (ctx) => {
  await ctx.conversation.enter('testConversation');
});
