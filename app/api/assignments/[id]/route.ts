// Fichier: app/api/assignments/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assignments, users, patients } from '@/lib/db/schema';
import { eq, and, or, lt, gt, ne } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignmentSchema } from '@/lib/validations/schemas';
import type { Role } from '@/types';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const id = parseInt(params.id, 10);
    const [row] = await db
      .select()
      .from(assignments)
      .leftJoin(users, eq(assignments.userId, users.id))
      .leftJoin(patients, eq(assignments.patientId, patients.id))
      .where(eq(assignments.id, id))
      .limit(1);
    if (!row) return new NextResponse('Affectation non trouvée', { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const id = parseInt(params.id, 10);
    const [existing] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!existing) return new NextResponse('Affectation non trouvée', { status: 404 });

    const isOwner = session.user.id === existing.userId;
    const isAdmin = (session.user.role as Role) === 'ADMIN';

    if (existing.status === 'COMPLETED' && !isAdmin) {
      return new NextResponse('Seules les interventions planifiées peuvent être modifiées.', { status: 403 });
    }
    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé.', { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignmentSchema.safeParse(body);
    if (!validatedData.success) {
      return new NextResponse(validatedData.error.issues[0].message, { status: 400 });
    }

    const { userId, patientId, startTime, endTime, ignoreConflict, status, notes } = validatedData.data;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (!ignoreConflict) {
      const [conflict] = await db
        .select({ id: assignments.id, userId: assignments.userId })
        .from(assignments)
        .where(
          and(
            ne(assignments.id, id),
            or(
              and(eq(assignments.userId, userId), lt(assignments.startTime, end), gt(assignments.endTime, start)),
              and(eq(assignments.patientId, patientId), lt(assignments.startTime, end), gt(assignments.endTime, start))
            )
          )
        )
        .limit(1);

      if (conflict) {
        const msg = conflict.userId === userId
          ? 'Cet intervenant a déjà une intervention prévue sur ce créneau.'
          : 'Ce patient a déjà une intervention prévue sur ce créneau.';
        return new NextResponse(msg, { status: 409 });
      }
    }

    const [updated] = await db
      .update(assignments)
      .set({ userId, patientId, startTime: start, endTime: end, status, notes })
      .where(eq(assignments.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erreur de mise à jour:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const id = parseInt(params.id, 10);
    const [existing] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!existing) return new NextResponse('Affectation non trouvée', { status: 404 });

    const isOwner = session.user.id === existing.userId;
    const isAdmin = (session.user.role as Role) === 'ADMIN';

    if (existing.status === 'COMPLETED' && !isAdmin) {
      return new NextResponse('Seules les interventions planifiées peuvent être supprimées.', { status: 403 });
    }
    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé.', { status: 403 });
    }

    await db.delete(assignments).where(eq(assignments.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erreur de suppression:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
