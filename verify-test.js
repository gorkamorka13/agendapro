
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function verify() {
  console.log('--- Checking Users ---');
  const users = await sql`SELECT id, name, email, role FROM "User"`;
  console.log(JSON.stringify(users, null, 2));

  console.log('\n--- Checking Recent Expenses ---');
  const expenses = await sql`SELECT id, motif, "receiptUrl", "userId" FROM "Expense" ORDER BY id DESC LIMIT 10`;
  console.log(JSON.stringify(expenses, null, 2));
}

verify().catch(console.error);
