
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for orphan assignments...');

  // 1. Get all assignments
  const assignments = await prisma.assignment.findMany();
  console.log(`Found ${assignments.length} total assignments.`);

  let deletedCount = 0;

  for (const assignment of assignments) {
    // 2. Check if the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: assignment.patientId },
    });

    if (!patient) {
      console.log(`Assignment ${assignment.id} has missing patient (ID: ${assignment.patientId}). Deleting...`);
      // 3. Delete orphan assignment
      await prisma.assignment.delete({
        where: { id: assignment.id },
      });
      deletedCount++;
    }
  }

  console.log(`Finished. Deleted ${deletedCount} orphan assignments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
