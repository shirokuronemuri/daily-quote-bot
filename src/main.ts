import { Bot, session } from 'grammy';
import { config } from './config';
import { conversations, createConversation } from '@grammyjs/conversations';
import { initDailyQuoteCron } from './daily-quote';
import { MyContext } from './types';
import { addQuote, addQuoteModule } from './commands/add-quote';
import { testConversation, testModule } from './commands/test';
import { startModule } from './commands/start';

const bootstrap = async () => {
  const bot = new Bot<MyContext>(config.botToken);
  initDailyQuoteCron(bot);

  bot.use(session({ initial: () => ({}) }));
  bot.use(conversations());

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'add_quote', description: 'Add new quote' },
    { command: 'test', description: 'test conversation' },
  ]);

  bot.use(createConversation(addQuote));
  bot.use(createConversation(testConversation));

  bot.use(startModule);
  bot.use(addQuoteModule);
  bot.use(testModule);

  void bot.start({ onStart: () => console.log('The bot is running, nya!') });
};

void bootstrap();
