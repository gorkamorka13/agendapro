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
    throw new Error('DATABASE_URL is not defined. Please check your environment variables.');
  }
  return url;
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

let dbInstance: ReturnType<typeof drizzle<typeof schema>>;

if (process.env.NODE_ENV === 'production') {
  dbInstance = createDbInstance().db;
} else {
  if (!globalForDb.db) {
    const { db, pool } = createDbInstance();
    globalForDb.db = db;
    globalForDb.pool = pool;
  }
  dbInstance = globalForDb.db;
}

export const db = dbInstance;
export default db;
