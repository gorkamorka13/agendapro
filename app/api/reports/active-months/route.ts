import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse('Non authentifié', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    const whereClause: any = {};

    // Si l'utilisateur est un intervenant, il ne voit que ses propres mois
    if (session.user.role !== Role.ADMIN) {
      whereClause.assignment = { userId: session.user.id };
    } else if (userId && userId !== 'all') {
      whereClause.assignment = { userId: userId };
    }

    // Récupérer toutes les dates de début des heures travaillées
    const workedHours = await prisma.workedHours.findMany({
      where: whereClause,
      select: { startTime: true }
    });

    // START CHANGE: Récupérer aussi les assignments (planifiés)
    const assignmentWhere: any = {};
    if (session.user.role !== Role.ADMIN) {
      assignmentWhere.userId = session.user.id;
    } else if (userId && userId !== 'all') {
      assignmentWhere.userId = userId;
    }

    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      select: { startTime: true }
    });
    // END CHANGE

    const activeMonthsSet = new Set<string>();

    const addToSet = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      activeMonthsSet.add(`${year}-${month}`);
    };

    workedHours.forEach(wh => addToSet(new Date(wh.startTime)));
    assignments.forEach(a => addToSet(new Date(a.startTime)));

    const activeMonths = Array.from(activeMonthsSet).map(s => {
      const [year, month] = s.split('-').map(Number);
      return { year, month };
    });

    return NextResponse.json(activeMonths);
  } catch (error) {
    console.error("Erreur lors de la récupération des mois actifs:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
