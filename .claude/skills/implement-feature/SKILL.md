---
name: implement-feature
description: >-
  Implement a feature end-to-end in the Binome countdown-timer repo, from either a written feature description or a path
  to a task list under specs/tasks/. After writing code it runs the project's type, lint, and test scripts in a
  fix-until-green loop, then runs format, then updates the relevant Markdown docs (README.md, CLAUDE.md,
  specs/requirements.md). Use this whenever the user asks to "implement", "build", "add", or "work through" a feature,
  hands you a task list or a specs/tasks file, or says something like "do feature 0003" / "knock out the next phase" /
  "build this and make sure it passes" — even if they don't say the word "skill". Prefer this over ad-hoc implementation
  for anything bigger than a one-line tweak, because it guarantees the checks-and-docs discipline the repo expects.
---

# Implement a feature in Binome

This skill takes a feature from intent to a verified, formatted, documented working tree. It does **not** commit — it
leaves all changes staged in the working tree for the user to review (per repo convention). Your job is to land code
that genuinely passes every gate the repo enforces, and to leave the docs honest about what changed.

## The shape of the work

```
1. Understand the input  →  2. Implement (test-after)  →  3. Verify loop (type/lint/test)
                                                                      │ fix & re-run ALL
                                                                      ▼
                          5. Update docs  ←  4. Format (once fully green)
```

Track these as TodoWrite items so progress is visible and nothing gets skipped. The verify loop (step 3) is the heart of
the skill — treat its "re-run everything after each fix" rule as non-negotiable.

## Step 1 — Understand the input

The skill accepts two input modes. Detect which one you're in:

**Task-list mode** — the user points you at a file under `specs/tasks/` (e.g. `specs/tasks/0003-foo-tasks.md`), or says
"do feature 0002" / "the next phase".

- Read the task file _and_ its sibling feature spec under `specs/features/` if one exists — the spec carries the design
  intent the tasks compress.
- Work through **unchecked** (`- [ ]`) tasks **in listed order**, respecting phase boundaries. Tasks are deliberately
  ordered so each builds on the last; don't reorder them.
- Each task names the files it touches and carries a **Verify** hint (e.g. `**Verify:** npm run type`) and a test
  convention (a co-located `*.test.ts(x)`, or `**(no unit test)**` for wiring/config). Honor those hints — they tell you
  exactly what "done" means for that task.
