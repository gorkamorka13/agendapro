import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { expenses, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { uploadFile } from '@/lib/storage';
import type { Role } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: expenses.id,
        motif: expenses.motif,
        amount: expenses.amount,
        date: expenses.date,
        recordingDate: expenses.recordingDate,
        receiptUrl: expenses.receiptUrl,
        userId: expenses.userId,
        userName: users.name,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .orderBy(desc(expenses.recordingDate));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Erreur récupération dépenses:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const formData = await request.formData();
    const motif = formData.get('motif') as string;
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;
    const recordingDate = formData.get('recordingDate') as string;
    const userId = formData.get('userId') as string;
    const receiptFile = formData.get('receipt') as File | null;

    if (!motif || amount === undefined || !date || !userId) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    let receiptUrl: string | null = null;
    let storageError: string | undefined;

    if (receiptFile && receiptFile.size > 0) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(receiptFile.type)) {
        return new NextResponse('Type de fichier non valide.', { status: 400 });
      }
      if (receiptFile.size > 5 * 1024 * 1024) {
        return new NextResponse('Fichier trop volumineux. Maximum 5MB.', { status: 400 });
      }
      const uploadResult = await uploadFile(receiptFile, 'receipts');
      receiptUrl = uploadResult.url;
      storageError = uploadResult.error;
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        motif,
        amount: parseFloat(amount),
        date: new Date(date),
        recordingDate: recordingDate ? new Date(recordingDate) : new Date(),
        userId,
        receiptUrl,
      })
      .returning();

    return NextResponse.json({ ...expense, storageError }, { status: 201 });
  } catch (error) {
    console.error('Erreur création dépense:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
