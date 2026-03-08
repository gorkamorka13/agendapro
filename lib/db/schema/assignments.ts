// lib/db/schema/assignments.ts
import { pgTable, serial, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { patients } from './patients';
import { assignmentStatusEnum } from './enums';

export const assignments = pgTable('Assignment', {
  id: serial('id').primaryKey(),
  startTime: timestamp('startTime', { mode: 'date' }).notNull(),
  endTime: timestamp('endTime', { mode: 'date' }).notNull(),
  notes: text('notes'),
  status: assignmentStatusEnum('status').notNull().default('PLANNED'),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  patientId: serial('patientId').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  isRecurring: boolean('isRecurring').notNull().default(false),
  recurrenceId: text('recurrenceId'),
}, (table) => ({
  userStartIdx: index('Assignment_userId_startTime_idx').on(table.userId, table.startTime),
  patientStartIdx: index('Assignment_patientId_startTime_idx').on(table.patientId, table.startTime),
  startEndIdx: index('Assignment_startTime_endTime_idx').on(table.startTime, table.endTime),
  statusIdx: index('Assignment_status_idx').on(table.status),
}));

export const workedHours = pgTable('WorkedHours', {
  id: serial('id').primaryKey(),
  startTime: timestamp('startTime', { mode: 'date' }).notNull(),
  endTime: timestamp('endTime', { mode: 'date' }).notNull(),
  isPaid: boolean('isPaid').notNull().default(false),
  assignmentId: serial('assignmentId').notNull().unique().references(() => assignments.id, { onDelete: 'cascade' }),
});
