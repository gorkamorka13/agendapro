// lib/db/schema/patients.ts
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const patients = pgTable('Patient', {
  id: serial('id').primaryKey(),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  address: text('address').notNull(),
  contactInfo: text('contactInfo'),
});
