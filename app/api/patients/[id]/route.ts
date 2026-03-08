import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  const { id } = await params;
  const patientId = parseInt(id, 10);

  if (isNaN(patientId)) {
    return new NextResponse('ID patient invalide', { status: 400 });
  }

  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));

    if (!patient) {
      return new NextResponse('Patient non trouvé', { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Erreur lors de la récupération du patient:', error);
    return new NextResponse('Erreur Serveur', { status: 500 });
  }
}
