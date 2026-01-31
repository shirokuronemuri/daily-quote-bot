import { Bot, type Context } from 'grammy';
import { config } from './config';
import { getDb } from './database/database';
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from '@grammyjs/conversations';

const bootstrap = () => {
  const db = getDb();

  const bot = new Bot<ConversationFlavor<Context>>(config.botToken);

  bot.use(conversations());

  const addQuote = async (conversation: Conversation, ctx: Context) => {
    await ctx.reply('Enter new quote:');
    ctx = await conversation.wait();
    if (ctx.message?.text?.startsWith('/')) {
      return await conversation.halt({ next: true });
    }
    const quote = ctx.message?.text;

    await ctx.reply('Enter the quote source:');
    ctx = await conversation.wait();
    if (ctx.message?.text?.startsWith('/')) {
      return await conversation.halt({ next: true });
    }
    const source = ctx.message?.text;
    await ctx.reply(`Your new quote:\n ${quote}\n\nSource: ${source}`);
  };
  bot.use(createConversation(addQuote));

  const waitText = async (conversation: Conversation) => {
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

  const testConversation = async (conversation: Conversation, ctx: Context) => {
    await ctx.reply('oniichan!');
    ctx = await waitText(conversation);
    await ctx.reply('I see, I see!');
  };
  bot.use(createConversation(testConversation));

  bot.command('start', (ctx) => ctx.reply('hello, oniichan!'));
  bot.command('create_quote', async (ctx) => {
    await ctx.conversation.enter('addQuote');
  });
  bot.command('test', async (ctx) => {
    await ctx.conversation.enter('testConversation');
  });

  void bot.start({ onStart: () => console.log('The bot is running, nya!') });
};

void bootstrap();
