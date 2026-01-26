import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        user: true,
      },
      orderBy: {
        startTime: 'asc',
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

    const formattedAppointments = appointments.map((apt) => {
      const backgroundColor = apt.user.color || getUserColor(apt.userId);
      return {
        id: `apt-${apt.id}`,
        title: `RDV: ${apt.subject}`,
        start: apt.startTime,
        end: apt.endTime,
        backgroundColor: backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          type: 'APPOINTMENT',
          subject: apt.subject,
          location: apt.location,
          workerName: apt.user.name,
          notes: apt.notes,
          status: apt.status,
        },
      };
    });

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    console.error("Erreur lors de la récupération des rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const body = await request.json();
    const { subject, location, userId, startTime, endTime, notes, status } = body;

    if (!subject || !location || !userId || !startTime || !endTime) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    const newAppointment = await prisma.appointment.create({
      data: {
        subject,
        location,
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes,
        status: status || 'PLANNED',
      },
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
