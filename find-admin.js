
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function findAdmin() {
  const admins = await sql`SELECT email, name FROM "User" WHERE role = 'ADMIN' LIMIT 5`;
  console.log(JSON.stringify(admins, null, 2));
}

findAdmin().catch(console.error);
