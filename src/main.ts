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
import {
  setTimeConversation,
  setTimezoneConversation,
  settingsMenu,
  settingsModule,
} from './commands/settings';
import { randomQuoteModule } from './commands/random-quote';
import { htmlParseMode } from './util/html-parse-mode';
import { KyselyAdapter } from './util/kysely-adapter';
import { getDb } from './database/database';
import { helpModule } from './commands/help';
import { errorHandler } from './util/error-handler';

const bootstrap = async () => {
  const bot = new Bot<MyContext>(config.botToken);
  bot.catch(errorHandler);

  initDailyQuoteCron(bot);

  await bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Command explainer' },
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
      command: 'random_quote',
      description: 'Send a random quote',
    },
    {
      command: 'settings',
      description: 'Timezone, sending time and other settings you might need',
    },
    {
      command: 'cancel',
      description: 'Cancel current operation',
    },
  ]);

  const db = getDb();

  bot.use(
    session({
      storage: new KyselyAdapter(db),
      prefix: 'user:',
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
        settings: {
          lastMenuMsgId: null,
          menuFingerprint: 0,
        },
        timezoneSettings: {
          lastMenuMsgId: null,
          menuFingerprint: 0,
        },
        activeConversation: null,
      }),
    }),
  );
  bot.api.config.use(htmlParseMode);
  bot.use(
    conversations({
      storage: {
        type: 'key',
        version: 0,
        adapter: new KyselyAdapter(db),
        prefix: 'conversation:',
      },
    }),
  );
  bot.use(createConversation(addQuote));
  bot.use(createConversation(editQuote));
  bot.use(createConversation(addCustomMessage));
  bot.use(createConversation(editCustomMessage));
  bot.use(createConversation(setTimezoneConversation));
  bot.use(createConversation(setTimeConversation));

  bot.use(quotesMenu);
  bot.use(quoteDetailsMenu);
  bot.use(customMessagesMenu);
  bot.use(customMessageDetailsMenu);
  bot.use(settingsMenu);

  bot.use(startModule);
  bot.use(helpModule);
  bot.use(addQuoteModule);
  bot.use(manageQuotesModule);
  bot.use(cancelModule);
  bot.use(addCustomMessageModule);
  bot.use(manageCustomMessagesModule);
  bot.use(settingsModule);
  bot.use(randomQuoteModule);

  void bot.start({ onStart: () => console.log('The bot is running, wafu!') });
};

void bootstrap();
