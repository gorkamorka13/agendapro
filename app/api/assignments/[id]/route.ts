// Fichier: app/api/assignments/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

// --- FONCTION PUT (pour Mettre à Jour une affectation) ---
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) {
      return new NextResponse('Affectation non trouvée', { status: 404 });
    }

    const isOwner = session.user.id === existing.userId;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé : vous ne pouvez modifier que vos propres interventions', { status: 403 });
    }

    const body = await request.json();
    const { userId, patientId, startTime, endTime } = body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Vérifier les chevauchements pour l'intervenant cible (en excluant l'affectation actuelle)
    const conflict = await prisma.assignment.findFirst({
      where: {
        userId: userId,
        id: { not: id },
        OR: [
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gt: start } },
            ],
          },
        ],
      },
    });

    if (conflict) {
      return new NextResponse('Cet intervenant a déjà une intervention prévue sur ce créneau horaire.', { status: 409 });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        userId,
        patientId: parseInt(patientId, 10),
        startTime: start,
        endTime: end,
      },
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Erreur de mise à jour:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

// --- FONCTION DELETE (pour Supprimer une affectation) ---
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) {
      return new NextResponse('Affectation non trouvée', { status: 404 });
    }

    const isOwner = session.user.id === existing.userId;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé : vous ne pouvez supprimer que vos propres interventions', { status: 403 });
    }

    await prisma.assignment.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 }); // 204 = Succès, pas de contenu
  } catch (error) {
    console.error("Erreur de suppression:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) {
      return new NextResponse('Affectation non trouvée', { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
