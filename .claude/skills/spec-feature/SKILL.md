---
name: spec-feature
description: >-
  Use when the user wants to plan or specify a new Binome feature before any code is written — they describe a feature
  (with however much detail they have) and ask you to "spec it out", "write a spec", "create a feature spec", "design
  this", "plan this feature", or "break it into tasks", or they hand you a rough idea destined for the specs/ folder.
  Produces a numbered specs/features/NNNN-slug.md design spec plus a matching phased specs/tasks/NNNN-slug-tasks.md task
  list that the implement-feature skill can later execute. Prefer this over ad-hoc planning whenever a feature warrants
  a written design and a task breakdown. Do NOT use it to write feature code — that is implement-feature's job; this
  skill stops at the two planning documents and leaves them uncommitted for review.
---

# Spec a feature in Binome

This skill turns a feature idea into the two planning artifacts the repo expects: a **design spec** under
`specs/features/` and a **derived task list** under `specs/tasks/`. It is the upstream half of a two-skill pipeline —
`spec-feature` plans, [implement-feature] builds from the task list it produces. Your job here is to think the feature
all the way through on paper so the implementer never has to guess, then stop. **You do not write feature code and you
do not commit** — you leave both new Markdown files in the working tree for the user to review.

## The shape of the work

```
1. Understand the request + read the lay of the land
        ▼
2. Clarify until the design is settled  ◄── ask focused questions, loop until no blocking unknowns
        ▼
3. Pick the next number + slug
        ▼
4. Write specs/features/NNNN-slug.md      (the design)
        ▼
5. Derive specs/tasks/NNNN-slug-tasks.md  (the phased task list)
        ▼
6. Self-review against the code, then hand off (uncommitted)
```

Track these as TodoWrite items so nothing gets skipped. Step 2 is the heart of the skill: **a spec written on top of
unresolved unknowns just relocates the guesswork to the implementer.** Resolve them with the user first.

## Step 1 — Understand the request and read the lay of the land

Before writing anything, ground yourself in how this repo actually works so the spec proposes designs that fit:

- Read **`CLAUDE.md`** for the architecture (three React contexts, `'use client'` SPA, `localStorage` persistence,
  shadcn/Base-UI, co-located tests) and the conventions the spec must respect.
- Read the most recent existing spec pair as your **template of record** — `specs/features/0002-import-export.md` and
  `specs/tasks/0002-import-export-tasks.md` are the canonical example of the structure, voice, and level of detail
  expected.
- Skim the **source the feature will touch** (`types/timer.ts`, the relevant `contexts/`, `hooks/`, `components/`,
  `lib/`). A good spec names real files, hooks, and types — not invented ones. If the feature extends a data model, read
  the current `TimerConfig` / schema so the spec describes a true delta.
- Glance at `specs/requirements.md` to see which numbered section the feature relates to and whether it touches an "Out
  of Scope" (§13) line that the spec's Rollout Notes will need to narrow.

The full set of patterns the spec must honor lives in the implement-feature skill's
`../implement-feature/references/repo-conventions.md` (this skill reuses that file rather than duplicating it) — read it
if you're unsure what's idiomatic here.

## Step 2 — Clarify until the design is settled

The user gave you "a description and as much detail as I can think of" — which means there will be gaps. **Ask focused
questions and wait for answers before writing the spec.** This is the one place the skill is interactive by design.