- As you finish a task, flip its checkbox to `- [x]` in the task file. That checkbox is the repo's progress ledger;
  keeping it current is part of the job (it's a working-tree edit, not a commit).
- If the user names a single phase, scope to that phase's tasks only.

**Prompt mode** — the user gives a free-text feature description with no task file.

- Do **not** scaffold new `specs/features/` or `specs/tasks/` files (repo owner's standing choice).
- Instead, decompose the request into a short ordered plan in your head / TodoWrite, then implement directly. If the
  feature is large or ambiguous, restate your understanding and the plan in one or two sentences before writing code, so
  a wrong assumption gets caught early.

Either way, before writing code, read the neighbouring source so your work matches existing patterns. This repo has
strong conventions (see CLAUDE.md): three React contexts, `'use client'` everywhere, co-located tests, shadcn/Base-UI
primitives, `localStorage` persistence via `useLocalStorage`, Zod schemas in `lib/*Schema.ts`. Read
`references/repo-conventions.md` for the concrete patterns to imitate.

## Step 2 — Implement (test-after)

Write the implementation first, then add tests — that's the chosen workflow for this repo.

- Follow the file layout the repo uses: code in top-level `app/` `components/` `contexts/` `hooks/` `lib/` `types/` (no
  `src/`); the context object lives in `contexts/*Context.tsx` and the thin consumer hook in `hooks/use*.ts`.
- Reuse before you build: lenient parsing goes through `parseTimerList`, time formatting through `lib/time.ts`, class
  merging through `cn`. Don't duplicate validation or formatting logic.
- After the code works, add **co-located** `*.test.ts(x)` using Vitest + React Testing Library (jsdom), covering the
  behaviour you added — happy path plus the edge cases the feature implies. Skip tests only for pure wiring/config that
  a task explicitly marks `**(no unit test)**`.
- Match the house style as you type: single quotes, semicolons, `printWidth` 100, named exports for components. Don't
  fight the formatter — write it close to formatted and let step 4 finish the job.

## Step 3 — Verify loop (fix until green)

Run the three project gates. **The rule: after any fix, re-run all three from the top** — never declare victory off a
partial run, because a lint autofix can break a type and a code fix can break a test. Cheapest-first ordering keeps the
loop fast:

```bash
npm run type     # tsc --noEmit — fastest, fails loudest on contract breaks
npm run lint     # eslint --fix --cache --max-warnings 0 — autofixes trivia; a real failure is a real signal
npm run test     # vitest run — full suite
```

When something fails:

1. **Read the actual error** — the message, the file, the line. Don't pattern-match to a guessed fix.
2. **Find the root cause.** A failing test usually means either the code is wrong or the test encodes a wrong
   expectation — decide which before editing. A type error is a contract you broke; fix the contract, don't `as any` it.
   A lint failure that survived `--fix` is structural (unused var, missing dep, disallowed pattern) — fix the structure,
   not the lint config. If you must use an `eslint-disable`, the repo requires a justification comment on the same line.
3. **Apply the smallest correct fix**, then re-run `type` → `lint` → `test` again from the top.
4. Repeat until all three pass clean.

For speed _during_ debugging you may run a single test file (`npx vitest run path/to/file.test.tsx`) or a named test
(`npx vitest run -t "name"`), but the gate that must pass before moving on is the full `npm run test`.

**Loop guard:** if you go ~3 iterations without reducing the failure count, stop and surface what's stuck rather than
thrashing — flapping usually means a wrong assumption upstream (wrong API shape, wrong test expectation, a missing
dependency). Re-read the relevant source/spec before continuing.

A `read references/troubleshooting.md` has the common failure signatures in this repo and their fixes.

## Step 4 — Format (only once fully green)

After all three gates pass, normalize formatting across the repo:

```bash
npm run format   # prettier --write .
```

Run this _after_ the verify loop, not before — Prettier only touches whitespace/quotes/wrapping, so it won't break a
passing build, and running it last means the verify loop didn't waste cycles on cosmetics. As a courtesy you can run
`npm run format:check` to confirm it's clean, but `format` having just written is sufficient.

## Step 5 — Update documentation

Now make the docs tell the truth about what you built. Touch only what actually changed — don't pad.

- **`specs/requirements.md`** — if the feature adds or changes user-facing behaviour, data models (`types/timer.ts`), or
  scope, update the matching numbered section. If you implemented from a `specs/features/NNNN-*.md`, reconcile that the
  requirements reflect the shipped reality, and narrow any "Out of Scope" (§13) line the feature now invalidates.
- **`CLAUDE.md`** — update the architecture/feature notes if you added a context, hook, data field, view, or convention
  that someone reading CLAUDE.md cold would now get wrong. CLAUDE.md is meant to capture the cross-file understanding,
  not restate every file.
- **`README.md`** — update if the feature changes how a user runs, configures, or uses the app (commands, env vars,
  user-facing capabilities).
- **Task file** (task-list mode) — confirm every task you completed is checked `- [x]`.

After editing docs, re-read your diff against them once: the most common doc bug is describing the _intended_ design
instead of the _shipped_ one. Make them match the code.

## Done

Report back concisely: what you implemented, which gates passed (with the fact you ran them), what docs you touched, and
that the changes are left **uncommitted** for review. Don't claim success for a gate you didn't actually run to
completion — if you stopped the loop because it was stuck, say so plainly with the remaining failure.
