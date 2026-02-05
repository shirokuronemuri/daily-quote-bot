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
  customMessages: CustomMessageTable;
  session: SessionTable;
}

export type Defaultable<T> = ColumnType<T, T | undefined, T>;
export type CreatedAt = ColumnType<string, string | undefined, never>;
export type UpdatedAt = Defaultable<string>;

export interface ChatTable {
  id: number;
  sendDailyQuote: Defaultable<boolean>;
  sendTime: Defaultable<string>;
  ianaTimezone: Defaultable<string>;
  dailyOffset: Defaultable<string>;
  lastSentDate: string | null;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}
export type Chat = Selectable<ChatTable>;
export type NewChat = Insertable<ChatTable>;
export type ChatUpdate = Updateable<ChatTable>;

export interface QuoteTable {
  id: Generated<number>;
  chatId: number;
  quoteText: string;
  source: string;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}
export type Quote = Selectable<QuoteTable>;
export type NewQuote = Insertable<QuoteTable>;
export type QuoteUpdate = Updateable<QuoteTable>;

export interface CustomMessageTable {
  id: Generated<number>;
  chatId: number;
  text: string;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}
export type CustomMessage = Selectable<CustomMessageTable>;
export type NewCustomMessage = Insertable<CustomMessageTable>;
export type CustomMessageUpdate = Updateable<CustomMessageTable>;

export interface SessionTable {
  id: Generated<number>;
  key: string;
  value: string;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}
export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;
