
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

async function main() {
  console.log('--- Deleting Admin Assignments ---');

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true }
  });

  for (const admin of admins) {
    console.log(`Processing admin: ${admin.email}`);

    // Delete assignments where userId is the admin's ID
    const deleteAssignments = await prisma.assignment.deleteMany({
      where: { userId: admin.id }
    });

    console.log(`- Deleted ${deleteAssignments.count} assignments.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
