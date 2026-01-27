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
    const expenses = await (prisma as any).expense.findMany({
      include: { user: true },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Erreur lors de la récupération des dépenses:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}

export async function POST(request: Request) {
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

    if (!motif || amount === undefined || !date || !userId) {
      return new NextResponse('Données manquantes', { status: 400 });
    }

    let receiptUrl: string | null = null;

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

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${originalName}`;
      const filepath = `public/uploads/receipts/${filename}`;

      // Save file to disk
      try {
        const bytes = await receiptFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fs = require('fs').promises;
        await fs.writeFile(filepath, buffer);
        receiptUrl = `/uploads/receipts/${filename}`;
      } catch (fsError) {
        console.error("Échec de l'écriture du fichier (Vercel ?) :", fsError);
        // On continue sans l'URL de l'image
        receiptUrl = null;
      }
    }

    const expense = await (prisma as any).expense.create({
      data: {
        motif,
        amount: parseFloat(amount),
        date: new Date(date),
        userId: userId,
        receiptUrl
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la dépense:", error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}
