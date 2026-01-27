// Fichier: prisma/seed-mass.ts
import { PrismaClient, Role, AssignmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start mass seeding for 2 years (2025-2026)...');

  // 1. Ensure "Mr Delaronciere" exists
  let patient = await prisma.patient.findFirst({
    where: { lastName: 'Delaronciere' }
  });

  if (!patient) {
    console.log('🏥 Creating patient Mr Delaronciere...');
    patient = await prisma.patient.create({
      data: {
        firstName: 'Charles',
        lastName: 'Delaronciere',
        address: '800 impasse de capeou, Aix en provence',
        contactInfo: 'Patient prioritary - 1 year planning'
      }
    });
  }

  // 2. Get all worker users
  const workers = await prisma.user.findMany({
    where: { role: Role.USER }
  });

  if (workers.length === 0) {
    console.log('❌ No workers found. Please run the main seed first.');
    return;
  }

  console.log(`👥 Generating assignments for ${workers.length} workers...`);

  // 3. Define the period (Total years 2025 and 2026)
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-12-31');

  const currentDay = new Date(startDate);
  let totalCreated = 0;

  // Clear 2026 data first if needed, or just let it cumulative.
  // User asked "depuis le debut 2026", but previously I did 2025.
  // I'll skip clearing and just generate.

  while (currentDay <= endDate) {
    for (const worker of workers) {
      const numSlots = Math.floor(Math.random() * 2) + 1;
      let lastEndHour = 9;

      for (let i = 0; i < numSlots; i++) {
        const startHour = lastEndHour + (Math.random() * 2);
        if (startHour > 19) break;

        const durationHours = 0.5 + (Math.random() * 2);
        const endHour = Math.min(startHour + durationHours, 21);

        const startTime = new Date(currentDay);
        startTime.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

        const endTime = new Date(currentDay);
        endTime.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

        await prisma.assignment.create({
          data: {
            userId: worker.id,
            patientId: patient.id,
            startTime,
            endTime,
            status: AssignmentStatus.COMPLETED,
            notes: 'Visite quotidienne programmée',
            workedHours: {
              create: {
                startTime,
                endTime,
                isPaid: true
              }
            }
          }
        });

        totalCreated++;
        lastEndHour = endHour;
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);

    if (currentDay.getDate() === 1) {
      console.log(`📅 Month processed: ${currentDay.getMonth() + 1}/${currentDay.getFullYear()}... Total: ${totalCreated}`);
    }
  }

  console.log(`\n✅ Finished! Created ${totalCreated} interventions for Mr Delaronciere in 2025-2026.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during mass seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
