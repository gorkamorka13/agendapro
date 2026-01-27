
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.user.updateMany({
      where: { role: 'VISITEUR' },
      data: { color: '#cbd5e1' }
    });
    console.log(`Updated ${result.count} visitor(s) to light grey (#cbd5e1) color.`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
