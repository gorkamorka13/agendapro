// Fichier: lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// Déclare une variable globale pour stocker le client Prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// Crée le client Prisma.
// En développement, on le stocke dans la variable globale pour qu'il ne soit pas
// recréé à chaque rechargement à chaud (hot reload).
// En production, on crée simplement une nouvelle instance.
const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = client;

// Exporte le client pour qu'il puisse être utilisé dans le reste de l'application
export const prisma = client;
