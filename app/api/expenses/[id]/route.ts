import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { expenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile, deleteFile } from '@/lib/storage';
import type { Role } from '@/types';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id, 10);
    const formData = await request.formData();
    const motif = formData.get('motif') as string | null;
    const amount = formData.get('amount') as string | null;
    const date = formData.get('date') as string | null;
    const recordingDate = formData.get('recordingDate') as string | null;
    const userId = formData.get('userId') as string | null;
    const receiptFile = formData.get('receipt') as File | null;
    const deleteReceipt = formData.get('deleteReceipt') === 'true';

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!existing) return new NextResponse('Dépense non trouvée', { status: 404 });

    let receiptUrl = existing.receiptUrl;
    let storageError: string | undefined;

    if (deleteReceipt) {
      await deleteFile(existing.receiptUrl);
      receiptUrl = null;
    } else if (receiptFile && receiptFile.size > 0) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(receiptFile.type)) {
        return new NextResponse('Type de fichier non valide.', { status: 400 });
      }
      if (receiptFile.size > 5 * 1024 * 1024) {
        return new NextResponse('Fichier trop volumineux. Maximum 5MB.', { status: 400 });
      }
      if (existing.receiptUrl) await deleteFile(existing.receiptUrl);
      const uploadResult = await uploadFile(receiptFile, 'receipts');
      receiptUrl = uploadResult.url || existing.receiptUrl;
      storageError = uploadResult.error;
    }

    const updateData: Partial<typeof expenses.$inferInsert> = { receiptUrl };
    if (motif !== null) updateData.motif = motif;
    if (amount !== null) updateData.amount = parseFloat(amount);
    if (date !== null) updateData.date = new Date(date);
    if (recordingDate !== null) updateData.recordingDate = new Date(recordingDate);
    if (userId !== null) updateData.userId = userId;

    const [updated] = await db.update(expenses).set(updateData).where(eq(expenses.id, id)).returning();
    return NextResponse.json({ ...updated, storageError });
  } catch (error) {
    console.error('Erreur mise à jour dépense:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const id = parseInt(params.id, 10);
    const [existing] = await db.select({ receiptUrl: expenses.receiptUrl }).from(expenses).where(eq(expenses.id, id)).limit(1);
    if (existing?.receiptUrl) await deleteFile(existing.receiptUrl);
    await db.delete(expenses).where(eq(expenses.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erreur suppression dépense:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
