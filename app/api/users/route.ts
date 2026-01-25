// Fichier : app/api/users/route.ts

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    let whereClause = {};
    if (session.user.role !== Role.ADMIN) {
      whereClause = { id: session.user.id };
    } else {
      whereClause = {}; // L'admin voit TOUT le monde (incluant les autres admins)
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });

    // On retire le mot de passe avant de renvoyer les données
    const usersWithoutPassword = users.map(({ hashedPassword, ...user }) => user);

    return NextResponse.json(usersWithoutPassword);

  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { name, email, password, role, hourlyRate, travelCost, color } = await request.json();

    if (!name || !password) {
      return new NextResponse('Nom et mot de passe requis', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: role || Role.USER,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        travelCost: travelCost ? parseFloat(travelCost) : null,
        color: color || '#3b82f6',
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);

  } catch (error: any) {
    if (error.code === 'P2002') {
      return new NextResponse('Cet utilisateur existe déjà', { status: 400 });
    }
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
