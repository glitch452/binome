/**
 * Generates public/build-info.json at build/dev time.
 * Run via `tsx scripts/generate-build-info.ts` (wired as prebuild / predev).
 *
 * The pure logic lives in lib/build-info.ts; this script only handles I/O:
 * reading env vars, resolving git fallbacks, writing the JSON file.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildInfoSchema, createBuildInfo } from '../lib/build-info';

const INDENT = 2;

function tryExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const info = createBuildInfo(
  {
    BUILD_VERSION: process.env.BUILD_VERSION,
    GIT_SHA: process.env.GIT_SHA,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GIT_VERSION_FALLBACK: tryExec('git describe --tags --always'),
    GIT_SHA_FALLBACK: tryExec('git rev-parse HEAD'),
  },
  new Date(),
);

const validated = buildInfoSchema.parse(info);

const outPath = join(process.cwd(), 'public', 'build-info.json');
// eslint-disable-next-line security/detect-non-literal-fs-filename -- build script: path is cwd + known static subpath, not user input
writeFileSync(outPath, `${JSON.stringify(validated, null, INDENT)}\n`);

console.log(`✓ public/build-info.json written (${validated.version} @ ${validated.commitShort})`);
