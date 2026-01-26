import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { name, email, password, role, hourlyRate, travelCost, color } = await request.json();

    const data: any = {
      name,
      email,
      role,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      travelCost: travelCost ? parseFloat(travelCost) : null,
      color: color,
    };

    if (password) {
      data.hashedPassword = await bcrypt.hash(password, 12);
    }

    // Sécurité: Empêcher de supprimer les droits admin de l'utilisateur 'admin'
    const existingUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (existingUser?.name === 'admin' && role !== Role.ADMIN) {
      return new NextResponse("Le rôle de l'utilisateur 'admin' ne peut pas être modifié.", { status: 403 });
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

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const userToDelete = await prisma.user.findUnique({ where: { id: params.id } });
    if (userToDelete?.name === 'admin') {
      return new NextResponse("L'utilisateur principal 'admin' ne peut pas être supprimé.", { status: 403 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return new NextResponse('Utilisateur supprimé', { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
