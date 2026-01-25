
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.assignment.findMany();
  const byYear: Record<string, number> = {};

  for (const a of assignments) {
    const year = a.startTime.getFullYear();
    byYear[year] = (byYear[year] || 0) + 1;
  }

  console.log('Assignments by year:', byYear);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
