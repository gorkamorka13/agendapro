import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    const formData = await request.formData();
    const motif = formData.get('motif') as string | null;
    const amount = formData.get('amount') as string | null;
    const date = formData.get('date') as string | null;
    const userId = formData.get('userId') as string | null;
    const receiptFile = formData.get('receipt') as File | null;
    const deleteReceipt = formData.get('deleteReceipt') === 'true';
    const id = parseInt(params.id, 10);

    // Get existing expense to check for old receipt
    const existingExpense = await (prisma as any).expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return new NextResponse('Dépense non trouvée', { status: 404 });
    }

    let receiptUrl = existingExpense.receiptUrl;
    let storageError: string | undefined;

    // Use the storage utilities
    const { uploadFile, deleteFile } = require('@/lib/storage');

    // Handle receipt deletion if requested
    if (deleteReceipt) {
      await deleteFile(existingExpense.receiptUrl);
      receiptUrl = null;
    }
    // Handle file upload if present (overrides deletion if both are sent)
    else if (receiptFile && receiptFile.size > 0) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(receiptFile.type)) {
        return new NextResponse('Type de fichier non valide. Utilisez JPG, PNG, WEBP ou GIF.', { status: 400 });
      }

      // Validate file size (max 5MB)
      if (receiptFile.size > 5 * 1024 * 1024) {
        return new NextResponse('Fichier trop volumineux. Maximum 5MB.', { status: 400 });
      }

      // Delete old file if it exists
      if (existingExpense.receiptUrl) {
        await deleteFile(existingExpense.receiptUrl);
      }

      // Upload new file using hybrid strategy
      const uploadResult = await uploadFile(receiptFile, 'receipts');
      receiptUrl = uploadResult.url || existingExpense.receiptUrl;
      storageError = uploadResult.error;
    }

    // Build update data only with provided fields
    const data: any = {};
    if (motif !== null) data.motif = motif;
    if (amount !== null) data.amount = parseFloat(amount);
    if (date !== null) data.date = new Date(date);
    if (userId !== null) data.userId = userId;
    data.receiptUrl = receiptUrl;

    const expense = await (prisma as any).expense.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...expense,
      storageError
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la dépense:", error);
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
    const id = parseInt(params.id, 10);

    // Get existing to find receiptUrl for deletion
    const existingExpense = await (prisma as any).expense.findUnique({
      where: { id }
    });

    if (existingExpense?.receiptUrl) {
      const { deleteFile } = require('@/lib/storage');
      await deleteFile(existingExpense.receiptUrl);
    }

    await (prisma as any).expense.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur lors de la suppression de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
