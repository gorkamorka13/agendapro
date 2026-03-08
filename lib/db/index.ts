// lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Support WebSockets pour Node.js (dev local) - Cloudflare a nativement les WebSockets
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}

const getDatabaseUrl = (): string => {
  const url =
    process.env.DATABASE_URL ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as Record<string, any>).__env?.DATABASE_URL ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as Record<string, any>).env?.DATABASE_URL;

  if (!url) {
    console.warn('[DB] DATABASE_URL is not defined at module evaluation time. This is normal on Cloudflare Edge cold boots.');
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

  // Workaround: Neon sometimes doesn't set search_path properly
  dbInstance.execute('SET search_path TO public').catch((err) => {
    console.error('[DB] Failed to set search_path:', err);
  });

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
    // Si on n'a toujours pas d'URL au runtime, on reste sur l'instance buildTime ou on lance une erreur
    // Pour l'Edge de Cloudflare, l'URL est injectée juste avant l'exécution du handler.
    return buildTimeDb;
  }

  const { db } = createDbInstance();
  realDbInstance = db;
  return db;
};

// Proxy transparent qui utilise buildTimeDb comme cible de type
export const db = new Proxy(buildTimeDb, {
  get(target, prop, receiver) {
    // Si on a une URL, on délègue à l'instance réelle
    // Sinon on reste sur le target (buildTimeDb)
    const url = getDatabaseUrl();
    const activeDb = url ? getRealDb() : target;

    const value = Reflect.get(activeDb, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  },
  getPrototypeOf(target) {
    // Crucial pour instanceof Drizzle classes
    const url = getDatabaseUrl();
    return Object.getPrototypeOf(url ? getRealDb() : target);
  }
});

export default db;
