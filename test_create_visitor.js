
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to create a test visitor user...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Visitor',
        email: 'testvisitor@example.com',
        hashedPassword: 'dummy',
        role: 'VISITEUR',
        color: '#ff00ff'
      },
    });
    console.log('Success!', testUser);

    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('Cleaned up test user.');
  } catch (e) {
    console.error('Error during creation:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
