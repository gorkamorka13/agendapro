const fs = require('fs');
const path = require('path');

// Use process.cwd() to get project root (works on Vercel and locally)
const packagePath = path.join(process.cwd(), 'package.json');

if (!fs.existsSync(packagePath)) {
  console.error('❌ Error: package.json not found at', packagePath);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse current version
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Write back
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version incremented: ${major}.${minor}.${patch} → ${newVersion}`);
