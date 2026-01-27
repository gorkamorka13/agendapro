const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Configuration
const projectRoot = path.resolve(__dirname, '..');
const prismaBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

function printHeader(text) {
  console.log('\n' + '='.repeat(50));
  console.log(` ${text}`);
  console.log('='.repeat(50));
}

async function main() {
  printHeader('🔄 ASSISTANT DE SYNCHRONISATION BDD');

  try {
    // Étape 1 : Tentative propre (Migrate Dev)
    console.log('Tentative de migration standard (prisma migrate dev)...');
    try {
        await runCommand(prismaBin, ['migrate', 'dev']);
        console.log('✅ Migration réussie !');
    } catch (e) {
        console.warn('⚠️ La migration standard a échoué.');
        console.log('Cela arrive souvent quand on ajoute un champ obligatoire sans valeur par défaut,');
        console.log('ou quand le schéma local a divergé de la base distante.');

        const answer = await askQuestion('\nQue voulez-vous faire ?\n1. Forcer la mise à jour (db push) - Conserve les données si possible\n2. Réinitialiser la base (migrate reset) - ⚠️ PERTE DE DONNÉES\n3. Annuler\n\nVotre choix (1/2/3) : ');

        if (answer.trim() === '1') {
            printHeader('🚀 FORCAGE DE LA MISE À JOUR (DB PUSH)');
            await runCommand(prismaBin, ['db', 'push']);
            console.log('✅ Schéma poussé avec succès.');
        } else if (answer.trim() === '2') {
            printHeader('💀 RÉINITIALISATION TOTALE (RESET)');
            const confirm = await askQuestion('Êtes-vous SÛR de vouloir tout effacer ? (oui/non) : ');
            if (confirm.toLowerCase() === 'oui') {
                await runCommand(prismaBin, ['migrate', 'reset', '--force']);
                console.log('✅ Base réinitialisée et seedée.');
            } else {
                console.log('Annulation.');
                process.exit(0);
            }
        } else {
            console.log('Annulation.');
            process.exit(0);
        }
    }

    // Étape 2 : Génération du client
    printHeader('🛠️ GÉNÉRATION DU CLIENT PRISMA');
    await runCommand(prismaBin, ['generate']);
    console.log('✅ Client Prisma généré.');

    console.log('\n✨ Synchronisation terminée avec succès !');

  } catch (error) {
    console.error('\n❌ UNE ERREUR EST SURVENUE :');
    console.error(error.message);
  } finally {
    rl.close();
  }
}

main();
