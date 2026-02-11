import { Composer } from 'grammy';
import { MyContext } from '../types';

export const startModule = new Composer<MyContext>();

startModule.command('start', (ctx) =>
  ctx.reply(`Hi, oniichan! 
This bot was created to send you good motivating quotes every day \
to make you feel a little bit better in your life. You can also add custom messages that are displayed before the quote.
Both quote and message are selected randomly from your list.

Before using the bot for the first time you should check out /settings to set a correct timezone and sending time. \
You can also toggle daily quote from there.

To list all the commands, type /help.`),
);
