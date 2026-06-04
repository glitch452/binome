# Timer Import / Export — Task List

Derived from `specs/features/0002-import-export.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — Validation & file helpers

- [x] **IE-01** Add `lib/importExport.ts`: export `EXPORT_FILE_NAME = 'binome.json'`, the `exportFileSchema`
      (`z.object({ timers: z.array(z.unknown()) }).loose()` — Zod v4 replaces `.passthrough()`), and
      `buildExportObject(timers): { timers }`. Reuses `timerConfigSchema`/`parseTimerList` from `lib/timerSchema.ts` —
      do **not** duplicate timer validation. Co-locate `lib/importExport.test.ts`: `buildExportObject` wraps the list
      under `timers` and survives a `JSON.parse(JSON.stringify(...))` round-trip. **Verify:** `npm run type`.
- [x] **IE-02** Implement `parseImportContent(text): ImportParseResult` in `lib/importExport.ts` (discriminated union
      `{ ok: true; timers; droppedCount } | { ok: false; reason: 'json' | 'shape' | 'empty' }`): `JSON.parse` in a
      try/catch → `reason: 'json'`; `exportFileSchema.safeParse` failure → `reason: 'shape'`; then
      `parseTimerList(parsed.timers)` → `reason: 'empty'` when no timers survive, else `ok: true` with
      `droppedCount = parsed.timers.length − valid.length`. Extend `lib/importExport.test.ts`: invalid JSON, non-object
      / missing-or-non-array `timers`, all-invalid timers, mixed valid+invalid (correct `droppedCount`), and tolerated
      unknown sibling keys.
- [x] **IE-03** Add `lib/download.ts` — `downloadJson(filename, data)`: 2-space-indented `JSON.stringify`, `Blob`,
      transient object-URL anchor click, SSR-guarded. Co-locate `lib/download.test.ts` mocking
      `URL.createObjectURL`/`revokeObjectURL` + anchor click; assert filename and serialized content. **(jsdom)**

## Phase B — Store import operation

- [x] **IE-04** Add `importTimers(incoming: TimerConfig[]): { added; overwritten }` to `hooks/useTimerStore.ts` and its
      `UseTimerStoreReturn` type — id-keyed merge via `setTimers` (`Map` of existing, then incoming overrides), no
      name/duration re-validation (already schema-valid), returning the counts. Extend `hooks/useTimerStore.test.tsx`:
      append-new, replace-on-id-match (imported wins), accurate counts, untouched timers preserved.

## Phase C — Export UI

- [x] **IE-05** Implement `components/timer-list/ExportButton.tsx` — reads `timers` from `useTimerStore`; disabled when
      empty; on click calls `downloadJson(EXPORT_FILE_NAME, buildExportObject(timers))`. Has an `aria-label`; respects
      color scheme. Co-locate test: disabled with no timers; invokes the download helper with the envelope when clicked.

## Phase D — Import UI

- [x] **IE-06** Implement `components/timer-list/ImportDialog.tsx` (the selection dialog) — props
      `{ open, onOpenChange, candidates, droppedCount, onConfirm }`, `candidates: Array<{ timer; conflict }>`. Rows show
      checkbox + name + `formatDuration` + alert icons; conflicting rows render an "Overwrites existing" badge (icon +
      text, not color-only) and are **unchecked** by default, non-conflicting **checked**; header notes `droppedCount`
      when > 0; Import disabled when nothing selected; Cancel closes without change; `onConfirm` receives exactly the
      checked timers. Co-locate test for each of those behaviours.
- [x] **IE-07** Implement `components/timer-list/ImportButton.tsx` — button opening a hidden
      `<input type="file" accept="application/json,.json">`; on change reads `File.text()`, calls `parseImportContent`,
      and on failure fires the matching toast (`json` → "not valid JSON", `shape` → "not a valid Binome export file",
      `empty` → `toast.info` "No valid timers found"); on success opens `ImportDialog` with candidates (conflict = id
      present in store) and `droppedCount`. Clears the input value after each pick. Co-locate test (mock `sonner`):
      malformed file → correct toast, no dialog; valid file → dialog opens with conflict flags.

## Phase E — Wire into the list view

- [x] **IE-08** Mount `ExportButton` and `ImportButton` in `components/timer-list/TimerList.tsx` header (next to "New
      Timer" / theme toggle; collapse to icon-only or an overflow menu at ≥375px). Wire `ImportDialog.onConfirm` →
      `importTimers`, reset the active timer when an overwrite targets `activeTimer.state.configId`, then
      `toast.success('Imported N timers (M overwritten).')`. Extend `TimerList`/`AppShell` tests: confirming an import
      calls `importTimers`, resets the active timer on a conflicting overwrite, and shows the summary toast.

## Phase F — Documentation

- [ ] **IE-09** Add `specs/requirements.md` §14 (Import / Export) and narrow the §13 Out-of-Scope item to URL sharing
      only; update `CLAUDE.md` (out-of-scope line + a short Import/Export note). Confirm both match the implementation.
      **(no unit test)**

## Phase G — Verification

- [ ] **IE-10** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual: export a library → `binome.json` downloads with the envelope; import it back (no-op / all overwrites
      flagged); import a file with one malformed timer (it is skipped, dialog notes the drop); import with an invalid
      JSON and a wrong-shape file (correct toasts, no dialog); confirm an overwrite of the running timer resets it.
      **(no unit test)**
