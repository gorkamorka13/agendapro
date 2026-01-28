import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { list } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'cloud';

  try {
    let totalSize = 0;

    if (storageType === 'local') {
      // Calculer la taille du stockage local
      const localDir = path.join(process.cwd(), 'public', 'uploads');
      totalSize = await getDirSize(localDir);
    } else {
      // Lister tous les blobs pour calculer la taille totale (Vercel Cloud)
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const result = await list({ cursor, limit: 1000 });
        totalSize += result.blobs.reduce((acc, blob) => acc + blob.size, 0);
        hasMore = result.hasMore;
        cursor = result.cursor;
      }
    }

    // Calculer le total des jetons consommés
    const { prisma } = await import('@/lib/prisma');
    let totalAiTokens = 0;

    // @ts-ignore
    if (prisma.aiUsage) {
      // @ts-ignore
      const tokenStats = await prisma.aiUsage.aggregate({
        _sum: { totalTokens: true }
      });
      totalAiTokens = tokenStats._sum.totalTokens || 0;
    }

    // Limite : 250 MB pour Cloud (Vercel Free), arbitraire pour local (ex: 500MB pour monitoring)
    const limitMB = storageType === 'local' ? 500 : 250;
    const limitBytes = limitMB * 1024 * 1024;
    const usagePercentage = (totalSize / limitBytes) * 100;

    return NextResponse.json({
      totalSize,
      limitBytes,
      usagePercentage: Math.min(usagePercentage, 100),
      formattedSize: formatBytes(totalSize),
      formattedLimit: formatBytes(limitBytes),
      totalAiTokens,
      storageType // 'local' ou 'cloud'
    });
  } catch (error) {
    console.error("Erreur lors du calcul de l'usage stockage:", error);
    return new NextResponse('Erreur lors de la récupération des statistiques de stockage', { status: 500 });
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await getDirSize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    }
  } catch (e) {
    // Si le dossier n'existe pas encore
  }
  return size;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
