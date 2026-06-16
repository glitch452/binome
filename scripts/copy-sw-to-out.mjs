// @ts-check
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');
const outDir = join(process.cwd(), 'out');

const swSrc = join(publicDir, 'sw.js');
// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
if (!existsSync(swSrc)) {
  console.error('Error: public/sw.js not found. Run `serwist build` before this script.');
  process.exit(1);
}

// Stamp the service worker with the build version + commit so every release is byte-different. The
// precache manifest already changes when the inlined version changes a content-hashed chunk, but
// this makes "new version → new sw.js" an explicit guarantee rather than relying on that chain — so
// the browser always detects a new worker for a new release. (sw.js is gitignored and excluded from
// lint/prettier, so appending a comment is safe.)
const buildInfoPath = join(publicDir, 'build-info.json');
// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
if (existsSync(buildInfoPath)) {
  const { version, commitShort } =
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: known static path
    /** @type {{ version: string, commitShort: string }} */ (JSON.parse(readFileSync(buildInfoPath, 'utf8')));
  const stamp = `// binome build ${version} (${commitShort})`;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: known static path
  const sw = readFileSync(swSrc, 'utf8');
  if (!sw.includes(stamp)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: known static path
    writeFileSync(swSrc, `${sw}\n${stamp}\n`);
    console.log(`✓ Stamped public/sw.js with ${stamp}`);
  }
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
