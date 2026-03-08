// Fichier : app/api/users/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, asc, and, ne } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const isVisitor = (session.user.role as Role) === 'VISITEUR';
    const isAdmin = (session.user.role as Role) === 'ADMIN';

    const columns = {
      id: users.id,
      name: users.name,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      hourlyRate: users.hourlyRate,
      travelCost: users.travelCost,
      color: users.color,
      phone: users.phone,
    };

    if (isVisitor) {
      const user = await db
        .select(columns)
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      return NextResponse.json(user);
    }

    const allUsers = await db
      .select(columns)
      .from(users)
      .orderBy(asc(users.name));

    const filteredUsers = allUsers.map((u) => {
      const canSeeSensitive = isAdmin || u.id === session.user.id;
      if (!canSeeSensitive) {
        return { ...u, hourlyRate: null, travelCost: null, email: null, phone: null };
      }
      return u;
    });

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { name, fullName, email, password, role, hourlyRate, travelCost, color, phone } =
      await request.json();

    if (!name || !password) {
      return new NextResponse('Nom et mot de passe requis', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const targetRole: Role =
      role === 'ADMIN' ? 'ADMIN' : role === 'VISITEUR' ? 'VISITEUR' : 'USER';
    const isVisitor = targetRole === 'VISITEUR';

    if (!isVisitor) {
      const [colorUsed] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.color, color || '#3b82f6'))
        .limit(1);
      if (colorUsed) {
        return new NextResponse(
          'Cette couleur est déjà attribuée à un autre utilisateur.',
          { status: 400 }
        );
      }
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const [newUser] = await db
      .insert(users)
      .values({
        id,
        name,
        fullName,
        email,
        hashedPassword,
        role: targetRole,
        hourlyRate: isVisitor ? null : hourlyRate ? parseFloat(hourlyRate) : null,
        travelCost: isVisitor ? null : travelCost ? parseFloat(travelCost) : null,
        color: isVisitor ? '#cbd5e1' : color || '#3b82f6',
        phone: phone || null,
      })
      .returning();

    const { hashedPassword: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    if (error?.code === '23505') {
      return new NextResponse('Cet utilisateur existe déjà', { status: 400 });
    }
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
