
import { PrismaClient, Assignment } from '@prisma/client';

const prisma = new PrismaClient();

function roundToNearest30Minutes(date: Date): Date {
  const ms = 1000 * 60 * 30; // 30 minutes in milliseconds
  return new Date(Math.round(date.getTime() / ms) * ms);
}

async function main() {
  console.log('Starting Cleanup: Reducing count by 50% and enforcing 30m intervals.');

  const allAssignments = await prisma.assignment.findMany();
  const total = allAssignments.length;
  console.log(`Initial Count: ${total}`);

  const toKeep: Assignment[] = [];
  const toDeleteIds: number[] = [];

  // Randomly select ~50% to keep
  for (const a of allAssignments) {
    if (Math.random() < 0.5) {
      toDeleteIds.push(a.id);
    } else {
      toKeep.push(a);
    }
  }

  console.log(`Deleting ${toDeleteIds.length} records...`);

  // Batch delete
  if (toDeleteIds.length > 0) {
    await prisma.assignment.deleteMany({
      where: {
        id: { in: toDeleteIds }
      }
    });
  }

  console.log('Rounding times for remaining records...');
  let roundedCount = 0;

  for (const a of toKeep) {
    const newStart = roundToNearest30Minutes(a.startTime);
    const newEnd = roundToNearest30Minutes(a.endTime);

    const needsUpdate = newStart.getTime() !== a.startTime.getTime() || newEnd.getTime() !== a.endTime.getTime();

    // Also enforce seconds/ms are zero just to be absolutely sure
    // (Math.round logic above should handle it, but new Date(ms) ensures it purely based on epoch)

    if (needsUpdate) {
      await prisma.assignment.update({
        where: { id: a.id },
        data: { startTime: newStart, endTime: newEnd }
      });
      roundedCount++;
    }
  }

  const finalCount = await prisma.assignment.count();
  console.log('------------------------------------------------');
  console.log(`Original Count: ${total}`);
  console.log(`Deleted: ${toDeleteIds.length}`);
  console.log(`Rounded updates: ${roundedCount}`);
  console.log(`Final Count: ${finalCount}`);
  console.log('Cleanup Complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
