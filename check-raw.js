
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function check() {
  const allExpenses = await sql`SELECT "receiptUrl" FROM "Expense"`;
  let vercelCount = 0;
  let r2Count = 0;
  let otherCount = 0;
  let nullCount = 0;

  allExpenses.forEach(e => {
    if (!e.receiptUrl) nullCount++;
    else if (e.receiptUrl.includes('vercel-storage.com')) vercelCount++;
    else if (e.receiptUrl.includes('r2.dev') || e.receiptUrl.includes('cloudflarestorage.com')) r2Count++;
    else otherCount++;
  });

  console.log('--- Expense Storage Breakdown ---');
  console.log(`Total: ${allExpenses.length}`);
  console.log(`Vercel Blob: ${vercelCount}`);
  console.log(`Cloudflare R2: ${r2Count}`);
  console.log(`Null/No receipt: ${nullCount}`);
  console.log(`Other: ${otherCount}`);
}

check().catch(console.error);
