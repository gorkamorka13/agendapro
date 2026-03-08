
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { db } from './lib/db/index.ts';
import { expenses } from './lib/db/schema/index.ts';
import { desc } from 'drizzle-orm';

async function check() {
  const latestExpenses = await db.select().from(expenses).orderBy(desc(expenses.recordingDate)).limit(10);

  console.log('--- Latest Expenses ---');
  latestExpenses.forEach(e => {
    console.log(`ID: ${e.id}, Motif: ${e.motif}, URL: ${e.receiptUrl}`);
  });
}

check().catch(console.error);
