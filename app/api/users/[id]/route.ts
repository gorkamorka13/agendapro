import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { Role } from '@/types';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { name, fullName, email, password, role, hourlyRate, travelCost, color, phone } =
      await request.json();

    // Check color collision with other users
    const [colorUsed] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.color, color), ne(users.id, params.id)))
      .limit(1);

    if (colorUsed) {
      return new NextResponse('Cette couleur est déjà attribuée à un autre utilisateur.', {
        status: 400,
      });
    }

    // Prevent removing admin role from the main admin account
    const [existingUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (existingUser?.name === 'admin' && role !== 'ADMIN') {
      return new NextResponse("Le rôle de l'utilisateur 'admin' ne peut pas être modifié.", {
        status: 403,
      });
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      name,
      fullName,
      email,
      role: role as Role,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      travelCost: travelCost ? parseFloat(travelCost) : null,
      color,
      phone: phone || null,
    };

    if (password) {
      updateData.hashedPassword = await bcrypt.hash(password, 12);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.id))
      .returning();

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

  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const [userToDelete] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (userToDelete?.name === 'admin') {
      return new NextResponse("L'utilisateur principal 'admin' ne peut pas être supprimé.", {
        status: 403,
      });
    }

    await db.delete(users).where(eq(users.id, params.id));
    return new NextResponse('Utilisateur supprimé', { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
