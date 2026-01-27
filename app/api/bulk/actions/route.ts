import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AssignmentStatus } from '@prisma/client';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { items, action } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new NextResponse('Aucun élément sélectionné', { status: 400 });
    }

    if (!['delete', 'cancel', 'complete'].includes(action)) {
      return new NextResponse('Action invalide', { status: 400 });
    }

    const assignmentIds = items
      .filter((item: any) => item.type === 'ASSIGNMENT')
      .map((item: any) => parseInt(item.id, 10));

    const appointmentIds = items
      .filter((item: any) => item.type === 'APPOINTMENT')
      .map((item: any) => {
        // Handle "apt-" prefix if present
        const cleanId = item.id.toString().replace('apt-', '');
        return parseInt(cleanId, 10);
      });

    await prisma.$transaction(async (tx) => {
      if (action === 'delete') {
        if (assignmentIds.length > 0) {
          await tx.assignment.deleteMany({
            where: { id: { in: assignmentIds } }
          });
        }
        if (appointmentIds.length > 0) {
          await tx.appointment.deleteMany({
            where: { id: { in: appointmentIds } }
          });
        }
      } else if (action === 'cancel') {
        if (assignmentIds.length > 0) {
          await tx.assignment.updateMany({
            where: { id: { in: assignmentIds } },
            data: { status: AssignmentStatus.CANCELLED }
          });
        }
        if (appointmentIds.length > 0) {
          await tx.appointment.updateMany({
            where: { id: { in: appointmentIds } },
            data: { status: AssignmentStatus.CANCELLED }
          });
        }
      } else if (action === 'complete') {
        if (assignmentIds.length > 0) {
          await tx.assignment.updateMany({
            where: { id: { in: assignmentIds } },
            data: { status: AssignmentStatus.COMPLETED }
          });
        }
        if (appointmentIds.length > 0) {
          await tx.appointment.updateMany({
            where: { id: { in: appointmentIds } },
            data: { status: AssignmentStatus.COMPLETED }
          });
        }
      }
    });

    return NextResponse.json({ success: true, count: items.length });

  } catch (error) {
    console.error("Erreur lors de l'action groupée:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
