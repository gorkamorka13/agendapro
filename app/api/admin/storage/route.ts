import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { list } from '@vercel/blob';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    // Lister tous les blobs pour calculer la taille totale
    let totalSize = 0;
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const result = await list({ cursor, limit: 1000 });
      totalSize += result.blobs.reduce((acc, blob) => acc + blob.size, 0);
      hasMore = result.hasMore;
      cursor = result.cursor;
    }

    // Limite gratuite Vercel Blob : 250 MB
    const limitBytes = 250 * 1024 * 1024;
    const usagePercentage = (totalSize / limitBytes) * 100;

    return NextResponse.json({
      totalSize, // en octets
      limitBytes,
      usagePercentage: Math.min(usagePercentage, 100),
      formattedSize: formatBytes(totalSize),
      formattedLimit: formatBytes(limitBytes)
    });
  } catch (error) {
    console.error("Erreur lors du calcul de l'usage stockage:", error);
    return new NextResponse('Erreur lors de la récupération des statistiques de stockage', { status: 500 });
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
