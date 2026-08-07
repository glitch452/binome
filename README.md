# Binome

[![GitHub License](https://img.shields.io/github/license/glitch452/binome)](https://choosealicense.com/licenses/mit/)
[![GitHub Release](https://img.shields.io/github/v/release/glitch452/binome)](https://github.com/glitch452/binome/releases)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker&logoColor=white)](https://github.com/glitch452/binome/pkgs/container/binome)

A browser-based countdown timer. Build a library of named timers, run one at a time, and get alerted on expiry with a
screen flash, an audio sound, and an optional count-up display. All data is stored locally in the browser — no account
or server required. The name comes from the animated series [ReBoot](https://reboot.fandom.com/wiki/Binome), where
binomes are the small binary-coded inhabitants of Mainframe.

**Details:**

- **Framework:** [Next.js 15](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- **Language:** [TypeScript](https://www.typescriptlang.org) (strict)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) on
  [Base UI](https://base-ui.com)
- **Testing:** [Vitest 4](https://vitest.dev) + [React Testing Library](https://testing-library.com)

## Table of Contents

- [Binome](#binome)
  - [Table of Contents](#table-of-contents)
  - [What's New](#whats-new)
  - [Features](#features)
  - [Getting Started](#getting-started)
    - [Running with Docker](#running-with-docker)
      - [Docker Compose](#docker-compose)
      - [Available Tags](#available-tags)
    - [Running Locally](#running-locally)
  - [Development](#development)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
    - [Scripts](#scripts)
    - [Building the Docker Image](#building-the-docker-image)
    - [Branching Strategy](#branching-strategy)
  - [License](#license)

## What's New

Check out the [GitHub Releases](https://github.com/glitch452/binome/releases) page for the latest release notes.

## Features

- **Timer library** — create and name as many timers as you need; each stores its own duration and alert configuration.
- **Expiry alerts** — any combination of:
  - **Screen flash** — the viewport flashes for 3 seconds at 2 Hz.
  - **Audio** — one of five built-in sounds plays on expiry and can be re-triggered manually.
  - **Count-up** — the display continues counting upward (prefixed with `+`) after zero.
  - **System notification** — a browser notification fires even when the tab is in the background; choose _Always_ or
    _Only when the app is in the background_ per timer.
- **Feature indicators** — at-a-glance icons on each list entry show which alerts are enabled.
- **Hide name** — optionally hide the timer name on the run screen for a distraction-free view.
- **Theme** — light, dark, or system preference, persisted across visits.
- **Client-side only** — no backend, no database, no account. All state lives in `localStorage`.
- **Install & offline** — an installable PWA: use your browser's native **Install** action, and once loaded the app
  launches and runs fully offline (a service worker precaches the app shell, sounds, and icons).
- **Responsive** — works at 375 px and up; fluid typography on the run screen.
- **Docker deployment** — ships as a self-contained `nginx:alpine` image (multi-arch: `linux/amd64` + `linux/arm64`).
- **Hosted demo** — also deployed to GitHub Pages at [binome.dearden.dev](https://binome.dearden.dev) on every release.

## Getting Started

### Running with Docker

Pull and run the latest image directly from the GitHub Container Registry:

```sh
docker run -p 3000:80 ghcr.io/glitch452/binome:latest
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

#### Docker Compose

```yaml
services:
  binome:
    image: ghcr.io/glitch452/binome:latest
    ports:
      - '3000:80'
```

```sh
docker compose up
```

#### Available Tags

| Tag           | Description                          |
| :------------ | :----------------------------------- |
| `latest`      | Most recent release                  |
| `vX`          | Latest release for major version X   |
| `vX.Y`        | Latest release for minor version X.Y |
| `vX.Y.Z`      | Specific release                     |
| `sha-<short>` | Specific commit                      |

### Running Locally

```sh
git clone https://github.com/glitch452/binome.git
cd binome
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Prerequisites

- [Node.js](https://nodejs.org) `24` (see `.nvmrc`)
- [npm](https://www.npmjs.com) `11+`
- [Docker](https://www.docker.com) _(optional, for container builds)_

> [!TIP]
>
> If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` from the project root to automatically switch to the
> correct Node version.

### Setup

```sh
git clone https://github.com/glitch452/binome.git
cd binome
nvm use
npm install
```

### Scripts

| Script                 | Description                                                |
| :--------------------- | :--------------------------------------------------------- |
| `npm run dev`          | Start the Next.js development server (Turbopack)           |
| `npm run build`        | Production build — static export to `out/`                 |
| `npm run start`        | Serve `out/` locally with `npx serve` (requires a build)   |
| `npm run type`         | TypeScript type check (`tsc --noEmit`)                     |
| `npm run lint`         | ESLint with auto-fix                                       |
| `npm run lint:ci`      | ESLint without auto-fix; fails on any warning (used in CI) |
| `npm run format`       | Prettier — format all files                                |
| `npm run format:check` | Prettier — check formatting without writing changes        |
| `npm run test`         | Vitest — run all tests once                                |
| `npm run test:w`       | Vitest — watch mode                                        |
| `npm run test:ci`      | Vitest — run with coverage and JUnit report                |

### Building the Docker Image

```sh
docker build -t binome .
docker compose up
```

> [!NOTE]
>
> The image is built in two stages: a `node:24-alpine` builder that runs `npm run build`, followed by an `nginx:alpine`
> runner that serves the static `out/` directory. The container exposes port `80`; `docker compose` maps it to `3000` on
> the host. Multi-arch images (`linux/amd64`, `linux/arm64`) are built in CI.

### Branching Strategy

`main` is the only long-lived branch — it is always releasable and reflects the latest published release.

All changes must be made via a pull request into `main`. Once a pull request is merged, the
[Release GitHub Actions workflow](.github/workflows/release.yml) automatically determines the next version, publishes
the Docker image and GitHub Release, and deploys the GitHub Pages demo — there is no manual release step.

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE) as defined by the
[Open Source Initiative](https://opensource.org/license/mit).
