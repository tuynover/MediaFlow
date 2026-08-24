import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');
const targetDir = path.join(rootDir, 'node_modules', '@mediaflow');

fs.mkdirSync(targetDir, { recursive: true });

const pkgs = fs.readdirSync(packagesDir);
for (const pkg of pkgs) {
  const srcPath = path.join(packagesDir, pkg);
  const dstPath = path.join(targetDir, pkg);

  if (fs.existsSync(dstPath)) {
    fs.rmSync(dstPath, { recursive: true, force: true });
  }

  fs.cpSync(srcPath, dstPath, { recursive: true });
  console.log(`✅ Synced @mediaflow/${pkg} to node_modules/@mediaflow/${pkg}`);
}
