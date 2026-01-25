
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundToNearest30Minutes(date: Date): Date {
  const ms = 1000 * 60 * 30; // 30 minutes in milliseconds
  return new Date(Math.round(date.getTime() / ms) * ms);
}

async function main() {
  console.log('Rounding WorkedHours to nearest 30 minutes...');

  const allWH = await prisma.workedHours.findMany();
  console.log(`Found ${allWH.length} worked hours records.`);

  let updatedCount = 0;

  for (const wh of allWH) {
    const newStart = roundToNearest30Minutes(wh.startTime);
    const newEnd = roundToNearest30Minutes(wh.endTime);

    const needsUpdate = newStart.getTime() !== wh.startTime.getTime() || newEnd.getTime() !== wh.endTime.getTime();

    if (needsUpdate) {
      await prisma.workedHours.update({
        where: { id: wh.id },
        data: {
          startTime: newStart,
          endTime: newEnd,
        },
      });
      updatedCount++;
    }
  }

  console.log(`Finished. Updated ${updatedCount} WorkedHours records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
