import { Composer } from 'grammy';
import { MyContext } from 'src/types';

export const startModule = new Composer<MyContext>();

startModule.command('start', (ctx) => ctx.reply('hello, oniichan!'));
