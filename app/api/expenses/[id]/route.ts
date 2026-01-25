import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { motif, amount, date } = await request.json();
    const id = parseInt(params.id, 10);

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        motif,
        amount: parseFloat(amount),
        date: new Date(date),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id, 10);
    await prisma.expense.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur lors de la suppression de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
