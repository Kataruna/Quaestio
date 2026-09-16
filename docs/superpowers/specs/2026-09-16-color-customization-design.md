# Color customization — design spec

Status: approved in chat, written up for record and for the implementation plan to build from.

## Goal

A sub-page inside Settings where the user can override individual semantic color tokens for the Light and Dark palettes independently, plus export/import that customization as a `.json` file.

## Relationship to the existing theme system

The [theme-system implementation plan](../plans/2026-09-16-theme-system.md) (same session, merged into `dev`) established: `nativeTheme.themeSource` drives `prefers-color-scheme`, and `tokens.css` has one `@media (prefers-color-scheme: dark)` block redeclaring semantic tokens. That mechanism is **static** (compiled CSS, no renderer JS). Per-user custom colors can't be static, since they're arbitrary runtime data — this is the one place this feature needs actual renderer logic, unlike the theme system.

## Scope: which tokens are editable

Confirmed with the owner: **semantic tokens only**, not the raw `--color-lime-*`/`--color-ink-*`/`--color-neutral-*` ramps. Those ramps are used directly (not through a semantic alias) by primary buttons, badges, accent dots, and chips across ~24 files (documented in the theme-system decisions log entry) — editing the ramps to actually reach those components would mean rewriting how those components reference color, which is out of scope here and was explicitly declined.

Shadows (`--shadow-*`) are excluded — they're multi-part `box-shadow` strings (offset + blur + rgba, sometimes with an `inset` clause), not something an `<input type="color">` can represent or a hex-string JSON value can carry.

**The 24 editable tokens**, grouped exactly as they'll appear in the UI:

| Group | Tokens |
|---|---|
| Surfaces | `surface-app`, `surface-card`, `surface-sunken`, `surface-ink`, `surface-accent`, `surface-accent-soft`, `surface-overlay`, `surface-chip` |
| Text | `text-strong`, `text-body`, `text-muted`, `text-faint` |
| Lines | `line-hairline`, `line-strong` |
| Status | `status-hot`, `status-hot-bg`, `status-warm`, `status-warm-bg`, `status-due`, `status-due-bg`, `status-won`, `status-won-bg`, `status-info`, `status-info-bg` |

Two of these (`surface-accent`, `surface-accent-soft`) are lime-derived and mostly redundant with the fixed ramp in practice (`bg-lime-400` is what most accent dots actually use, per the theme-system audit) — included anyway since they're genuine semantic tokens and the one file that does use `surface-accent` (`IssueCard.tsx`) should be customizable. This asymmetry (editing `surface-accent` visibly changes less than editing, say, `surface-app`) is a known, accepted limitation of the "semantic tokens only" scope decision, not a bug to fix here.

`--color-line-hairline`/`--color-line-strong` are `rgba(255,255,255,.1)`/`.18` in dark mode (translucent), not solid hex — `<input type="color">` only accepts opaque 6-digit hex. Where a default value isn't representable as `#rrggbb`, the picker still writes a plain hex on edit (losing translucency is an accepted trade-off of using the native color input rather than building a custom rgba picker) — flagged explicitly in the UI copy for those two rows ("this will become a solid color") rather than silently changing behavior.

## Data model

New single-row table, `custom_palette`, same shape convention as `tab_layout` (a JSON blob column, not one column per token — the token set can grow without a migration):

```ts
export const customPalette = sqliteTable('custom_palette', {
  id: integer('id').primaryKey(),
  overrides: text('overrides').notNull().default('{}'),
});
```

`overrides` deserializes to `{ light?: Partial<Record<PaletteToken, string>>, dark?: Partial<Record<PaletteToken, string>> }` — sparse; a token absent from the map uses the built-in default from `tokens.css`. `PaletteToken` is the union of the 24 token names above (shared type in `shared/ipc-contract.ts`, reused by the UI, the validator, and the CSS-injection code so the token list is defined exactly once).

## Applying overrides at runtime

A small hook, `useCustomPalette()` (or inline in `App.tsx`, matching how little state this app puts in dedicated hooks elsewhere), does three things on mount and whenever the persisted overrides change:
1. Reads `theme.getPaletteOverrides()` via the existing `settings`-style query pattern (TanStack Query, `['customPalette']` key).
2. Builds two CSS strings: `:root{--color-x:v;...}` from the light map, and the same wrapped in `@media (prefers-color-scheme: dark){:root{...}}` from the dark map.
3. Writes both into a single `<style id="custom-palette-overrides">` tag in `document.head`, replacing its previous content — a `<style>` tag placed after Tailwind's own stylesheet in the DOM wins the cascade for the same custom property without needing `!important`.

