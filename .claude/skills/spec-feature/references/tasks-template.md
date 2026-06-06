# Task-list scaffold

Copy this into `specs/tasks/NNNN-slug-tasks.md` and fill it from the spec. `specs/tasks/0002-import-export-tasks.md` is
the model — match its format exactly, because implement-feature parses the task IDs, `**Verify:**` hints, and
`**(no unit test)**` markers literally. Replace `PREFIX` with the feature's uppercase initials (Import / Export → `IE`).
Leave every checkbox unchecked.

Ordering is bottom-up: validation/helpers (`lib/`) → store/hooks → leaf components → wiring into a view → docs →
verification. Use as many or as few lettered phases as the feature needs, but keep **Documentation** and
**Verification** as the final two phases.

---

# <Human Title> — Task List

Derived from `specs/features/NNNN-slug.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — <e.g. Validation & helpers>

- [ ] **PREFIX-01** <Imperative task naming the file(s) it touches — e.g. add `lib/foo.ts` with `bar()`. Reuse existing
      validation/helpers rather than duplicating.> Co-locate `lib/foo.test.ts`: <what it must assert, drawn from the
      spec's Testing Strategy>. **Verify:** `npm run type`.
- [ ] **PREFIX-02** <Next task building on the previous.>

## Phase B — <e.g. Store / hooks>

- [ ] **PREFIX-03** <Add an operation to `hooks/useFoo.ts` and its return type.> Extend `hooks/useFoo.test.tsx`:
      <assertions>.

## Phase C — <e.g. Leaf components>

- [ ] **PREFIX-04** <Implement `components/area/Foo.tsx` — props, behavior, color-scheme + aria.> Co-locate test:
      <behaviors>.

## Phase D — <e.g. Wire into the view>

- [ ] **PREFIX-05** <Mount the new component(s) in the relevant view; wire callbacks; handle the active-timer-safety
      case if relevant.> Extend the view's test: <assertions>.

## Phase E — Documentation

- [ ] **PREFIX-06** Update `specs/requirements.md` (add/edit §N) and `CLAUDE.md` (the relevant note); narrow any §13
      Out-of-Scope line the feature invalidates. Confirm both match the implementation. **(no unit test)**

## Phase F — Verification

- [ ] **PREFIX-07** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual: <walk the feature's key flows and the edge cases from the spec — empty/conflict/overflow/active-timer>.
      **(no unit test)**
