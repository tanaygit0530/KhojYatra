import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

console.log('🔍 Checking for raw hex colors and disallowed green accents in frontend/src...');

// Disallowed green hex values or names (except semantic --color-success #2E9E6D in tokens)
const GREEN_PATTERNS = [
  /#(?:[0-9a-fA-F]{2})?(?:[4-9a-fA-F][0-9a-fA-F])(?:[0-9a-fA-F]{2})/i, // basic green-ish check
  /\bgreen-[0-9]{2,3}\b/,
  /\bemerald-[0-9]{2,3}\b/,
  /\bteal-[0-9]{2,3}\b/
];

let errors = [];

function checkFile(filePath) {
  const relPath = path.relative(srcDir, filePath);
  // DesignSystem.tsx is allowed to display the token swatches and their hex values
  if (relPath.includes('DesignSystem.tsx') || relPath.endsWith('tokens.css')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for hardcoded hex colors #xxxxxx or #xxx
    const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatches) {
      errors.push(`${relPath}:${index + 1} - Disallowed raw hex color literal: "${hexMatches.join(', ')}". Use CSS variables (--color-*) or Tailwind theme tokens.`);
    }

    // Check for green classes or green colors
    GREEN_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        errors.push(`${relPath}:${index + 1} - Disallowed green styling detected. Use --color-accent (sky-blue) instead.`);
      }
    });
  });
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

scanDir(srcDir);

if (errors.length > 0) {
  console.error('❌ Color Lint Errors Found:\n' + errors.join('\n'));
  process.exit(1);
} else {
  console.log('✅ Color Lint PASSED: Zero raw hex literals outside design system swatches and zero green styles.');
}
