
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await sql`UPDATE "User" SET "hashedPassword" = ${hashedPassword} WHERE email = 'admin@agendastable.fr'`;
  console.log('Password reset for admin@agendastable.fr to admin123');
}

resetPassword().catch(console.error);
