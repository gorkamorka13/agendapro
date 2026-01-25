// Fichier: app/api/assignments/[id]/complete/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role, AssignmentStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const assignmentId = parseInt(params.id, 10);
    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });

    if (!existing) return new NextResponse('Affectation non trouvée', { status: 404 });

    const isAdmin = session.user.role === Role.ADMIN;
    const isOwner = session.user.id === existing.userId;

    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé', { status: 403 });
    }

    if (existing.status === AssignmentStatus.COMPLETED) {
      return new NextResponse('L\'intervention est déjà validée', { status: 400 });
    }

    // Utiliser une transaction pour assurer la cohérence des données
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de l'affectation
      const updatedAssignment = await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.COMPLETED },
      });

      // 2. Créer l'entrée correspondante dans WorkedHours
      await tx.workedHours.create({
        data: {
          assignmentId: updatedAssignment.id,
          startTime: updatedAssignment.startTime,
          endTime: updatedAssignment.endTime,
        },
      });

      return updatedAssignment;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la validation de l'affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
