// lib/db/schema/aiUsage.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const aiUsage = pgTable('AiUsage', {
  id: serial('id').primaryKey(),
  model: text('model').notNull(),
  promptTokens: integer('promptTokens').notNull(),
  candidatesTokens: integer('candidatesTokens').notNull(),
  totalTokens: integer('totalTokens').notNull(),
  feature: text('feature').notNull().default('OCR'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});
