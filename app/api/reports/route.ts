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
    // 1. Récupérer les interventions de la période (Toutes les affectations, pas seulement validées)
    const assignmentsQuery: any = {
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
        },
        user: {
          role: {
            not: Role.ADMIN
          }
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        patient: true,
        user: true,
        workedHours: true // Pour savoir si c'est déjà validé
      },
    };

    if (userId !== 'all') {
      assignmentsQuery.where.userId = userId;
    }

    const assignments = await prisma.assignment.findMany(assignmentsQuery) as any[];

    let realizedTotalMinutes = 0;
    let realizedTotalPay = 0;
    let realizedTotalTravelCost = 0;

    let plannedTotalMinutes = 0;
    let plannedTotalPay = 0;
    let plannedTotalTravelCost = 0;

    const chartDataMap: Record<string, number> = {};
    const distributionDataMap: Record<string, number> = {};
    const dailySummariesMap: Record<string, any> = {};

    const detailedEntries = assignments.map(assignment => {
      const start = new Date(assignment.startTime);
      const end = new Date(assignment.endTime);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      const isRealized = assignment.status === 'COMPLETED' || !!assignment.workedHours;

      const user = assignment.user;
      const hourlyRate = user.hourlyRate || 0;
      const travelCost = user.travelCost || 0;
      const pay = ((durationMinutes / 60) * hourlyRate) + travelCost;

      if (isRealized) {
        realizedTotalMinutes += durationMinutes;
        realizedTotalPay += pay;
        realizedTotalTravelCost += travelCost;
      } else {
        plannedTotalMinutes += durationMinutes;
        plannedTotalPay += pay;
        plannedTotalTravelCost += travelCost;
      }

      // Données Graphique (on cumule tout pour le profil d'activité)
      const dayKey = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      chartDataMap[dayKey] = (chartDataMap[dayKey] || 0) + (durationMinutes / 60);

      // Répartition
      const distributionKey = userId === 'all'
        ? user.name || 'Inconnu'
        : `${assignment.patient.firstName} ${assignment.patient.lastName}`;
      distributionDataMap[distributionKey] = (distributionDataMap[distributionKey] || 0) + (durationMinutes / 60);

      return {
        date: start.toLocaleDateString('fr-FR'),
        patient: `${assignment.patient.firstName} ${assignment.patient.lastName}`,
        worker: user.name || 'Inconnu',
        startTime: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: (durationMinutes / 60).toFixed(2),
        pay: pay.toFixed(2),
        status: assignment.status,
        isRealized
      };
    });

    const chartData = Object.entries(chartDataMap).map(([day, hours]) => ({
      day,
      hours: parseFloat(hours.toFixed(2))
    }));

    const distributionData = Object.entries(distributionDataMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));

    return NextResponse.json({
      workedHours: detailedEntries, // On garde le nom de clé pour la compatibilité frontend
      chartData,
      dailySummaries: [], // Désactivé temporairement pour simplifier
      distributionData,
      summary: {
        realizedHours: realizedTotalMinutes / 60,
        realizedPay: realizedTotalPay,
        realizedTravelCost: realizedTotalTravelCost,
        plannedHours: plannedTotalMinutes / 60,
        plannedPay: plannedTotalPay,
        plannedTravelCost: plannedTotalTravelCost,
        totalPay: realizedTotalPay, // Fallback compat
        totalHours: realizedTotalMinutes / 60 // Fallback compat
      },
    });

  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