This tag is empty (or absent) when there are no overrides, so a user who never customizes anything sees byte-identical output to before this feature.

## IPC surface

New `theme` namespace (new, since this doesn't fit the existing `settings` one — it has its own data shape, its own file-dialog side effects, and grouping it under `settings.get()`'s single blob would mean every settings read carries the palette JSON even when the color page is never opened):

```ts
theme: {
  getPaletteOverrides(): Promise<{ light: Partial<Record<PaletteToken,string>>; dark: Partial<Record<PaletteToken,string>> }>;
  setPaletteOverride(input: { mode: 'light'|'dark'; token: PaletteToken; value: string | null }): Promise<void>; // null = reset to default
  resetPalette(input: { mode: 'light'|'dark' }): Promise<void>;
  exportPalette(): Promise<{ path: string } | null>; // null = user canceled the save dialog
  importPalette(): Promise<{ light: {...}; dark: {...} } | null>; // null = canceled; throws on invalid file (renderer shows a toast)
}
```

- `setPaletteOverride`/`resetPalette` follow the exact upsert pattern `settings-queries.ts` already uses (read whole JSON blob, patch, write back) — no new pattern.
- `exportPalette`/`importPalette` use `dialog.showSaveDialog`/`showOpenDialog` (`electron`, main process only — first use of these APIs in this app), scoped to the calling window via `BrowserWindow.fromWebContents(event.sender)` rather than tracking a global window reference.
- Export writes `JSON.stringify({ light, dark }, null, 2)` to the chosen path (default filename `quaestio-palette.json`, filter `{ name: 'JSON', extensions: ['json'] }`).
- Import reads the file, `JSON.parse`s it, and validates with a zod schema (`z.object({ light: z.record(paletteTokenSchema, z.string()).partial().optional(), dark: ... })` — actually: an object whose keys must be in the known `PaletteToken` enum and values are strings; unknown keys are dropped, not rejected, since a slightly-newer or slightly-older export/import across app versions shouldn't hard-fail). A parse or validation failure throws a plain `Error` with a user-facing message; the renderer's mutation `onError` shows it as a toast, matching the existing settings-mutation error pattern.

## UI

A new component, `ColorCustomizationScreen` (or a section within `SettingsScreen` toggled by local state — leaning toward a separate component file since it's a distinct, sizeable UI, imported and shown conditionally by `SettingsScreen` rather than a new sidebar/`ScreenId` destination, matching "sub-page" as described).

- `SettingsScreen`'s "Appearance" row gets a "Customize colors" button/link that flips a local `showColorPage` boolean.
- The color page: a back arrow (returns to Settings), Export/Import buttons at the top, then two sections — "Light" and "Dark" — each rendering the 4 groups above as labeled rows, each row an `<input type="color">` (native, no library — ladder step 3) bound to the effective value (override ?? default, read from a small constants map mirroring `tokens.css`'s light/dark defaults) plus a small "reset" icon-button that appears only when that token has an active override.
- A "Reset all" button per section, and a toast on import success ("Palette imported") / failure ("Couldn't import: <reason>").
- `<input type="color">`'s `change` event (not `input`) drives the mutation, so dragging inside the OS color picker doesn't fire a write per pixel — only the committed final value does.

## Testing

Pure, unit-testable pieces (following this codebase's existing pattern of testing logic, not React or Electron APIs):
- `mergePaletteOverride` / whatever the small reducer-style function ends up being called for the read-modify-write JSON blob logic in `custom-palette-queries.ts` — SQLite round-trip test in the `tab-layout-queries.test.ts` style.
- The import validator (parses valid JSON, drops unknown keys, rejects non-string values, rejects a non-object root) — pure function, direct unit tests, no file system or Electron involved.
- The CSS-string-building function (`buildPaletteStyleTag(overrides): string` or similar) — pure string logic, testable without a DOM.

Not tested (consistent with how `nativeTheme` itself isn't tested): the `<style>`-tag DOM injection, the file dialogs themselves, and the `<input type="color">` wiring — same "verification gap, flagged not hidden" pattern as every other slice in this codebase's decisions log.

## Known limitations (stated up front, not discovered later)

1. Raw-ramp component chrome (buttons, badges, accent dots) does not change — by explicit scope decision.
2. `line-hairline`/`line-strong` lose their translucency if customized (become opaque hex) — a limitation of `<input type="color">`, not fixed here.
3. `surface-accent`/`surface-accent-soft` visibly affect very little of the UI (one file), despite being full citizens of the token list — a known asymmetry from the "semantic tokens only" scope.
