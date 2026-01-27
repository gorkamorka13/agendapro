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
    const motif = formData.get('motif') as string;
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;
    const userId = formData.get('userId') as string;
    const receiptFile = formData.get('receipt') as File | null;
    const id = parseInt(params.id, 10);

    // Get existing expense to check for old receipt
    const existingExpense = await (prisma as any).expense.findUnique({
      where: { id }
    });

    let receiptUrl = existingExpense?.receiptUrl;

    // Handle file upload if present
    if (receiptFile && receiptFile.size > 0) {
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
      if (existingExpense?.receiptUrl) {
        try {
          const fs = require('fs').promises;
          const oldFilePath = `public${existingExpense.receiptUrl}`;
          await fs.unlink(oldFilePath);
        } catch (error) {
          console.error("Erreur lors de la suppression de l'ancien fichier:", error);
          // Continue even if deletion fails
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${originalName}`;
      const filepath = `public/uploads/receipts/${filename}`;

      // Save file to disk
      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fs = require('fs').promises;
      await fs.writeFile(filepath, buffer);

      receiptUrl = `/uploads/receipts/${filename}`;
    }

    const expense = await (prisma as any).expense.update({
      where: { id },
      data: {
        motif,
        amount: parseFloat(amount),
        date: new Date(date),
        userId: userId,
        receiptUrl
      },
    });

    return NextResponse.json(expense);
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
    await (prisma as any).expense.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur lors de la suppression de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
