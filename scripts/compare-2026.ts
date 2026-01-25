
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date('2026-01-31T23:59:59Z');

  console.log('--- Jan 2026 Data ---');

  const assignments = await prisma.assignment.findMany({
    where: { startTime: { gte: start, lte: end } },
    include: { user: true }
  });
  console.log(`Assignments: ${assignments.length}`);
  assignments.forEach(a => console.log(`[A] ${a.startTime.toISOString()} - ${a.user.name}`));

  const workedHours = await prisma.workedHours.findMany({
    where: { startTime: { gte: start, lte: end } },
    include: { assignment: { include: { user: true } } }
  });
  console.log(`WorkedHours: ${workedHours.length}`);
  workedHours.forEach(wh => console.log(`[WH] ${wh.startTime.toISOString()} - ${wh.assignment?.user?.name}`));

}

main().catch(console.error).finally(() => prisma.$disconnect());
