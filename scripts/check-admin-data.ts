
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    include: {
      _count: {
        select: { assignments: true }
      }
    }
  });

  console.log('--- Admin Data Check ---');
  for (const admin of admins) {
    console.log(`Admin: ${admin.name} (${admin.email}) - Role: ${admin.role}`);
    console.log(`- Assignments: ${admin._count.assignments}`);
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
