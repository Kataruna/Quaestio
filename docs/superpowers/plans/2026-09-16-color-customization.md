# Color Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Customize colors" sub-page inside Settings where the user edits the app's 24 semantic color tokens for Light and Dark independently, with export/import to a `.json` file.

**Architecture:** A new `custom_palette` SQLite table (single JSON blob, same pattern as `tab_layout`) holds sparse per-mode overrides. The main process owns reads/writes and the two file dialogs (export/import); the renderer's only new runtime logic is one effect that turns the current overrides into a `<style>` tag's text content — everything else (the `<input type="color">` rows, the mutations) is ordinary React/TanStack Query following this codebase's existing settings-mutation pattern.

**Tech Stack:** Electron (`dialog`, `nativeTheme` already wired from the theme-system work), Drizzle ORM + better-sqlite3, zod, TanStack Query, native `<input type="color">` (no new dependency).

**Spec:** `docs/superpowers/specs/2026-09-16-color-customization-design.md`

## Global Constraints

- 24 editable tokens only (semantic layer) — never the raw `--color-lime-*`/`--color-ink-*`/`--color-neutral-*` ramps, and never `--shadow-*`. (Spec: "Scope: which tokens are editable".)
- Every stored/applied override value must be a plain CSS color string (`#rrggbb` or `rgba(r,g,b,a)`) usable directly as a custom-property value — no other representation anywhere in the pipeline. (Spec: "Applying overrides at runtime".)
- Alpha is never user-chosen: it's always derived from whatever the *current effective value* (override, or failing that, the default) already has, via `parseColor`/`withAlpha`. The picker only ever edits hue/lightness. (Spec: "Scope", updated per owner feedback on 2026-09-16.)
- IPC inputs are validated with zod, per `CLAUDE.md`'s "Validation: zod (for all IPC inputs)".
- No new dependency — file dialogs are `electron`'s own `dialog` module (first use in this app), color picking is the native `<input type="color">`.
- Run `npm run typecheck && npm run lint && npm test` before considering any task done; all three must pass.

---

## File Structure

```
src/shared/
  palette-tokens.ts          NEW — PaletteToken union, PALETTE_TOKENS, PALETTE_GROUPS, PALETTE_DEFAULTS, PaletteOverrides type
  palette-color.ts           NEW — parseColor, withAlpha
  build-palette-style.ts     NEW — buildPaletteStyleTag
  validate-palette-import.ts NEW — validatePaletteImport
  ipc-contract.ts            MODIFY — palette IPC types/schemas, window.api.theme namespace
  channels.ts                MODIFY — 5 new channels
src/main/
  db/schema.ts                MODIFY — add customPalette table
  db/custom-palette-queries.ts NEW — getPaletteOverrides, setPaletteOverride, resetPalette, replacePaletteOverrides
  ipc/theme.ts                 NEW — registerThemeHandlers
  index.ts                     MODIFY — call registerThemeHandlers()
src/preload/index.ts          MODIFY — theme namespace
src/renderer/
  App.tsx                              MODIFY — inject the palette <style> tag
  features/settings/ColorCustomizationScreen.tsx  NEW
  features/settings/SettingsScreen.tsx  MODIFY — "Customize colors" entry point
drizzle/                      NEW migration (generated)
tests/
  palette-color.test.ts            NEW
  build-palette-style.test.ts      NEW
  validate-palette-import.test.ts  NEW
  palette-tokens.test.ts           NEW
  custom-palette-queries.test.ts   NEW
```

---

## Task 1: Palette token catalog

**Files:**
- Create: `src/shared/palette-tokens.ts`
- Test: `tests/palette-tokens.test.ts`

**Interfaces:**
- Produces: `PALETTE_TOKENS: readonly PaletteToken[]` (24 entries), `type PaletteToken`, `PALETTE_GROUPS: { label: string; tokens: PaletteToken[] }[]`, `PALETTE_DEFAULTS: Record<'light' | 'dark', Record<PaletteToken, string>>`, `type PaletteOverrides = { light: Partial<Record<PaletteToken, string>>; dark: Partial<Record<PaletteToken, string>> }`, `type PaletteMode = 'light' | 'dark'`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/palette-tokens.test.ts
import { describe, expect, it } from 'vitest';
import { PALETTE_TOKENS, PALETTE_GROUPS, PALETTE_DEFAULTS } from '../src/shared/palette-tokens';

