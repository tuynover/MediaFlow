import fs from 'node:fs';
import path from 'node:path';

// Regex patterns to detect forbidden RhinoQ imports or dependencies
const FORBIDDEN_PATTERNS = [
  /@rhinoq\//i,
  /from\s+['"]rhinoq/i,
  /require\(['"]rhinoq/i,
  /import\(['"]rhinoq/i,
];

const ROOT_DIR = process.cwd();
const SCAN_TARGETS = ['apps', 'packages', 'scripts', 'package.json', 'pnpm-lock.yaml'];
const SCRIPT_NAME = 'verify-no-rhinoq.mjs';

let violationsFound = false;

function scanPath(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(targetPath);
    for (const entry of entries) {
      scanPath(path.join(targetPath, entry));
    }
  } else if (stat.isFile()) {
    if (path.basename(targetPath) === SCRIPT_NAME) return; // Skip self

    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            console.error(`❌ [VERIFY-FAIL] RhinoQ reference found in ${path.relative(ROOT_DIR, targetPath)}:${index + 1}`);
            console.error(`   Line: ${line.trim()}`);
            violationsFound = true;
          }
        }
      });
    } catch (err) {
      // Skip unreadable binary files
    }
  }
}

console.log('🔍 Running verify-no-rhinoq check on codebase targets (apps, packages, scripts, configs)...');
for (const target of SCAN_TARGETS) {
  scanPath(path.join(ROOT_DIR, target));
}

if (violationsFound) {
  console.error('\n💥 FAILURE: Forbidden RhinoQ references detected!');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: No RhinoQ dependencies or code imports found.');
}
