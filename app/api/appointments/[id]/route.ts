import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!appointment) {
      return new NextResponse('Rendez-vous non trouvé', { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Erreur lors de la récupération du rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    const body = await request.json();
    const { subject, location, userId, startTime, endTime, notes, status } = body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        subject,
        location,
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes,
        status,
      },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id.replace('apt-', ''), 10);
    await prisma.appointment.delete({
      where: { id },
    });

    return new NextResponse('Rendez-vous supprimé', { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression du rendez-vous:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
