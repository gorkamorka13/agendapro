// Fichier: app/api/reports/worked-hours/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!session?.user) {
    return new NextResponse('Non authentifié', { status: 401 });
  }

  if (session.user.role !== Role.ADMIN && session.user.id !== userId) {
    return new NextResponse('Accès refusé', { status: 403 });
  }
  const month = searchParams.get('month'); // Fallback logic
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!userId) {
    return new NextResponse('Utilisateur manquant', { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;

  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
  } else if (month) {
    // Calculer les dates de début et de fin du mois sélectionné
    startDate = new Date(`${month}-01T00:00:00.000Z`);
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
  } else {
    return new NextResponse('Paramètres de période manquants', { status: 400 });
  }

  try {
    let users: any[] = [];
    if (userId === 'all') {
      users = await prisma.user.findMany({
        where: { role: Role.USER }
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return new NextResponse('Utilisateur non trouvé', { status: 404 });
      users = [user];
    }

    // 1. Récupérer les interventions de la période
    // Si ADMIN : on peut tout voir. Si USER : on ne voit que soi.
    const workedHoursQuery: any = {
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
        },
        assignment: {
          user: {
            role: {
              not: Role.ADMIN
            }
          }
        }
      },
      include: {
        assignment: {
          include: {
            patient: true,
            user: true,
          },
        },
      },
    };

    // Si on demande un utilisateur spécifique, on filtre
    if (userId !== 'all') {
      workedHoursQuery.where.assignment.userId = userId;
    }

    const workedHoursEntries = await prisma.workedHours.findMany(workedHoursQuery);

    // Context global seulement pour l'admin
    let globalTotalMinutes = 0;
    if (session.user.role === Role.ADMIN) {
      const allWorkedHoursEntries = userId === 'all'
        ? workedHoursEntries
        : await prisma.workedHours.findMany({
          where: {
            startTime: { gte: startDate, lt: endDate },
            assignment: { user: { role: { not: Role.ADMIN } } }
          }
        });

      globalTotalMinutes = allWorkedHoursEntries.reduce((sum, entry) => {
        const start = new Date(entry.startTime);
        const end = new Date(entry.endTime);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0);
    }

    const chartDataMap: Record<string, number> = {};
    const dailySummariesMap: Record<string, { date: string, worker: string, firstStart: Date, lastEnd: Date, totalHours: number }> = {};
    const distributionDataMap: Record<string, number> = {};
    let totalMinutes = 0;
    let totalTravelCost = 0;
    let totalPay = 0;

    const detailedEntries = (workedHoursEntries as any[]).map(entry => {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      totalMinutes += durationMinutes;

      const dayKey = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      chartDataMap[dayKey] = (chartDataMap[dayKey] || 0) + (durationMinutes / 60);

      // Répartition par patient (si un seul intervenant) ou par intervenant (si tous)
      const distributionKey = userId === 'all'
        ? entry.assignment.user.name || 'Inconnu'
        : `${entry.assignment.patient.firstName} ${entry.assignment.patient.lastName}`;
      distributionDataMap[distributionKey] = (distributionDataMap[distributionKey] || 0) + (durationMinutes / 60);

      // Groupement pour la synthèse quotidienne
      const dateStr = start.toLocaleDateString('fr-FR');
      const workerId = entry.assignment.userId;
      const groupKey = `${dateStr}_${workerId}`;

      if (!dailySummariesMap[groupKey]) {
        dailySummariesMap[groupKey] = {
          date: dateStr,
          worker: entry.assignment.user.name || 'Inconnu',
          firstStart: start,
          lastEnd: end,
          totalHours: durationMinutes / 60
        };
      } else {
        const current = dailySummariesMap[groupKey];
        if (start < current.firstStart) current.firstStart = start;
        if (end > current.lastEnd) current.lastEnd = end;
        current.totalHours += durationMinutes / 60;
      }

      const entryUser = entry.assignment.user;
      const entryHourlyRate = entryUser.hourlyRate || 0;
      const entryTravelCost = entryUser.travelCost || 0;

      const entryPay = ((durationMinutes / 60) * entryHourlyRate) + entryTravelCost;
      totalPay += entryPay;
      totalTravelCost += entryTravelCost;

      return {
        date: start.toLocaleDateString('fr-FR'),
        patient: `${entry.assignment.patient.firstName} ${entry.assignment.patient.lastName}`,
        worker: entryUser.name || 'Inconnu',
        startTime: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: (durationMinutes / 60).toFixed(2),
        pay: entryPay.toFixed(2),
      };
    });

    // 3. Ajouter la part "Autres intervenants" si on est en vue individuelle
    if (userId !== 'all') {
      const otherWorkersMinutes = globalTotalMinutes - totalMinutes;
      if (otherWorkersMinutes > 0) {
        distributionDataMap['Autres intervenants'] = otherWorkersMinutes / 60;
      }
    }

    const dailySummaries = Object.values(dailySummariesMap).map(s => ({
      ...s,
      firstStart: s.firstStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      lastEnd: s.lastEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      totalHours: s.totalHours.toFixed(2)
    }));

    // Transformer la map en tableau pour le graphique d'évaluation
    const distributionData = Object.entries(distributionDataMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));

    // Transformer la map en tableau pour le graphique
    const chartData = Object.entries(chartDataMap).map(([day, hours]) => ({
      day,
      hours: parseFloat(hours.toFixed(2))
    }));

    const totalHours = totalMinutes / 60;

    return NextResponse.json({
      workedHours: detailedEntries,
      chartData,
      dailySummaries,
      distributionData,
      summary: {
        totalHours: totalHours,
        totalPay: totalPay,
        totalTravelCost: totalTravelCost,
        hourlyRate: userId === 'all' ? null : (users[0].hourlyRate || 0),
      },
    });

  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
