
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Démarrage de la migration des images vers Vercel Blob...');

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('❌ Erreur: BLOB_READ_WRITE_TOKEN manquant dans l\'environnement.');
    process.exit(1);
  }

  try {
    // 1. Trouver toutes les dépenses avec un lien local
    const expenses = await (prisma as any).expense.findMany({
      where: {
        receiptUrl: {
          startsWith: '/uploads/'
        }
      }
    });

    if (expenses.length === 0) {
      console.log('✅ Aucune image locale à migrer.');
      return;
    }

    console.log(`📦 ${expenses.length} justificatifs trouvés en local.`);

    for (const expense of expenses) {
      const localPath = expense.receiptUrl;
      const absolutePath = path.join(process.cwd(), 'public', localPath);

      if (!fs.existsSync(absolutePath)) {
        console.warn(`⚠️ Fichier introuvable: ${absolutePath} (Dépense ID: ${expense.id})`);
        continue;
      }

      console.log(`⏳ Migration: ${localPath} ...`);

      try {
        const fileBuffer = fs.readFileSync(absolutePath);
        const filename = path.basename(localPath);

        // Simuler un File object pour put (on utilise le buffer directement dans Node)
        const blob = await put(`receipts/${filename}`, fileBuffer, {
          access: 'public',
          addRandomSuffix: true,
          token: blobToken
        });

        console.log(`✅ Uploadé sur Vercel: ${blob.url}`);

        // 2. Mettre à jour la base de données
        await (prisma as any).expense.update({
          where: { id: expense.id },
          data: { receiptUrl: blob.url }
        });

        console.log(`✨ Base de données mise à jour pour ID: ${expense.id}`);
      } catch (err: any) {
        console.error(`❌ Échec migration pour ID ${expense.id}:`, err.message);
      }
    }

    console.log('🏁 Migration terminée !');
  } catch (error: any) {
    console.error('❌ Erreur fatale lors de la migration:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
