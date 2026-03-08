// Fichier: app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const all = await db.select().from(patients).orderBy(asc(patients.lastName));
    return NextResponse.json(all);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { firstName, lastName, address, contactInfo } = await request.json();
    if (!firstName || !lastName || !address) {
      return new NextResponse('Champs obligatoires manquants', { status: 400 });
    }
    const [patient] = await db.insert(patients).values({ firstName, lastName, address, contactInfo }).returning();
    return NextResponse.json(patient);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { id, firstName, lastName, address, contactInfo } = await request.json();
    if (!id) return new NextResponse('ID requis', { status: 400 });
    const [patient] = await db.update(patients).set({ firstName, lastName, address, contactInfo }).where(eq(patients.id, parseInt(id))).returning();
    return NextResponse.json(patient);
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return new NextResponse('ID requis', { status: 400 });
    await db.delete(patients).where(eq(patients.id, parseInt(id)));
    return new NextResponse('Patient supprimé', { status: 200 });
  } catch (error) {
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
