# Feature Spec — Versioning & GitHub Releases

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §12, `specs/tasks/VERSIONING_TASKS.md`

## 1. Summary

Introduce automated semantic versioning for Binome. The current version is tracked in **GitHub Releases** (the latest
release/tag is the current version). On every push to `main`, the conventional-commit messages that landed (the commits
that were in the merged PR) determine the next [semver](https://semver.org) version and the generated release notes. The
release tags both the Docker image (in GHCR) and the git repo with rolling major / major-minor pointers plus the
immutable full version. The build bakes the resolved version and commit hash into a servable, zod-validated
`build-info.json`, and the app surfaces the version in a footer that links to its GitHub Release.

## 2. Goals

- Single source of truth for the current version: **GitHub Releases / git tags** (no version committed to
  `package.json`).
- Next version derived automatically from conventional commits (see §4 for the full bump table).
- Release notes generated automatically from those commits and attached to the GitHub Release.
- Rolling and immutable **git tags** and **Docker image tags**: `vX.Y.Z` (immutable), `vX.Y` (rolling), `vX` (rolling),
  and `latest` (rolling) — all updated to the current release on `main`.
- A zod-validated `build-info.json` served by the app at `/build-info.json` containing the version, full + short commit
  hash, a link to the GitHub Release, and the build timestamp.
- The CI build determines version and hash from **environment variables** (passed as Docker build-args), with a
  local-dev fallback.
- A small UI footer showing `v<version> (<shortHash>)` linking to the GitHub Release, plus a toast if the build info
  fails to load or validate.

## 3. Non-Goals (v1 of this feature)

- Publishing to npm (the release pipeline ships a Docker image to GHCR; npm publish was removed).
- Committing a changelog file or bumped `package.json` back to the repo (the release notes live in the GitHub Release).
- Pre-release / channel branches (`next`, `beta`) — `main` only for now.
- Manual/forced version overrides.

## 4. Versioning Scheme

- **SemVer 2.0.0**, tag format `v<major>.<minor>.<patch>` (e.g. `v1.4.0`), matching semantic-release's default.
- Per the [Conventional Commits](https://www.conventionalcommits.org) recommended type set (as enforced on PRs by
  commitlint's `config-conventional`), **every** type triggers at least a patch release. `feat` triggers a minor and any
  breaking change triggers a major:

| Commit                                                                                         | Bump  |
| ---------------------------------------------------------------------------------------------- | ----- |
| Any commit with `!` (e.g. `feat!:`) or a `BREAKING CHANGE:` footer                             | major |
| `feat:`                                                                                        | minor |
| `fix:`, `perf:`, `revert:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` | patch |

- Because every conventional type now produces a release, the only "no release" case is a push to `main` whose commits
  are entirely non-conventional (e.g. a bare merge commit). In that case the pipeline skips the build/push.
- The "current version" is whatever the latest GitHub Release tag is; semantic-release reads it from the git tags to
  compute the next one.

## 5. Release Tooling — semantic-release

Config file `release.config.mjs` at the repo root:

```js
const releaseRules = [
  { breaking: true, release: 'major' },
  { type: 'feat', release: 'minor' },
  { type: 'fix', release: 'patch' },
  { type: 'perf', release: 'patch' },
  { type: 'revert', release: 'patch' },
  { type: 'docs', release: 'patch' },
  { type: 'style', release: 'patch' },
  { type: 'refactor', release: 'patch' },
  { type: 'test', release: 'patch' },
  { type: 'build', release: 'patch' },
  { type: 'ci', release: 'patch' },
  { type: 'chore', release: 'patch' },
];

const noteTypes = [
  { type: 'feat', section: 'Features' },
  { type: 'fix', section: 'Bug Fixes' },
  { type: 'perf', section: 'Performance' },
  { type: 'revert', section: 'Reverts' },
  { type: 'docs', section: 'Documentation' },
  { type: 'style', section: 'Styles' },
  { type: 'refactor', section: 'Refactoring' },
  { type: 'test', section: 'Tests' },
  { type: 'build', section: 'Build System' },
  { type: 'ci', section: 'Continuous Integration' },
  { type: 'chore', section: 'Chores' },
];

export default {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits', releaseRules }],
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits', presetConfig: { types: noteTypes } },
    ],
    ['@semantic-release/github', { successComment: false, failComment: false }], // tag + GitHub Release
  ],
};
```

- The `conventionalcommits` preset is used by both the analyzer and the notes generator (so all types appear as named
  sections in the release notes, since they all now warrant a release). Requires the
  `conventional-changelog-conventionalcommits` package.
- `releaseRules` map every supported type to at least `patch` (§4). These types are **exactly** the `type-enum` from
  `@commitlint/config-conventional` (`build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
  `style`, `test`), which the commit-msg hook + PR CI already enforce — so every commit that reaches `main` resolves to
  a release. **Keep these in sync:** if commitlint's `type-enum` is ever customized, update `releaseRules` to match, or
  a newly-allowed type would fall through to the preset defaults (where `docs`/`chore`/etc. yield no release).
- **No** `@semantic-release/npm` (we do not publish to npm or bump `package.json`).
- **No** `@semantic-release/git` (we do not commit anything back to the repo).
- `@semantic-release/github` creates the immutable `vX.Y.Z` git tag and the GitHub Release with the generated notes; the
  rolling tags are handled by the workflow (§6).
- Dev dependencies: `semantic-release`, `@semantic-release/commit-analyzer`,
  `@semantic-release/release-notes-generator`, `@semantic-release/github`, `conventional-changelog-conventionalcommits`.

## 6. Release Pipeline (`.github/workflows/release.yml`)

Trigger: `push` to `main`. Because the version must be known **before** building the Docker image (to bake it into
`build-info.json` and tag the image), the job computes the version with a **dry run first**, builds/pushes the image,
then creates the release and updates the rolling tags. This ordering guarantees a GitHub Release only exists once its
image has been pushed.

```
push to main
  ├─ checkout (fetch-depth: 0 — full history + tags)
  ├─ setup-node (.nvmrc) + npm ci
  ├─ semantic-release --dry-run        → outputs: new_release_published, new_release_version,
  │     (cycjimmy/semantic-release-action@v4)   new_release_major_version, new_release_minor_version, new_release_notes
  └─ if new_release_published == 'true':
        ├─ docker login ghcr.io
        ├─ docker metadata  → tags: latest, v<version>, v<major>.<minor>, v<major>, sha-<short>
        ├─ docker build & push
        │     build-args: BUILD_VERSION=<version>, GIT_SHA=${{ github.sha }}
        ├─ semantic-release (real run)  → creates immutable tag v<version> + GitHub Release with notes
        └─ update rolling git tags      → force-move v<major>, v<major>.<minor>, latest → GITHUB_SHA, push
```

### Image & git tags

| Tag           | Kind                   | Moves each release? | Created by                     |
| ------------- | ---------------------- | ------------------- | ------------------------------ |
| `vX.Y.Z`      | Docker + git           | No (immutable)      | semantic-release (git) + meta  |
| `vX.Y`        | Docker + git (rolling) | Yes                 | workflow                       |
| `vX`          | Docker + git (rolling) | Yes                 | workflow                       |
| `latest`      | Docker + git (rolling) | Yes                 | workflow / docker metadata     |
| `sha-<short>` | Docker only            | n/a                 | docker metadata (traceability) |

Docker tags are produced with `docker/metadata-action` `type=raw` entries built from the semantic-release outputs:

```yaml
tags: |
  type=raw,value=latest,enable={{is_default_branch}}
  type=raw,value=v${{ steps.semver.outputs.new_release_version }}
  type=raw,value=v${{ steps.semver.outputs.new_release_major_version }}.${{ steps.semver.outputs.new_release_minor_version }}
  type=raw,value=v${{ steps.semver.outputs.new_release_major_version }}
  type=sha,prefix=sha-
```

The rolling **git** tags are force-updated after the release is created and pushed with the workflow token:

```bash
MAJOR="${{ steps.semver.outputs.new_release_major_version }}"
MINOR="${{ steps.semver.outputs.new_release_minor_version }}"
for t in "v${MAJOR}" "v${MAJOR}.${MINOR}" "latest"; do git tag -f "$t" "$GITHUB_SHA"; done
git push -f origin "v${MAJOR}" "v${MAJOR}.${MINOR}" "latest"
```

Permissions required: `contents: write` (tags/releases), `packages: write` (GHCR push), `issues: write` +
`pull-requests: write` (semantic-release may comment).

> The dry-run and the real run analyze the same commit range, so they resolve to the same version deterministically.

> **Assumption (please confirm):** `latest` is treated as both a Docker tag and a rolling **git** tag pointing at the
> current release commit. If a `latest` git tag is undesirable, drop it from the rolling-tag loop — the Docker `latest`
> tag is independent of it.

### PR preview (`.github/workflows/pr.yml`)

Add a non-blocking step that runs semantic-release in dry-run to compute and surface the **predicted next version** and
notes for the PR (logged, and optionally posted as a PR comment). This makes the version impact of a PR visible before
merge.

## 7. `build-info.json`

### Schema (zod)

The shape is defined once as a zod schema in `lib/build-info.ts`, and the `BuildInfo` type is inferred from it. The
schema is the single source of truth — used by the generator to validate output before writing, and by the app to parse
the file on load.

```ts
import { z } from 'zod';

export const buildInfoSchema = z.object({
  version: z.string().min(1), // semver, or "0.0.0-dev" in local dev
  commit: z.string().min(1), // full sha, or "unknown" in dev
  commitShort: z.string().min(1), // first 7 chars of commit
  releaseUrl: z.string().url().nullable(), // null in dev (no release exists)
  buildTime: z.string().datetime(), // ISO 8601
});

export type BuildInfo = z.infer<typeof buildInfoSchema>;
```

Example payload:

```jsonc
{
  "version": "1.4.0",
  "commit": "9f1c2ab3d4e5f6...",
  "commitShort": "9f1c2ab",
  "releaseUrl": "https://github.com/glitch452/binome/releases/tag/v1.4.0",
  "buildTime": "2026-05-31T12:00:00.000Z",
}
```

Served statically at **`GET /build-info.json`** from `public/build-info.json` (the standalone server serves `public/`).

### Generation

- Pure builder `createBuildInfo(env, now)` lives in `lib/build-info.ts` (returns a `BuildInfo`) and is unit-tested.
- `scripts/generate-build-info.ts` imports `createBuildInfo` + `buildInfoSchema`, resolves the git fallbacks locally,
  validates the result with the schema, and writes `public/build-info.json`. It is run with **`tsx`** so it shares the
  schema/types with the app (single source of truth, no duplicated logic).
- Wired via npm lifecycle scripts so it runs automatically:
  - `prebuild` → `tsx scripts/generate-build-info.ts` before `next build` (covers Docker, since the image runs
    `npm run build`).
  - `predev` → same, before `next dev` (so `/build-info.json` exists locally).
- `public/build-info.json` is a build artifact → add to `.gitignore`.

### Inputs & precedence

| Field         | Source (in order of precedence)                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `version`     | `BUILD_VERSION` env → else `git describe --tags --always` (local) → else `0.0.0-dev`                            |
| `commit`      | `GIT_SHA` env → else `git rev-parse HEAD` (local) → else `unknown`                                              |
| `commitShort` | first 7 chars of `commit`                                                                                       |
| `releaseUrl`  | built from `GITHUB_REPOSITORY` (fallback `glitch452/binome`) + version, `null` when version is the dev fallback |
| `buildTime`   | current ISO timestamp at generation                                                                             |

> Inside Docker, `.git` is excluded by `.dockerignore`, so the env-var path is the only one available there — exactly
> what we want. Git is a **local-dev** convenience fallback only.

### Docker build-args

The `builder` stage of the `Dockerfile` accepts and exports the values so the in-image `npm run build` (and its
`prebuild`) can read them:

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
ARG BUILD_VERSION
ARG GIT_SHA
ENV BUILD_VERSION=$BUILD_VERSION
ENV GIT_SHA=$GIT_SHA
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

## 8. App Integration

- **`lib/build-info.ts`** — `buildInfoSchema`, inferred `BuildInfo` type, and the pure `createBuildInfo` builder.
- **Toasts (`sonner`)** — shadcn's sonner component (`components/ui/sonner.tsx`) with `<Toaster />` mounted in
  `app/layout.tsx` (theme-aware). Used to report build-info failures.
- **`hooks/useBuildInfo.ts`** — fetches `/build-info.json` on mount, parses it with `buildInfoSchema.safeParse`. On a
  fetch failure or a schema-validation failure it fires a `toast.error` (distinct messages — "Failed to load build info"
  vs "Build info is invalid") and returns `null`. On success returns the validated `BuildInfo`.
- **`components/shared/BuildInfoFooter.tsx`** — renders `v<version> (<commitShort>)`; when `releaseUrl` is present the
  label is a link (opens the GitHub Release, `target="_blank" rel="noreferrer"`), otherwise plain text. Respects the
  active color scheme; carries an `aria-label`. Hidden entirely when build info is `null`.
- Mounted once in `components/AppShell.tsx` so it appears under both views.

Fetching at runtime (rather than baking values into the JS bundle) means the same compiled bundle reports whatever
`build-info.json` ships beside it.

## 9. Environment Variables

| Variable            | Set by                       | Purpose                                                 |
| ------------------- | ---------------------------- | ------------------------------------------------------- |
| `BUILD_VERSION`     | release workflow (build-arg) | SemVer version baked into `build-info.json` + image tag |
| `GIT_SHA`           | release workflow (build-arg) | Full commit hash baked into `build-info.json`           |
| `GITHUB_REPOSITORY` | GitHub Actions (built-in)    | `owner/repo` for constructing the release URL           |
| `GITHUB_TOKEN`      | GitHub Actions (built-in)    | semantic-release auth for tags/releases; GHCR push      |

## 10. Testing Strategy

- `lib/build-info.ts`:
  - `buildInfoSchema` — accepts a valid payload (incl. `releaseUrl: null`); rejects missing/empty fields and a non-URL
    `releaseUrl`.
  - `createBuildInfo` — env-var path, git-fallback shape, dev fallback (`0.0.0-dev`, `releaseUrl: null`), short-hash
    truncation, release-URL construction; result satisfies `buildInfoSchema`.
- `hooks/useBuildInfo.ts` — mock `fetch` + `sonner`: success → validated info, no toast; 404 / network error → null +
  "failed to load" toast; malformed JSON failing `safeParse` → null + "invalid" toast.
- `components/shared/BuildInfoFooter.tsx` — link when `releaseUrl` present, plain text otherwise, hidden when null; has
  `aria-label`.
- Pipeline — verified by a local `npx semantic-release --dry-run` on a feature branch and a `docker build` confirming
  `build-info.json` is emitted with the build-args; manual check that rolling tags move after a release.

## 11. Rollout Notes

- First release: with no existing tags, semantic-release starts at `v1.0.0` (its default initial version). If a
  different starting point is desired, push an annotated tag (e.g. `v0.1.0`) before the first run.
- New runtime/build dependencies introduced: `zod` (dependency), `sonner` (dependency), `tsx` (devDependency), plus the
  semantic-release packages and `conventional-changelog-conventionalcommits` (devDependencies).
- The stale "publish to npm" references in `specs/requirements.md` and `CLAUDE.md` are corrected as part of this work to
  reflect the GHCR Docker release + semantic-release versioning.
