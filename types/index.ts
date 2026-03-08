import type {
  users,
  assignments,
  patients,
  appointments,
  workedHours,
  invoices,
} from '@/lib/db/schema';

// Base types derived from Drizzle schema (single source of truth)
export type User = typeof users.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WorkedHours = typeof workedHours.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;

export type Role = 'ADMIN' | 'USER' | 'VISITEUR';
export type AssignmentStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';

export interface UserWithMetadata extends User {
  _count?: {
    assignments: number;
    appointments: number;
    expenses: number;
  };
}

export interface AssignmentWithPatient extends Assignment {
  patient: Patient;
  user: User;
  workedHours?: WorkedHours | null;
}

export interface AppointmentWithUser extends Appointment {
  user: User;
}

export interface FullCalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    type: 'ASSIGNMENT' | 'APPOINTMENT';
    userId: string;
    patientId?: number;
    workerName?: string | null;
    patientName?: string;
    status: AssignmentStatus;
    subject?: string;
    location?: string;
    notes?: string | null;
    isRecurring?: boolean;
  };
}

export interface AssignmentUpdateData {
  startTime?: string;
  endTime?: string;
  userId?: string;
  patientId?: number;
  ignoreConflict?: boolean;
}

export interface AppointmentUpdateData {
  startTime?: string;
  endTime?: string;
  userId?: string;
  subject?: string;
  location?: string;
  notes?: string | null;
  status?: AssignmentStatus;
}
