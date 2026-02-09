import { MyContext } from 'src/types';

export const resetMenu = async (
  ctx: MyContext,
  chatId: number,
  messageId: number,
) => {
  try {
    await ctx.api.editMessageReplyMarkup(chatId, messageId, {
      reply_markup: undefined,
    });
  } catch {
    // continue regardless
  }
};
