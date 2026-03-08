import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET || 'agendapro-storage';
const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_STORAGE_DOMAIN; // Facultatif : domaine personnalisé pour R2

/**
 * Upload un fichier en utilisant la meilleure méthode disponible
 * Cloud (Cloudflare R2) > Local (public/uploads) > None (Données uniquement)
 */
export async function uploadFile(
  file: File,
  directory: string = 'receipts'
): Promise<StorageResult> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE; // "r2" ou "local"
  const timestamp = Date.now();
  const cleanName = (file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${directory}/${timestamp}_${cleanName}`;

  // 1. Priorité : Cloudflare R2 (si configuré ou forcé)
  if (storageType === 'r2' || process.env.R2_ACCESS_KEY_ID) {
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // URL de l'objet : soit domaine personnalisé, soit URL publique R2 par défaut
      const url = PUBLIC_DOMAIN
        ? `${PUBLIC_DOMAIN}/${filename}`
        : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${filename}`;

      return { url, storageType: 'cloud' };
    } catch (error) {
      console.error("Échec Cloudflare R2, passage au local:", error);
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

  // 1. Cas : Cloudflare R2 (ou compatible S3)
  if (url.includes('r2.cloudflarestorage.com') || url.includes('r2.dev') || (PUBLIC_DOMAIN && url.includes(PUBLIC_DOMAIN))) {
    try {
      // Extraire la clé (Key) de l'URL
      let key = '';
      if (PUBLIC_DOMAIN && url.includes(PUBLIC_DOMAIN)) {
        key = url.split(`${PUBLIC_DOMAIN}/`)[1];
      } else {
        // Format classique : https://pub-xxx.r2.dev/directory/file.ext
        const urlParts = url.split('/');
        key = urlParts.slice(3).join('/');
      }

      if (key) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          })
        );
      }
      return true;
    } catch (error) {
      console.error("Échec suppression R2:", error);
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
