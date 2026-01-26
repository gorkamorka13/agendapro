// Fichier: lib/validations/schemas.ts
import { z } from 'zod';

export const assignmentSchema = z.object({
  userId: z.string().min(1, "L'intervenant est requis"),
  patientId: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  ignoreConflict: z.boolean().optional().default(false),
});

export const appointmentSchema = z.object({
  subject: z.string().min(1, "L'objet est requis"),
  location: z.string().min(1, "Le lieu est requis"),
  userId: z.string().min(1, "L'intervenant est requis"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
