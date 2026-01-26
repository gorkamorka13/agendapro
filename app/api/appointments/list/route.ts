import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Erreur lors de la récupération des rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
