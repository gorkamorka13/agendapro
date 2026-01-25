import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
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
    const { name, email, password, role, hourlyRate, travelCost } = await request.json();

    const data: any = {
      name,
      email,
      role,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      travelCost: travelCost ? parseFloat(travelCost) : null,
    };

    if (password) {
      data.hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    const { hashedPassword: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
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
    await prisma.user.delete({
      where: { id: params.id },
    });

    return new NextResponse('Utilisateur supprimé', { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
