
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role';
    `;
    console.log('User role column info:', result);

    const types = await prisma.$queryRaw`
      SELECT n.nspname as schema, t.typname as type
      FROM pg_type t
      LEFT JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'Role';
    `;
    console.log('Role types found:', types);

    const values = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE typname = 'Role';
    `;
    console.log('Role enum values:', values);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
