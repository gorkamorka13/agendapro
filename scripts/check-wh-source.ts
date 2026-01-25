
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking WorkedHours for 2025-08-31...');

  // Checks for dates around the user's report
  // Note: Database is likely UTC.
  // 31/08/2025 09:25 local time might be 07:25 or 08:25 UTC depending on TZ.
  // We'll just fetch all WH for that day based on string comparison to be safe/broad,
  // or just all WH in general that are "messy".

  const messy = await prisma.workedHours.findMany({
    where: {
      OR: [
        { startTime: { not: { gte: new Date('2000-01-01') } } }, // dummy condition to fetch many
      ]
    },
    take: 10
  });

  // Filter for the user's examples slightly manually or just look for non-zeros
  const samples = await prisma.workedHours.findMany({
    take: 20,
    skip: 100 // Look deeper in case beginning is clean
  });

  console.log("--- Random Samples ---");
  for (const wh of samples) {
    console.log(`WH ${wh.id}: ${wh.startTime.toISOString()} - ${wh.endTime.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