describe('palette-tokens', () => {
  it('has exactly 24 tokens', () => {
    expect(PALETTE_TOKENS).toHaveLength(24);
  });

  it('has no duplicate tokens', () => {
    expect(new Set(PALETTE_TOKENS).size).toBe(PALETTE_TOKENS.length);
  });

  it('every token appears in exactly one group', () => {
    const grouped = PALETTE_GROUPS.flatMap((group) => group.tokens);
    expect(grouped.slice().sort()).toEqual(PALETTE_TOKENS.slice().sort());
  });

  it('every token has a light and dark default', () => {
    for (const token of PALETTE_TOKENS) {
      expect(PALETTE_DEFAULTS.light[token]).toBeTruthy();
      expect(PALETTE_DEFAULTS.dark[token]).toBeTruthy();
    }
  });

  it('matches the known default for surface-app in both modes', () => {
    expect(PALETTE_DEFAULTS.light['surface-app']).toBe('#f4f4f1');
    expect(PALETTE_DEFAULTS.dark['surface-app']).toBe('#0b0c0b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/palette-tokens.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/palette-tokens'`

- [ ] **Step 3: Write the implementation**

Values copied from `src/renderer/styles/tokens.css`'s `@theme` block (light) and its `@media (prefers-color-scheme: dark)` block (dark) — the two blocks this app already ships. `surface-accent` has no dark override in that file (lime is fixed across themes), so its dark default here is the same literal.

```ts
// src/shared/palette-tokens.ts
export const PALETTE_TOKENS = [
  'surface-app',
  'surface-card',
  'surface-sunken',
  'surface-ink',
  'surface-accent',
  'surface-accent-soft',
  'surface-overlay',
  'surface-chip',
  'text-strong',
  'text-body',
  'text-muted',
  'text-faint',
  'line-hairline',
  'line-strong',
  'status-hot',
  'status-hot-bg',
  'status-warm',
  'status-warm-bg',
  'status-due',
  'status-due-bg',
  'status-won',
  'status-won-bg',
  'status-info',
  'status-info-bg',
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];
export type PaletteMode = 'light' | 'dark';
export type PaletteOverrides = {
  light: Partial<Record<PaletteToken, string>>;
  dark: Partial<Record<PaletteToken, string>>;
};

export const PALETTE_GROUPS: { label: string; tokens: PaletteToken[] }[] = [
  {
    label: 'Surfaces',
    tokens: [
      'surface-app',
      'surface-card',
      'surface-sunken',
      'surface-ink',
      'surface-accent',
      'surface-accent-soft',
      'surface-overlay',
      'surface-chip',
    ],
  },
  { label: 'Text', tokens: ['text-strong', 'text-body', 'text-muted', 'text-faint'] },
  { label: 'Lines', tokens: ['line-hairline', 'line-strong'] },
  {
    label: 'Status',
    tokens: [
      'status-hot',
      'status-hot-bg',
      'status-warm',
      'status-warm-bg',
      'status-due',
      'status-due-bg',
      'status-won',
      'status-won-bg',
      'status-info',
      'status-info-bg',
    ],
  },
];

export const PALETTE_DEFAULTS: Record<PaletteMode, Record<PaletteToken, string>> = {
  light: {
    'surface-app': '#f4f4f1',
    'surface-card': '#ffffff',
    'surface-sunken': '#eeeeea',
    'surface-ink': '#0e0f10',
    'surface-accent': '#c7f24c',
    'surface-accent-soft': '#f1fbd9',
    'surface-overlay': 'rgba(14, 15, 16, 0.55)',
    'surface-chip': '#ffffff',
    'text-strong': '#16181a',
    'text-body': '#232629',
    'text-muted': '#6e7174',
    'text-faint': '#b4b5ae',
    'line-hairline': '#e4e4de',
    'line-strong': '#d6d6cf',
    'status-hot': '#f0433a',
    'status-hot-bg': '#fde4e2',
    'status-warm': '#fb8c3a',
    'status-warm-bg': '#feebda',
    'status-due': '#f5c93b',
    'status-due-bg': '#fdf2d6',
    'status-won': '#59c24c',
    'status-won-bg': '#e1f5de',
    'status-info': '#3d7bf7',
    'status-info-bg': '#e0eafe',
  },
  dark: {
    'surface-app': '#0b0c0b',
    'surface-card': '#181a17',
    'surface-sunken': '#1f211d',
    'surface-ink': '#272a25',
    'surface-accent': '#c7f24c',
    'surface-accent-soft': 'rgba(199, 242, 76, 0.12)',
    'surface-overlay': 'rgba(5, 6, 5, 0.66)',
    'surface-chip': '#1f211d',
    'text-strong': '#f4f5f0',
    'text-body': '#dddfd7',
    'text-muted': '#9da096',
    'text-faint': '#6f736a',
    'line-hairline': 'rgba(255, 255, 255, 0.1)',
    'line-strong': 'rgba(255, 255, 255, 0.18)',
    'status-hot': '#ff6b62',
    'status-hot-bg': 'rgba(255, 107, 98, 0.16)',
    'status-warm': '#ffa45c',
    'status-warm-bg': 'rgba(255, 164, 92, 0.16)',
    'status-due': '#ffd760',
    'status-due-bg': 'rgba(255, 215, 96, 0.16)',
    'status-won': '#7bda6c',
    'status-won-bg': 'rgba(123, 218, 108, 0.16)',
    'status-info': '#6e9bff',
    'status-info-bg': 'rgba(110, 155, 255, 0.16)',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/palette-tokens.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/palette-tokens.ts tests/palette-tokens.test.ts
git commit -m "feat: add palette token catalog for color customization"
```

---

## Task 2: Color conversion helpers

**Files:**
- Create: `src/shared/palette-color.ts`
- Test: `tests/palette-color.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `parseColor(value: string): { hex: string; alpha: number }`, `withAlpha(hex: string, alpha: number): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/palette-color.test.ts
import { describe, expect, it } from 'vitest';
import { parseColor, withAlpha } from '../src/shared/palette-color';

describe('parseColor', () => {
  it('parses a 6-digit hex as fully opaque', () => {
    expect(parseColor('#f4f4f1')).toEqual({ hex: '#f4f4f1', alpha: 1 });
  });

  it('parses an rgba() string into hex + alpha', () => {
    expect(parseColor('rgba(255, 255, 255, 0.1)')).toEqual({ hex: '#ffffff', alpha: 0.1 });
  });

  it('parses rgba() with no spaces after commas', () => {
    expect(parseColor('rgba(14,15,16,0.55)')).toEqual({ hex: '#0e0f10', alpha: 0.55 });
  });

  it('pads single-digit hex components with a leading zero', () => {
    expect(parseColor('rgba(5, 6, 5, 0.66)')).toEqual({ hex: '#050605', alpha: 0.66 });
  });
});

describe('withAlpha', () => {
  it('returns the plain hex unchanged when alpha is 1', () => {
    expect(withAlpha('#c7f24c', 1)).toBe('#c7f24c');
  });

  it('returns an rgba() string when alpha is less than 1', () => {
    expect(withAlpha('#ffffff', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('round-trips through parseColor', () => {
    const original = 'rgba(199, 242, 76, 0.12)';
    const { hex, alpha } = parseColor(original);
    expect(withAlpha(hex, alpha)).toBe(original);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/palette-color.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/palette-color'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/palette-color.ts

/** Every override this app ever stores is one of these two shapes. */
const RGBA_PATTERN = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

function toHexByte(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Reduces any color string this app produces (plain hex, or the rgba()
 * strings withAlpha below generates) to its hue and alpha, so the color
 * picker — which only ever edits hue — can show the right swatch and
 * withAlpha can restore the original transparency after an edit.
 */
export function parseColor(value: string): { hex: string; alpha: number } {
  const rgbaMatch = RGBA_PATTERN.exec(value);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return {
      hex: `#${toHexByte(Number(r))}${toHexByte(Number(g))}${toHexByte(Number(b))}`,
      alpha: Number(a),
    };
  }
  return { hex: value, alpha: 1 };
}

/**
 * Inverse of parseColor's hex half: combines a freshly-picked opaque hex
 * with a (usually pre-existing) alpha. Alpha is never something the user
 * picks directly — it always comes from whatever the token's current
 * effective value already had (see ColorCustomizationScreen).
 */
export function withAlpha(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/palette-color.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/palette-color.ts tests/palette-color.test.ts
git commit -m "feat: add hex/rgba conversion helpers for palette editing"
```

---

## Task 3: Style tag builder

**Files:**
- Create: `src/shared/build-palette-style.ts`
- Test: `tests/build-palette-style.test.ts`

**Interfaces:**
- Consumes: `PaletteOverrides` (Task 1).
- Produces: `buildPaletteStyleTag(overrides: PaletteOverrides): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/build-palette-style.test.ts
import { describe, expect, it } from 'vitest';
import { buildPaletteStyleTag } from '../src/shared/build-palette-style';

describe('buildPaletteStyleTag', () => {
  it('returns an empty string when there are no overrides', () => {
    expect(buildPaletteStyleTag({ light: {}, dark: {} })).toBe('');
  });

  it('emits a plain :root rule for light overrides', () => {
    const css = buildPaletteStyleTag({ light: { 'surface-app': '#ff0000' }, dark: {} });
    expect(css).toBe(':root{--color-surface-app:#ff0000;}');
  });

  it('wraps dark overrides in a prefers-color-scheme media query', () => {
    const css = buildPaletteStyleTag({ light: {}, dark: { 'text-strong': '#00ff00' } });
    expect(css).toBe('@media (prefers-color-scheme: dark){:root{--color-text-strong:#00ff00;}}');
  });

  it('emits both blocks when both modes have overrides', () => {
    const css = buildPaletteStyleTag({
      light: { 'surface-app': '#ff0000' },
      dark: { 'surface-app': '#0b0c0b' },
    });
    expect(css).toBe(
      ':root{--color-surface-app:#ff0000;}@media (prefers-color-scheme: dark){:root{--color-surface-app:#0b0c0b;}}',
    );
  });

  it('emits multiple tokens in one rule', () => {
    const css = buildPaletteStyleTag({
      light: { 'surface-app': '#ff0000', 'text-strong': '#000000' },
      dark: {},
    });
    expect(css).toBe(':root{--color-surface-app:#ff0000;--color-text-strong:#000000;}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/build-palette-style.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/build-palette-style'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/build-palette-style.ts
import type { PaletteOverrides } from './palette-tokens';

function declarations(overrides: Partial<Record<string, string>>): string {
  return Object.entries(overrides)
    .map(([token, value]) => `--color-${token}:${value};`)
    .join('');
}

/**
 * Turns persisted overrides into the text content of a single <style> tag.
 * Composes with tokens.css's own `@media (prefers-color-scheme: dark)`
 * block exactly the same way the built-in dark palette does — this is just
 * one more layer, injected after Tailwind's stylesheet in the DOM so it
 * wins the cascade for the same custom properties without `!important`.
 */
export function buildPaletteStyleTag(overrides: PaletteOverrides): string {
  const lightDecls = declarations(overrides.light);
  const darkDecls = declarations(overrides.dark);
  let css = '';
  if (lightDecls) css += `:root{${lightDecls}}`;
  if (darkDecls) css += `@media (prefers-color-scheme: dark){:root{${darkDecls}}}`;
  return css;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/build-palette-style.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/build-palette-style.ts tests/build-palette-style.test.ts
git commit -m "feat: add pure CSS builder for custom palette overrides"
```

---

## Task 4: Import validation

**Files:**
- Create: `src/shared/validate-palette-import.ts`
- Test: `tests/validate-palette-import.test.ts`

**Interfaces:**
- Consumes: `PALETTE_TOKENS`, `PaletteToken`, `PaletteOverrides` (Task 1).
- Produces: `validatePaletteImport(raw: unknown): PaletteOverrides` (throws `Error` only when the root isn't a plain object; otherwise always returns a valid, possibly-empty `PaletteOverrides`, silently dropping anything it doesn't recognize).

- [ ] **Step 1: Write the failing test**

```ts
// tests/validate-palette-import.test.ts
import { describe, expect, it } from 'vitest';
import { validatePaletteImport } from '../src/shared/validate-palette-import';

describe('validatePaletteImport', () => {
  it('accepts a well-formed palette', () => {
    const input = { light: { 'surface-app': '#ff0000' }, dark: { 'surface-app': '#000000' } };
    expect(validatePaletteImport(input)).toEqual(input);
  });

  it('defaults missing light/dark keys to empty objects', () => {
    expect(validatePaletteImport({})).toEqual({ light: {}, dark: {} });
  });

  it('drops keys that are not known palette tokens', () => {
    const input = { light: { 'surface-app': '#ff0000', 'not-a-real-token': '#123456' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': '#ff0000' }, dark: {} });
  });

  it('drops values that are not strings', () => {
    const input = { light: { 'surface-app': 12345 }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('ignores a non-object light/dark value instead of throwing', () => {
    const input = { light: 'not an object', dark: null };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('throws when the root is not an object', () => {
    expect(() => validatePaletteImport('a string')).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport(null)).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport([1, 2, 3])).not.toThrow(); // arrays are objects; light/dark just come back empty
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate-palette-import.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/validate-palette-import'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/validate-palette-import.ts
import { PALETTE_TOKENS, type PaletteMode, type PaletteOverrides, type PaletteToken } from './palette-tokens';

const KNOWN_TOKENS = new Set<string>(PALETTE_TOKENS);

function sanitizeMode(value: unknown): Partial<Record<PaletteToken, string>> {
  const result: Partial<Record<PaletteToken, string>> = {};
  if (typeof value !== 'object' || value === null) return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (KNOWN_TOKENS.has(key) && typeof entry === 'string') {
      result[key as PaletteToken] = entry;
    }
  }
  return result;
}

/**
 * Untrusted input from a file the user picked — never trust its shape.
 * Unknown keys are dropped rather than rejected (so an export from a
 * slightly newer/older version of this app still imports), but the root
 * itself must be a JSON object or there's nothing sensible to read.
 */
export function validatePaletteImport(raw: unknown): PaletteOverrides {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Palette file must be a JSON object.');
  }
  const obj = raw as Record<PaletteMode, unknown>;
  return { light: sanitizeMode(obj.light), dark: sanitizeMode(obj.dark) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate-palette-import.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/validate-palette-import.ts tests/validate-palette-import.test.ts
git commit -m "feat: validate imported palette files against known tokens"
```

---

## Task 5: Schema, migration, and query layer

**Files:**
- Modify: `src/main/db/schema.ts`
- Create: `src/main/db/custom-palette-queries.ts`
- Create (generated): `drizzle/000N_<name>.sql`, `drizzle/meta/000N_snapshot.json`, and an update to `drizzle/meta/_journal.json`
- Test: `tests/custom-palette-queries.test.ts`

**Interfaces:**
- Consumes: `PaletteOverrides`, `PaletteMode`, `PaletteToken` (Task 1).
- Produces: `getPaletteOverrides(db): PaletteOverrides`, `setPaletteOverride(db, mode: PaletteMode, token: PaletteToken, value: string | null): void`, `resetPalette(db, mode: PaletteMode): void`, `replacePaletteOverrides(db, overrides: PaletteOverrides): void`.

- [ ] **Step 1: Add the table to the schema**

```ts
// src/main/db/schema.ts — add near the other single-row tables (settings, tabLayout)
/**
 * Single-row table (`id` is always 1) holding per-mode color-token
 * overrides as JSON — `{ light: {...}, dark: {...} }` (see
 * shared/palette-tokens.ts's PaletteOverrides). A JSON blob, not one column
 * per token, matching `tab_layout`'s precedent — the token set can grow
 * without a migration.
 */
export const customPalette = sqliteTable('custom_palette', {
  id: integer('id').primaryKey(),
  overrides: text('overrides').notNull().default('{}'),
});
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: a new file under `drizzle/`, e.g. `drizzle/0005_<name>.sql` containing `CREATE TABLE `custom_palette` (...)`, plus the matching `drizzle/meta/0005_snapshot.json` and an updated `drizzle/meta/_journal.json`. Read the generated `.sql` file and confirm it's a single `CREATE TABLE` statement with no data loss implied (it's a brand-new table, so there's nothing to ask permission for per `CLAUDE.md`).

- [ ] **Step 3: Write the failing test**

```ts
// tests/custom-palette-queries.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  getPaletteOverrides,
  setPaletteOverride,
  resetPalette,
  replacePaletteOverrides,
} from '../src/main/db/custom-palette-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('custom-palette-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('defaults to empty overrides for both modes when no row exists yet', () => {
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: {} });
  });

  it('setPaletteOverride adds a token to the given mode', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    expect(getPaletteOverrides(db)).toEqual({ light: { 'surface-app': '#ff0000' }, dark: {} });
  });

  it('setPaletteOverride with a null value removes that token', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'light', 'surface-app', null);
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: {} });
  });

  it('keeps light and dark overrides independent', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'dark', 'surface-app', '#00ff00');
    expect(getPaletteOverrides(db)).toEqual({
      light: { 'surface-app': '#ff0000' },
      dark: { 'surface-app': '#00ff00' },
    });
  });

  it('resetPalette clears only the given mode', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'dark', 'surface-app', '#00ff00');
    resetPalette(db, 'light');
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: { 'surface-app': '#00ff00' } });
  });

  it('replacePaletteOverrides overwrites both modes at once', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    replacePaletteOverrides(db, { light: { 'text-strong': '#111111' }, dark: { 'text-strong': '#eeeeee' } });
    expect(getPaletteOverrides(db)).toEqual({
      light: { 'text-strong': '#111111' },
      dark: { 'text-strong': '#eeeeee' },
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/custom-palette-queries.test.ts`
Expected: FAIL — `Cannot find module '../src/main/db/custom-palette-queries'`

- [ ] **Step 5: Write the implementation**

```ts
// src/main/db/custom-palette-queries.ts
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PaletteMode, PaletteOverrides, PaletteToken } from '@shared/palette-tokens';
import { customPalette } from './schema';

const ROW_ID = 1;
const EMPTY: PaletteOverrides = { light: {}, dark: {} };

function readRow(db: BetterSQLite3Database): PaletteOverrides {
  const row = db.select().from(customPalette).where(eq(customPalette.id, ROW_ID)).get();
  if (!row) return EMPTY;
  try {
    const parsed = JSON.parse(row.overrides) as Partial<PaletteOverrides>;
    return { light: parsed.light ?? {}, dark: parsed.dark ?? {} };
  } catch {
    // A corrupt row self-heals the same way tab-layout-queries does: treat
    // it as empty rather than throwing and breaking every settings read.
    return EMPTY;
  }
}

function writeRow(db: BetterSQLite3Database, overrides: PaletteOverrides): void {
  const json = JSON.stringify(overrides);
  db.insert(customPalette)
    .values({ id: ROW_ID, overrides: json })
    .onConflictDoUpdate({ target: customPalette.id, set: { overrides: json } })
    .run();
}

export function getPaletteOverrides(db: BetterSQLite3Database): PaletteOverrides {
  return readRow(db);
}

export function setPaletteOverride(
  db: BetterSQLite3Database,
  mode: PaletteMode,
  token: PaletteToken,
  value: string | null,
): void {
  const current = readRow(db);
  const nextMode = { ...current[mode] };
  if (value === null) {
    delete nextMode[token];
  } else {
    nextMode[token] = value;
  }
  writeRow(db, { ...current, [mode]: nextMode });
}

export function resetPalette(db: BetterSQLite3Database, mode: PaletteMode): void {
  const current = readRow(db);
  writeRow(db, { ...current, [mode]: {} });
}

export function replacePaletteOverrides(db: BetterSQLite3Database, overrides: PaletteOverrides): void {
  writeRow(db, overrides);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/custom-palette-queries.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add src/main/db/schema.ts src/main/db/custom-palette-queries.ts drizzle/ tests/custom-palette-queries.test.ts
git commit -m "feat: add custom_palette table and query layer"
```

---

## Task 6: Shared IPC contract

**Files:**
- Modify: `src/shared/channels.ts`
- Modify: `src/shared/ipc-contract.ts`

**Interfaces:**
- Consumes: `PaletteToken`, `PaletteMode`, `PaletteOverrides` (Task 1).
- Produces: `paletteTokenSchema`, `setPaletteOverrideInput` (+ `SetPaletteOverrideInput` type), `resetPaletteInput` (+ `ResetPaletteInput` type), and the `window.api.theme` interface consumed by Tasks 7–10.

There is no test for this task — it's types and zod schemas with no runtime branching of their own; `npm run typecheck` is the check.

- [ ] **Step 1: Add the 5 new channels**

```ts
// src/shared/channels.ts — add alongside the existing settingsX channels
  themeGetPaletteOverrides: 'theme:get-palette-overrides',
  themeSetPaletteOverride: 'theme:set-palette-override',
  themeResetPalette: 'theme:reset-palette',
  themeExportPalette: 'theme:export-palette',
  themeImportPalette: 'theme:import-palette',
```

- [ ] **Step 2: Add the zod schemas and types**

```ts
// src/shared/ipc-contract.ts — add near setTabGroupsEnabledInput
import { PALETTE_TOKENS, type PaletteOverrides } from './palette-tokens';

export const paletteTokenSchema = z.enum(PALETTE_TOKENS);

export const setPaletteOverrideInput = z.object({
  mode: z.enum(['light', 'dark']),
  token: paletteTokenSchema,
  value: z.string().nullable(),
});
export type SetPaletteOverrideInput = z.infer<typeof setPaletteOverrideInput>;

export const resetPaletteInput = z.object({ mode: z.enum(['light', 'dark']) });
export type ResetPaletteInput = z.infer<typeof resetPaletteInput>;
```

- [ ] **Step 3: Add the `theme` namespace to the `window.api` interface**

Find the interface that declares `settings: { ... }` (the same interface `images`, `tabLayout` etc. live in) and add a sibling block:

```ts
// src/shared/ipc-contract.ts — in the window.api interface, alongside `settings`
  theme: {
    getPaletteOverrides(): Promise<PaletteOverrides>;
    setPaletteOverride(input: SetPaletteOverrideInput): Promise<void>;
    resetPalette(input: ResetPaletteInput): Promise<void>;
    /** null means the user canceled the save dialog. */
    exportPalette(): Promise<{ path: string } | null>;
    /** null means the user canceled the open dialog; throws on an unreadable/invalid file. */
    importPalette(): Promise<PaletteOverrides | null>;
  };
```

- [ ] **Step 4: Verify it typechecks**

Run: `npm run typecheck`
Expected: still fails at this point, but only with errors in `src/preload/index.ts` ("Property 'theme' is missing...") — that's Task 8's job. Confirm there are no errors *inside* `ipc-contract.ts` or `channels.ts` themselves.

- [ ] **Step 5: Commit**

```bash
git add src/shared/channels.ts src/shared/ipc-contract.ts
git commit -m "feat: add theme IPC contract for palette overrides"
```

---

## Task 7: Main-process IPC handlers

**Files:**
- Create: `src/main/ipc/theme.ts`
- Modify: `src/main/index.ts`

**Interfaces:**
- Consumes: `getPaletteOverrides`, `setPaletteOverride`, `resetPalette`, `replacePaletteOverrides` (Task 5); `setPaletteOverrideInput`, `resetPaletteInput` (Task 6); `validatePaletteImport` (Task 4).
- Produces: `registerThemeHandlers(): void`, called once from `main/index.ts`'s `bootstrap()`.

No unit test — this is Electron `dialog`/`fs` wiring, same category as this codebase's other IPC handler files (`main/ipc/settings.ts` etc.), which aren't unit tested either; `npm run typecheck` + `npm run lint` are the checks, plus the manual verification noted in Task 11.

- [ ] **Step 1: Write the handler file**

```ts
// src/main/ipc/theme.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import { setPaletteOverrideInput, resetPaletteInput } from '@shared/ipc-contract';
import { validatePaletteImport } from '@shared/validate-palette-import';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import {
  getPaletteOverrides,
  setPaletteOverride,
  resetPalette,
  replacePaletteOverrides,
} from '../db/custom-palette-queries';

export function registerThemeHandlers(): void {
  ipcMain.handle(CHANNELS.themeGetPaletteOverrides, () => getPaletteOverrides(getDb()));

  ipcMain.handle(CHANNELS.themeSetPaletteOverride, (_event, rawInput: unknown) => {
    const { mode, token, value } = setPaletteOverrideInput.parse(rawInput);
    setPaletteOverride(getDb(), mode, token, value);
  });

  ipcMain.handle(CHANNELS.themeResetPalette, (_event, rawInput: unknown) => {
    const { mode } = resetPaletteInput.parse(rawInput);
    resetPalette(getDb(), mode);
  });

  ipcMain.handle(CHANNELS.themeExportPalette, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const overrides = getPaletteOverrides(getDb());
    const dialogOptions = {
      defaultPath: 'quaestio-palette.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    // dialog.showSaveDialog's two overloads — (options) vs (window, options)
    // — don't accept `BrowserWindow | undefined` for the window param, so
    // this branches rather than passing a possibly-undefined window through.
    const result = window
      ? await dialog.showSaveDialog(window, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, JSON.stringify(overrides, null, 2), 'utf-8');
    return { path: result.filePath };
  });

  ipcMain.handle(CHANNELS.themeImportPalette, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const openDialogOptions = {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'] as const,
    };
    const result = window
      ? await dialog.showOpenDialog(window, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);
    if (result.canceled || result.filePaths.length === 0) return null;
    const [filePath] = result.filePaths;
    const raw = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('That file is not valid JSON.');
    }
    const overrides = validatePaletteImport(parsed);
    replacePaletteOverrides(getDb(), overrides);
    return overrides;
  });
}
```

- [ ] **Step 2: Register the handlers at startup**

In `src/main/index.ts`, add the import and the call, next to the other `register*Handlers()` calls:

```ts
import { registerThemeHandlers } from './ipc/theme';
```

```ts
  registerSettingsHandlers();
  registerThemeHandlers();
  registerTabLayoutHandlers();
```

- [ ] **Step 3: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS (module-not-found errors for `window.api.theme` in the renderer/preload are expected until Tasks 8–10 land — but nothing inside `main/ipc/theme.ts` or `main/index.ts` itself should error)

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/theme.ts src/main/index.ts
git commit -m "feat: register main-process IPC handlers for palette overrides"
```

---

## Task 8: Preload bridge

**Files:**
- Modify: `src/preload/index.ts`

**Interfaces:**
- Consumes: `CHANNELS.themeGetPaletteOverrides` etc. (Task 6).
- Produces: `window.api.theme` matching the `theme` interface declared in Task 6.

- [ ] **Step 1: Add the `theme` block**

Find the object literal that implements the `settings` block (`get: () => ipcRenderer.invoke(...)`, etc.) and add a sibling:

```ts
// src/preload/index.ts
  theme: {
    getPaletteOverrides: () => ipcRenderer.invoke(CHANNELS.themeGetPaletteOverrides),
    setPaletteOverride: (input) => ipcRenderer.invoke(CHANNELS.themeSetPaletteOverride, input),
    resetPalette: (input) => ipcRenderer.invoke(CHANNELS.themeResetPalette, input),
    exportPalette: () => ipcRenderer.invoke(CHANNELS.themeExportPalette),
    importPalette: () => ipcRenderer.invoke(CHANNELS.themeImportPalette),
  },
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS with zero errors anywhere in the project (this was the last piece implementing the `window.api` interface from Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat: expose theme palette API through the preload bridge"
```

---

## Task 9: Apply overrides in the renderer

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `window.api.theme.getPaletteOverrides()` (Task 8), `buildPaletteStyleTag` (Task 3).
- Produces: a `<style id="custom-palette-overrides">` tag kept in sync with the persisted overrides; a `['customPalette']` TanStack Query cache entry that Task 10's mutations write into.

No new unit test — this is a DOM-side effect, same category as this codebase's other un-unit-tested renderer wiring (the `sync:updated` cache invalidation, etc.). Verified via the manual check in Task 11 and a `vite build` sanity pass.

- [ ] **Step 1: Add the query and the injection effect**

`App.tsx` already imports `useEffect` and `useQuery` (used by the existing settings/issues queries) — only the new CSS-builder import is needed:

```tsx
import { buildPaletteStyleTag } from '@shared/build-palette-style';
```

Add this alongside the existing top-level `useQuery`/`useEffect` calls (e.g. near the `settingsQuery` declaration at line 93):

```tsx
  const customPaletteQuery = useQuery({
    queryKey: ['customPalette'],
    queryFn: () => window.api.theme.getPaletteOverrides(),
  });

  useEffect(() => {
    const overrides = customPaletteQuery.data ?? { light: {}, dark: {} };
    let styleEl = document.getElementById('custom-palette-overrides') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-palette-overrides';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildPaletteStyleTag(overrides);
  }, [customPaletteQuery.data]);
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Verify the CSS pipeline still builds**

Run: `npx vite build --config vite.renderer.config.mts`
Expected: build succeeds (this task adds no new CSS, so this mainly guards against a typo breaking the renderer bundle). Clean up with `rm -rf dist` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: apply custom palette overrides via an injected style tag"
```

---

## Task 10: Color customization page

**Files:**
- Create: `src/renderer/features/settings/ColorCustomizationScreen.tsx`
- Modify: `src/renderer/features/settings/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `PALETTE_GROUPS`, `PALETTE_DEFAULTS`, `PaletteToken`, `PaletteMode` (Task 1); `parseColor`, `withAlpha` (Task 2); `window.api.theme.*` (Task 8); `showToast` (existing, `@/components/ui/toast`); `Button` (existing, `@/components/ui/button`).
- Produces: `ColorCustomizationScreen({ onBack: () => void })`, rendered by `SettingsScreen` behind a "Customize colors" entry point.

No new unit test — this is the UI layer; `PALETTE_*`/`parseColor`/`withAlpha` underneath it already have direct tests (Tasks 1–2). Verified via the manual check in Task 11.

- [ ] **Step 1: Write the component**

```tsx
// src/renderer/features/settings/ColorCustomizationScreen.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload, RotateCcw } from 'lucide-react';
import { PALETTE_GROUPS, PALETTE_DEFAULTS, type PaletteMode, type PaletteToken } from '@shared/palette-tokens';
import type { PaletteOverrides } from '@shared/palette-tokens';
import { parseColor, withAlpha } from '@shared/palette-color';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';

const MODES: PaletteMode[] = ['light', 'dark'];
const EMPTY_OVERRIDES: PaletteOverrides = { light: {}, dark: {} };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

export function ColorCustomizationScreen({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const paletteQuery = useQuery({
    queryKey: ['customPalette'],
    queryFn: () => window.api.theme.getPaletteOverrides(),
  });
  const overrides = paletteQuery.data ?? EMPTY_OVERRIDES;

  const setOverrideMutation = useMutation({
    mutationFn: (input: { mode: PaletteMode; token: PaletteToken; value: string | null }) =>
      window.api.theme.setPaletteOverride(input),
    onSuccess: (_data, input) => {
      queryClient.setQueryData(['customPalette'], (current: PaletteOverrides | undefined) => {
        const base = current ?? EMPTY_OVERRIDES;
        const nextMode = { ...base[input.mode] };
        if (input.value === null) {
          delete nextMode[input.token];
        } else {
          nextMode[input.token] = input.value;
        }
        return { ...base, [input.mode]: nextMode };
      });
    },
    onError: (error) => showToast(`Failed to save color: ${errorMessage(error)}`, 'error'),
  });

  const resetModeMutation = useMutation({
    mutationFn: (mode: PaletteMode) => window.api.theme.resetPalette({ mode }),
    onSuccess: (_data, mode) => {
      queryClient.setQueryData(['customPalette'], (current: PaletteOverrides | undefined) => ({
        ...(current ?? EMPTY_OVERRIDES),
        [mode]: {},
      }));
    },
    onError: (error) => showToast(`Failed to reset: ${errorMessage(error)}`, 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: () => window.api.theme.exportPalette(),
    onSuccess: (result) => {
      if (result) showToast(`Exported to ${result.path}`, 'success');
    },
    onError: (error) => showToast(`Export failed: ${errorMessage(error)}`, 'error'),
  });

  const importMutation = useMutation({
    mutationFn: () => window.api.theme.importPalette(),
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(['customPalette'], result);
        showToast('Palette imported', 'success');
      }
    },
    onError: (error) => showToast(`Couldn't import: ${errorMessage(error)}`, 'error'),
  });

  function effectiveValue(mode: PaletteMode, token: PaletteToken): string {
    return overrides[mode][token] ?? PALETTE_DEFAULTS[mode][token];
  }

  function handlePick(mode: PaletteMode, token: PaletteToken, pickedHex: string) {
    const { alpha } = parseColor(effectiveValue(mode, token));
    setOverrideMutation.mutate({ mode, token, value: withAlpha(pickedHex, alpha) });
  }

  return (
    <div className="max-w-[560px] rounded-card bg-surface-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Settings"
          className="flex h-8 w-8 items-center justify-center rounded-pill text-text-muted hover:bg-surface-sunken hover:text-text-strong"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <h1 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
          Customize colors
        </h1>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" iconLeft={Download} onClick={() => exportMutation.mutate()}>
            Export
          </Button>
          <Button variant="secondary" size="sm" iconLeft={Upload} onClick={() => importMutation.mutate()}>
            Import
          </Button>
        </div>
      </div>

      {MODES.map((mode) => (
        <div key={mode} className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-sans text-label font-medium capitalize text-text-strong">{mode}</h2>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={RotateCcw}
              className="ml-auto"
              onClick={() => resetModeMutation.mutate(mode)}
            >
              Reset all
            </Button>
          </div>
          {PALETTE_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <span className="mb-1 block font-sans text-micro text-text-muted">{group.label}</span>
              <div className="flex flex-col gap-1">
                {group.tokens.map((token) => {
                  const value = effectiveValue(mode, token);
                  const hasOverride = overrides[mode][token] !== undefined;
                  return (
                    <div key={token} className="flex items-center gap-2.5 py-1">
                      <span className="flex-1 font-sans text-label text-text-body">{token}</span>
                      <input
                        type="color"
                        aria-label={`${mode} ${token}`}
                        value={parseColor(value).hex}
                        onChange={(event) => handlePick(mode, token, event.target.value)}
                        className="h-7 w-10 cursor-pointer rounded-xs border border-line-hairline bg-transparent p-0"
                      />
                      {hasOverride ? (
                        <button
                          type="button"
                          aria-label={`Reset ${token} to default`}
                          onClick={() => setOverrideMutation.mutate({ mode, token, value: null })}
                          className="text-text-muted hover:text-text-strong"
                        >
                          <RotateCcw size={12} strokeWidth={1.75} />
                        </button>
                      ) : (
                        <span className="w-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `SettingsScreen`**

Add local state and the entry point next to the Appearance row:

```tsx
// src/renderer/features/settings/SettingsScreen.tsx
import { useState } from 'react';
import { ColorCustomizationScreen } from './ColorCustomizationScreen';
```

Add the new state hook next to the existing `toggles` one at the top of the function body (line 42):

```tsx
  const [showColorPage, setShowColorPage] = useState(false);
```

Then, immediately before `return (` at line 77 — i.e. *after* `settingsQuery`, `setTabGroupsMutation`, and `setThemeMutation` are all declared, so this early return doesn't skip any hook call (Rules of Hooks: every hook must run on every render) — insert:

```tsx
  if (showColorPage) {
    return <ColorCustomizationScreen onBack={() => setShowColorPage(false)} />;
  }
```

The Appearance row currently reads (lines 87–99):

```tsx
        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Appearance</span>
            <span className="font-sans text-micro text-text-muted">Light, dark, or match the system</span>
          </span>
          <SelectPill
            className="ml-auto"
            options={THEME_OPTIONS}
            aria-label="Appearance"
            value={THEME_LABEL[theme]}
            onChange={(event) => setThemeMutation.mutate(THEME_FROM_LABEL[event.target.value as ThemeOptionLabel])}
          />
        </div>
```

Move `ml-auto` off the `SelectPill` and onto a new wrapping `<span>` around both it and the new button, so the pair sits flush right as a group:

```tsx
        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Appearance</span>
            <span className="font-sans text-micro text-text-muted">Light, dark, or match the system</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <SelectPill
              options={THEME_OPTIONS}
              aria-label="Appearance"
              value={THEME_LABEL[theme]}
              onChange={(event) => setThemeMutation.mutate(THEME_FROM_LABEL[event.target.value as ThemeOptionLabel])}
            />
            <Button variant="ghost" size="sm" onClick={() => setShowColorPage(true)}>
              Customize colors
            </Button>
          </span>
        </div>
```

- [ ] **Step 3: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Verify the renderer still builds**

Run: `npx vite build --config vite.renderer.config.mts`
Expected: build succeeds. Clean up with `rm -rf dist` afterward.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/settings/ColorCustomizationScreen.tsx src/renderer/features/settings/SettingsScreen.tsx
git commit -m "feat: add color customization sub-page to Settings"
```

---

## Task 11: Full verification and decisions log

**Files:**
- Modify: `CLAUDE.md` (decisions log)

- [ ] **Step 1: Run the full required check suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all three pass; the test count should be the pre-existing count plus 24 (5 + 7 + 5 + 6 + 6 from Tasks 1–5).

- [ ] **Step 2: Add a decisions log entry**

Append to `CLAUDE.md`'s `## Decisions log` section (newest entry on top), covering: the `custom_palette` table/JSON-blob shape, the `parseColor`/`withAlpha` alpha-preservation mechanism (and why — the owner's "can't you use opacity" question, and why literal CSS `opacity` doesn't work for this), the "semantic tokens only, not the raw ramps" scope decision, and the same "not clicked through in a live window" verification-gap statement every other entry in this log makes, naming specifically what wasn't checked: the color pickers actually reflecting/writing the right values, export/import round-tripping through a real file, and the reset buttons.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record color customization decisions"
```

---

## Self-Review Notes

- **Spec coverage:** every section of the spec has a task — data model → Task 5, IPC surface → Tasks 6–8, applying overrides → Task 9, UI → Task 10, testing → Tasks 1–5's test steps, the alpha-preservation fix → Task 2.
- **Type consistency check:** `PaletteMode`, `PaletteToken`, `PaletteOverrides` are defined once (Task 1) and imported everywhere else (Tasks 4–10) rather than redefined; `setPaletteOverride`/`resetPalette`/`replacePaletteOverrides`/`getPaletteOverrides` names match exactly between Task 5 (definition), Task 7 (IPC handler usage), and Task 10 (renderer call sites, via `window.api.theme`).
- **No placeholders:** every step above has real code, not a description of code.
