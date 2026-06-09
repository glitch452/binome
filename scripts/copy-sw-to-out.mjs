// @ts-check
import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');
const outDir = join(process.cwd(), 'out');

const swSrc = join(publicDir, 'sw.js');
// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
if (!existsSync(swSrc)) {
  console.error('Error: public/sw.js not found. Run `serwist build` before this script.');
  process.exit(1);
}

cpSync(swSrc, join(outDir, 'sw.js'));
console.log('✓ Copied public/sw.js → out/sw.js');

const swMapSrc = join(publicDir, 'sw.js.map');
// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
if (existsSync(swMapSrc)) {
  cpSync(swMapSrc, join(outDir, 'sw.js.map'));
  console.log('✓ Copied public/sw.js.map → out/sw.js.map');
}

// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
const sweWorkerFiles = readdirSync(publicDir).filter((f) => /^swe-worker-.*\.js$/.test(f));
for (const file of sweWorkerFiles) {
  cpSync(join(publicDir, file), join(outDir, file));
  console.log(`✓ Copied public/${file} → out/${file}`);
}
