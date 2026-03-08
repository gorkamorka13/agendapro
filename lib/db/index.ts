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

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

const initDb = () => {
  if (!dbInstance) {
    if (process.env.NODE_ENV !== 'production' && globalForDb.db) {
      dbInstance = globalForDb.db;
    } else {
      const url = getDatabaseUrl();
      if (!url) {
        throw new Error('DATABASE_URL is missing. Ensure Cloudflare Environment variables are set.');
      }
      const { db, pool } = createDbInstance();
      dbInstance = db;
      if (process.env.NODE_ENV !== 'production') {
        globalForDb.db = db;
        globalForDb.pool = pool;
      }
    }
  }
  return dbInstance;
};

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop) {
    const instance = initDb();
    return (instance as any)[prop];
  }
});

export default db;
