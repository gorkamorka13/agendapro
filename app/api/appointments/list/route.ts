import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');
    const search = searchParams.get('search') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        skip,
        take,
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
      }),
      prisma.appointment.count({ where })
    ]);

    return NextResponse.json({
      appointments,
      total,
      hasMore: skip + appointments.length < total
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
