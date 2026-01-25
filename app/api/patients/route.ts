// Fichier: app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      orderBy: { lastName: 'asc' },
    });
    return NextResponse.json(patients);
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

    const patient = await prisma.patient.create({
      data: { firstName, lastName, address, contactInfo },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Erreur lors de la création du patient:", error);
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

    const patient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: { firstName, lastName, address, contactInfo },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du patient:", error);
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

    await prisma.patient.delete({
      where: { id: parseInt(id) },
    });

    return new NextResponse('Patient supprimé', { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression du patient:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
