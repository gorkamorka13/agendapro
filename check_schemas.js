
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_schema, column_name, data_type, udt_schema, udt_name
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role';
    `;
    console.log('User role column full info:', result);

    const enums = await prisma.$queryRaw`
      SELECT n.nspname as schema_name, t.typname as type_name, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'Role'
      ORDER BY n.nspname, e.enumsortorder;
    `;
    console.log('All Role enums found in all schemas:', enums);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
