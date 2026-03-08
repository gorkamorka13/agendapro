import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { workedHours, assignments, expenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse('Non authentifié', { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    const isAdmin = (session.user.role as Role) === 'ADMIN';
    const effectiveUserId = !isAdmin ? session.user.id : (userId && userId !== 'all' ? userId : null);

    // Batch all queries in parallel
    let whQuery = db.select({ startTime: workedHours.startTime })
      .from(workedHours)
      .leftJoin(assignments, eq(workedHours.assignmentId, assignments.id)) as any;

    if (effectiveUserId) {
      whQuery = whQuery.where(eq(assignments.userId, effectiveUserId));
    }

    let aQuery = db.select({ startTime: assignments.startTime }).from(assignments) as any;
    if (effectiveUserId) aQuery = aQuery.where(eq(assignments.userId, effectiveUserId));

    let eQuery = db.select({ recordingDate: expenses.recordingDate }).from(expenses) as any;
    if (effectiveUserId) eQuery = eQuery.where(eq(expenses.userId, effectiveUserId));

    const [wh, asgn, exp] = await Promise.all([whQuery, aQuery, eQuery]);

    const activeMonthsSet = new Set<string>();
    const addToSet = (date: Date) => activeMonthsSet.add(`${date.getFullYear()}-${date.getMonth()}`);

    wh.forEach((r: any) => addToSet(new Date(r.startTime)));
    asgn.forEach((r: any) => addToSet(new Date(r.startTime)));
    exp.forEach((r: any) => addToSet(new Date(r.recordingDate)));

    const activeMonths = Array.from(activeMonthsSet).map(s => {
      const [year, month] = s.split('-').map(Number);
      return { year, month };
    });

    return NextResponse.json(activeMonths);
  } catch (error) {
    console.error('Erreur mois actifs:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
