
import { PrismaClient, AssignmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding Jan/Feb 2026 assignments...');

  // 1. Fetch Users and Patients
  const users = await prisma.user.findMany({
    where: {
      OR: [{ role: 'USER' }, { role: 'ADMIN' }] // Include admins who might work? Or just users.
      // Better to just filter by those who look like workers (e.g. have hourlyRate or are USER)
    }
  });

  const patients = await prisma.patient.findMany();

  if (users.length === 0 || patients.length === 0) {
    console.error('No users or patients found. Aborting.');
    return;
  }

  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-02-28');
  let createdCount = 0;

  // 2. Loop through each day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDayStr = d.toISOString().split('T')[0];

    // Skip Sundays? (0). Let's say workers work Mon-Sat (1-6)
    if (d.getDay() === 0) continue;

    for (const user of users) {
      // 3. Random chance to work (e.g., 30% chance per day)
      if (Math.random() > 0.3) continue;

      const patient = patients[getRandomInt(0, patients.length - 1)];

      // 4. Random Start Time (aligned to 30m)
      // Hours: 08:00 to 17:00
      const startHour = getRandomInt(8, 16);
      const startMinute = Math.random() > 0.5 ? 0 : 30;

      const startTime = new Date(d);
      startTime.setHours(startHour, startMinute, 0, 0);

      // 5. Random Duration (1h, 1.5h, 2h, ... up to 4h)
      // Steps of 30m: 2 * 30m = 1h, 8 * 30m = 4h
      const durationSlots = getRandomInt(2, 6);
      const durationMs = durationSlots * 30 * 60 * 1000;

      const endTime = new Date(startTime.getTime() + durationMs);

      // Create Assignment
      const assignment = await prisma.assignment.create({
        data: {
          startTime: startTime,
          endTime: endTime,
          status: AssignmentStatus.COMPLETED, // Mark completed so it shows nicely in reports
          userId: user.id,
          patientId: patient.id,
          // Create Linked WorkedHours immediately
          workedHours: {
            create: {
              startTime: startTime,
              endTime: endTime,
              isPaid: false
            }
          }
        }
      });

      createdCount++;
    }
  }

  console.log(`Seeding complete. Created ${createdCount} assignments (and WorkedHours) for 2026.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
