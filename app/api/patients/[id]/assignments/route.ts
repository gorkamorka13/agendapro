import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignments, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  const { id } = await params;
  const patientId = parseInt(id, 10);

  if (isNaN(patientId)) {
    return new NextResponse('ID patient invalide', { status: 400 });
  }

  try {
    // Les administrateurs peuvent tout voir, les intervenants pointent vers leurs propres assignations ?
    // Pour l'axe CRM, c'est généralement l'admin.
    // Si on veut limiter pour les intervenants :
    // const userId = session.user.id;
    // Mais pour l'historique complet d'un patient par admin :

    // Jointure pour récupérer le nom de l'intervenant
    const patientAssignments = await db.select({
      id: assignments.id,
      patientId: assignments.patientId,
      userId: assignments.userId,
      startTime: assignments.startTime,
      endTime: assignments.endTime,
      isRecurring: assignments.isRecurring,
      status: assignments.status,
      user: {
        id: users.id,
        name: users.name,
      }
    })
    .from(assignments)
    .leftJoin(users, eq(assignments.userId, users.id))
    .where(eq(assignments.patientId, patientId))
    .orderBy(desc(assignments.startTime));

    return NextResponse.json(patientAssignments);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique du patient:', error);
    return new NextResponse('Erreur Serveur', { status: 500 });
  }
}
