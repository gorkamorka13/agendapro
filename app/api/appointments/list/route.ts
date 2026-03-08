import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { appointments, users } from '@/lib/db/schema';
import { eq, or, ilike, sql, desc, count, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');
    const search = searchParams.get('search') || '';

    const conditions = [];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(appointments.subject, searchPattern),
          ilike(appointments.location, searchPattern),
          ilike(appointments.notes, searchPattern),
          ilike(users.name, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, totalResult] = await Promise.all([
      db
        .select({
          id: appointments.id,
          subject: appointments.subject,
          location: appointments.location,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          notes: appointments.notes,
          status: appointments.status,
          user: {
            name: users.name,
          },
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.userId, users.id))
        .where(whereClause)
        .orderBy(desc(appointments.startTime))
        .limit(take)
        .offset(skip),
      db
        .select({ value: count() })
        .from(appointments)
        .leftJoin(users, eq(appointments.userId, users.id))
        .where(whereClause),
    ]);

    const total = totalResult[0]?.value || 0;

    return NextResponse.json({
      appointments: results,
      total,
      hasMore: skip + results.length < total
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
