// Fichier: app/api/assignments/[id]/replan/route.ts
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
    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé.', { status: 403 });
    }

    await db.delete(workedHours).where(eq(workedHours.assignmentId, assignmentId));
    const [updated] = await db
      .update(assignments)
      .set({ status: 'PLANNED' })
      .where(eq(assignments.id, assignmentId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur replan:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
