---
name: Migration Drizzle & Cloudflare
description: Guide complet pour migrer de Prisma/Vercel vers Drizzle ORM et Cloudflare Pages/Workers.
---

# Guide de Migration : Drizzle ORM & Cloudflare Ecosystem

Cette compétence fournit les meilleures pratiques et les modèles d'implémentation pour migrer une application Next.js de Prisma (Vercel) vers Drizzle ORM sur Cloudflare.

## 1. Stack Technique Cible

- **Runtime** : Cloudflare Edge Runtime (via OpenNext ou next-on-pages).
- **Base de données** : Neon (PostgreSQL) via HTTP/WebSockets.
- **ORM** : Drizzle ORM.
- **Stockage** : Cloudflare R2 (remplace Vercel Blob).
- **Cache** : Cloudflare KV.

---

## 2. Drizzle & Neon Serverless

Sur Cloudflare Workers, utilisez `@neondatabase/serverless` avec les WebSockets pour supporter les transactions.

### Initialisation du client (`lib/db/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Support WebSockets pour Node.js (dev local)
if (typeof window === 'undefined' && !globalThis.WebSocket) {
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

> [!IMPORTANT]
> Pour éviter l'erreur `relation "table" does not exist`, forcez le search_path :
> `await db.execute(sql`SET search_path TO public`);`

---

## 3. Schéma Modulaire

Organisez votre schéma Drizzle de manière modulaire dans `lib/db/schema/` pour une meilleure maintenabilité.

- `users.ts`, `appointments.ts`, `enums.ts`, etc.
- Exportez tout via `lib/db/schema/index.ts`.

---

## 4. Performance sur l'Edge (Éviter N+1)

Le runtime Cloudflare impose des limites de requêtes (souvent 50 par session). **Évitez les requêtes dans les boucles `.map()`.**

- **Option 1 (1-to-1)** : Utilisez `.leftJoin()`.
- **Option 2 (1-to-Many)** : Utilisez `inArray()` pour récupérer tous les enfants en une seule requête, puis filtrez en mémoire.

---

## 5. Sérialisation JSON pour l'Edge

Les Server Actions sur Cloudflare Workers échouent si elles retournent des types non-sérialisables (`Date`, `BigInt`, `undefined`).

**Modèle de solution :**
Convertissez toujours les `Date` en `string` (ISO) avant de les retourner.

```typescript
const result = await db.select().from(table);
return result.map(r => ({
  ...r,
  createdAt: r.createdAt.toISOString()
}));
```

---

## 6. Cloudflare R2 (Remplacement de Vercel Blob)

Remplacez `@vercel/blob` par `@aws-sdk/client-s3` configuré pour Cloudflare R2.

- **Endpoint** : `https://<account_id>.r2.cloudflarestorage.com`
- **Authentification** : Access Key ID et Secret Access Key.
- **Utilisation** : Les Workers n'ont pas de système de fichiers (`fs`). Utilisez exclusivement R2 pour tout fichier persistant.

---

## 7. Sécurité & Crypto

Sur l'Edge Runtime, `bcryptjs` est lent. Préférez l'API **Web Crypto** native (utilisée par NextAuth/Auth.js v5) ou une bibliothèque optimisée pour l'Edge.

---

## Checklist de Migration

- [ ] `wrangler.toml` configuré avec `compatibility_flags = ["nodejs_compat"]`.
- [ ] Schéma Prisma traduit en Drizzle TypeScript.
- [ ] Variables d'environnement configurées dans le dashboard Cloudflare.
- [ ] Toutes les routes API et Layouts marqués `export const runtime = 'edge'`.
- [ ] Tests de sérialisation sur les Server Actions complexes.
