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

export type CreatedAt = ColumnType<Date, string | undefined, never>;
export type UpdatedAt = ColumnType<Date, string | undefined, string>;

export interface ChatTable {
  id: number;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}
export type Chat = Selectable<ChatTable>;
export type NewChat = Insertable<ChatTable>;
export type ChatUpdate = Updateable<ChatTable>;

export interface QuoteTable {
  id: Generated<number>;
  chat_id: number;
  quote_text: string;
  source: string;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}
export type Quote = Selectable<QuoteTable>;
export type NewQuote = Insertable<QuoteTable>;
export type QuoteUpdate = Updateable<QuoteTable>;

export interface CustomMessageTable {
  id: Generated<number>;
  chat_id: number;
  custom_message: string;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}
export type CustomMessage = Selectable<CustomMessageTable>;
export type NewCustomMessage = Insertable<CustomMessageTable>;
export type CustomMessageUpdate = Updateable<CustomMessageTable>;

export interface SessionTable {
  id: Generated<number>;
  key: string;
  value: string;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}
export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;
