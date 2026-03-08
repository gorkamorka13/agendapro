// lib/db/schema/auth.ts
// NextAuth.js required tables: Account, Session, VerificationToken
import { pgTable, text, timestamp, integer, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';

export const accounts = pgTable('Account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: varchar('provider', { length: 100 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 100 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('Session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('VerificationToken', {
  identifier: varchar('identifier', { length: 100 }).notNull(),
  token: varchar('token', { length: 100 }).notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}));
