// Fichier: prisma/seed.ts
import { PrismaClient, Role, AssignmentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Clearing existing data...');
  await prisma.workedHours.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // =====================================================================
  // 1. CREATE USERS (1 Admin + 5 Healthcare Workers)
  // =====================================================================
  console.log('👥 Creating users...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const workerPassword = await bcrypt.hash('worker123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@agendastable.fr',
      name: 'admin',
      hashedPassword: adminPassword,
      role: Role.ADMIN,
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'marie.dubois@agendastable.fr',
        name: 'marie',
        hashedPassword: workerPassword,
        role: Role.USER,
        hourlyRate: 18.50,
        travelCost: 5.00,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jean.martin@agendastable.fr',
        name: 'jean',
        hashedPassword: workerPassword,
        role: Role.USER,
        hourlyRate: 20.00,
        travelCost: 6.50,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sophie.bernard@agendastable.fr',
        name: 'sophie',
        hashedPassword: workerPassword,
        role: Role.USER,
        hourlyRate: 19.00,
        travelCost: 5.50,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pierre.petit@agendastable.fr',
        name: 'pierre',
        hashedPassword: workerPassword,
        role: Role.USER,
        hourlyRate: 21.00,
        travelCost: 7.00,
      },
    }),
    prisma.user.create({
      data: {
        email: 'claire.rousseau@agendastable.fr',
        name: 'claire',
        hashedPassword: workerPassword,
        role: Role.USER,
        hourlyRate: 18.00,
        travelCost: 4.50,
      },
    }),
  ]);

  console.log(`✅ Created admin and ${users.length} healthcare workers`);

  // =====================================================================
  // 2. CREATE PATIENTS (5 Elderly Patients)
  // =====================================================================
  console.log('🏥 Creating patients...');

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        firstName: 'Jeanne',
        lastName: 'Moreau',
        address: '12 Rue de la Paix, 75002 Paris',
        contactInfo: '01 42 33 44 55 - Fille: 06 12 34 56 78',
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Robert',
        lastName: 'Lefebvre',
        address: '45 Avenue des Champs, 69001 Lyon',
        contactInfo: '04 78 90 12 34 - Fils: 06 23 45 67 89',
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Marguerite',
        lastName: 'Dupont',
        address: '8 Boulevard Victor Hugo, 33000 Bordeaux',
        contactInfo: '05 56 78 90 12 - Petite-fille: 06 34 56 78 90',
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Henri',
        lastName: 'Garnier',
        address: '23 Rue du Commerce, 44000 Nantes',
        contactInfo: '02 40 12 34 56 - Épouse: 06 45 67 89 01',
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Simone',
        lastName: 'Fontaine',
        address: '67 Allée des Roses, 13001 Marseille',
        contactInfo: '04 91 23 45 67 - Neveu: 06 56 78 90 12',
      },
    }),
  ]);

  console.log(`✅ Created ${patients.length} patients`);

  // =====================================================================
  // 3. CREATE ASSIGNMENTS (15 Assignments across different dates)
  // =====================================================================
  console.log('📅 Creating assignments...');

  const today = new Date();
  const assignments = [];

  // Helper function to create date
  const createDate = (daysOffset: number, hour: number, minute: number = 0) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  // Week 1 - Completed assignments
  assignments.push(
    await prisma.assignment.create({
      data: {
        userId: users[0].id, // Marie Dubois
        patientId: patients[0].id, // Jeanne Moreau
        startTime: createDate(-7, 9, 0),
        endTime: createDate(-7, 11, 0),
        status: AssignmentStatus.COMPLETED,
        notes: 'Aide à la toilette et préparation du repas',
        workedHours: {
          create: {
            startTime: createDate(-7, 9, 0),
            endTime: createDate(-7, 11, 0),
            isPaid: true,
          },
        },
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[1].id, // Jean Martin
        patientId: patients[1].id, // Robert Lefebvre
        startTime: createDate(-6, 14, 0),
        endTime: createDate(-6, 16, 30),
        status: AssignmentStatus.COMPLETED,
        notes: 'Accompagnement médical et courses',
        workedHours: {
          create: {
            startTime: createDate(-6, 14, 0),
            endTime: createDate(-6, 16, 30),
            isPaid: true,
          },
        },
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[2].id, // Sophie Bernard
        patientId: patients[2].id, // Marguerite Dupont
        startTime: createDate(-5, 10, 0),
        endTime: createDate(-5, 12, 0),
        status: AssignmentStatus.COMPLETED,
        notes: 'Aide au ménage et compagnie',
        workedHours: {
          create: {
            startTime: createDate(-5, 10, 0),
            endTime: createDate(-5, 12, 0),
            isPaid: false,
          },
        },
      },
    }),
  );

  // Week 2 - Mix of completed and planned
  assignments.push(
    await prisma.assignment.create({
      data: {
        userId: users[3].id, // Pierre Petit
        patientId: patients[3].id, // Henri Garnier
        startTime: createDate(-3, 8, 30),
        endTime: createDate(-3, 11, 0),
        status: AssignmentStatus.COMPLETED,
        notes: 'Aide à la toilette, habillage et petit-déjeuner',
        workedHours: {
          create: {
            startTime: createDate(-3, 8, 30),
            endTime: createDate(-3, 11, 0),
            isPaid: false,
          },
        },
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[4].id, // Claire Rousseau
        patientId: patients[4].id, // Simone Fontaine
        startTime: createDate(-2, 15, 0),
        endTime: createDate(-2, 17, 0),
        status: AssignmentStatus.COMPLETED,
        notes: 'Préparation du dîner et aide à la prise de médicaments',
        workedHours: {
          create: {
            startTime: createDate(-2, 15, 0),
            endTime: createDate(-2, 17, 0),
            isPaid: false,
          },
        },
      },
    }),
  );

  // Current week - Planned assignments
  assignments.push(
    await prisma.assignment.create({
      data: {
        userId: users[0].id, // Marie Dubois
        patientId: patients[0].id, // Jeanne Moreau
        startTime: createDate(0, 9, 0),
        endTime: createDate(0, 11, 0),
        status: AssignmentStatus.PLANNED,
        notes: 'Aide à la toilette et préparation du repas',
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[1].id, // Jean Martin
        patientId: patients[2].id, // Marguerite Dupont
        startTime: createDate(1, 14, 0),
        endTime: createDate(1, 16, 0),
        status: AssignmentStatus.PLANNED,
        notes: 'Promenade et activités',
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[2].id, // Sophie Bernard
        patientId: patients[1].id, // Robert Lefebvre
        startTime: createDate(2, 10, 0),
        endTime: createDate(2, 12, 30),
        status: AssignmentStatus.PLANNED,
        notes: 'Rendez-vous médical et pharmacie',
      },
    }),
  );

  // Next week - Future planned assignments
  assignments.push(
    await prisma.assignment.create({
      data: {
        userId: users[3].id, // Pierre Petit
        patientId: patients[4].id, // Simone Fontaine
        startTime: createDate(7, 9, 0),
        endTime: createDate(7, 11, 30),
        status: AssignmentStatus.PLANNED,
        notes: 'Aide au lever et petit-déjeuner',
      },
    }),
    await prisma.assignment.create({
      data: {
        userId: users[4].id, // Claire Rousseau
        patientId: patients[3].id, // Henri Garnier
        startTime: createDate(8, 16, 0),
        endTime: createDate(8, 18, 0),
        status: AssignmentStatus.PLANNED,
        notes: 'Préparation du dîner',
      },
    }),
  );

  // One cancelled assignment
  assignments.push(
    await prisma.assignment.create({
      data: {
        userId: users[0].id, // Marie Dubois
        patientId: patients[2].id, // Marguerite Dupont
        startTime: createDate(-4, 14, 0),
        endTime: createDate(-4, 16, 0),
        status: AssignmentStatus.CANCELLED,
        notes: 'Annulé - Patient hospitalisé',
      },
    }),
  );

  console.log(`✅ Created ${assignments.length} assignments`);

  // =====================================================================
  // SUMMARY
  // =====================================================================
  console.log('\n📊 Seeding Summary:');
  console.log('==================');
  console.log(`👤 Admin: admin (password: admin123)`);
  console.log(`👥 Healthcare Workers: ${users.length}`);
  users.forEach(user => {
    console.log(`   - ${user.name} (password: worker123) - ${user.hourlyRate}€/h`);
  });
  console.log(`🏥 Patients: ${patients.length}`);
  patients.forEach(patient => {
    console.log(`   - ${patient.firstName} ${patient.lastName}`);
  });
  console.log(`📅 Assignments: ${assignments.length}`);
  console.log(`   - Completed: ${assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length}`);
  console.log(`   - Planned: ${assignments.filter(a => a.status === AssignmentStatus.PLANNED).length}`);
  console.log(`   - Cancelled: ${assignments.filter(a => a.status === AssignmentStatus.CANCELLED).length}`);
  console.log('\n✅ Seeding finished successfully!');
  console.log('\n🔐 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
