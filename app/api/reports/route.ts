// Fichier: app/api/reports/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignments, appointments, expenses, users, patients, workedHours } from '@/lib/db/schema';
import { eq, gte, lt, ne, and, or, inArray } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!session?.user) return new NextResponse('Non authentifié', { status: 401 });

  if ((session.user.role as Role) !== 'ADMIN' && session.user.id !== userId || (session.user.role as Role) === 'VISITEUR') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  const month = searchParams.get('month');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!userId) return new NextResponse('Utilisateur manquant', { status: 400 });

  let startDate: Date, endDate: Date;
  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr); startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endDateStr); endDate.setHours(23, 59, 59, 999);
  } else if (month) {
    startDate = new Date(`${month}-01T00:00:00.000Z`);
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
  } else {
    return new NextResponse('Paramètres de période manquants', { status: 400 });
  }

  try {
    // Batch query: all assignments with joins (single query instead of N+1)
    const allRows = await db
      .select({
        id: assignments.id,
        startTime: assignments.startTime,
        endTime: assignments.endTime,
        status: assignments.status,
        userId: assignments.userId,
        patientId: assignments.patientId,
        patientFirst: patients.firstName,
        patientLast: patients.lastName,
        workerName: users.name,
        hourlyRate: users.hourlyRate,
        travelCost: users.travelCost,
        workedHoursId: workedHours.id,
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(patients, eq(assignments.patientId, patients.id))
      .leftJoin(workedHours, eq(workedHours.assignmentId, assignments.id))
      .where(and(gte(assignments.startTime, startDate), lt(assignments.startTime, endDate), ne(assignments.status, 'CANCELLED')));

    const filteredRows = userId === 'all' ? allRows : allRows.filter(r => r.userId === userId);

    let realizedTotalMinutes = 0, realizedTotalPay = 0, realizedTotalTravelCost = 0;
    let plannedTotalMinutes = 0, plannedTotalPay = 0, plannedTotalTravelCost = 0;
    const chartDataMap: Record<string, number> = {};
    const distributionDataMap: Record<string, number> = {};
    const teamDistributionDataMap: Record<string, number> = {};

    const now = new Date();
    const detailedEntries = filteredRows.map(r => {
      const start = r.startTime, end = r.endTime;
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;
      const isRealized = r.status === 'COMPLETED' || !!r.workedHoursId || end < now;
      const hourlyRate = r.hourlyRate || 0, travelCost = r.travelCost || 0;
      const pay = ((durationMinutes / 60) * hourlyRate) + travelCost;

      if (isRealized) { realizedTotalMinutes += durationMinutes; realizedTotalPay += pay; realizedTotalTravelCost += travelCost; }
      else { plannedTotalMinutes += durationMinutes; plannedTotalPay += pay; plannedTotalTravelCost += travelCost; }

      const dayKey = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      chartDataMap[dayKey] = (chartDataMap[dayKey] || 0) + (durationMinutes / 60);
      const distKey = userId === 'all' ? (r.workerName || 'Inconnu') : `${r.patientFirst ?? ''} ${r.patientLast ?? ''}`.trim();
      distributionDataMap[distKey] = (distributionDataMap[distKey] || 0) + (durationMinutes / 60);

      return {
        date: start.toLocaleDateString('fr-FR'),
        patient: `${r.patientFirst ?? ''} ${r.patientLast ?? ''}`.trim(),
        worker: r.workerName || 'Inconnu',
        startTime: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: (durationMinutes / 60).toFixed(2),
        pay: pay.toFixed(2),
        status: r.status,
        isRealized,
      };
    });

    allRows.forEach(r => {
      const durationHours = (r.endTime.getTime() - r.startTime.getTime()) / 3600000;
      teamDistributionDataMap[r.workerName || 'Inconnu'] = (teamDistributionDataMap[r.workerName || 'Inconnu'] || 0) + durationHours;
    });

    // Appointments with join
    const aptFilter = userId !== 'all'
      ? and(gte(appointments.startTime, startDate), lt(appointments.startTime, endDate), ne(appointments.status, 'CANCELLED'), eq(appointments.userId, userId))
      : and(gte(appointments.startTime, startDate), lt(appointments.startTime, endDate), ne(appointments.status, 'CANCELLED'));

    const aptRows = await db
      .select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status, subject: appointments.subject, location: appointments.location, workerName: users.name })
      .from(appointments)
      .leftJoin(users, eq(appointments.userId, users.id))
      .where(aptFilter)
      .orderBy(appointments.startTime);

    const appointmentEntries = aptRows.map(apt => {
      const start = apt.startTime, end = apt.endTime;
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;
      const isRealized = apt.status === 'COMPLETED' || end < now;
      if (isRealized) realizedTotalMinutes += durationMinutes; else plannedTotalMinutes += durationMinutes;
      const dayKey = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      chartDataMap[dayKey] = (chartDataMap[dayKey] || 0) + (durationMinutes / 60);
      return {
        id: apt.id, date: start.toLocaleDateString('fr-FR'), subject: apt.subject, location: apt.location,
        worker: apt.workerName || 'Inconnu',
        startTime: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: (durationMinutes / 60).toFixed(2), status: apt.status, isRealized,
      };
    });

    // Expenses
    const expFilter = userId !== 'all'
      ? and(gte(expenses.recordingDate, startDate), lt(expenses.recordingDate, endDate), eq(expenses.userId, userId))
      : and(gte(expenses.recordingDate, startDate), lt(expenses.recordingDate, endDate));

    const expRows = await db.select().from(expenses).leftJoin(users, eq(expenses.userId, users.id)).where(expFilter).orderBy(expenses.recordingDate);
    const totalExpenses = expRows.reduce((sum, r) => sum + (r.Expense.amount || 0), 0);

    const chartData = Object.entries(chartDataMap).map(([day, hours]) => ({ day, hours: parseFloat(hours.toFixed(2)) }));
    const distributionData = Object.entries(distributionDataMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    const teamDistributionData = Object.entries(teamDistributionDataMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

    // Serialize dates for Cloudflare Edge
    const expensesForClient = expRows.map(r => ({
      ...r.Expense,
      date: r.Expense.date.toISOString(),
      recordingDate: r.Expense.recordingDate.toISOString(),
      userName: r.User?.name,
    }));

    return NextResponse.json({
      workedHours: detailedEntries,
      appointments: appointmentEntries,
      chartData, dailySummaries: [],
      distributionData, teamDistributionData,
      expenses: expensesForClient,
      summary: {
        realizedHours: realizedTotalMinutes / 60, realizedPay: realizedTotalPay, realizedTravelCost: realizedTotalTravelCost,
        plannedHours: plannedTotalMinutes / 60, plannedPay: plannedTotalPay, plannedTravelCost: plannedTotalTravelCost,
        totalExpenses, totalPay: realizedTotalPay, totalHours: realizedTotalMinutes / 60, expectedPay: plannedTotalPay,
      },
    });
  } catch (error) {
    console.error('Erreur rapport:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
