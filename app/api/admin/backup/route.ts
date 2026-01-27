import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    // Récupération de toutes les données importantes
    // On utilise une transaction pour s'assurer de la cohérence des données à l'instant T
    const backupData = await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        include: {
          accounts: true,
          sessions: true,
        }
      });

      const patients = await tx.patient.findMany({
        include: {
          invoices: {
            include: { lineItems: true }
          }
        }
      });

      const assignments = await tx.assignment.findMany({
        include: {
          workedHours: true
        }
      });

      const appointments = await tx.appointment.findMany();
      const expenses = await tx.expense.findMany();
      const verificationTokens = await tx.verificationToken.findMany();

      return {
        metadata: {
          date: new Date().toISOString(),
          version: '1.0',
          appName: 'AgendaPro'
        },
        data: {
          users,
          patients,
          assignments,
          appointments,
          expenses,
          verificationTokens
        }
      };
    });

    // Génération du nom de fichier avec la date
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `agendapro_backup_${dateStr}.json`;

    // Création de la réponse avec les bons headers pour le téléchargement
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    return new NextResponse('Erreur lors de la génération de la sauvegarde', { status: 500 });
  }
}
