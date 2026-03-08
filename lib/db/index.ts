// lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Polyfill process pour l'Edge si nécessaire
if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {} };
}

// Support WebSockets pour Node.js (dev local) uniquement
if (typeof globalThis.WebSocket === 'undefined' && (process.env.NEXT_RUNTIME !== 'edge')) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
  } catch (e) {
    // Silently ignore if ws is not available
  }
}

import { getCloudflareContext } from '@opennextjs/cloudflare';

const getDatabaseUrl = (): string => {
  let url = process.env.DATABASE_URL;

  // Si on est sur Edge, on tente de récupérer le contexte Cloudflare
  if (!url) {
    try {
      const { env } = getCloudflareContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      url = (env as any)?.DATABASE_URL;
    } catch (e) {
      // Ignorer l'erreur si le contexte n'est pas dispo
    }
  }

  // Fallbacks génériques
  if (!url) {
    url =
      (globalThis as any).DATABASE_URL ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as Record<string, any>).__env?.DATABASE_URL ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as Record<string, any>).env?.DATABASE_URL;
  }

  return url || '';
};

// Singleton pattern to avoid multiple pools in development (hot reload)
interface GlobalDb {
  pool?: Pool;
  db?: ReturnType<typeof drizzle<typeof schema>>;
}

const globalForDb = globalThis as unknown as GlobalDb;

function createDbInstance() {
  const connectionString = getDatabaseUrl();
  const pool = new Pool({ connectionString });
  const dbInstance = drizzle(pool, { schema });
  return { db: dbInstance, pool };
}

// On prépare une instance "fantôme" pour le temps de build / analyse statique
// Cela permet à Auth.js de reconnaître l'objet comme une instance Drizzle Pg (dialect, etc.)
const buildTimePool = new Pool({ connectionString: 'postgres://localhost/build_dummy' });
const buildTimeDb = drizzle(buildTimePool, { schema });

let realDbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

const getRealDb = () => {
  if (realDbInstance) return realDbInstance;

  const url = getDatabaseUrl();
  if (!url) {
    return buildTimeDb;
  }

  const { db, pool } = createDbInstance();
  realDbInstance = db;

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
    globalForDb.pool = pool;
  }

  return db;
};

// Proxy transparent qui délègue tout à l'instance réelle (ou buildTimeDb)
export const db = new Proxy(buildTimeDb, {
  get(target, prop, receiver) {
    // Cas spécial pour Auth.js/Drizzle qui inspectent le constructeur
    if (prop === 'constructor') return target.constructor;

    const activeDb = getRealDb();
    const value = Reflect.get(activeDb, prop, receiver === target ? activeDb : receiver);

    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(getRealDb());
  },
  has(target, prop) {
    return Reflect.has(getRealDb(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getRealDb());
  },
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(getRealDb(), prop);
  }
});

export default db;
