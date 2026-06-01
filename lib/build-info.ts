import { z } from 'zod';

export const buildInfoSchema = z.object({
  version: z.string().min(1),
  commit: z.string().min(1),
  commitShort: z.string().min(1),
  releaseUrl: z.url().nullable(),
  releasesUrl: z.url(),
  buildTime: z.iso.datetime(),
});

export type BuildInfo = z.infer<typeof buildInfoSchema>;

export interface CreateBuildInfoEnv {
  BUILD_VERSION?: string | undefined;
  GIT_SHA?: string | undefined;
  GITHUB_REPOSITORY?: string | undefined;
  /** Resolved locally via `git describe --tags --always` */
  GIT_VERSION_FALLBACK?: string | undefined;
  /** Resolved locally via `git rev-parse HEAD` */
  GIT_SHA_FALLBACK?: string | undefined;
}

const COMMIT_SHORT_LENGTH = 7;
const DEV_VERSION = '0.0.0-dev';
const FALLBACK_COMMIT = 'unknown';
const FALLBACK_REPO = 'glitch452/binome';
const RELEASE_BASE_URL = 'https://github.com';
// Captures the X.Y.Z base from a version string — handles BUILD_VERSION ("1.2.3"),
// git-describe with v-prefix ("v1.2.3"), and git-describe ahead-of-tag
// ("v1.2.3-5-gabcdef"). Returns null for raw SHAs and the 0.0.0-dev sentinel.
const SEMVER_BASE_RE = /^v?(\d+\.\d+\.\d+)/;

function extractSemver(version: string): string | null {
  const match = SEMVER_BASE_RE.exec(version);
  const semver = match?.[1];
  if (!semver || semver === '0.0.0') {
    return null;
  }
  return semver;
}

/**
 * Returns the trimmed string, or `undefined` if absent or blank.
 * @param s
 */
function nonEmpty(s: string | undefined): string | undefined {
  const trimmed = s?.trim();
  return trimmed !== '' ? trimmed : undefined;
}

/**
 * Pure builder — all git lookups must be resolved externally and passed in via `env`.
 * @param env - Environment variables and pre-resolved git fallback values.
 * @param now - Current timestamp (injected for testability).
 */
export function createBuildInfo(env: CreateBuildInfoEnv, now: Date): BuildInfo {
  const version = nonEmpty(env.BUILD_VERSION) ?? nonEmpty(env.GIT_VERSION_FALLBACK) ?? DEV_VERSION;

  const commit = nonEmpty(env.GIT_SHA) ?? nonEmpty(env.GIT_SHA_FALLBACK) ?? FALLBACK_COMMIT;

  const commitShort = commit.slice(0, COMMIT_SHORT_LENGTH);

  const repo = nonEmpty(env.GITHUB_REPOSITORY) ?? FALLBACK_REPO;
  const semver = extractSemver(version);
  const releasesUrl = `${RELEASE_BASE_URL}/${repo}/releases`;
  const releaseUrl = semver !== null ? `${releasesUrl}/tag/v${semver}` : null;

  const buildTime = now.toISOString();

  return { version, commit, commitShort, releaseUrl, releasesUrl, buildTime };
}
