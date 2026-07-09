# Feature Spec — Timer Import / Export

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §14, `specs/tasks/0002-import-export-tasks.md`

## 1. Summary

Let a user back up and transfer their timer library as a JSON file. **Export** downloads every saved timer as a single
`binome.json` file. **Import** lets the user pick a previously-exported (or hand-edited) file, validates it, and
presents a checklist of the timers it contains so the user can choose exactly which ones to bring in. Timers whose `id`
already exists in the library are flagged as **overwrites** so the user understands the consequence before committing.

The feature is entirely client-side (no backend, consistent with the rest of Binome) and reuses the existing
`timerConfigSchema` / `parseTimerList` validation so imported timers are held to the same standard as timers read from
`localStorage`.

## 2. Goals

- One-click **export** of the full timer library to a downloaded `binome.json`.
- The export file is a top-level **object** with a `timers` key holding the timer list — leaving room for additional
  top-level keys (other app data) in future without a breaking change.
- The exported timer shape **matches the persisted `localStorage` shape** and validates against `timerConfigSchema`.
- **Import** validates the file as JSON and as a Binome export envelope, surfacing a clear `sonner` toast on any
  failure.
- Import reuses the **lenient** `parseTimerList` semantics: individual malformed timers are dropped (and logged) while
  valid siblings are still offered for import.
- Import is **never silent or immediate** — the user is shown a selection list and explicitly confirms which timers to
  import.
- **Overwrite awareness**: any incoming timer whose `id` matches an existing timer is visibly flagged; such entries are
  **unchecked by default** so overwriting is always an opt-in.

## 3. Non-Goals (v1 of this feature)

- Sharing via URL, query string, or a hosted link (remains out of scope — see `specs/requirements.md` §13).
- Server-side storage, accounts, or cloud sync of the export file.
- Exporting non-timer state (theme preference, etc.). The envelope leaves room for it, but v1 exports only `timers`.
- Partial-field merge / conflict resolution UI (an overwrite replaces the whole timer record; there is no field-level
  merge).
- A schema-version field or migration framework. Forward-compatibility is provided structurally (object envelope +
  lenient per-timer parsing); a `version` field can be added later if a migration need arises.
- Import/export of the **active run state** (`ActiveTimerState` is runtime-only and never persisted or exported).

## 4. Export

### 4.1 Behaviour

- Triggered from an **Export** control in the Timer List header (alongside "New Timer").
- Serializes the current in-memory timer list (already validated by `parseTimerList` on load) into the export envelope
  and triggers a browser download of a file named **`binome.json`**.
- Exports **all** timers as-is; it is not a selective export in v1.
- If the library is empty the control is **disabled** (nothing to export).

### 4.2 File format

A top-level object with a `timers` array. Each element is a full `TimerConfig` exactly as persisted to `localStorage`:

```jsonc
{
  "timers": [
    {
      "id": "f6b3...-uuid",
      "name": "Tea",
      "durationSeconds": 180,
      "flash": true,
      "sound": true,
      "soundId": "bell",
      "countUp": false,
      "hideName": false,
      "createdAt": "2026-05-30T12:00:00.000Z",
      "updatedAt": "2026-05-30T12:00:00.000Z",
    },
  ],
}
```

- The top-level object (rather than a bare array) is deliberate: future exports can add sibling keys (e.g. `theme`,
  `schemaVersion`) without breaking importers that only read `timers`.
- The JSON is pretty-printed (2-space indent) for human readability.

## 5. Import

### 5.1 Validation pipeline

The file is processed in stages; the **first** failing stage shows a specific toast and aborts (no selection dialog
opens):

1. **Read** the chosen file's text (via the file input's `File.text()`).
2. **Parse JSON** — `JSON.parse`. On a syntax error → `toast.error('Could not import: the file is not valid JSON.')`.
3. **Validate envelope** — the parsed value must be an object containing a `timers` **array** (`exportFileSchema`, which
   allows unknown extra keys). Otherwise → `toast.error('Could not import: this is not a valid Binome export file.')`.
4. **Parse timers leniently** — run `parseTimerList(parsed.timers)`. This drops any malformed timer (logging its Zod
   issues via `console.error`, exactly as the `localStorage` read does) and returns the valid ones.
   - If **zero** valid timers result → `toast.info('No valid timers found in the file.')` and abort (no dialog).
   - Otherwise continue to the selection dialog with the valid timers.

