
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function cleanup() {
  console.log('Cleaning up expenses with Vercel receipts...');
  const result = await sql`DELETE FROM "Expense" WHERE "receiptUrl" LIKE '%vercel-storage.com%' RETURNING id`;
  console.log(`Deleted ${result.length} expenses.`);
}

cleanup().catch(console.error);
