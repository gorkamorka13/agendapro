import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AssignmentStatus } from '@prisma/client';

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
    const whereClause = session.user.role === Role.ADMIN
      ? {} // L'admin voit tout, donc pas de filtre
      : { userId: session.user.id }; // L'utilisateur ne voit que ses affectations

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        patient: true,
        user: true,
      },
    });

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
    const formattedEvents = assignments.map((assignment) => {
      let backgroundColor = assignment.user.color || getUserColor(assignment.userId);

      if (assignment.status === AssignmentStatus.COMPLETED) {
        // Optionnel : On peut garder le vert pour le complété ou mixer avec la couleur
      }

      const start = new Date(assignment.startTime);
      const end = new Date(assignment.endTime);
      const timeStr = `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      return {
        id: assignment.id.toString(),
        title: session.user.role === Role.ADMIN
          ? assignment.user.name || 'Inconnu'
          : `${assignment.patient.firstName} ${assignment.patient.lastName}`,
        start: assignment.startTime,
        end: assignment.endTime,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          workerName: assignment.user.name,
          patientName: `${assignment.patient.firstName} ${assignment.patient.lastName}`,
          status: assignment.status
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

  // Seul un administrateur peut créer une affectation
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, patientId, startTime, endTime } = body;

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

    // Vérifier les chevauchements pour cet intervenant
    const conflict = await prisma.assignment.findFirst({
      where: {
        userId: userId,
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

    const newAssignment = await prisma.assignment.create({
      data: {
        userId: userId,
        patientId: parseInt(patientId, 10),
        startTime: start,
        endTime: end,
        // Le statut par défaut (PLANNED) est géré par le schéma Prisma
      },
    });

    return NextResponse.json(newAssignment, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'affectation:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
