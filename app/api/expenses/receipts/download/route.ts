import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import JSZip from 'jszip';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Build query filters
    const where: any = {
      receiptUrl: { not: null }
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (userId && userId !== 'all') {
      where.userId = userId;
    }

    // Fetch expenses with receipts
    const expenses = await (prisma as any).expense.findMany({
      where,
      include: { user: true },
      orderBy: { date: 'desc' }
    });

    if (expenses.length === 0) {
      return new NextResponse('Aucun justificatif trouvé', { status: 404 });
    }

    // Create ZIP file
    const zip = new JSZip();

    for (const expense of expenses) {
      if (!expense.receiptUrl) continue;

      try {
        // Read file from disk
        const filePath = path.join(process.cwd(), 'public', expense.receiptUrl);
        const fileBuffer = await fs.readFile(filePath);

        // Generate readable filename
        const date = new Date(expense.date).toISOString().split('T')[0];
        const motif = expense.motif.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const amount = expense.amount.toFixed(2).replace('.', ',');
        const ext = path.extname(expense.receiptUrl);
        const fileName = `${date}_${motif}_${amount}€${ext}`;

        // Add to ZIP
        zip.file(fileName, fileBuffer);
      } catch (error) {
        console.error(`Erreur lecture fichier ${expense.receiptUrl}:`, error);
        // Continue with other files
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Return ZIP file
    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="justificatifs_${timestamp}.zip"`
      }
    });

  } catch (error) {
    console.error("Erreur lors de la création du ZIP:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
