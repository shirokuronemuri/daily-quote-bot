import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

export interface Database {
  chats: ChatTable;
  quotes: QuoteTable;
  custom_messages: CustomMessageTable;
  session: SessionTable;
}

export interface ChatTable {
  id: number;
}
export type Chat = Selectable<ChatTable>;
export type NewChat = Insertable<ChatTable>;
export type ChatUpdate = Updateable<ChatTable>;

export interface QuoteTable {
  id: Generated<number>;
  chat_id: number;
  quote_text: string;
  source: string;
}
export type Quote = Selectable<QuoteTable>;
export type NewQuote = Insertable<QuoteTable>;
export type QuoteUpdate = Updateable<QuoteTable>;

export interface CustomMessageTable {
  id: Generated<number>;
  chat_id: number;
  custom_message: string;
}
export type CustomMessage = Selectable<CustomMessageTable>;
export type NewCustomMessage = Insertable<CustomMessageTable>;
export type CustomMessageUpdate = Updateable<CustomMessageTable>;

export interface SessionTable {
  id: Generated<number>;
  key: string;
  value: string;
}
export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;
