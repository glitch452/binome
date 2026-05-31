# Versioning & GitHub Releases — Task List

Derived from `specs/features/versioning-and-releases.md`. Tasks are ordered so each builds on the previous. Each is
small, independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are config/CI/scaffolding verified by a build / dry-run.

---

## Phase A — Build Info: schema, builder & generation

- [x] **VR-01** Add the `zod` dependency. Define `buildInfoSchema` in `lib/build-info.ts` (`version`, `commit`,
      `commitShort` non-empty strings; `releaseUrl` nullable URL; `buildTime` ISO datetime) and export
      `type BuildInfo = z.infer<typeof buildInfoSchema>`. Co-locate `lib/build-info.test.ts` schema cases: valid payload
      (incl. `releaseUrl: null`) passes; missing/empty field and non-URL `releaseUrl` fail. **Verify:** `npm run type`.
- [x] **VR-02** Implement the pure builder `createBuildInfo(env, now)` in `lib/build-info.ts` returning a `BuildInfo`:
      resolves `version` (`BUILD_VERSION` → injected git value → `0.0.0-dev`), `commit` (`GIT_SHA` → git → `unknown`),
      `commitShort` (first 7), `releaseUrl` from `GITHUB_REPOSITORY` (fallback `glitch452/binome`) + version (`null` for
      the dev fallback), and `buildTime`. Extend `lib/build-info.test.ts`: env-var path, dev fallback (`0.0.0-dev`,
      `releaseUrl: null`), short-hash truncation, release-URL construction, and result satisfies `buildInfoSchema`.
      (Keep git lookups out of the pure fn — pass resolved git values in.)
- [x] **VR-03** Add `tsx` (devDependency). Implement `scripts/generate-build-info.ts` importing `createBuildInfo` +
      `buildInfoSchema` from `lib/build-info.ts`; resolve git fallbacks locally (`git describe`/`rev-parse`), build the
      info, `parse` it with the schema, and write `public/build-info.json`. **Verify:**
      `tsx scripts/generate-build-info.ts` emits a valid file. **(no unit test — logic covered by VR-01/02)**
- [x] **VR-04** Wire generation into npm lifecycle in `package.json`: `predev` and `prebuild` →
      `tsx scripts/generate-build-info.ts`. Add `public/build-info.json` to `.gitignore`. **Verify:** `npm run build`
      produces `public/build-info.json`. **(no unit test)**

## Phase B — Toast infrastructure

- [x] **VR-05** Add `sonner` (dependency); add the shadcn sonner component `components/ui/sonner.tsx` and mount
      `<Toaster />` in `app/layout.tsx` (theme-aware). **Verify:** a manual `toast()` renders. **(no unit test)**

## Phase C — Serve & surface in the app

- [x] **VR-06** Implement `hooks/useBuildInfo.ts` — fetch `/build-info.json` on mount, parse with
      `buildInfoSchema.safeParse`. On fetch failure → `toast.error('Failed to load build info')` + return null; on
      `safeParse` failure → `toast.error('Build info is invalid')` + return null; on success → return the validated
      `BuildInfo`. Co-locate `hooks/useBuildInfo.test.ts` (mock `fetch` + `sonner`): success → info, no toast; 404 /
      reject → null + load toast; malformed body → null + invalid toast.
- [x] **VR-07** Implement `components/shared/BuildInfoFooter.tsx` — renders `v<version> (<commitShort>)`; link to
      `releaseUrl` when present (`target="_blank" rel="noreferrer"`), plain text otherwise; hidden when build info is
      null; respects color scheme; has `aria-label`. Co-locate test (link vs plain text vs hidden, aria-label).
- [x] **VR-08** Mount `<BuildInfoFooter />` once in `components/AppShell.tsx` so it shows under both views. Extend
      `components/AppShell.test.tsx` to assert it renders.

## Phase D — Dockerfile

- [x] **VR-09** Add `ARG BUILD_VERSION` / `ARG GIT_SHA` → `ENV` to the `builder` stage of `Dockerfile` (before
      `RUN npm run build`) so the in-image `prebuild` reads them. **Verify:**
      `docker build --build-arg BUILD_VERSION=9.9.9 --build-arg GIT_SHA=$(git rev-parse HEAD) -t binome .` and confirm
      `build-info.json` inside the image carries those values. **(no unit test)**

## Phase E — semantic-release & CI

- [x] **VR-10** Add `release.config.mjs`: branches `['main']`; `@semantic-release/commit-analyzer` with
      `preset: 'conventionalcommits'` and `releaseRules` mapping every conventional type to ≥ patch (`feat` → minor,
      `breaking` → major); `@semantic-release/release-notes-generator` with the same preset + `presetConfig.types` so
      all types render as named sections; `@semantic-release/github` (`successComment: false`, `failComment: false`).
      **No** npm/git plugins. Add devDeps: `semantic-release`, `@semantic-release/commit-analyzer`,
      `@semantic-release/release-notes-generator`, `@semantic-release/github`,
      `conventional-changelog-conventionalcommits`. **Verify:** `npx semantic-release --dry-run` runs. **(no unit
      test)**
- [x] **VR-11** Rewrite `.github/workflows/release.yml` per feature spec §6: checkout `fetch-depth: 0`; compute version
      via `cycjimmy/semantic-release-action@v4` (`dry_run: true`) → `new_release_published`, `new_release_version`,
      `new_release_major_version`, `new_release_minor_version`; gate remaining steps on
      `new_release_published == 'true'`; GHCR login; `docker/metadata-action` `type=raw` tags `latest`, `v<version>`,
      `v<major>.<minor>`, `v<major>`, plus `type=sha,prefix=sha-`; build & push with `build-args`
      `BUILD_VERSION`/`GIT_SHA`; real `cycjimmy/semantic-release-action@v4` to create the tag + GitHub Release; final
      step force-updates the rolling git tags `v<major>`, `v<major>.<minor>`, `latest` → `$GITHUB_SHA` and pushes them.
      Permissions: `contents/packages/issues/pull-requests: write`. **(no unit test)**
- [x] **VR-12** Update `.github/workflows/pr.yml` — add a non-blocking dry-run step surfacing the predicted next
      version + notes for the PR (log, and optionally post a PR comment). **(no unit test)**

## Phase F — Documentation

- [x] **VR-13** Confirm `specs/requirements.md` §12 (bump table, tags, zod + toast) and `CLAUDE.md` (CI/CD + build-info)
      match the implementation; adjust if anything drifted. **(no unit test)**

## Phase G — Verification

- [x] **VR-14** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`
      (confirm `public/build-info.json` emitted and schema-valid), `docker build` with build-args (confirm baked
      values), and `npx semantic-release --dry-run` on a feature branch. After a real release, confirm `v<major>` /
      `v<major>.<minor>` / `latest` moved. **(no unit test)**
