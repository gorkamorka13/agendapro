// Fichier : app/api/users/route.ts

import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  // Sécurité : Seul un administrateur peut obtenir la liste des utilisateurs
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: Role.ADMIN }
      },
      orderBy: {
        name: 'asc', // Ordonner les utilisateurs par ordre alphabétique
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
    const { name, email, password, role, hourlyRate, travelCost } = await request.json();

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
