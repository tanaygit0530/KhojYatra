import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bold = '\x1b[1m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

console.log(`\n${bold}${cyan}========================================================================${reset}`);
console.log(`${bold}${cyan}   🇮🇳  KHOJYATRA — PRE-DEPLOYMENT PRODUCTION VERIFICATION AUDIT       ${reset}`);
console.log(`${bold}${cyan}========================================================================${reset}\n`);

let checksPassed = 0;
let totalChecks = 0;

function runCheck(title, fn) {
  totalChecks++;
  process.stdout.write(`Checking ${title}... `);
  try {
    fn();
    console.log(`${green}✅ PASS${reset}`);
    checksPassed++;
  } catch (err) {
    console.log(`${red}❌ FAIL${reset}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }
}

// 1. Env example check
runCheck('.env.example configuration', () => {
  const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PORT'];
  for (const k of required) {
    if (!envExample.includes(k)) {
      throw new Error(`Missing required key ${k} in .env.example`);
    }
  }
});

// 2. Vercel SPA routing check
runCheck('vercel.json configuration & security headers', () => {
  const vercelPath = path.join(rootDir, 'vercel.json');
  if (!fs.existsSync(vercelPath)) throw new Error('vercel.json missing in repository root');
  const content = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  if (!content.rewrites || content.rewrites.length === 0) throw new Error('SPA rewrites missing in vercel.json');
  if (!content.headers || content.headers.length === 0) throw new Error('Security headers missing in vercel.json');
});

// 3. Render web service check
runCheck('render.yaml deployment spec', () => {
  const renderPath = path.join(rootDir, 'render.yaml');
  if (!fs.existsSync(renderPath)) throw new Error('render.yaml missing in repository root');
  const content = fs.readFileSync(renderPath, 'utf8');
  if (!content.includes('khojyatra-backend')) throw new Error('Missing service definition in render.yaml');
  if (!content.includes('/api/v1/health')) throw new Error('Missing /api/v1/health check in render.yaml');
});

// 4. Build output verification
runCheck('Workspace compilation & bundle outputs', () => {
  execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });

  const requiredOutputs = [
    path.join(rootDir, 'backend/dist/index.js'),
    path.join(rootDir, 'frontend/dist/index.html')
  ];

  for (const file of requiredOutputs) {
    if (!fs.existsSync(file)) {
      throw new Error(`Expected build artifact missing: ${file}`);
    }
  }
});

// 5. Static security audit
runCheck('Client-bundle static security pass', () => {
  execSync('npm run check:security', { cwd: rootDir, stdio: 'pipe' });
});

// 6. Warm color tokens compliance
runCheck('Design tokens & zero-green color lint', () => {
  execSync('npm run lint:colors --workspace=frontend', { cwd: rootDir, stdio: 'pipe' });
});

console.log(`\n${bold}${green}========================================================================${reset}`);
console.log(`${bold}${green}   🚀 AUDIT PASSED: ${checksPassed}/${totalChecks} PRODUCTION READINESS CHECKS PASSED${reset}`);
console.log(`${bold}${green}   Frontend ready for Vercel • Backend ready for Render / Railway       ${reset}`);
console.log(`${bold}${green}========================================================================${reset}\n`);
