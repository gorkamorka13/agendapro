import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { expenses, users } from '@/lib/db/schema';
import { eq, gte, lte, and, isNotNull } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    const conditions = [isNotNull(expenses.receiptUrl)];
    if (startDate && endDate) {
      conditions.push(gte(expenses.recordingDate, new Date(startDate)));
      conditions.push(lte(expenses.recordingDate, new Date(endDate)));
    }
    if (userId && userId !== 'all') conditions.push(eq(expenses.userId, userId));

    const rows = await db
      .select({
        id: expenses.id,
        receiptUrl: expenses.receiptUrl,
        recordingDate: expenses.recordingDate,
        date: expenses.date,
        motif: expenses.motif,
        amount: expenses.amount,
      })
      .from(expenses)
      .where(and(...conditions))
      .orderBy(expenses.recordingDate);

    if (rows.length === 0) return new NextResponse('Aucun justificatif trouvé', { status: 404 });

    const JSZip = (await import('jszip')).default;
    const { default: path } = await import('path');
    const zip = new JSZip();

    for (const expense of rows) {
      if (!expense.receiptUrl) continue;
      try {
        let fileBuffer: ArrayBuffer;
        if (expense.receiptUrl.startsWith('http')) {
          const response = await fetch(expense.receiptUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          fileBuffer = await response.arrayBuffer();
        } else {
          // Note: fs not available on Cloudflare Edge — files should be in R2
          // Fallback for local dev only
          const { promises: fs } = await import('fs');
          const filePath = path.join(process.cwd(), 'public', expense.receiptUrl);
          fileBuffer = (await fs.readFile(filePath)).buffer;
        }

        const date = new Date(expense.recordingDate || expense.date).toISOString().split('T')[0];
        const motif = expense.motif.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const amount = expense.amount.toFixed(2).replace('.', ',');
        let ext = '.jpg';
        try {
          const urlPath = expense.receiptUrl.startsWith('http') ? new URL(expense.receiptUrl).pathname : expense.receiptUrl;
          ext = path.extname(urlPath) || '.jpg';
        } catch {}

        zip.file(`${date}_${motif}_${amount}€${ext}`, fileBuffer);
      } catch (err) {
        console.error(`Erreur lecture ${expense.receiptUrl}:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="justificatifs_${timestamp}.zip"`,
      },
    });
  } catch (error) {
    console.error('Erreur ZIP justificatifs:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
