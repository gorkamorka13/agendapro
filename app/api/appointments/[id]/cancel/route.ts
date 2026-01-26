// Fichier: app/api/appointments/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role, AssignmentStatus } from '@prisma/client';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Non autorisé', { status: 401 });

  try {
    const appointmentId = parseInt(params.id.replace('apt-', ''), 10);
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!existing) return new NextResponse('Rendez-vous non trouvé', { status: 404 });

    const isAdmin = session.user.role === Role.ADMIN;
    if (!isAdmin) {
      return new NextResponse('Accès refusé', { status: 403 });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AssignmentStatus.CANCELLED },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("Erreur lors de l'annulation du rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
