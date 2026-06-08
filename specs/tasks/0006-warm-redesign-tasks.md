# Warm Redesign — Task List

Derived from `specs/features/0006-warm-redesign.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/config/visual-token work verified by a build or type-check.

---

## Phase A — Types, constants & validation

- [x] **WR-01** Add `AccentColor` (`'indigo' | 'amber' | 'teal' | 'rose' | 'green'`) and `TimerNumeralFont`
      (`'mono' | 'sans'`) to `types/timer.ts`. Do **not** touch `TimerConfig`. **(no unit test)** **Verify:**
      `npm run type`.
- [x] **WR-02** Add to `lib/constants.ts`: `STORAGE_KEY_ACCENT = 'countdown_accent'`,
      `STORAGE_KEY_TIMER_NUMERAL_FONT = 'countdown_timer_numeral_font'`, `ACCENT_IDS`
      (`['indigo','amber','teal','rose','green'] as const satisfies readonly AccentColor[]` — a `const` tuple so
      `z.enum` accepts it), `DEFAULT_ACCENT = 'indigo'`, the `ACCENTS` record (`{ hex, label }` per id, hex per §5.1),
      `NUMERAL_FONTS`, and `DEFAULT_TIMER_NUMERAL_FONT = 'mono'`. **(no unit test)** **Verify:** `npm run type`.
- [x] **WR-03** Add `lib/preferencesSchema.ts` with Zod enums `themePreferenceSchema`, `timerFontSizeSchema`,
      `accentColorSchema` (`z.enum(ACCENT_IDS)`), `timerNumeralFontSchema` (§9.2) — reusing the constant id lists so the
      schemas can't drift from the types. Co-locate `lib/preferencesSchema.test.ts`: each schema accepts its valid
      values and throws on garbage / wrong type / unknown strings. **Verify:** `npm run type`.

## Phase B — Warm tokens (`app/globals.css`)

- [ ] **WR-04** Rewrite the `:root` / `.dark` neutrals to the Warm palette (§4.1), bump `--radius` to `1.125rem`, and
      add the Warm `--shadow` / `--shadow-sm` tokens; apply a soft `shadow-sm` to list rows / cards. **(no unit test)**
      **Verify:** `npm run build` and a manual light/dark check.
- [ ] **WR-05** Add the accent token layer: bake the default `indigo` values into `:root` / `.dark` (`--primary`,
      `--primary-foreground`, `--ring`, and the `--acc` / `--acc-foreground` / `--acc-soft` / `--acc-softer` /
      `--acc-ring` family), add a `[data-accent='<id>']` override block per accent, register the `--color-acc-*` tokens
      used by utilities in `@theme inline`, and add the Run-view background gradient (utility class or documented inline
      values). **(no unit test)** **Verify:** `npm run build`; toggle `data-accent` in devtools and confirm primary
      buttons + soft surfaces recolor.

## Phase C — Preference state (contexts + hooks)

- [ ] **WR-06** Add `contexts/AccentContext.tsx` (`AccentProvider`:
      `useLocalStorage(STORAGE_KEY_ACCENT, 'indigo',     { sync: true, parse: (raw) => accentColorSchema.parse(raw) })`;
      applies `data-accent` to `document.documentElement` in an effect; exposes `{ accent, setAccent }`) and
      `hooks/useAccent.ts` (throws outside the provider). Co-locate `contexts/AccentContext.test.tsx`: default
      `'indigo'`; `setAccent` persists + updates state; `data-accent` applied; hydrates from storage; malformed/unknown
      value → `'indigo'`; valid cross-tab `storage` event applies, invalid ignored. Add a `useAccent` outside-provider
      throw test.
- [ ] **WR-07** Add `contexts/TimerNumeralFontContext.tsx` (`TimerNumeralFontProvider`, mirroring
      `TimerFontSizeContext`:
      `useLocalStorage(STORAGE_KEY_TIMER_NUMERAL_FONT, 'mono', { sync: true, parse: (raw) =>     timerNumeralFontSchema.parse(raw) })`)
      and `hooks/useTimerNumeralFont.ts`. Co-locate `contexts/TimerNumeralFontContext.test.tsx`: default `'mono'`;
      `setNumeralFont` persists + updates; hydrates; malformed value → `'mono'`; valid cross-tab event applies.
- [ ] **WR-08** Retrofit Zod validation onto the existing prefs: pass `parse: (raw) => themePreferenceSchema.parse(raw)`
      to `useLocalStorage` in `contexts/ThemeContext.tsx` and `parse: (raw) => timerFontSizeSchema.parse(raw)` in
      `contexts/TimerFontSizeContext.tsx` (both already use `{ sync: true }`). Extend their tests: a malformed stored
      value now falls back to the default; existing default / set / sync assertions still pass.

## Phase D — Menu primitive & the two menus

- [ ] **WR-09** Extend `components/ui/menu.tsx` with `MenuSeparator`, `MenuGroup`, `MenuGroupLabel`, `MenuRadioGroup`,
      `MenuRadioItem`, and `MenuRadioItemIndicator` (thin wrappers over the matching `@base-ui/react/menu` parts, styled
      to match `MenuItem` / `MenuPopup`). **(no unit test — exercised by WR-10/WR-11)** **Verify:** `npm run type`.
- [ ] **WR-10** Add `components/shared/ThemeMenu.tsx` (the Theme & Accent dropdown, §6) consuming `useTheme` +
      `useAccent`; **delete** `components/shared/ThemeToggle.tsx` and `ThemeToggle.test.tsx`. Co-locate
      `ThemeMenu.test.tsx`: trigger shows the current-preference icon + `aria-label`; opening shows three mode items
      with the current indicated and selecting another calls `setTheme`; shows five accent items with the current
      indicated and selecting one calls `setAccent`.
- [ ] **WR-11** Add `components/shared/DisplayMenu.tsx` (the size + numeral-font dropdown, §7) consuming
      `useTimerFontSize` + `useTimerNumeralFont`; **delete** `components/shared/FontSizeToggle.tsx` and
      `FontSizeToggle.test.tsx`. Co-locate `DisplayMenu.test.tsx`: four size items (current indicated) → `setFontSize`;
      two numeral items (current indicated) → `setNumeralFont`; trigger `aria-label`.

## Phase E — Run view

- [ ] **WR-12** Add a `numeralFont?: TimerNumeralFont` prop (default `'mono'`) to
      `components/run-view/CountdownDisplay.tsx` mapping to `font-mono` / `font-sans` (replacing the hard-coded
      `font-mono`). Extend `CountdownDisplay.test.tsx`: `numeralFont='sans'` → `font-sans`; default → `font-mono`;
      existing size/count-up assertions still pass.
- [ ] **WR-13** Update `components/run-view/RunView.tsx`: add the always-on accent-gradient background element
      (absolute, `pointer-events-none`, behind content); replace `ThemeToggle` + `FontSizeToggle` with `ThemeMenu` +
      `DisplayMenu`; read `useTimerNumeralFont` and pass `numeralFont` to `CountdownDisplay`. Extend `RunView.test.tsx`:
      background element present; both menus render; numeral font flows to the display.

## Phase F — Timer list

- [ ] **WR-14** Update `components/timer-list/TimerListItem.tsx`: add an `index: number` prop and render the bare
      zero-padded monospace index in place of any leading icon (§8.1). Leave the existing `isActive` / "Running"
      treatment unchanged. Extend `TimerListItem.test.tsx`: renders the padded index; the existing `isActive` /
      Start-disabled assertions still pass.
- [ ] **WR-15** Update `components/timer-list/TimerList.tsx`: use `ThemeMenu` in the header (in place of `ThemeToggle`);
      pass each row its map `index`. The existing `isActive` computation is unchanged. Update `TimerList.test.tsx`:
      header renders `ThemeMenu`; rows receive indices.

## Phase G — Form restyle

- [ ] **WR-16** Restructure `components/shared/DurationInput.tsx` to the captioned-box layout (§8.3): three large,
      equal-width `font-mono` boxes with captions below ("hours" / "min" / "sec"), the focused box taking the accent
      border + `--acc-ring`. Keep the value/clamp/`onChange`-to-seconds + blur-normalization contract and `aria-label`s.
      Extend `DurationInput.test.tsx`: the captioned boxes render; existing value/clamp/blur assertions still pass.
- [ ] **WR-17** Restructure `components/timer-list/TimerForm.tsx` to the Warm form structure (§8.3): an "Alerts on
      expiry" legend; each alert setting as a bordered card row (icon + bold title + muted description + trailing
      `Switch`) that takes the accent-on background/border when enabled; the sound + notify sub-controls revealed as an
      indented subrow tied to the card; the hide-name setting as its own standalone card. Keep fields, `Switch`-based
      controls (no checkboxes), and submit logic unchanged. Extend `TimerForm.test.tsx`: card rows + descriptions
      render; toggling a switch reveals its sub-control and applies the accent-on styling; submit still emits the
      correct `TimerFormValues`.

## Phase H — App wiring

- [ ] **WR-18** Wrap the tree in `app/layout.tsx` with `AccentProvider` and `TimerNumeralFontProvider` (alongside the
      existing providers); leave `viewport.themeColor` as `#4f46e5`. Confirm `components/AppShell.integration.test.tsx`
      (start → run → back) still passes with the menus in place; adjust the integration test only if it referenced the
      removed toggles. **(no unit test beyond the existing integration suite)** **Verify:** `npm run test`.

