import { Bot } from 'grammy';
import { config } from './config';

const bot = new Bot(config.botToken);

bot.command('start', (ctx) => ctx.reply('hello, oniichan!'));

bot.start();
