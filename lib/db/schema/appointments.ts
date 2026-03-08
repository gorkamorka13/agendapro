// lib/db/schema/appointments.ts
import { pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { assignmentStatusEnum } from './enums';

export const appointments = pgTable('Appointment', {
  id: serial('id').primaryKey(),
  subject: text('subject').notNull(),
  location: text('location').notNull(),
  startTime: timestamp('startTime', { mode: 'date' }).notNull(),
  endTime: timestamp('endTime', { mode: 'date' }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().$onUpdate(() => new Date()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: assignmentStatusEnum('status').notNull().default('PLANNED'),
}, (table) => ({
  userStartIdx: index('Appointment_userId_startTime_idx').on(table.userId, table.startTime),
  startEndIdx: index('Appointment_startTime_endTime_idx').on(table.startTime, table.endTime),
}));