Work through the dimensions a Binome feature spec has to pin down, and ask about any the description leaves genuinely
ambiguous (skip the ones the description already settles — don't interrogate for its own sake):

- **Scope & goals** — what's explicitly in, and what's deliberately _not_ in this version? (Every spec has a Non-Goals
  section; you need the user's line.)
- **Data model** — does it add or change fields on `TimerConfig` / `SoundId` / other `types/timer.ts` types? New
  `localStorage` key, or reuse an existing one? New Zod validation, or reuse `parseTimerList`/`timerSchema`?
- **UI surface** — which view (Timer List, Run View, the form sheet, a new dialog)? New control placement? Must it work
  at ≥375px and respect light/dark? Any accessibility requirement (the repo cares about not-color-alone, aria labels)?
- **Behavior & edge cases** — what happens in the empty/zero/overflow/conflict cases? How does it interact with a
  running timer (the active-timer-safety concern that recurs in this app)?
- **Persistence & migration** — does existing stored data stay valid, or is a migration/back-compat story needed?
- **Out-of-scope boundaries** — anything the user wants explicitly excluded for v1 of the feature.

Prefer the `AskUserQuestion` tool for a small batch of high-leverage choices (with a recommended option first) over a
long open-ended interview. **Loop:** ask → incorporate → if a material unknown remains, ask again. Only proceed to Step
3 when no remaining gap would change the design. If the user says "just make reasonable assumptions," that's your cue to
stop asking and proceed — but record those assumptions in the spec's Summary/Non-Goals so they're visible.

## Step 3 — Pick the next number and slug

- **Number:** scan `specs/features/` for the highest `NNNN` prefix and use the next integer, zero-padded to four digits
  (`0001`, `0002` → next is `0003`). The feature spec and its task file share the same number.
- **Slug:** a short kebab-case name from the feature (`import-export`, `versioning-and-releases`). Both files use it:
  `specs/features/NNNN-slug.md` and `specs/tasks/NNNN-slug-tasks.md`.
- **Task-ID prefix:** uppercase initials of the feature's significant words, dropping connectors (`and`, `of`, `/`) —
  Versioning & Releases → `VR`, Import / Export → `IE`, Recent Timers → `RT`. Tasks are then `VR-01`, `VR-02`, … If the
  initials would collide with an existing feature's prefix, add a third letter to disambiguate.

## Step 4 — Write the feature spec

Create `specs/features/NNNN-slug.md`. Use `references/spec-template.md` as the scaffold and fill every section with
real, specific content — read `specs/features/0002-import-export.md` alongside it to calibrate depth.

**Number the `##` sections sequentially with no gaps** (§1, §2, §3, …) — the spine below is an _ordering_, not a fixed
set of numbers. Summary is always §1, Goals §2, Non-Goals §3; then your feature-specific sections; then the trailing
sections continue the count (in a feature with three feature-specific sections, Data Models is §7, and so on, as in
`0002`). The fixed spine, in order:

1. **Title line** — `# Feature Spec — <Human Title>`
2. **Status line** —
   `Status: **planned** · Owner: glitch452 · Related: specs/requirements.md §N, specs/tasks/NNNN-slug-tasks.md` — where
   `§N` is the requirements.md section your Rollout Notes plan to add or edit (a brand-new feature predicts the next
   free number; e.g. after `0002` added §14, `0003` points at §15).
3. **§1 Summary** — what it is and why, in a short paragraph.
4. **§2 Goals** — the bulleted outcomes the feature must achieve.
5. **§3 Non-Goals (v1 of this feature)** — explicit exclusions (this is where Step 2's boundaries land).
6. **Feature-specific sections** — behavior, file format, pipelines, etc. (§4…§N), as the feature needs.
7. **Data Models & Validation** — concrete type/schema deltas; name real files (`types/timer.ts`, `lib/*Schema.ts`).
   Reuse existing validation rather than inventing parallel logic, and say so.
8. **App Integration & Components** — the real files to add/change, with a one-line role for each.
9. **UX Notes** — placement, ≥375px behavior, color-scheme + accessibility requirements.
10. **Testing Strategy** — per-file, what the co-located tests must assert. This becomes the test column of the tasks.
11. **Edge Cases** — the empty/conflict/overflow/active-timer cases enumerated.
12. **Rollout Notes** — new deps (prefer none), and which docs change: the `specs/requirements.md` section to add/edit
    and the `CLAUDE.md` note. **Describe these doc edits as planned work — do not perform them now;** implement-feature
    makes them during the build.

Write in the repo's voice: precise, decisive, naming real artifacts. The spec should let a competent implementer build
the feature without coming back with questions.

## Step 5 — Derive the task list

Create `specs/tasks/NNNN-slug-tasks.md` from the spec. Use `references/tasks-template.md` as the scaffold;
`specs/tasks/0002-import-export-tasks.md` is the model. This file is a **contract with implement-feature** — it reads
the task IDs, `**Verify:**` hints, and `**(no unit test)**` markers literally, so match the format exactly.

Rules:

- **Header** — title, a "Derived from `specs/features/NNNN-slug.md`" line, and the convention note (logic tasks land a
  co-located `*.test.ts(x)`; `**(no unit test)**` tasks are wiring/config verified by a build).
- **Ordering** — tasks ordered so each builds on the last; bottom-up is the house style: validation/helpers (`lib/`) →
  store/hooks → leaf components → wiring into a view → docs → verification. Respect phase boundaries.
- **Phases** — `## Phase A — <title>`, `## Phase B — …`, lettered, with as many phases as the feature needs. The
  invariant is **not** the letters (which shift with the phase count) but that the **final two phases are always
  Documentation** (the requirements.md + CLAUDE.md edits) **and Verification** (the full gate + manual checks) — so they
  land on whatever the last two letters happen to be.
- **Each task** — `- [ ] **PREFIX-NN** <imperative description naming the files it touches>.` Include either a
  co-located test expectation drawn from the spec's Testing Strategy, or a `**(no unit test)**` marker, plus a
  `**Verify:**` hint (e.g. `**Verify:** npm run type`) where one adds signal. Keep tasks small and independently
  testable.
- **Verification phase** — a final task running the real gates (`npm run type`, `npm run lint`, `npm run format:check`,
  `npm run test`, `npm run build`) plus a manual walkthrough of the feature's key flows and edge cases.

Leave every checkbox **unchecked** (`- [ ]`) — these are planned, not done. implement-feature ticks them as it builds.

## Step 6 — Self-review and hand off

Before reporting:

- **Re-read both files against the code.** The most common spec bug is naming a file, hook, type, or field that doesn't
  exist (or describing the intended design instead of the real one). Verify every artifact you reference is real or is
  clearly marked as new.
- **Check the two files agree:** every section of the spec with implementable work has a corresponding task; every task
  traces back to something in the spec. No orphans either direction.
- **Confirm you didn't overstep:** no feature code written, no docs edited, nothing committed.

Then report concisely: the two file paths you created, the feature number/slug/task-prefix you chose, a one-line summary
of the design and its key decisions (especially anything the user clarified in Step 2), and that the files are left
**uncommitted** for review. Offer that the natural next step is the [implement-feature] skill pointed at the new task
file — but don't run it; this skill ends at the plan.

[implement-feature]: ../implement-feature/SKILL.md
