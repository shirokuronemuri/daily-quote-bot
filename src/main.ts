import { Bot, session } from 'grammy';
import { config } from './config';
import { conversations, createConversation } from '@grammyjs/conversations';
import { initDailyQuoteCron } from './daily-quote';
import { MyContext } from './types';
import { addQuote, addQuoteModule } from './commands/add-quote';
import { testConversation, testModule } from './commands/test';
import { startModule } from './commands/start';
import {
  editQuote,
  manageQuotesModule,
  quoteDetailsMenu,
  quotesMenu,
} from './commands/manage-quotes';
import { cancelModule } from './commands/cancel';

const bootstrap = async () => {
  const bot = new Bot<MyContext>(config.botToken);
  initDailyQuoteCron(bot);

  bot.use(
    session({
      initial: () => ({
        quotePage: 0,
        quoteCount: 0,
        selectedQuoteId: null,
        lastQuoteMenuMessageId: null,
        menuFingerprint: 0,
      }),
    }),
  );
  bot.use(conversations());
  bot.use(createConversation(addQuote));
  bot.use(createConversation(editQuote));
  bot.use(createConversation(testConversation));

  bot.use(quotesMenu);
  bot.use(quoteDetailsMenu);

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'add_quote', description: 'Add new quote' },
    { command: 'test', description: 'Test conversation' },
    {
      command: 'manage_quotes',
      description: 'View, edit or delete your quotes',
    },
    {
      command: 'cancel',
      description: 'Cancel creating/editing the quote',
    },
  ]);

  bot.use(startModule);
  bot.use(addQuoteModule);
  bot.use(testModule);
  bot.use(manageQuotesModule);
  bot.use(cancelModule);

  void bot.start({ onStart: () => console.log('The bot is running, nya!') });
};

void bootstrap();
