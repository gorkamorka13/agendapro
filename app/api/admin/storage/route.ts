import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiUsage } from '@/lib/db/schema';
import { sum } from 'drizzle-orm';
import type { Role } from '@/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user?.role as Role) !== 'ADMIN') {
    return new NextResponse('Accès refusé', { status: 403 });
  }

  try {
    // On Cloudflare, no filesystem access. Storage info comes from R2 (TODO: hook up R2 listing).
    // For now, returns AI token usage and a placeholder for storage.
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'r2';

    const [tokenRow] = await db.select({ total: sum(aiUsage.totalTokens) }).from(aiUsage);
    const totalAiTokens = Number(tokenRow?.total ?? 0);

    // R2 storage: placeholder - actual R2 bucket listing requires R2 binding (wrangler env)
    const totalSize = 0; // Will be populated once R2 is configured with wrangler bindings
    const limitMB = 10240; // R2 free tier: 10 GB
    const limitBytes = limitMB * 1024 * 1024;
    const usagePercentage = (totalSize / limitBytes) * 100;

    return NextResponse.json({
      totalSize,
      limitBytes,
      usagePercentage: Math.min(usagePercentage, 100),
      formattedSize: formatBytes(totalSize),
      formattedLimit: formatBytes(limitBytes),
      totalAiTokens,
      storageType,
    });
  } catch (error) {
    console.error("Erreur stats stockage:", error);
    return new NextResponse('Erreur stats stockage', { status: 500 });
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
