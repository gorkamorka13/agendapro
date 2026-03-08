import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, patients, assignments, appointments, expenses, verificationTokens, workedHours, invoices, invoiceLineItems } from '@/lib/db/schema';
import type { Role } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    // Fetch all tables in parallel for speed
    const [
      allUsers, allPatients, allAssignments, allAppointments,
      allExpenses, allTokens, allWorkedHours, allInvoices, allLineItems
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(patients),
      db.select().from(assignments),
      db.select().from(appointments),
      db.select().from(expenses),
      db.select().from(verificationTokens),
      db.select().from(workedHours),
      db.select().from(invoices),
      db.select().from(invoiceLineItems),
    ]);

    // Remove sensitive data and serialize dates for edge runtime
    const safeUsers = allUsers.map(u => {
      const { hashedPassword, ...rest } = u;
      return rest;
    });

    const backupData = {
      metadata: {
        date: new Date().toISOString(),
        version: '2.0-drizzle',
        appName: 'AgendaPro',
      },
      data: {
        users: safeUsers,
        patients: allPatients,
        assignments: allAssignments,
        workedHours: allWorkedHours,
        appointments: allAppointments,
        expenses: allExpenses,
        invoices: allInvoices,
        invoiceLineItems: allLineItems,
        verificationTokens: allTokens,
      },
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `agendapro_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    return new NextResponse('Erreur lors de la génération de la sauvegarde', { status: 500 });
  }
}
