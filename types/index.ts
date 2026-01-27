import { User, Assignment, Patient, Appointment, AssignmentStatus, WorkedHours, Invoice } from '@prisma/client';

export type Role = 'ADMIN' | 'USER' | 'VISITEUR';

export interface UserWithMetadata extends User {
  // Add any additional fields that might be used in the UI or from custom queries
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
