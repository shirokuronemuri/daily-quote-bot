import { Composer } from 'grammy';
import { MyContext } from 'src/types';

export const cancelModule = new Composer<MyContext>();

cancelModule.command('cancel', async (ctx) => {
  if (!ctx.session.activeConversation) {
    await ctx.reply("Sorry, there's nothing to cancel...");
  } else {
    await ctx.reply(
      `<code>${ctx.session.activeConversation}</code> operation was cancelled.`,
      { parse_mode: 'HTML' },
    );
    ctx.session.activeConversation = null;
  }
});
