import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Erreur lors de la récupération des dépenses:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { motif, amount, date } = await request.json();
    if (!motif || amount === undefined || !date) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        motif,
        amount: parseFloat(amount),
        date: new Date(date),
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
