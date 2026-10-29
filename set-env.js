const fs = require('fs');
const path = require('path');

// 1. Chargement automatique du .env s'il existe
const envFilePath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIdx = trimmed.indexOf('=');
    if (separatorIdx !== -1) {
      const key = trimmed.slice(0, separatorIdx).trim();
      let value = trimmed.slice(separatorIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// 2. Chemins cibles
const targetDir = './src/environments';
const targetEnvPath = './src/environments/environment.ts';
const targetProdPath = './src/environments/environment.prod.ts';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Récupérer l'URL existante dans environment.ts si déjà configurée
let existingDevUrl = '';
if (fs.existsSync(targetEnvPath)) {
  const content = fs.readFileSync(targetEnvPath, 'utf8');
  const urlMatch = content.match(/apiUrl:\s*['"`]([^'"`]*)['"`]/);
  if (urlMatch && urlMatch[1]) {
    existingDevUrl = urlMatch[1];
  }
}

let existingProdUrl = '';
if (fs.existsSync(targetProdPath)) {
  const content = fs.readFileSync(targetProdPath, 'utf8');
  const urlMatch = content.match(/apiUrl:\s*['"`]([^'"`]*)['"`]/);
  if (urlMatch && urlMatch[1]) {
    existingProdUrl = urlMatch[1];
  }
}

// 3. Résolution des URLs : priorité absolue au fichier .env ou variables système (aucune URL de prod en clair dans le code source)
const devApiUrl = (
  process.env.API_URL ||
  process.env.OAS_API_URL ||
  existingDevUrl ||
  'http://localhost:9090'
).replace(/\/+$/, '');

const prodApiUrl = (
  process.env.API_URL_PROD ||
  process.env.OAS_API_URL_PROD ||
  (process.env.NODE_ENV === 'production' ? process.env.API_URL : null) ||
  existingProdUrl ||
  ''
).replace(/\/+$/, '');

// 4. Génération des fichiers TypeScript
const devConfigFile = `export const environment = {
  production: false,
  apiUrl: '${devApiUrl}',
};
`;

const prodConfigFile = `export const environment = {
  production: true,
  apiUrl: '${prodApiUrl}',
};
`;

fs.writeFileSync(targetEnvPath, devConfigFile);
fs.writeFileSync(targetProdPath, prodConfigFile);

console.log(`[set-env] Configuration des environnements générée :`);
console.log(`  - Dev  API URL (environment.ts)      : ${devApiUrl}`);
console.log(`  - Prod API URL (environment.prod.ts) : ${prodApiUrl}`);

// 5. Ajustement dynamique du CSP pour la production
// Lors d'un build de production (ex: Docker avec NODE_ENV=production ou CI/CD),
// on épure connect-src dans src/index.html pour ne garder que l'API officielle et Cloudinary,
// tout en laissant les liens de test (localhost, oas-test.de) intacts dans le repo Git pour l'équipe.
const isProdBuild = process.env.NODE_ENV === 'production' || process.argv.includes('--configuration=production') || process.argv.includes('--prod');
const indexPath = path.resolve(__dirname, 'src/index.html');

if (isProdBuild && prodApiUrl && fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const wssUrl = prodApiUrl.replace(/^http(s?):/, 'wss:');
  const strictConnectSrc = `connect-src 'self' ${prodApiUrl} ${wssUrl} https://api.cloudinary.com;`;
  
  const updatedContent = indexContent.replace(
    /connect-src\s+[^;]+;/g,
    strictConnectSrc
  );
  
  if (updatedContent !== indexContent) {
    fs.writeFileSync(indexPath, updatedContent);
    console.log(`[set-env] Production détectée : CSP connect-src épuré automatiquement -> ${strictConnectSrc}`);
  }
}