## Phase I — Documentation

- [ ] **WR-19** Add `specs/requirements.md` **§18 Theming & Display Preferences** (Warm visual system, accent palette +
      `countdown_accent`, numeral font + `countdown_timer_numeral_font`, Zod-validated preference reads, the two menus
      replacing the toggles, the form restructure, bare-index rows) and touch §5 / §8 where they describe the toggles,
      the form, and the list row. Update `CLAUDE.md` (new `AccentProvider` / `TimerNumeralFontProvider` root contexts,
      Warm token system + accent → `--primary` mapping, `lib/preferencesSchema.ts` validating all prefs, `ThemeMenu` /
      `DisplayMenu` replacing `ThemeToggle` / `FontSizeToggle`, new storage keys, the form restructure, list-row index).
      Confirm both match the implementation. **(no unit test)**

## Phase J — Verification

- [ ] **WR-20** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual: confirm the Warm look in light + dark; open the Theme & Accent menu, switch mode and each accent (primary
      buttons + run-view glow recolor; selection reload-persists and **syncs across tabs immediately**); open the
      Display menu, change size and numeral font (countdown updates, persists, syncs); the form shows captioned duration
      boxes + alert card rows with descriptions/accent-on state + standalone hide-name card, and still saves correctly;
      list rows show the `01`/`02` index with the existing "Running" / active-row state intact; corrupt a stored pref in
      devtools and confirm it falls back to its default; default first-load accent is indigo with no flash; layout holds
      at 375px width. **(no unit test)**
