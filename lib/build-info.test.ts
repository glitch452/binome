import { describe, expect, it } from 'vitest';

import { buildInfoSchema, createBuildInfo } from './build-info';

const FIXED_NOW = new Date('2024-06-01T10:00:00.000Z');
const FULL_SHA = 'a1b2c3d4e5f6789012345678901234567890abcd';
const SHORT_SHA = 'a1b2c3d';

const VALID_PAYLOAD = {
  version: '1.4.0',
  commit: FULL_SHA,
  commitShort: SHORT_SHA,
  releaseUrl: 'https://github.com/glitch432/binome/releases/tag/v1.4.0',
  releasesUrl: 'https://github.com/glitch432/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

describe('build-info', () => {
  describe('buildInfoSchema', () => {
    describe('valid payloads', () => {
      it('accepts a complete valid payload', () => {
        expect(buildInfoSchema.safeParse(VALID_PAYLOAD).success).toBe(true);
      });

      it('accepts a payload with releaseUrl: null', () => {
        expect(buildInfoSchema.safeParse({ ...VALID_PAYLOAD, releaseUrl: null }).success).toBe(true);
      });
    });

    describe('invalid payloads', () => {
      it('rejects a missing version field', () => {
        const { version: _, ...rest } = VALID_PAYLOAD;
        expect(buildInfoSchema.safeParse(rest).success).toBe(false);
      });

      it('rejects an empty version string', () => {
        expect(buildInfoSchema.safeParse({ ...VALID_PAYLOAD, version: '' }).success).toBe(false);
      });

      it('rejects an empty commit string', () => {
        expect(buildInfoSchema.safeParse({ ...VALID_PAYLOAD, commit: '' }).success).toBe(false);
      });

      it('rejects a non-URL releaseUrl string', () => {
        expect(buildInfoSchema.safeParse({ ...VALID_PAYLOAD, releaseUrl: 'not-a-url' }).success).toBe(false);
      });

      it('rejects an invalid buildTime string', () => {
        expect(buildInfoSchema.safeParse({ ...VALID_PAYLOAD, buildTime: 'not-a-date' }).success).toBe(false);
      });
    });
  });

  describe('createBuildInfo', () => {
    describe('env-var path', () => {
      it('uses BUILD_VERSION when provided', () => {
        const info = createBuildInfo({ BUILD_VERSION: '2.3.4', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.version).toBe('2.3.4');
      });

      it('uses GIT_SHA when provided', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.commit).toBe(FULL_SHA);
      });

      it('constructs the release URL from GITHUB_REPOSITORY and version', () => {
        const info = createBuildInfo(
          { BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA, GITHUB_REPOSITORY: 'owner/myapp' },
          FIXED_NOW,
        );
        expect(info.releaseUrl).toBe('https://github.com/owner/myapp/releases/tag/v1.0.0');
      });

      it('falls back to glitch452/binome when GITHUB_REPOSITORY is absent', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.releaseUrl).toBe('https://github.com/glitch452/binome/releases/tag/v1.0.0');
      });

      it('strips a leading v from a git-describe version in the release URL', () => {
        const info = createBuildInfo({ GIT_VERSION_FALLBACK: 'v2.3.4', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.releaseUrl).toBe('https://github.com/glitch452/binome/releases/tag/v2.3.4');
      });

      it('sets releaseUrl to null when version is a raw git SHA', () => {
        const info = createBuildInfo({ GIT_VERSION_FALLBACK: 'a1b2c3d', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.releaseUrl).toBeNull();
      });

      it('always provides releasesUrl pointing to the all-releases page', () => {
        const info = createBuildInfo(
          { GIT_VERSION_FALLBACK: 'a1b2c3d', GIT_SHA: FULL_SHA, GITHUB_REPOSITORY: 'owner/myapp' },
          FIXED_NOW,
        );
        expect(info.releasesUrl).toBe('https://github.com/owner/myapp/releases');
      });

      it('releasesUrl is the base of releaseUrl when a version is present', () => {
        const info = createBuildInfo(
          { BUILD_VERSION: '1.2.3', GIT_SHA: FULL_SHA, GITHUB_REPOSITORY: 'owner/myapp' },
          FIXED_NOW,
        );
        expect(info.releaseUrl).toBe(`${info.releasesUrl}/tag/v1.2.3`);
      });
    });

    describe('git fallback path', () => {
      it('uses GIT_VERSION_FALLBACK when BUILD_VERSION is absent', () => {
        const info = createBuildInfo({ GIT_SHA: FULL_SHA, GIT_VERSION_FALLBACK: '1.2.3' }, FIXED_NOW);
        expect(info.version).toBe('1.2.3');
      });

      it('uses GIT_SHA_FALLBACK when GIT_SHA is absent', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA_FALLBACK: FULL_SHA }, FIXED_NOW);
        expect(info.commit).toBe(FULL_SHA);
      });
    });

    describe('dev fallback', () => {
      it('returns 0.0.0-dev when no version source is available', () => {
        const info = createBuildInfo({}, FIXED_NOW);
        expect(info.version).toBe('0.0.0-dev');
      });

      it('returns releaseUrl: null for the dev fallback version', () => {
        const info = createBuildInfo({}, FIXED_NOW);
        expect(info.releaseUrl).toBeNull();
      });

      it('returns unknown commit when no SHA source is available', () => {
        const info = createBuildInfo({}, FIXED_NOW);
        expect(info.commit).toBe('unknown');
      });
    });

    describe('commitShort truncation', () => {
      it('truncates commit to 7 characters', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.commitShort).toBe(SHORT_SHA);
      });

      it('commitShort equals the first 7 chars of commit', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(info.commitShort).toBe(info.commit.slice(0, SHORT_SHA.length));
      });
    });

    describe('buildTime', () => {
      it('uses the injected now as an ISO 8601 string', () => {
        const info = createBuildInfo({}, FIXED_NOW);
        expect(info.buildTime).toBe(FIXED_NOW.toISOString());
      });
    });

    describe('schema satisfaction', () => {
      it('the returned value satisfies buildInfoSchema', () => {
        const info = createBuildInfo({ BUILD_VERSION: '1.0.0', GIT_SHA: FULL_SHA }, FIXED_NOW);
        expect(buildInfoSchema.safeParse(info).success).toBe(true);
      });

      it('the dev fallback also satisfies buildInfoSchema', () => {
        const info = createBuildInfo({}, FIXED_NOW);
        expect(buildInfoSchema.safeParse(info).success).toBe(true);
      });
    });
  });
});
