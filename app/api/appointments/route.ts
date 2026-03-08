import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { appointments, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const rows = await db
      .select({
        id: appointments.id,
        subject: appointments.subject,
        location: appointments.location,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        notes: appointments.notes,
        status: appointments.status,
        userId: appointments.userId,
        userName: users.name,
        userColor: users.color,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.userId, users.id))
      .orderBy(asc(appointments.startTime));

    const getUserColor = (id: string) => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
      const c = (hash & 0x00ffffff).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const formatted = rows.map((apt) => {
      const bg = apt.userColor || getUserColor(apt.userId);
      return {
        id: `apt-${apt.id}`,
        title: `RDV: ${apt.subject}`,
        start: apt.startTime,
        end: apt.endTime,
        backgroundColor: bg,
        borderColor: bg,
        extendedProps: {
          type: 'APPOINTMENT',
          userId: apt.userId,
          subject: apt.subject,
          location: apt.location,
          workerName: apt.userName,
          notes: apt.notes,
          status: apt.status,
        },
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erreur récupération rendez-vous:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { subject, location, userId, startTime, endTime, notes, status } = await request.json();
    if (!subject || !location || !userId || !startTime || !endTime) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        subject,
        location,
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes,
        status: status || 'PLANNED',
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Erreur création rendez-vous:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
