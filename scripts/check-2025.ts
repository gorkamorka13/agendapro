
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const start = new Date('2025-01-01T00:00:00Z');
  const end = new Date('2025-12-31T23:59:59Z');

  const assignments = await prisma.assignment.findMany({
    where: {
      startTime: { gte: start, lte: end }
    },
    take: 50 // Check 50 samples
  });

  console.log(`Checking ${assignments.length} assignments from 2025...`);
  let invalidCount = 0;

  for (const a of assignments) {
    const s = a.startTime;
    const e = a.endTime;

    const sMin = s.getMinutes();
    const sSec = s.getSeconds();
    const sMs = s.getMilliseconds();

    const eMin = e.getMinutes();
    const eSec = e.getSeconds();
    const eMs = e.getMilliseconds();

    const invalidStart = (sMin !== 0 && sMin !== 30) || sSec !== 0 || sMs !== 0;
    const invalidEnd = (eMin !== 0 && eMin !== 30) || eSec !== 0 || eMs !== 0;

    if (invalidStart || invalidEnd) {
      invalidCount++;
      console.log(`[ID ${a.id}] INVALID: ${s.toISOString()} - ${e.toISOString()}`);
    }
  }

  if (invalidCount === 0) {
    console.log("All checked assignments are valid (00 or 30 mins).");
  } else {
    console.log(`Found ${invalidCount} invalid assignments in sample.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
