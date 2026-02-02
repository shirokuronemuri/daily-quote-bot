import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';

export type SessionData = {
  a: string;
};

export type MyContext = ConversationFlavor<
  Context & SessionFlavor<SessionData>
>;

export type ConversationContext = Context;

export type MyConversation = Conversation<MyContext, ConversationContext>;
