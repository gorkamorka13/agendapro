
// npm run db:sync
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDiagnostic() {
  console.log('--- 🛡️ DIAGNOSTIC DE SYNCHRONISATION PRISMA ---');

  // 1. Check DB URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ ERREUR : DATABASE_URL n\'est pas définie dans l\'environnement.');
  } else {
    const host = dbUrl.split('@')[1]?.split('/')[0] || 'Inconnu';
    console.log(`✅ URL Environnement : Connecté à ${host}`);
  }

  try {
    // 2. Check Enums directly in Postgres
    console.log('\n--- Vérification des Énumérations (Postgres) ---');
    const roles = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE typname = 'Role';
    `;

    if (roles.length > 0) {
      const roleList = roles.map(r => r.enumlabel).join(', ');
      console.log(`✅ Rôles trouvés en base : [ ${roleList} ]`);

      if (!roleList.includes('VISITEUR')) {
        console.warn('⚠️ ATTENTION : Le rôle "VISITEUR" est MANQUANT dans la base de données.');
      } else {
        console.log('✨ La base de données est à jour avec le rôle "VISITEUR".');
      }
    } else {
      console.error('❌ ERREUR : Impossible de trouver le type "Role" en base.');
    }

    // 3. Check Assignment Columns
    console.log('\n--- Vérification des colonnes Assignment ---');
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Assignment';
    `;

    const colNames = columns.map(c => c.column_name);
    console.log(`✅ Colonnes trouvées : [ ${colNames.join(', ')} ]`);

    const requiredCols = ['isRecurring', 'recurrenceId'];
    requiredCols.forEach(col => {
      if (colNames.includes(col)) {
        console.log(`✨ Colonne "${col}" OK.`);
      } else {
        console.error(`❌ ERREUR : Colonne "${col}" est MANQUANTE.`);
      }
    });

    // 4. Test Query
    console.log('\n--- Test de Connexion ---');
    const userCount = await prisma.user.count();
    console.log(`✅ Nombre d'utilisateurs en base : ${userCount}`);

  } catch (error) {
    console.error('\n❌ ERREUR DE CONNEXION :');
    console.error(error.message);
    console.log('\n💡 CONSEIL : Vérifiez que vos URLs dans .env et .env.local sont IDENTIQUES.');
  } finally {
    await prisma.$disconnect();
    console.log('\n--- FIN DU DIAGNOSTIC ---');
  }
}

runDiagnostic();
