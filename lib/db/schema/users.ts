// lib/db/schema/users.ts
import { pgTable, text, timestamp, real } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums';

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  name: text('name').unique(),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  phone: text('phone'),
  hashedPassword: text('hashedPassword'),
  image: text('image'),
  role: roleEnum('role').notNull().default('USER'),
  hourlyRate: real('hourlyRate'),
  travelCost: real('travelCost'),
  color: text('color').default('#3b82f6'),
  fullName: text('fullName'),
});
