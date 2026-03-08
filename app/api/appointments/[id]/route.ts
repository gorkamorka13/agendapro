import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { appointments, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const [row] = await db
      .select()
      .from(appointments)
      .leftJoin(users, eq(appointments.userId, users.id))
      .where(eq(appointments.id, id))
      .limit(1);

    if (!row) return new NextResponse('Rendez-vous non trouvé', { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const { subject, location, userId, startTime, endTime, notes, status } = await request.json();

    const [updated] = await db
      .update(appointments)
      .set({
        subject, location, userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes, status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const [existing] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!existing) return new NextResponse('Rendez-vous non trouvé', { status: 404 });
    await db.delete(appointments).where(eq(appointments.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
