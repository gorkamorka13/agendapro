
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        name: 'RealVisitor',
        fullName: 'Le Visiteur',
        email: 'real@visitor.com',
        hashedPassword: 'password123', // Just for test
        role: 'VISITEUR',
        color: '#10b981'
      }
    });
    console.log('Created!', user);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
