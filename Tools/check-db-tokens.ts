import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Vérification de la table AiUsage ---');
  try {
    // @ts-ignore
    const count = await prisma.aiUsage.count();
    console.log(`Nombre d'enregistrements : ${count}`);

    // @ts-ignore
    const usage = await prisma.aiUsage.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    if (usage.length > 0) {
      console.log('\n10 derniers enregistrements :');
      console.table(usage.map(u => ({
        id: u.id,
        model: u.model,
        total: u.totalTokens,
        date: u.createdAt.toLocaleString()
      })));

      // @ts-ignore
      const total = await prisma.aiUsage.aggregate({
        _sum: { totalTokens: true }
      });
      console.log(`\nTotal cumulé : ${total._sum.totalTokens || 0} tokens`);
    } else {
      console.log('\nAucun enregistrement trouvé.');
    }
  } catch (error) {
    console.error('Erreur lors de la vérification :', error.message);
    if (error.message.includes('not found')) {
      console.log('CONSEIL : La table n\'existe peut-être pas encore. Avez-vous fait "npx prisma db push" ?');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
