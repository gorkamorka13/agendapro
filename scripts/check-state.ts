
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.assignment.count();
  console.log(`Total assignments: ${count}`);

  const sample = await prisma.assignment.findMany({ take: 5 });
  console.log('Sample times:');
  sample.forEach(a => {
    console.log(`- ID ${a.id}: ${a.startTime.toISOString()} -> ${a.endTime.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
