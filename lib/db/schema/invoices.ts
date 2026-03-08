// lib/db/schema/invoices.ts
import { pgTable, serial, text, real, timestamp } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { invoiceStatusEnum } from './enums';

export const invoices = pgTable('Invoice', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoiceNumber').notNull().unique(),
  issueDate: timestamp('issueDate', { mode: 'date' }).notNull(),
  dueDate: timestamp('dueDate', { mode: 'date' }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  totalAmount: real('totalAmount').notNull(),
  patientId: serial('patientId').notNull().references(() => patients.id, { onDelete: 'cascade' }),
});

export const invoiceLineItems = pgTable('InvoiceLineItem', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unitPrice').notNull(),
  total: real('total').notNull(),
  invoiceId: serial('invoiceId').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
});
