# Feature spec scaffold

Copy this into `specs/features/NNNN-slug.md` and fill every section with real, specific content. Delete the
parenthetical guidance as you go. Read `specs/features/0002-import-export.md` alongside it to calibrate depth and voice
— this scaffold is the skeleton, that file is the standard. Sections §4…§N are feature-specific: add as many as the
feature needs, but keep the leading three (§1–§3) and the trailing spine (Data Models → … → Rollout Notes) in order.

**Number every `##` section sequentially with no gaps.** The `## N.` placeholders below mean "the next number in
sequence" — not a literal repeated `N`. So if you write three feature-specific sections (§4, §5, §6), Data Models
becomes §7, App Integration §8, and so on through Rollout Notes.

---

# Feature Spec — <Human Title>

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §N, `specs/tasks/NNNN-slug-tasks.md`

## 1. Summary

(One short paragraph: what the feature is, who it's for, and why. If the user asked you to proceed on assumptions rather
than answer every clarifying question, state the key assumptions here so they're visible.)

## 2. Goals

- (Bulleted, outcome-focused — what must be true when this ships.)
- (Reference real constraints: client-side only, reuses existing validation, respects color scheme, etc.)

## 3. Non-Goals (v1 of this feature)

- (Explicit exclusions — the boundaries the user drew. This is where "not in this version" lives.)

## 4. <Feature-specific section>

(Behavior, file format, pipeline, state machine — whatever the feature centrally is. Use sub-headings (### 4.1) like the
existing specs. Add §5, §6, … as needed.)

## N. Data Models & Validation

(Concrete deltas to `types/timer.ts` / `lib/*Schema.ts`, or an explicit "no change to the data model." Name real types
and files. Reuse `parseTimerList` / `timerConfigSchema` rather than duplicating validation — say so. Show the Zod/TS
shape in a fenced block when it clarifies.)

## N. App Integration & Components

(The real files to add or change, each with a one-line role. e.g. `components/timer-list/Foo.tsx` — does X. Distinguish
new files from edits to existing ones.)

## N. UX Notes

(Placement of new controls; behavior at ≥375px; light/dark compliance; accessibility — aria labels, not-color-alone. The
repo holds these as hard requirements.)

## N. Testing Strategy

(Per file, what the co-located `*.test.ts(x)` must assert. Be specific — these bullets become the test expectations in
the task list. Group by file.)

## N. Edge Cases

(Empty / zero / overflow / conflict / duplicate cases, and the active-timer-safety case if a running timer can be
affected. One bullet each.)

## N. Rollout Notes

- (New runtime dependencies — prefer **none**; call it out if any are needed and why.)
- (Which docs change: the `specs/requirements.md` section to add or edit, and the `CLAUDE.md` note. Describe these as
  planned edits — they are performed during implementation, not at spec time.)
- (Any persisted-data migration / back-compat consideration, or an explicit "no migration required.")
