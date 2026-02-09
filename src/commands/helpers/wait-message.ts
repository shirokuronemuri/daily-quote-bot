import { Filter } from 'grammy';
import { ConversationContext, MyConversation } from 'src/types';

export const waitForTextMessage = async (
  conversation: MyConversation,
  prompt: string,
): Promise<Filter<ConversationContext, 'message:text'>> => {
  return await conversation
    .waitFor('message:text', {
      otherwise: async (ctx) => {
        if (ctx.has('callback_query')) {
          await ctx.reply('Current operation cancelled.');
          await conversation.halt({ next: true });
        }
        if (ctx.has('message')) {
          await ctx.reply(prompt);
        }
      },
    })
    .and((ctx) => !ctx.message.text.startsWith('/'), {
      otherwise: async () => {
        await conversation.halt({ next: true });
      },
    });
};
