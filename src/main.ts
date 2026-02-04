import { Bot, session } from 'grammy';
import { config } from './config';
import { conversations, createConversation } from '@grammyjs/conversations';
import { initDailyQuoteCron } from './daily-quote';
import { MyContext } from './types';
import { addQuote, addQuoteModule } from './commands/add-quote';
import { startModule } from './commands/start';
import {
  editQuote,
  manageQuotesModule,
  quoteDetailsMenu,
  quotesMenu,
} from './commands/manage-quotes';
import { cancelModule } from './commands/cancel';
import {
  addCustomMessage,
  addCustomMessageModule,
} from './commands/add-custom-message';
import {
  customMessageDetailsMenu,
  customMessagesMenu,
  editCustomMessage,
  manageCustomMessagesModule,
} from './commands/manage-custom-messages';

const bootstrap = async () => {
  const bot = new Bot<MyContext>(config.botToken);
  initDailyQuoteCron(bot);

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'add_quote', description: 'Add new quote' },
    {
      command: 'manage_quotes',
      description: 'View, edit or delete your quotes',
    },
    {
      command: 'add_custom_message',
      description: 'Add custom message that is displayed before the quote',
    },
    {
      command: 'manage_custom_messages',
      description: 'View, edit or delete your custom messages',
    },
    {
      command: 'cancel',
      description: 'Cancel current add/edit operation',
    },
  ]);

  bot.use(
    session({
      initial: () => ({
        quotes: {
          lastMenuMsgId: null,
          selectedId: null,
          menuFingerprint: 0,
          page: 0,
          totalCount: 0,
        },
        customMessages: {
          lastMenuMsgId: null,
          selectedId: null,
          menuFingerprint: 0,
          page: 0,
          totalCount: 0,
        },
        activeConversation: null,
      }),
    }),
  );
  bot.use(conversations());
  bot.use(createConversation(addQuote));
  bot.use(createConversation(editQuote));
  bot.use(createConversation(addCustomMessage));
  bot.use(createConversation(editCustomMessage));

  bot.use(quotesMenu);
  bot.use(quoteDetailsMenu);
  bot.use(customMessagesMenu);
  bot.use(customMessageDetailsMenu);

  bot.use(startModule);
  bot.use(addQuoteModule);
  bot.use(manageQuotesModule);
  bot.use(cancelModule);
  bot.use(addCustomMessageModule);
  bot.use(manageCustomMessagesModule);

  void bot.start({ onStart: () => console.log('The bot is running, wafu!') });
};

void bootstrap();