> Note: lenient per-timer parsing means an importable file can still yield fewer timers than it literally contains. When
> the dialog opens after dropping some entries, it surfaces that (see §5.2) so the drop is never silent.

### 5.2 Selection dialog

A `Dialog` lists every successfully-parsed timer as a selectable row. Each row shows:

- A checkbox to include/exclude the timer.
- The timer **name** and formatted **duration** (reusing `formatDuration`), plus the small alert-setting icons used in
  the list row (flash / sound / count-up) for parity.
- An **"Overwrites existing"** badge when the timer's `id` matches an `id` already in the store, with helper text
  explaining the existing timer's settings will be replaced.

Defaults & controls:

- **Non-conflicting** timers (new `id`s) are **checked** by default.
- **Conflicting** timers (overwrites) are **unchecked** by default — overwriting is opt-in.
- If any timers were dropped during parsing, the dialog header notes it (e.g. "2 timers in the file were invalid and
  skipped").
- A primary **Import** button applies the current selection; it is disabled when nothing is selected. A **Cancel**
  button closes the dialog without changes.

### 5.3 Applying the import

On confirm, the selected timers are merged into the store **by `id`**:

- A selected timer whose `id` already exists **replaces** that record wholesale (the imported record wins, preserving
  the imported `id`).
- A selected timer whose `id` is new is **appended**.
- The imported `id` is always preserved (it is the dedupe key) — so the merge cannot use `addTimer` (which generates a
  fresh `id`); it goes through a dedicated `importTimers` store operation that performs an id-keyed merge via
  `setTimers`.
- **Active-timer safety**: if an overwrite targets the timer that is currently running, the active timer is reset first
  (mirroring delete behaviour) so the run view never holds a stale duration.
- After applying, a summary toast reports the result, e.g. `toast.success('Imported 3 timers (1 overwritten).')`.

## 6. Data Models & Validation

All validation lives in `lib/` and reuses the existing timer schema. No change to `types/timer.ts`.

### 6.1 Export envelope schema (`lib/importExport.ts`)

```ts
import { z } from 'zod';
import { timerConfigSchema } from '@/lib/timerSchema';

/**
 * Envelope validation only — confirms a top-level object with a `timers` array.
 * Per-timer validation is intentionally deferred to the lenient `parseTimerList`
 * so one bad timer does not reject the whole file. `.passthrough()` keeps any
 * future sibling keys instead of stripping them.
 */
export const exportFileSchema = z.object({ timers: z.array(z.unknown()) }).passthrough();

export const EXPORT_FILE_NAME = 'binome.json';
```

- `buildExportObject(timers: TimerConfig[]): { timers: TimerConfig[] }` — wraps the list in the envelope.
- `parseImportContent(text: string): ImportParseResult` — runs stages 2–4 of §5.1 and returns a discriminated result so
  the calling component owns the toast copy:

```ts
type ImportParseResult =
  { ok: true; timers: TimerConfig[]; droppedCount: number } | { ok: false; reason: 'json' | 'shape' | 'empty' };
```

`droppedCount` = (number of array entries in the file) − (valid timers returned by `parseTimerList`), used for the
"skipped" note in §5.2.

### 6.2 Store operation (`hooks/useTimerStore.ts`)

Add to `UseTimerStoreReturn`:

```ts
/**
 * Merge imported timers into the store by id: replace on id match, append otherwise.
 * @param incoming
 */
(incoming: TimerConfig[]) => {
  number;
  number;
};
```

Implemented with `setTimers` using a `Map` keyed by `id` (existing first, then incoming overrides), returning the counts
for the summary toast. It does **not** re-validate names/durations (the timers already passed `timerConfigSchema`).

## 7. App Integration & Components

- **`lib/importExport.ts`** — `exportFileSchema`, `EXPORT_FILE_NAME`, `buildExportObject`, `parseImportContent`.
- **`lib/download.ts`** (or a small inline helper) — `downloadJson(filename, data)`: serializes with 2-space indent,
  creates a `Blob`, and clicks a transient object-URL anchor. Browser-only; guarded for SSR.
- **`components/timer-list/ExportButton.tsx`** — reads `timers` from `useTimerStore`, disabled when empty, calls
  `downloadJson(EXPORT_FILE_NAME, buildExportObject(timers))`.
- **`components/timer-list/ImportButton.tsx`** — renders a button that opens a hidden
  `<input type="file" accept="application/json,.json">`; on change, reads the file, calls `parseImportContent`, fires
  the appropriate toast on failure, or opens `ImportDialog` with the parsed timers on success. Resets the input value
  after each pick so re-importing the same file re-triggers `change`.
- **`components/timer-list/ImportDialog.tsx`** — the §5.2 selection dialog. Props:
  `{ open, onOpenChange, candidates, droppedCount, onConfirm }` where
  `candidates: Array<{ timer: TimerConfig; conflict: boolean }>`. Owns local checkbox state (seeded per the default
  rules), renders rows + overwrite badges, and calls `onConfirm(selectedTimers)`.
- **`components/timer-list/TimerList.tsx`** — mounts `ExportButton` and `ImportButton` in the header; wires `onConfirm`
  to `importTimers` + active-timer reset + summary toast.
- Toasts use the existing `sonner` `<Toaster />` already mounted in `app/layout.tsx`.

## 8. UX Notes

- Import and Export controls sit in the Timer List header. On narrow (≥375px) widths they may collapse into icon-only
  buttons or an overflow menu to preserve the layout next to "New Timer" and the theme toggle.
- All new surfaces (dialog, badges, file button) must respect the active color scheme and carry appropriate
  `aria-label`s, consistent with the rest of the app.
- The overwrite badge must be distinguishable without relying on color alone (icon + text), for accessibility.

## 9. Testing Strategy

- **`lib/importExport.ts`**
  - `buildExportObject` wraps timers under `timers` and round-trips through `JSON.parse(JSON.stringify(...))`.
  - `parseImportContent`: invalid JSON → `{ ok: false, reason: 'json' }`; non-object / missing-or-non-array `timers` →
    `reason: 'shape'`; all-invalid timers → `reason: 'empty'`; a mix of valid + invalid → `ok: true` with the valid
    timers and the correct `droppedCount`; unknown sibling keys are tolerated.
- **`hooks/useTimerStore.ts`** — `importTimers`: appends new ids; replaces on id match (imported record wins); returns
  accurate `{ added, overwritten }`; leaves untouched timers intact.
- **`lib/download.ts`** — mocks `URL.createObjectURL`/anchor click; asserts filename and serialized content.
- **`components/timer-list/ExportButton.tsx`** — disabled when no timers; triggers the download helper with the envelope
  when clicked.
- **`components/timer-list/ImportButton.tsx`** — selecting a malformed file fires the matching `toast.error`; a valid
  file opens the dialog with the parsed candidates and conflict flags.
- **`components/timer-list/ImportDialog.tsx`** — non-conflicting rows pre-checked, conflicting rows unchecked + badged;
  dropped-count note shown when > 0; Import disabled with empty selection; `onConfirm` receives exactly the checked
  timers.
- **`components/timer-list/TimerList.tsx`** (integration) — confirming an import calls `importTimers`, resets the active
  timer when an overwrite targets it, and shows the summary toast.

## 10. Edge Cases

- **Empty library export** — control disabled; no empty file is produced.
- **File with `timers: []`** — passes envelope validation but yields zero timers → `reason: 'empty'` info toast.
- **Duplicate ids _within_ the import file** — `parseTimerList` keeps them all; the id-keyed merge means the last one
  wins. (Acceptable; hand-edited files are the only way to produce this.)
- **Very large file** — read fully into memory; acceptable for a single-user local app. No streaming in v1.
- **Re-selecting the same file** — the input value is cleared after each pick so the `change` event fires again.

## 11. Rollout Notes

- No new runtime dependencies — reuses `zod`, `sonner`, and the existing `timerConfigSchema` / `parseTimerList`.
- `specs/requirements.md` is updated: a new **§14 Import / Export** section is added and the "via URL or export/import"
  item in §13 Out of Scope is narrowed to URL sharing only. `CLAUDE.md`'s out-of-scope line is updated to match.
- No persisted-data migration is required; the export/import shape is the current `localStorage` timer shape.
