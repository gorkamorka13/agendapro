// Fichier: app/api/appointments/[id]/replan/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Role } from '@/types';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });
  if ((session.user.role as Role) !== 'ADMIN') return new NextResponse('Accès refusé', { status: 403 });

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const [existing] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!existing) return new NextResponse('Rendez-vous non trouvé', { status: 404 });

    const [updated] = await db
      .update(appointments)
      .set({ status: 'PLANNED', updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
