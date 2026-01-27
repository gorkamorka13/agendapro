
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: 'xxx' }
  });
  console.log('User xxx search result:', user);
}

main();
