
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for orphan WorkedHours...');

  const workedHours = await prisma.workedHours.findMany();
  console.log(`Total WorkedHours: ${workedHours.length}`);

  let deletedCount = 0;

  for (const wh of workedHours) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: wh.assignmentId },
    });

    if (!assignment) {
      // console.log(`WorkedHours ${wh.id} points to missing Assignment ${wh.assignmentId}. Deleting...`);
      await prisma.workedHours.delete({
        where: { id: wh.id },
      });
      deletedCount++;
    }
  }

  console.log(`Finished. Deleted ${deletedCount} orphan WorkedHours.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
