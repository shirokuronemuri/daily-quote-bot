import { Filter } from 'grammy';
import { ConversationContext, MyConversation } from 'src/types';

export const waitText = async (
  conversation: MyConversation,
): Promise<Filter<ConversationContext, ':text'>> => {
  return await conversation
    .waitFor(':text', {
      otherwise: (ctx) => ctx.reply('Write me something!'),
    })
    .and((ctx) => !ctx.message?.text.startsWith('/'), {
      otherwise: async () => {
        await conversation.halt({ next: true });
      },
    });
};
