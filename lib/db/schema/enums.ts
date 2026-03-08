// lib/db/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', ['USER', 'ADMIN', 'VISITEUR']);
export const assignmentStatusEnum = pgEnum('AssignmentStatus', ['PLANNED', 'COMPLETED', 'CANCELLED']);
export const invoiceStatusEnum = pgEnum('InvoiceStatus', ['DRAFT', 'SENT', 'PAID']);
