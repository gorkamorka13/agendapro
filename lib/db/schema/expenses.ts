// lib/db/schema/expenses.ts
import { pgTable, serial, text, real, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const expenses = pgTable('Expense', {
  id: serial('id').primaryKey(),
  motif: text('motif').notNull(),
  amount: real('amount').notNull(),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  recordingDate: timestamp('recordingDate', { mode: 'date' }).notNull().defaultNow(),
  receiptUrl: text('receiptUrl'),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  userDateIdx: index('Expense_userId_date_idx').on(table.userId, table.date),
  recordingDateIdx: index('Expense_recordingDate_idx').on(table.recordingDate),
  dateIdx: index('Expense_date_idx').on(table.date),
}));
