
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Environment Check ---');
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.split('@')[1] || 'NOT SET');

  try {
    const roles = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE typname = 'Role';
    `;
    console.log('Current DB Role enums:', roles);

    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      take: 2,
      select: { name: true, role: true }
    });
    console.log('Last 2 users in DB:', users);

  } catch (e) {
    console.error('Error during check:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
