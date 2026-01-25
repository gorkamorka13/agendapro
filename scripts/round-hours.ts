
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to round a date to the nearest 30 minutes
function roundToNearest30Minutes(date: Date): Date {
  const ms = 1000 * 60 * 30; // 30 minutes in milliseconds
  return new Date(Math.round(date.getTime() / ms) * ms);
}

async function main() {
  console.log('Rounding assignment times to nearest 30 minutes...');

  const assignments = await prisma.assignment.findMany();
  console.log(`Found ${assignments.length} assignments.`);

  let updatedCount = 0;

  for (const assignment of assignments) {
    const newStart = roundToNearest30Minutes(assignment.startTime);
    const newEnd = roundToNearest30Minutes(assignment.endTime);

    // Check if update is needed
    if (newStart.getTime() !== assignment.startTime.getTime() || newEnd.getTime() !== assignment.endTime.getTime()) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          startTime: newStart,
          endTime: newEnd,
        },
      });
      // console.log(`Assignment ${assignment.id}: ${assignment.startTime.toISOString()} -> ${newStart.toISOString()}`);
      updatedCount++;
    }
  }

  console.log(`Finished. Updated ${updatedCount} assignments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
