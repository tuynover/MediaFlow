import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');
const pkgs = fs.readdirSync(packagesDir);

for (const pkg of pkgs) {
  const pkgJsonPath = path.join(packagesDir, pkg, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const content = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    content.main = 'dist/index.js';
    content.types = 'dist/index.d.ts';
    fs.writeFileSync(pkgJsonPath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ Updated ${pkg}/package.json main -> dist/index.js`);
  }
}
