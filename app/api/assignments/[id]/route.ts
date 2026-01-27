// Fichier: app/api/assignments/[id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { assignmentSchema } from '@/lib/validations/schemas';

// --- FONCTION PUT (pour Mettre à Jour une affectation) ---
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const isCompleted = existing.status === 'COMPLETED';

    if (isCompleted && !isAdmin) {
      return new NextResponse('Accès refusé : seules les interventions planifiées peuvent être modifiées par un utilisateur.', { status: 403 });
    }

    if (!isAdmin && !isOwner) {
      return new NextResponse('Accès refusé : vous ne pouvez modifier que vos propres interventions', { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignmentSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(validatedData.error.issues[0].message, { status: 400 });
    }

    const { userId, patientId, startTime, endTime, ignoreConflict } = validatedData.data;

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Vérifier les chevauchements pour cet intervenant OU ce patient (sauf si ignorer est coché)
    if (!ignoreConflict) {
      const conflict = await prisma.assignment.findFirst({
        where: {
          id: { not: id },
          OR: [
            {
              userId: userId,
              startTime: { lt: end },
              endTime: { gt: start },
            },
            {
              patientId: patientId,
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (conflict) {
        const isWorkerConflict = conflict.userId === userId;
        const msg = isWorkerConflict
          ? 'Cet intervenant a déjà une intervention prévue sur ce créneau.'
          : 'Ce patient a déjà une intervention prévue sur ce créneau.';
        return new NextResponse(msg, { status: 409 });
      }
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        userId,
        patientId: patientId,
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
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const isCompleted = existing.status === 'COMPLETED';

    if (isCompleted && !isAdmin) {
      return new NextResponse('Accès refusé : seules les interventions planifiées peuvent être supprimées par un utilisateur.', { status: 403 });
    }

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

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        user: true,
        patient: true,
      }
    });
    if (!assignment) {
      return new NextResponse('Affectation non trouvée', { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
