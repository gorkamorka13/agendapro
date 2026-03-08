import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignments, users, patients } from '@/lib/db/schema';
import { eq, lt, gt, and, or, ne } from 'drizzle-orm';
import { assignmentSchema } from '@/lib/validations/schemas';
import type { Role, FullCalendarEvent } from '@/types';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const rangeStart = startDate ? new Date(startDate) : defaultStart;
    const rangeEnd = endDate ? new Date(endDate) : defaultEnd;

    // Single join query — avoids N+1 (Cloudflare Edge safe)
    const rows = await db
      .select({
        id: assignments.id,
        startTime: assignments.startTime,
        endTime: assignments.endTime,
        status: assignments.status,
        isRecurring: assignments.isRecurring,
        userId: assignments.userId,
        patientId: assignments.patientId,
        workerName: users.name,
        workerColor: users.color,
        patientFirst: patients.firstName,
        patientLast: patients.lastName,
        patientAddress: patients.address,
      })
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(patients, eq(assignments.patientId, patients.id))
      .where(
        and(
          lt(assignments.startTime, rangeEnd),
          gt(assignments.endTime, rangeStart)
        )
      )
      .orderBy(assignments.startTime);

    const getUserColor = (id: string) => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
      const c = (hash & 0x00ffffff).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const formattedEvents: FullCalendarEvent[] = rows.map((r) => {
      const bg = r.workerColor || getUserColor(r.userId);
      const patientName = `${r.patientFirst ?? ''} ${r.patientLast ?? ''}`.trim();
      return {
        id: r.id.toString(),
        title: r.workerName || 'Inc.',
        start: r.startTime,
        end: r.endTime,
        backgroundColor: bg,
        borderColor: bg,
        extendedProps: {
          type: 'ASSIGNMENT',
          userId: r.userId,
          patientId: r.patientId,
          workerName: r.workerName,
          patientName,
          location: r.patientAddress ?? '',
          status: r.status,
          isRecurring: r.isRecurring,
        },
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Erreur récupération affectations:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const body = await request.json();
    const validatedData = assignmentSchema.safeParse(body);
    if (!validatedData.success) {
      return new NextResponse(validatedData.error.issues[0].message, { status: 400 });
    }

    if ((session.user.role as Role) === 'VISITEUR') {
      return new NextResponse('Accès refusé', { status: 403 });
    }

    const {
      userId, patientId, startTime, endTime,
      ignoreConflict, isRecurring, frequency, interval, recurringEndDate,
    } = validatedData.data;
    const isAdmin = (session.user.role as Role) === 'ADMIN';

    if (!isAdmin) {
      if (userId !== session.user.id) {
        return new NextResponse('Accès refusé : interventions uniquement pour vous-même.', { status: 403 });
      }
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const start = new Date(startTime); start.setHours(0, 0, 0, 0);
      if (start < now) {
        return new NextResponse("Accès refusé : pas d'interventions dans le passé.", { status: 403 });
      }
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const occurrences: { startTime: Date; endTime: Date }[] = [];
    if (isRecurring && frequency && recurringEndDate) {
      const endLimit = new Date(recurringEndDate);
      const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
      const finalLimit = endLimit < maxDate ? endLimit : maxDate;
      let cur = new Date(start);
      const duration = end.getTime() - start.getTime();
      while (cur <= finalLimit) {
        occurrences.push({ startTime: new Date(cur), endTime: new Date(cur.getTime() + duration) });
        if (frequency === 'DAILY') cur.setDate(cur.getDate() + (interval || 1));
        else if (frequency === 'WEEKLY') cur.setDate(cur.getDate() + 7 * (interval || 1));
        else if (frequency === 'MONTHLY') cur.setMonth(cur.getMonth() + (interval || 1));
      }
    } else {
      occurrences.push({ startTime: start, endTime: end });
    }

    if (!ignoreConflict) {
      for (const occ of occurrences) {
        const [conflict] = await db
          .select({ id: assignments.id, userId: assignments.userId })
          .from(assignments)
          .where(
            or(
              and(eq(assignments.userId, userId), lt(assignments.startTime, occ.endTime), gt(assignments.endTime, occ.startTime)),
              and(eq(assignments.patientId, patientId), lt(assignments.startTime, occ.endTime), gt(assignments.endTime, occ.startTime))
            )
          )
          .limit(1);

        if (conflict) {
          const occDate = occ.startTime.toLocaleDateString('fr-FR');
          const msg = conflict.userId === userId
            ? `Conflit (Intervenant) le ${occDate}.`
            : `Conflit (Patient) le ${occDate}.`;
          return new NextResponse(msg, { status: 409 });
        }
      }
    }

    const recurrenceId = isRecurring
      ? `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      : null;

    const inserted = await db
      .insert(assignments)
      .values(occurrences.map((occ) => ({ userId, patientId, ...occ, isRecurring: !!isRecurring, recurrenceId })))
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Erreur création affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
