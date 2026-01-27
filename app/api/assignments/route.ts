import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AssignmentStatus } from '@prisma/client';
import { assignmentSchema } from '@/lib/validations/schemas';
import { FullCalendarEvent, Role as AppRole } from '@/types';

/**
 * GET /api/assignments
 * Récupère les affectations en fonction du rôle de l'utilisateur.
 * - ADMIN: voit toutes les affectations.
 * - USER: ne voit que ses propres affectations.
 * Formate les données pour FullCalendar.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    // Tous les utilisateurs voient désormais l'ensemble des affectations
    const whereClause = {};

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        patient: true,
        user: true,
      },
    });

    const patientCount = await prisma.patient.count();
    const hidePatientLabel = patientCount === 1;

    // Fonction déterministe pour générer une couleur à partir de l'ID utilisateur
    const getUserColor = (id: string) => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    // Formater les données pour être compatibles avec FullCalendar
    const formattedEvents: FullCalendarEvent[] = assignments.map((assignment) => {
      let backgroundColor = assignment.user.color || getUserColor(assignment.userId);

      if (assignment.status === AssignmentStatus.COMPLETED) {
        // Optionnel : On peut garder le vert pour le complété ou mixer avec la couleur
      }

      const start = new Date(assignment.startTime);
      const end = new Date(assignment.endTime);

      const patientName = `${assignment.patient.firstName} ${assignment.patient.lastName}`;
      const title = assignment.user.name || 'Inc.';

      return {
        id: assignment.id.toString(),
        title,
        start: assignment.startTime,
        end: assignment.endTime,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          type: 'ASSIGNMENT',
          userId: assignment.userId,
          patientId: assignment.patientId,
          workerName: assignment.user.name,
          patientName: hidePatientLabel ? '' : patientName,
          status: assignment.status,
          isRecurring: assignment.isRecurring
        }
      };
    });

    return NextResponse.json(formattedEvents);

  } catch (error) {
    console.error("Erreur lors de la récupération des affectations:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

/**
 * POST /api/assignments
 * Crée une nouvelle affectation.
 * Réservé aux administrateurs.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = assignmentSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(validatedData.error.issues[0].message, { status: 400 });
    }

    if ((session.user.role as AppRole) === 'VISITEUR') {
      return new NextResponse('Accès refusé', { status: 403 });
    }

    const {
      userId,
      patientId,
      startTime,
      endTime,
      ignoreConflict,
      isRecurring,
      frequency,
      interval,
      recurringEndDate
    } = validatedData.data;

    const isAdmin = session.user.role === Role.ADMIN;

    // Validation des droits
    if (!isAdmin) {
      // 1. Uniquement pour soi-même
      if (userId !== session.user.id) {
        return new NextResponse('Accès refusé : vous ne pouvez créer des interventions que pour vous-même.', { status: 403 });
      }

      // 2. Uniquement dans le futur (ou aujourd'hui)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = new Date(startTime);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);

      if (startDay < now) {
        return new NextResponse('Accès refusé : vous ne pouvez pas créer d\'interventions dans le passé.', { status: 403 });
      }
    }

    if (!userId || !patientId || !startTime || !endTime) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validation des intervalles de 30 minutes
    const startMinutes = start.getMinutes();
    const endMinutes = end.getMinutes();
    const startSeconds = start.getSeconds();
    const endSeconds = end.getSeconds();

    if ((startMinutes !== 0 && startMinutes !== 30) || startSeconds !== 0 ||
      (endMinutes !== 0 && endMinutes !== 30) || endSeconds !== 0) {
      return new NextResponse('Les horaires doivent être des heures pleines ou des demi-heures (ex: 09:00, 09:30).', { status: 400 });
    }

    // Logic for Recurrence
    const occurrences: { startTime: Date; endTime: Date }[] = [];
    if (isRecurring && frequency && recurringEndDate) {
      const endLimit = new Date(recurringEndDate);
      let currentStart = new Date(start);
      let currentEnd = new Date(end);
      const duration = end.getTime() - start.getTime();

      // Ensure we don't create infinite loops or too many records (safety limit 1 year)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      const finalLimit = endLimit < maxDate ? endLimit : maxDate;

      while (currentStart <= finalLimit) {
        occurrences.push({
          startTime: new Date(currentStart),
          endTime: new Date(currentEnd)
        });

        // Increment based on frequency
        if (frequency === 'DAILY') {
          currentStart.setDate(currentStart.getDate() + (interval || 1));
        } else if (frequency === 'WEEKLY') {
          currentStart.setDate(currentStart.getDate() + 7 * (interval || 1));
        } else if (frequency === 'MONTHLY') {
          currentStart.setMonth(currentStart.getMonth() + (interval || 1));
        }
        currentEnd = new Date(currentStart.getTime() + duration);
      }
    } else {
      occurrences.push({ startTime: start, endTime: end });
    }

    // Individual conflict check for each occurrence
    if (!ignoreConflict) {
      for (const occ of occurrences) {
        const conflict = await prisma.assignment.findFirst({
          where: {
            OR: [
              {
                userId: userId,
                startTime: { lt: occ.endTime },
                endTime: { gt: occ.startTime },
              },
              {
                patientId: patientId,
                startTime: { lt: occ.endTime },
                endTime: { gt: occ.startTime },
              },
            ],
          },
        });

        if (conflict) {
          const occDate = occ.startTime.toLocaleDateString('fr-FR');
          const isWorkerConflict = conflict.userId === userId;
          const msg = isWorkerConflict
            ? `Conflit (Intervenant) le ${occDate} : déjà une intervention prévue.`
            : `Conflit (Patient) le ${occDate} : déjà une intervention prévue.`;
          return new NextResponse(msg, { status: 409 });
        }
      }
    }

    // Transaction for creation
    const recurrenceId = isRecurring ? `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;

    if (occurrences.length > 1) {
      const created = await prisma.$transaction(
        occurrences.map(occ => prisma.assignment.create({
          data: {
            userId,
            patientId,
            startTime: occ.startTime,
            endTime: occ.endTime,
            isRecurring,
            recurrenceId
          }
        }))
      );
      return NextResponse.json(created[0], { status: 201 });
    } else {
      const newAssignment = await prisma.assignment.create({
        data: {
          userId,
          patientId,
          startTime: occurrences[0].startTime,
          endTime: occurrences[0].endTime,
          isRecurring,
          recurrenceId
        },
      });
      return NextResponse.json(newAssignment, { status: 201 });
    }

  } catch (error) {
    console.error("Erreur lors de la création de l'affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
