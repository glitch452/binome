# Verify-loop troubleshooting — common failure signatures

When a gate fails, match the symptom here before improvising. The theme throughout: fix the root cause, not the symptom,
and re-run all three gates afterward.

## `npm run type` (tsc --noEmit)

- **"Property X does not exist on type TimerConfig"** — you added a field in usage but not in `types/timer.ts`, or vice
  versa. The type is the contract; update `types/timer.ts` and the Zod schema in `lib/timerSchema.ts` together so
  persisted data and the type agree.
- **`unknown` is not assignable** — `ts-reset` makes `JSON.parse` and similar return `unknown` on purpose. Parse through
  a Zod schema (`safeParse`) instead of casting `as`.
- **Strict null errors** — the repo is strict. Handle the `undefined`/`null` branch rather than `!`-asserting; an
  assertion that's wrong becomes a runtime crash the tests may not catch.

## `npm run lint` (eslint --fix --cache --max-warnings 0)

- Trivial style issues are auto-fixed by `--fix`, so a _reported_ failure is structural. Common ones:
  - **unused variable / import** — remove it (don't disable the rule).
  - **react-hooks/exhaustive-deps** — add the missing dependency or, if intentional, restructure; only disable with a
    same-line justification comment.
  - **`--max-warnings 0`** means warnings fail the gate too — treat them as errors.
- If you genuinely need `eslint-disable`, it must carry a justification comment on the same line, or it will itself be
  flagged.
- Stale cache rarely lies, but if results look impossible, `npm run lint:nc` runs without the cache.

## `npm run test` (vitest run, jsdom)

- **A test fails after your change** — decide whether the _code_ regressed or the _test_ encodes an outdated
  expectation. If the feature intentionally changed behaviour, update the test to the new correct expectation; otherwise
  fix the code. Never delete a failing test to get green.
- **"document is not defined" / DOM missing** — the test needs jsdom; ensure it's a `*.test.tsx` or the config's jsdom
  env applies. RTL renders need `@testing-library/jest-dom` matchers (loaded via the Vitest setup file).
- **Web Audio / `AudioContext` errors** — jsdom has no audio. Mock `AudioContext` (see existing audio tests) rather than
  calling real playback.
- **`localStorage` bleed between tests** — clear it in a `beforeEach`/`afterEach`; persisted store state leaking across
  tests causes order-dependent flakiness.
- **Toasts (`sonner`)** — mock `sonner` and assert the call, as the import/export tests do.
- During debugging, narrow with `npx vitest run path/to/file.test.tsx` or `-t "name"`, but the gate is the full
  `npm run test`.

## Loop hygiene

- After **any** fix, re-run `type` → `lint` → `test` from the top. Fixes cross-contaminate: a lint autofix can break a
  type; a code fix can break an unrelated test.
- If the failure count isn't dropping after ~3 passes, stop. Flapping means a wrong upstream assumption — re-read the
  source, the spec, or the failing test's intent before editing again, and surface the blocker to the user rather than
  thrashing.
