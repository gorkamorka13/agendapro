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
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
        hourlyRate: true,
        travelCost: true,
        color: true,
      } as any
    });

    return NextResponse.json(users);

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
    const { name, fullName, email, password, role, hourlyRate, travelCost, color } = await request.json();

    if (!name || !password) {
      return new NextResponse('Nom et mot de passe requis', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Strict mapping for Role
    let targetRole: Role = Role.USER;
    if (role === 'ADMIN') targetRole = Role.ADMIN;
    else if (role === 'VISITEUR') targetRole = Role.VISITEUR;

    const isVisitor = targetRole === Role.VISITEUR;

    // Vérifier si la couleur est déjà utilisée (sauf pour les visiteurs qui ont tous la même)
    if (!isVisitor) {
      const colorUsed = await prisma.user.findFirst({
        where: { color: color || '#3b82f6' }
      });

      if (colorUsed) {
        return new NextResponse('Cette couleur est déjà attribuée à un autre utilisateur.', { status: 400 });
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        fullName,
        email,
        hashedPassword,
        role: targetRole,
        hourlyRate: isVisitor ? null : (hourlyRate ? parseFloat(hourlyRate) : null),
        travelCost: isVisitor ? null : (travelCost ? parseFloat(travelCost) : null),
        color: isVisitor ? '#cbd5e1' : (color || '#3b82f6'),
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
