import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';

export type SessionData = {
  quotePage: number;
  quoteCount: number;
  selectedQuoteId: number | null;
  lastQuoteMenuMessageId: number | null;
  menuFingerprint: number;
};

export type MyContext = ConversationFlavor<
  Context & SessionFlavor<SessionData>
>;

export type ConversationContext = Context;

export type MyConversation = Conversation<MyContext, ConversationContext>;
