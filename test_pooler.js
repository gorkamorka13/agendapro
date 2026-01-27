
const { PrismaClient } = require('@prisma/client');

// Force the pooler URL
const poolerUrl = "postgresql://neondb_owner:npg_OQK2pM8eNXTy@ep-mute-silence-agsm1vhh-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: poolerUrl,
    },
  },
});

async function main() {
  try {
    console.log('Testing with POOLER URL...');
    const values = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE typname = 'Role';
    `;
    console.log('Role enum values via Pooler:', values);

    console.log('Attempting creation via Pooler...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Pooler',
        email: 'testpooler@example.com',
        hashedPassword: 'dummy',
        role: 'VISITEUR',
        color: '#00ffff'
      },
    });
    console.log('Success via Pooler!', testUser);
    await prisma.user.delete({ where: { id: testUser.id } });

  } catch (e) {
    console.error('Error via Pooler:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
