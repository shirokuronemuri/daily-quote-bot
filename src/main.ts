import { Bot, type Context } from 'grammy';
import { config } from './config';
import { getDb } from './database/database';
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from '@grammyjs/conversations';

const bootstrap = async () => {
  const db = getDb();

  const bot = new Bot<ConversationFlavor<Context>>(config.botToken);

  bot.use(conversations());

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'add_quote', description: 'Add new quote' },
    { command: 'test', description: 'test conversation' },
  ]);

  const addQuote = async (conversation: Conversation, ctx: Context) => {
    await ctx.reply('Enter new quote:');
    const quoteCtx = await waitText(conversation);
    await quoteCtx.reply('Enter the quote source:');
    const sourceCtx = await waitText(conversation);

    const chatId = sourceCtx.chat.id;
    await conversation.external(() =>
      db
        .insertInto('chats')
        .values({ id: chatId })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute(),
    );
    await conversation.external(() =>
      db
        .insertInto('quotes')
        .values({
          quoteText: quoteCtx.msg.text,
          source: sourceCtx.msg.text,
          chatId,
        })
        .execute(),
    );

    await ctx.reply("I've written down your quote!");
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
  bot.command('add_quote', async (ctx) => {
    await ctx.conversation.enter('addQuote');
  });
  bot.command('test', async (ctx) => {
    await ctx.conversation.enter('testConversation');
  });

  void bot.start({ onStart: () => console.log('The bot is running, nya!') });
};

void bootstrap();
