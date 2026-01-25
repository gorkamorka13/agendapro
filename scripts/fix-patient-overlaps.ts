
import { PrismaClient, Assignment } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Scanning for overlapping assignments (SAME PATIENT) across ALL years...');

  // Fetch all assignments, ordered by time
  const assignments = await prisma.assignment.findMany({
    orderBy: { startTime: 'asc' }
  });

  console.log(`Total assignments to scan: ${assignments.length}`);

  // Group by patient
  const byPatient: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    const pid = String(a.patientId); // patientId is int usually, convert to string key
    if (!byPatient[pid]) byPatient[pid] = [];
    byPatient[pid].push(a);
  }

  const toDeleteIds: number[] = [];

  for (const pid in byPatient) {
    const list = byPatient[pid];
    if (list.length < 2) continue;

    let previous = list[0];

    for (let i = 1; i < list.length; i++) {
      const current = list[i];

      // Check intersection
      // Overlap if (StartA < EndB) and (EndA > StartB)
      // Since list is sorted by StartTime (asc), we mostly just check if Current.Start < Previous.End

      if (current.startTime < previous.endTime) {
        // Overlap detected
        // console.log(`Overlap for patient ${pid}:`);
        // console.log(`  Keep: ${previous.startTime.toISOString()} - ${previous.endTime.toISOString()} (ID: ${previous.id})`);
        // console.log(`  Del : ${current.startTime.toISOString()} - ${current.endTime.toISOString()} (ID: ${current.id})`);
        toDeleteIds.push(current.id);

        // We do NOT update 'previous' here because 'previous' is still the active "blocker"
        // If we have A (10-12) and B (10:30-11) and C (11:30-12:30)
        // A overlaps B -> Delete B.
        // Next compare A vs C?
        // A (10-12) vs C (11:30-12:30) -> Overlap! Delete C.
        // Correct.

        // However, what if A (10-11) and B (10:30-12)?
        // A overlaps B -> Delete B.
        // Should we keep A as the 'previous'? Yes.
        // But assume B was 'more important'? The logic here is "First come, first served / earliest start wins".

      } else {
        previous = current;
      }
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`Found ${toDeleteIds.length} overlapping assignments.`);
    console.log('Deleting...');

    // 1. Delete associated WorkedHours first (manual cascade)
    const whResult = await prisma.workedHours.deleteMany({
      where: {
        assignmentId: { in: toDeleteIds }
      }
    });
    console.log(`  - Deleted ${whResult.count} associated WorkedHours.`);

    // 2. Delete Assignments
    const aResult = await prisma.assignment.deleteMany({
      where: {
        id: { in: toDeleteIds }
      }
    });
    console.log(`  - Deleted ${aResult.count} Assignments.`);

  } else {
    console.log('No overlaps found.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
