import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';

export type SessionData = {
  quotes: {
    page: number;
    totalCount: number;
    selectedId: number | null;
    lastMenuMsgId: number | null;
    menuFingerprint: number;
  };
  customMessages: {
    page: number;
    totalCount: number;
    selectedId: number | null;
    lastMenuMsgId: number | null;
    menuFingerprint: number;
  };
  settings: {
    lastMenuMsgId: number | null;
    menuFingerprint: number;
  };
  activeConversation: string | null;
};

export type MyContext = ConversationFlavor<
  Context & SessionFlavor<SessionData>
>;

export type ConversationContext = Context;

export type MyConversation = Conversation<MyContext, ConversationContext>;
