
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Syncing WorkedHours with Assignments...');

  const assignments = await prisma.assignment.findMany({
    include: { workedHours: true }
  });
  console.log(`Checking ${assignments.length} assignments...`);

  let createdCount = 0;

  for (const a of assignments) {
    if (!a.workedHours) {
      // Create missing WorkedHours
      await prisma.workedHours.create({
        data: {
          assignmentId: a.id,
          startTime: a.startTime,
          endTime: a.endTime,
          isPaid: false
        }
      });
      createdCount++;
    }
  }

  console.log(`Finished. Created ${createdCount} missing WorkedHours.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
