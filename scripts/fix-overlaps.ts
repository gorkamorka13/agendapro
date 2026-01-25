
import { PrismaClient, Assignment } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Scanning for overlapping assignments in 2026...');

  // Fetch all 2026 assignments
  const startOfYear = new Date('2026-01-01T00:00:00Z');
  const endOfYear = new Date('2026-12-31T23:59:59Z');

  const assignments = await prisma.assignment.findMany({
    where: {
      startTime: {
        gte: startOfYear,
        lte: endOfYear
      }
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  console.log(`Found ${assignments.length} assignments in 2026.`);

  // Group by user
  const byUser: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    if (!byUser[a.userId]) byUser[a.userId] = [];
    byUser[a.userId].push(a);
  }

  const toDeleteIds: number[] = [];

  for (const userId in byUser) {
    const userAssignments = byUser[userId];
    let previous = userAssignments[0];

    for (let i = 1; i < userAssignments.length; i++) {
      const current = userAssignments[i];

      // Check for overlap: Current Start < Previous End
      if (current.startTime < previous.endTime) {
        // Overlap detected!
        // console.log(`Overlap for user ${userId}:`);
        // console.log(`  Prev: ${previous.startTime.toISOString()} - ${previous.endTime.toISOString()}`);
        // console.log(`  Curr: ${current.startTime.toISOString()} - ${current.endTime.toISOString()} (DELETING)`);
        toDeleteIds.push(current.id);
      } else {
        // No overlap, advance previous pointer
        previous = current;
      }
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`Deleting ${toDeleteIds.length} overlapping assignments...`);
    await prisma.assignment.deleteMany({
      where: {
        id: { in: toDeleteIds }
      }
    });
    console.log('Deletion complete.');
  } else {
    console.log('No overlaps found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
