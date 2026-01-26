// Fichier: app/api/assignments/[id]/replan/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role, AssignmentStatus } from '@prisma/client';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const assignmentId = parseInt(params.id, 10);
    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });

    if (!existing) return new NextResponse('Affectation non trouvée', { status: 404 });

    const isAdmin = session.user.role === Role.ADMIN;
    // Permettre l'accès si Admin ou si c'est le propriétaire de l'intervention
    const isOwner = session.user.id === existing.userId;

    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé : vous ne pouvez modifier que vos propres interventions.', { status: 403 });
    }

    const updatedAssignment = await prisma.$transaction(async (tx) => {
      // 1. Delete associated WorkedHours if they exist (just in case)
      await tx.workedHours.deleteMany({
        where: { assignmentId: assignmentId }
      });

      // 2. Update status back to PLANNED
      return await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.PLANNED },
      });
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Erreur lors de la replannification de l'affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
