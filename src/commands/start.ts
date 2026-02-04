import { Composer } from 'grammy';
import { MyContext } from '../types';

export const startModule = new Composer<MyContext>();

startModule.command('start', (ctx) => ctx.reply('hello, oniichan!'));
