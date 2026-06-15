# Static Build & Hosting — Task List

Derived from `specs/features/0007-static-hosting.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/config/infrastructure verified by a build or manual check.

---

## Phase A — Build config & SW copy script

- [x] **SH-01** Switch `next.config.ts` from `output: 'standalone'` to `output: 'export'`. **(no unit test)**
      **Verify:** `npm run build` succeeds and produces `out/index.html`; confirm `.next/standalone/` is no longer
      generated.

- [x] **SH-02** Add `scripts/copy-sw-to-out.js` — a Node.js script (no new dependencies; uses `fs.cpSync` /
      `fs.readdirSync`) that copies `public/sw.js`, `public/sw.js.map`, and any matching `public/swe-worker-*.js` files
      into `out/`. The script must throw (non-zero exit) if `public/sw.js` does not exist, and must silently skip absent
      optional artifacts (`sw.js.map`, `swe-worker-*.js`). **(no unit test)** **Verify:** after `npm run build`, confirm
      `out/sw.js` is present.

- [x] **SH-03** Update `package.json`: - `build` script: append `&& node scripts/copy-sw-to-out.js` after the
      `serwist build` step. - `start` script: change from `next start` to `npx serve out`. **(no unit test)**
      **Verify:** `npm run build` produces `out/sw.js`; `npm run start` after a build serves `out/` on a local port.

## Phase B — nginx config

- [x] **SH-04** Add `nginx.conf` at the repo root with: - `listen 80;` - Immutable cache headers for `/_next/static/`
      (`max-age=31536000, immutable`). - No-cache headers for `/sw.js`, `/swe-worker-*.js`, and `/build-info.json`. -
      `Service-Worker-Allowed: /` header on the `/sw.js` location. - `try_files $uri $uri.html $uri/ /index.html;`
      fallback for SPA routing. - `error_page 404 /404.html;` See §5 of the spec for the full block. **(no unit test)**
      **Verify:** `docker build .` succeeds.

## Phase C — Docker update

- [x] **SH-05** Rewrite `Dockerfile` to a two-stage build: - Stage 1 (`builder`): `node:24-alpine`, runs `npm ci` then
      `npm run build` (same `BUILD_VERSION`/`GIT_SHA` build args as today). - Stage 2 (`runner`): `nginx:alpine`,
      `COPY --from=builder /app/out /usr/share/nginx/html`, `COPY nginx.conf /etc/nginx/conf.d/default.conf`,
      `EXPOSE 80`. Remove the old `deps` stage and the standalone `COPY` commands. **(no unit test)** **Verify:**
      `docker build -t binome .` succeeds and the image does not contain `node` or `server.js`.

- [x] **SH-06** Update `docker-compose.yml`: change `ports` from `"3000:3000"` to `"3000:80"` (nginx listens on port 80
      internally). **(no unit test)** **Verify:** `docker compose up` serves the app at `http://localhost:3000`; confirm
      `/_next/static/` responses include `Cache-Control: immutable`; confirm `/sw.js` response includes
      `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.

- [x] **SH-07** Update `.github/workflows/release.yml` to build multi-arch Docker images: add
      `docker/setup-qemu-action@v4` and `docker/setup-buildx-action@v4` steps (each guarded by
      `if: steps.semver.outputs.new_release_published == 'true'`) immediately before the existing "Build and push Docker
      image" step; add `platforms: linux/amd64,linux/arm64` to the `docker/build-push-action` step. See §6.2 of the spec
      for the exact YAML. **(no unit test)** **Verify:** after a release, the pushed image manifest is multi-arch —
      `docker buildx imagetools inspect ghcr.io/<repo>:latest` should list both `linux/amd64` and `linux/arm64` digests.

## Phase D — GitHub Pages deployment

- [x] **SH-08** Add `public/CNAME` containing the custom domain (one line, no trailing newline). `next build` with
      `output: 'export'` copies `public/` to `out/`, so `out/CNAME` will be present in the Pages artifact. **(no unit
      test)** **Verify:** after `npm run build`, confirm `out/CNAME` exists with the correct domain.

- [x] **SH-09** Update `.github/workflows/release.yml`: 1. Add `outputs` to the `release` job that surface
      `new_release_published` and `new_release_version` from the semantic-release step outputs. 2. Add a `deploy-pages`
      job after the `release` job: - `needs: release` - `if: needs.release.outputs.new_release_published == 'true'` -
      `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }` - Narrow permissions:
      `pages: write`, `id-token: write`, `contents: read` - Steps: checkout → setup-node → `npm ci` → `npm run build`
      (with `BUILD_VERSION` and `GIT_SHA` from `needs.release.outputs`) → `actions/upload-pages-artifact@v5` (path
      `./out`) → `actions/deploy-pages@v5`. - Set `HUSKY: "0"` in env. See §7.3 of the spec for the full job block.
      **(no unit test)** **Verify:** a manual release run (or dry-run inspection) shows the `deploy-pages` job in the
      workflow; confirm `pages: write` is not present on the top-level `permissions` block.

## Phase E — Documentation

- [x] **SH-10** Update `specs/requirements.md`: - Edit §11 (Docker Deployment): replace references to `standalone` /
      `node server.js` / `node:24-alpine` runner with `output: 'export'` / nginx:alpine; update the copy commands
      (`out/` instead of `.next/standalone`); note the `3000:80` port mapping and multi-arch build. - Add **§19 Static
      Hosting & GitHub Pages**: cover `output: 'export'`, the SW copy step, `nginx.conf` cache strategy, `public/CNAME`,
      the multi-arch CI steps, and the `deploy-pages` workflow job including the GitHub Pages prerequisites. **(no unit
      test)**

- [x] **SH-11** Update `CLAUDE.md`: - In the "Stack" / Docker section: change runner from `node:24-alpine` +
      `node server.js` to `nginx:alpine` serving `out/`; note multi-arch (`linux/amd64,linux/arm64`); update the
      multi-stage description. - In "Expected Commands": update the `start` entry to `npx serve out`; note
      `output: 'export'` next to the `build` entry; add a note that `out/` is the static export directory. - Note
      `public/CNAME` and the `deploy-pages` job in the CI/CD section. **(no unit test)**

## Phase F — Verification

- [x] **SH-12** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual checks: - `out/index.html` exists; `out/sw.js` exists; `out/CNAME` contains the custom domain. -
      `docker build -t binome . && docker compose up` → app loads at `http://localhost:3000`. - Response headers:
      `/_next/static/` has `Cache-Control: immutable`; `/sw.js` has `no-cache` + `Service-Worker-Allowed: /`;
      `/build-info.json` has `no-cache`. - No `node` binary in the Docker image (`docker run --rm binome which node`
      should fail or return nothing). - `npm run start` (after build) serves `out/` locally without error. - The
      `release.yml` workflow correctly gates `deploy-pages` on `new_release_published == 'true'`; the `pages: write`
      permission is scoped to `deploy-pages` only. - After a release,
      `docker buildx imagetools inspect ghcr.io/<repo>:latest` lists both `linux/amd64` and `linux/arm64` digests. **(no
      unit test)**
