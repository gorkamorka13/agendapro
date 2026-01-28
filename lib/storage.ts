import { put, del } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

/**
 * Interface pour le résultat d'un upload
 */
export interface StorageResult {
  url: string | null;
  error?: string;
  storageType: 'cloud' | 'local' | 'none';
}

/**
 * Upload un fichier en utilisant la meilleure méthode disponible
 * Cloud (Vercel Blob) > Local (public/uploads) > None (Données uniquement)
 */
export async function uploadFile(
  file: File,
  directory: string = 'receipts'
): Promise<StorageResult> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;
  const timestamp = Date.now();
  const cleanName = (file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${directory}/${timestamp}_${cleanName}`;

  // 1. Priorité : Local (si forcé par env)
  if (storageType === 'local') {
    console.log("Stockage local forcé par NEXT_PUBLIC_STORAGE_TYPE");
  } else if (blobToken) {
    // 2. Vercel Blob (Cloud)
    try {
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: true
      });
      return { url: blob.url, storageType: 'cloud' };
    } catch (error) {
      console.error("Échec Vercel Blob, passage au local:", error);
    }
  }

  // 2. Secondaire : Local Filesystem (WAMP / VPS)
  try {
    const localDir = path.join(process.cwd(), 'public', 'uploads', directory);
    // S'assurer que le dossier existe
    await fs.mkdir(localDir, { recursive: true });

    const localFilename = `${timestamp}_${cleanName}`;
    const localPath = path.join(localDir, localFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.writeFile(localPath, buffer);
    return {
      url: `/uploads/${directory}/${localFilename}`,
      storageType: 'local'
    };
  } catch (error: any) {
    console.warn("Échec stockage local (lecture seule ?):", error);
    return {
      url: null,
      error: "Stockage impossible (Cloud non configuré ou Système de fichiers restreint)",
      storageType: 'none'
    };
  }
}

/**
 * Supprime un fichier du stockage (Cloud ou Local)
 */
export async function deleteFile(url: string | null): Promise<boolean> {
  if (!url) return true;

  // 1. Cas : Vercel Blob
  if (url.includes('vercel-storage.com')) {
    try {
      await del(url);
      return true;
    } catch (error) {
      console.error("Échec suppression Blob:", error);
      return false;
    }
  }

  // 2. Cas : Stockage Local
  if (url.startsWith('/uploads/')) {
    try {
      const localPath = path.join(process.cwd(), 'public', url);
      await fs.unlink(localPath).catch(() => { }); // Ignorer si déjà supprimé
      return true;
    } catch (error) {
      console.error("Échec suppression locale:", error);
      return false;
    }
  }

  return true;
}
