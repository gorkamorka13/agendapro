import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignments, appointments } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Role } from '@/types';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { items, action, targetUserId } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new NextResponse('Aucun élément sélectionné', { status: 400 });
    }
    if (!['delete', 'cancel', 'complete', 'reassign'].includes(action)) {
      return new NextResponse('Action invalide', { status: 400 });
    }

    const assignmentIds = items
      .filter((i: any) => i.type === 'ASSIGNMENT')
      .map((i: any) => parseInt(i.id, 10));

    const appointmentIds = items
      .filter((i: any) => i.type === 'APPOINTMENT')
      .map((i: any) => parseInt(i.id.toString().replace('apt-', ''), 10));

    if (action === 'delete') {
      if (assignmentIds.length > 0) await db.delete(assignments).where(inArray(assignments.id, assignmentIds));
      if (appointmentIds.length > 0) await db.delete(appointments).where(inArray(appointments.id, appointmentIds));
    } else if (action === 'cancel') {
      if (assignmentIds.length > 0) await db.update(assignments).set({ status: 'CANCELLED' }).where(inArray(assignments.id, assignmentIds));
      if (appointmentIds.length > 0) await db.update(appointments).set({ status: 'CANCELLED' }).where(inArray(appointments.id, appointmentIds));
    } else if (action === 'complete') {
      if (assignmentIds.length > 0) await db.update(assignments).set({ status: 'COMPLETED' }).where(inArray(assignments.id, assignmentIds));
      if (appointmentIds.length > 0) await db.update(appointments).set({ status: 'COMPLETED' }).where(inArray(appointments.id, appointmentIds));
    } else if (action === 'reassign') {
      if (!targetUserId) return new NextResponse('targetUserId requis', { status: 400 });
      if (assignmentIds.length > 0) await db.update(assignments).set({ userId: targetUserId }).where(inArray(assignments.id, assignmentIds));
      if (appointmentIds.length > 0) await db.update(appointments).set({ userId: targetUserId }).where(inArray(appointments.id, appointmentIds));
    }

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    console.error("Erreur action groupée:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
