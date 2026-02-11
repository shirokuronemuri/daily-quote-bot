import { Composer } from 'grammy';
import { MyContext } from 'src/types';

export const helpModule = new Composer<MyContext>();

helpModule.command('help', async (ctx) => {
  await ctx.reply(`Hi, oniichan! 
This bot was created to send you good motivating quotes every day \
to make you feel a little bit better in your life. You can also add custom messages that are displayed before the quote.
Both quote and message are selected randomly from your list.

Before using the bot for the first time you should check out /settings to set a correct timezone and sending time. \
You can also toggle daily quote from there.

Commands:
/start - start bot
/help - Show this message
/add_quote - add new quote
/manage_quotes - view, edit or delete your quotes
/add_custom_message - add custom message before the quote
/manage_custom_messages - view, edit or delete your custom messages
/random_quote - get a random quote from your list
/settings - set timezone, sending time or disable/enable daily quote
/cancel - cancel some operations like adding or editing a quote/message or setting a timezone`);
});
