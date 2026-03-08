// Fichier: app/api/assignments/[id]/complete/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assignments, workedHours } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Role } from '@/types';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const assignmentId = parseInt(params.id, 10);
    const [existing] = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
    if (!existing) return new NextResponse('Affectation non trouvée', { status: 404 });

    const isAdmin = (session.user.role as Role) === 'ADMIN';
    const isOwner = session.user.id === existing.userId;
    if (!isAdmin && !isOwner) return new NextResponse('Accès refusé', { status: 403 });
    if (existing.status === 'COMPLETED') return new NextResponse("L'intervention est déjà validée", { status: 400 });

    // Update status
    const [updated] = await db
      .update(assignments)
      .set({ status: 'COMPLETED' })
      .where(eq(assignments.id, assignmentId))
      .returning();

    // Upsert WorkedHours
    const [existingWH] = await db
      .select({ id: workedHours.id })
      .from(workedHours)
      .where(eq(workedHours.assignmentId, assignmentId))
      .limit(1);

    if (existingWH) {
      await db
        .update(workedHours)
        .set({ startTime: updated.startTime, endTime: updated.endTime })
        .where(eq(workedHours.assignmentId, assignmentId));
    } else {
      await db.insert(workedHours).values({
        assignmentId: updated.id,
        startTime: updated.startTime,
        endTime: updated.endTime,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur validation affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
