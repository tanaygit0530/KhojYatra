import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../frontend');

console.log('Running static security audit on frontend workspace...');

let violations = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        violations.push(`Security violation: ${fullPath} references SUPABASE_SERVICE_ROLE_KEY`);
      }
      if (content.includes('backend/src/db/supabaseClient')) {
        violations.push(`Security violation: ${fullPath} imports backend supabaseClient`);
      }
    }
  }
}

scanDirectory(frontendDir);

if (violations.length > 0) {
  console.error('❌ Security check FAILED:\n' + violations.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Security check PASSED: No service-role keys or backend db modules exposed to frontend.');
}
