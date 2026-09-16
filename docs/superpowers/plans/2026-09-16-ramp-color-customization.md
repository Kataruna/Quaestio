# Ramp Color Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app's 3 raw color ramps (accent/lime, ink chrome, neutral gray) customizable via one color pick per ramp per mode, so buttons/badges/accent dots — which read the ramps directly, not a semantic token — actually respond to customization, fixing the confusing gap where `surface-accent` looked editable but barely did anything.

**Architecture:** Tailwind compiles every ramp color utility (`bg-lime-400`, `bg-ink-900`, etc.) to `background-color: var(--color-lime-400)` — a runtime variable reference, never an inlined literal (verified against the built CSS). So customizing a ramp means overriding its CSS variables directly; no component changes anywhere. One picked "anchor" color per ramp is expanded, via HSL-lightness-preserving math, into every shade that ramp has, then fed into the *existing* `custom_palette` storage/IPC/CSS-injection pipeline unchanged — just with 3 new token-like keys (`ramp-accent`/`ramp-ink`/`ramp-neutral`) that expand to many CSS variables instead of mapping 1:1.

**Tech Stack:** Same as the color-customization feature this extends — no new dependency. Pure hex↔HSL math (new, ~30 lines, no library).

**Spec:** `docs/superpowers/specs/2026-09-16-ramp-color-customization-design.md`

## Global Constraints

- No new dependency — hex↔HSL conversion is hand-written, same as `parseColor`/`withAlpha`.
- Ramps get **separate Light and Dark override values** (unlike the ramps' own defaults, which stay a single mode-invariant set — only *overrides* differ per mode).
- Internal token names: `ramp-accent`, `ramp-ink`, `ramp-neutral` (not `ramp-lime` — named for role, not color, per owner feedback).
- `surface-accent` and `surface-accent-soft` are removed from the editable semantic-token catalog (now redundant with `ramp-accent`).
- Hue and saturation are held constant across all derived shades in a ramp — only lightness is shifted, preserving each ramp's original light-to-dark progression relative to its anchor shade.
- Anchor shades: `lime-400` (ramp-accent), `ink-900` (ramp-ink), `neutral-400` (ramp-neutral).
- Run `npm run typecheck && npm run lint && npm test` before considering any task done; all three must pass.

---

## File Structure

```
src/shared/
  ramp-tokens.ts             NEW — RAMP_TOKENS, RampToken, RAMP_LABELS, RAMP_FAMILY, RAMP_ANCHOR_SHADE, RAMP_SHADE_DEFAULTS, RAMP_ANCHOR_DEFAULTS
  hsl-color.ts                NEW — hexToHsl, hslToHex
  derive-ramp-overrides.ts    NEW — deriveRampOverrides
  expand-ramp-overrides.ts    NEW — expandRampOverrides
  palette-tokens.ts           MODIFY — remove surface-accent/-soft; add AnyPaletteToken, ALL_TOKENS; widen PaletteOverrides
  build-palette-style.ts      MODIFY — export CssVarOverrides, widen buildPaletteStyleTag's param type
  validate-palette-import.ts  MODIFY — accept ramp tokens; widen types
  ipc-contract.ts             MODIFY — paletteTokenSchema accepts ramp tokens too
src/main/db/
  custom-palette-queries.ts   MODIFY — widen PaletteToken param to AnyPaletteToken
src/renderer/
  App.tsx                                       MODIFY — wrap buildPaletteStyleTag call in expandRampOverrides
  features/settings/ColorCustomizationScreen.tsx MODIFY — extract ColorRow, add Ramps group
tests/
  ramp-tokens.test.ts             NEW
  hsl-color.test.ts               NEW
  derive-ramp-overrides.test.ts   NEW
  expand-ramp-overrides.test.ts   NEW
  palette-tokens.test.ts          MODIFY — token count 24 -> 22
  validate-palette-import.test.ts MODIFY — ramp tokens accepted, surface-accent/-soft dropped
```

---

## Task 1: Ramp token catalog

**Files:**
- Create: `src/shared/ramp-tokens.ts`
- Test: `tests/ramp-tokens.test.ts`

**Interfaces:**
- Produces: `RAMP_TOKENS: readonly RampToken[]` (3 entries), `type RampToken`, `RAMP_LABELS: Record<RampToken, string>`, `RAMP_FAMILY: Record<RampToken, string>` (the CSS variable family name each ramp controls — e.g. `ramp-accent` → `'lime'`), `RAMP_ANCHOR_SHADE: Record<RampToken, number>`, `RAMP_SHADE_DEFAULTS: Record<RampToken, Record<number, string>>`, `RAMP_ANCHOR_DEFAULTS: Record<RampToken, string>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/ramp-tokens.test.ts
import { describe, expect, it } from 'vitest';
import {
  RAMP_TOKENS,
  RAMP_LABELS,
  RAMP_FAMILY,
  RAMP_ANCHOR_SHADE,
  RAMP_SHADE_DEFAULTS,
  RAMP_ANCHOR_DEFAULTS,
} from '../src/shared/ramp-tokens';

describe('ramp-tokens', () => {
  it('has exactly 3 ramp tokens, named for role not color', () => {
    expect(RAMP_TOKENS).toEqual(['ramp-accent', 'ramp-ink', 'ramp-neutral']);
  });

  it('every ramp token has a label, family, anchor shade, and shade table', () => {
    for (const token of RAMP_TOKENS) {
      expect(RAMP_LABELS[token]).toBeTruthy();
      expect(RAMP_FAMILY[token]).toBeTruthy();
      expect(RAMP_ANCHOR_SHADE[token]).toBeTypeOf('number');
      expect(RAMP_SHADE_DEFAULTS[token]).toBeTruthy();
    }
  });

  it('labels match the design (Accent/Ink/Neutral)', () => {
    expect(RAMP_LABELS['ramp-accent']).toBe('Accent');
    expect(RAMP_LABELS['ramp-ink']).toBe('Ink');
    expect(RAMP_LABELS['ramp-neutral']).toBe('Neutral');
  });

  it('maps each ramp token to its real CSS variable family', () => {
    expect(RAMP_FAMILY['ramp-accent']).toBe('lime');
    expect(RAMP_FAMILY['ramp-ink']).toBe('ink');
    expect(RAMP_FAMILY['ramp-neutral']).toBe('neutral');
  });

  it('the accent ramp has exactly 7 shades, ink has 4, neutral has 10', () => {
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-accent'])).toHaveLength(7);
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-ink'])).toHaveLength(4);
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-neutral'])).toHaveLength(10);
  });

  it("each ramp's anchor default equals its shade table's value at the anchor shade", () => {
    for (const token of RAMP_TOKENS) {
      const anchorShade = RAMP_ANCHOR_SHADE[token];
      expect(RAMP_ANCHOR_DEFAULTS[token]).toBe(RAMP_SHADE_DEFAULTS[token][anchorShade]);
    }
  });

  it('matches the known default values for the accent ramp', () => {
    expect(RAMP_SHADE_DEFAULTS['ramp-accent']).toEqual({
      100: '#f1fbd9',
      200: '#e2f8ac',
      300: '#d4f57d',
      400: '#c7f24c',
      500: '#b6e230',
      600: '#9cc81c',
      700: '#6e8f14',
    });
    expect(RAMP_ANCHOR_DEFAULTS['ramp-accent']).toBe('#c7f24c');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ramp-tokens.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/ramp-tokens'`

- [ ] **Step 3: Write the implementation**

Values copied from `src/renderer/styles/tokens.css`'s raw `--color-lime-*`/`--color-ink-*`/`--color-neutral-*` declarations (unchanged across light/dark, per that file's own comment).

```ts
// src/shared/ramp-tokens.ts
export const RAMP_TOKENS = ['ramp-accent', 'ramp-ink', 'ramp-neutral'] as const;
export type RampToken = (typeof RAMP_TOKENS)[number];

/** UI label shown for each ramp's picker row. */
export const RAMP_LABELS: Record<RampToken, string> = {
  'ramp-accent': 'Accent',
  'ramp-ink': 'Ink',
  'ramp-neutral': 'Neutral',
};

/** The real CSS variable family each ramp token controls, e.g. ramp-accent -> --color-lime-100..700. */
export const RAMP_FAMILY: Record<RampToken, string> = {
  'ramp-accent': 'lime',
  'ramp-ink': 'ink',
  'ramp-neutral': 'neutral',
};

/** The shade each ramp's default table is centered on — the one real components use most (see design spec). */
export const RAMP_ANCHOR_SHADE: Record<RampToken, number> = {
  'ramp-accent': 400,
  'ramp-ink': 900,
  'ramp-neutral': 400,
};

/** Every shade in each ramp, with its default hex — from tokens.css's raw ramp declarations. */
export const RAMP_SHADE_DEFAULTS: Record<RampToken, Record<number, string>> = {
  'ramp-accent': {
    100: '#f1fbd9',
    200: '#e2f8ac',
    300: '#d4f57d',
    400: '#c7f24c',
    500: '#b6e230',
    600: '#9cc81c',
    700: '#6e8f14',
  },
  'ramp-ink': {
    600: '#3a3e42',
    700: '#232629',
    800: '#16181a',
    900: '#0e0f10',
  },
  'ramp-neutral': {
    0: '#ffffff',
    25: '#fbfbf9',
    50: '#f4f4f1',
    100: '#eeeeea',
    200: '#e4e4de',
    300: '#d6d6cf',
    400: '#b4b5ae',
    500: '#8a8d8f',
    600: '#6e7174',
    700: '#4a4d50',
  },
};

/** The anchor shade's own default hex — shown as the picker's un-overridden value. */
export const RAMP_ANCHOR_DEFAULTS: Record<RampToken, string> = {
  'ramp-accent': RAMP_SHADE_DEFAULTS['ramp-accent'][RAMP_ANCHOR_SHADE['ramp-accent']],
  'ramp-ink': RAMP_SHADE_DEFAULTS['ramp-ink'][RAMP_ANCHOR_SHADE['ramp-ink']],
  'ramp-neutral': RAMP_SHADE_DEFAULTS['ramp-neutral'][RAMP_ANCHOR_SHADE['ramp-neutral']],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ramp-tokens.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/ramp-tokens.ts tests/ramp-tokens.test.ts
git commit -m "feat: add ramp token catalog for ramp color customization"
```

---

## Task 2: Hex ↔ HSL conversion

**Files:**
- Create: `src/shared/hsl-color.ts`
- Test: `tests/hsl-color.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `type Hsl = { h: number; s: number; l: number }`, `hexToHsl(hex: string): Hsl`, `hslToHex(hsl: Hsl): string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/hsl-color.test.ts
import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex } from '../src/shared/hsl-color';

describe('hexToHsl', () => {
  it('converts white to 0 saturation, 100 lightness', () => {
    const { s, l } = hexToHsl('#ffffff');
    expect(s).toBeCloseTo(0, 5);
    expect(l).toBeCloseTo(100, 5);
  });

  it('converts black to 0 saturation, 0 lightness', () => {
    const { s, l } = hexToHsl('#000000');
    expect(s).toBeCloseTo(0, 5);
    expect(l).toBeCloseTo(0, 5);
  });

  it('converts pure red to hue 0, full saturation, 50 lightness', () => {
    const { h, s, l } = hexToHsl('#ff0000');
    expect(h).toBeCloseTo(0, 5);
    expect(s).toBeCloseTo(100, 5);
    expect(l).toBeCloseTo(50, 5);
  });

  it('matches the known HSL for the default accent color', () => {
    const { h, s, l } = hexToHsl('#c7f24c');
    expect(h).toBeCloseTo(75.5422, 3);
    expect(s).toBeCloseTo(86.4583, 3);
    expect(l).toBeCloseTo(62.3529, 3);
  });
});

describe('hslToHex', () => {
  it('converts hue 0, full saturation, 50 lightness back to pure red', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
  });

  it('round-trips the default accent color exactly', () => {
    expect(hslToHex(hexToHsl('#c7f24c'))).toBe('#c7f24c');
  });

  it('round-trips white and black', () => {
    expect(hslToHex(hexToHsl('#ffffff'))).toBe('#ffffff');
    expect(hslToHex(hexToHsl('#000000'))).toBe('#000000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hsl-color.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/hsl-color'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/hsl-color.ts
export type Hsl = { h: number; s: number; l: number };

/** Standard RGB->HSL conversion. h in [0,360), s and l in [0,100]. */
export function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

/** Inverse of hexToHsl. */
export function hslToHex({ h, s, l }: Hsl): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toByte = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hsl-color.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/hsl-color.ts tests/hsl-color.test.ts
git commit -m "feat: add hex/HSL conversion for ramp shade derivation"
```

---

## Task 3: Shade derivation

**Files:**
- Create: `src/shared/derive-ramp-overrides.ts`
- Test: `tests/derive-ramp-overrides.test.ts`

**Interfaces:**
- Consumes: `RAMP_SHADE_DEFAULTS`, `RAMP_ANCHOR_SHADE`, `RAMP_FAMILY`, `RampToken` (Task 1); `hexToHsl`, `hslToHex` (Task 2).
- Produces: `deriveRampOverrides(ramp: RampToken, anchorHex: string): Record<string, string>` — keys are `<family>-<shade>` (e.g. `lime-400`), values are hex colors.

- [ ] **Step 1: Write the failing test**

These exact expected values were computed and independently verified in both Python and this exact Node/TS algorithm before writing this plan — they are not estimates.

```ts
// tests/derive-ramp-overrides.test.ts
import { describe, expect, it } from 'vitest';
import { deriveRampOverrides } from '../src/shared/derive-ramp-overrides';

describe('deriveRampOverrides', () => {
  it("returns the picked color unchanged at the ramp's own anchor shade", () => {
    const result = deriveRampOverrides('ramp-accent', '#c7f24c');
    expect(result['lime-400']).toBe('#c7f24c');
  });

  it('derives every accent shade from a picked red, preserving the lightness progression', () => {
    const result = deriveRampOverrides('ramp-accent', '#ff0000');
    expect(result).toEqual({
      'lime-100': '#ff9696',
      'lime-200': '#ff6666',
      'lime-300': '#ff3434',
      'lime-400': '#ff0000',
      'lime-500': '#d30000',
      'lime-600': '#a50000',
      'lime-700': '#640000',
    });
  });

  it('clamps derived shades that would exceed 100% lightness rather than overflowing', () => {
    const result = deriveRampOverrides('ramp-accent', '#ffffff');
    // Shades lighter than the anchor default all clamp to white; darker ones don't need to.
    expect(result['lime-100']).toBe('#ffffff');
    expect(result['lime-200']).toBe('#ffffff');
    expect(result['lime-300']).toBe('#ffffff');
    expect(result['lime-400']).toBe('#ffffff');
    expect(result['lime-500']).toBe('#e9e9e9');
    expect(result['lime-600']).toBe('#d2d2d2');
    expect(result['lime-700']).toBe('#b2b2b2');
  });

  it('uses the correct CSS variable family and shade count for the ink ramp', () => {
    const result = deriveRampOverrides('ramp-ink', '#0e0f10');
    expect(Object.keys(result).sort()).toEqual(['ink-600', 'ink-700', 'ink-800', 'ink-900']);
    expect(result['ink-900']).toBe('#0e0f10');
  });

  it('uses the correct CSS variable family and shade count for the neutral ramp', () => {
    const result = deriveRampOverrides('ramp-neutral', '#b4b5ae');
    expect(Object.keys(result)).toHaveLength(10);
    expect(result['neutral-400']).toBe('#b4b5ae');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/derive-ramp-overrides.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/derive-ramp-overrides'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/derive-ramp-overrides.ts
import { hexToHsl, hslToHex } from './hsl-color';
import { RAMP_SHADE_DEFAULTS, RAMP_ANCHOR_SHADE, RAMP_FAMILY, type RampToken } from './ramp-tokens';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Derives every shade in a ramp from one picked anchor color. Preserves the
 * ramp's original lightness progression (each shade's default lightness
 * relative to the anchor's default lightness), applied to the picked color's
 * hue and saturation, which are held constant across every derived shade —
 * see the design spec's "Shade derivation algorithm" for why.
 */
export function deriveRampOverrides(ramp: RampToken, anchorHex: string): Record<string, string> {
  const defaults = RAMP_SHADE_DEFAULTS[ramp];
  const anchorShade = RAMP_ANCHOR_SHADE[ramp];
  const anchorDefaultHsl = hexToHsl(defaults[anchorShade]);
  const pickedHsl = hexToHsl(anchorHex);
  const family = RAMP_FAMILY[ramp];
  const result: Record<string, string> = {};
  for (const [shade, defaultHex] of Object.entries(defaults)) {
    const shadeHsl = hexToHsl(defaultHex);
    const deltaL = shadeHsl.l - anchorDefaultHsl.l;
    const newL = clamp(pickedHsl.l + deltaL, 0, 100);
    result[`${family}-${shade}`] = hslToHex({ h: pickedHsl.h, s: pickedHsl.s, l: newL });
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/derive-ramp-overrides.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/derive-ramp-overrides.ts tests/derive-ramp-overrides.test.ts
git commit -m "feat: derive full ramp shade sets from one anchor color pick"
```

---

## Task 4: Widen the CSS style-tag builder's input type

**Files:**
- Modify: `src/shared/build-palette-style.ts`

**Interfaces:**
- Produces: `type CssVarOverrides = { light: Partial<Record<string, string>>; dark: Partial<Record<string, string>> }` (new export); `buildPaletteStyleTag`'s parameter type widens from `PaletteOverrides` to `CssVarOverrides`.

No new test — the function's *behavior* is unchanged (still tested by the existing `tests/build-palette-style.test.ts`, which passes object literals that satisfy both the old and new type). This task only widens the type so a later task's expanded ramp overrides (which use ad hoc keys like `lime-400`, not `PaletteToken`) can be passed in.

- [ ] **Step 1: Replace the type import and widen the signature**

Current content of `src/shared/build-palette-style.ts`:

```ts
import type { PaletteOverrides } from './palette-tokens';

function declarations(overrides: Partial<Record<string, string>>): string {
  return Object.entries(overrides)
    .map(([token, value]) => `--color-${token}:${value};`)
    .join('');
}

/**
 * Turns persisted overrides into the text content of a single <style> tag.
 * Both light and dark overrides are wrapped in their respective `@media (prefers-color-scheme: ...)` queries.
 * This prevents cascade-order bugs: the injected <style> tag comes after tokens.css in the DOM, so an
 * unwrapped light override would incorrectly leak into dark mode (media queries of equal specificity are
 * tiebroken by source order, and "always applies" beats "applies when dark").
 */
export function buildPaletteStyleTag(overrides: PaletteOverrides): string {
  const lightDecls = declarations(overrides.light);
  const darkDecls = declarations(overrides.dark);
  let css = '';
  if (lightDecls) css += `@media (prefers-color-scheme: light){:root{${lightDecls}}}`;
  if (darkDecls) css += `@media (prefers-color-scheme: dark){:root{${darkDecls}}}`;
  return css;
}
```

Replace the import line and the function signature only — the rest of the file is unchanged:

```ts
export type CssVarOverrides = {
  light: Partial<Record<string, string>>;
  dark: Partial<Record<string, string>>;
};

function declarations(overrides: Partial<Record<string, string>>): string {
  return Object.entries(overrides)
    .map(([token, value]) => `--color-${token}:${value};`)
    .join('');
}

/**
 * Turns persisted overrides into the text content of a single <style> tag.
 * Both light and dark overrides are wrapped in their respective `@media (prefers-color-scheme: ...)` queries.
 * This prevents cascade-order bugs: the injected <style> tag comes after tokens.css in the DOM, so an
 * unwrapped light override would incorrectly leak into dark mode (media queries of equal specificity are
 * tiebroken by source order, and "always applies" beats "applies when dark").
 *
 * Takes plain CSS-variable-name/value pairs, not the stricter PaletteOverrides type — a caller with
 * ramp overrides expands them into ad hoc keys like `lime-400` first (expandRampOverrides), which
 * aren't PaletteToken values.
 */
export function buildPaletteStyleTag(overrides: CssVarOverrides): string {
  const lightDecls = declarations(overrides.light);
  const darkDecls = declarations(overrides.dark);
  let css = '';
  if (lightDecls) css += `@media (prefers-color-scheme: light){:root{${lightDecls}}}`;
  if (darkDecls) css += `@media (prefers-color-scheme: dark){:root{${darkDecls}}}`;
  return css;
}
```

- [ ] **Step 2: Run the existing test file to confirm nothing broke**

Run: `npx vitest run tests/build-palette-style.test.ts`
Expected: PASS (5 tests, unchanged — `PaletteOverrides` object literals are structurally assignable to the new `CssVarOverrides` type, so no test changes needed)

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (App.tsx's existing call site, `buildPaletteStyleTag(overrides)` where `overrides` is `PaletteOverrides`, still typechecks — structural widening is backward compatible)

- [ ] **Step 4: Commit**

```bash
git add src/shared/build-palette-style.ts
git commit -m "refactor: widen buildPaletteStyleTag to accept plain CSS-variable overrides"
```

---

## Task 5: Expand ramp overrides into CSS variables

**Files:**
- Create: `src/shared/expand-ramp-overrides.ts`
- Test: `tests/expand-ramp-overrides.test.ts`

**Interfaces:**
- Consumes: `RAMP_TOKENS`, `RampToken` (Task 1); `deriveRampOverrides` (Task 3); `CssVarOverrides` (Task 4); `PaletteOverrides` (existing, `src/shared/palette-tokens.ts`).
- Produces: `expandRampOverrides(overrides: PaletteOverrides): CssVarOverrides`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/expand-ramp-overrides.test.ts
import { describe, expect, it } from 'vitest';
import { expandRampOverrides } from '../src/shared/expand-ramp-overrides';

describe('expandRampOverrides', () => {
  it('passes through an overrides map with no ramp entries unchanged', () => {
    const overrides = { light: { 'surface-app': '#ff0000' }, dark: {} };
    expect(expandRampOverrides(overrides)).toEqual(overrides);
  });

  it('expands a ramp entry into its full shade set', () => {
    const overrides = { light: { 'ramp-accent': '#ff0000' }, dark: {} };
    const result = expandRampOverrides(overrides);
    expect(Object.keys(result.light).sort()).toEqual([
      'lime-100',
      'lime-200',
      'lime-300',
      'lime-400',
      'lime-500',
      'lime-600',
      'lime-700',
    ]);
    expect(result.light['lime-400']).toBe('#ff0000');
    expect(result.dark).toEqual({});
  });

  it('preserves semantic-token entries alongside an expanded ramp entry', () => {
    const overrides = { light: { 'ramp-accent': '#ff0000', 'surface-app': '#123456' }, dark: {} };
    const result = expandRampOverrides(overrides);
    expect(result.light['surface-app']).toBe('#123456');
    expect(result.light['lime-400']).toBe('#ff0000');
  });

  it('expands ramp entries independently per mode', () => {
    const overrides = {
      light: { 'ramp-ink': '#0e0f10' },
      dark: { 'ramp-ink': '#ffffff' },
    };
    const result = expandRampOverrides(overrides);
    expect(result.light['ink-900']).toBe('#0e0f10');
    expect(result.dark['ink-900']).toBe('#ffffff');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/expand-ramp-overrides.test.ts`
Expected: FAIL — `Cannot find module '../src/shared/expand-ramp-overrides'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/expand-ramp-overrides.ts
import { RAMP_TOKENS, type RampToken } from './ramp-tokens';
import { deriveRampOverrides } from './derive-ramp-overrides';
import type { CssVarOverrides } from './build-palette-style';
import type { PaletteOverrides } from './palette-tokens';

const RAMP_TOKEN_SET = new Set<string>(RAMP_TOKENS);

function expandMode(mode: Partial<Record<string, string>>): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const [key, value] of Object.entries(mode)) {
    if (value === undefined) continue;
    if (RAMP_TOKEN_SET.has(key)) {
      Object.assign(result, deriveRampOverrides(key as RampToken, value));
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Expands any ramp-token entries (ramp-accent/ramp-ink/ramp-neutral) in a
 * stored overrides map into their real CSS-variable overrides (lime-100,
 * ink-900, etc.), leaving semantic-token entries untouched. Runs before
 * buildPaletteStyleTag, which only ever deals in literal CSS variable names.
 */
export function expandRampOverrides(overrides: PaletteOverrides): CssVarOverrides {
  return { light: expandMode(overrides.light), dark: expandMode(overrides.dark) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/expand-ramp-overrides.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/expand-ramp-overrides.ts tests/expand-ramp-overrides.test.ts
git commit -m "feat: expand ramp overrides into CSS variables before injection"
```

---

## Task 6: Update the palette token catalog — remove surface-accent/-soft, widen types

**Files:**
- Modify: `src/shared/palette-tokens.ts`
- Modify: `tests/palette-tokens.test.ts`

**Interfaces:**
- Consumes: `RAMP_TOKENS`, `RampToken` (Task 1).
- Produces: `type AnyPaletteToken = PaletteToken | RampToken` (new export), `ALL_TOKENS: readonly AnyPaletteToken[]` (new export, `PALETTE_TOKENS` + `RAMP_TOKENS` combined — used by the IPC schema and the import validator), `PaletteOverrides` widened to `Partial<Record<AnyPaletteToken, string>>` per mode. `PALETTE_TOKENS` drops from 24 to 22 entries (removes `surface-accent`, `surface-accent-soft`); `PALETTE_GROUPS`'s "Surfaces" group drops from 8 to 6 tokens; `PALETTE_DEFAULTS` drops those two keys from both `light` and `dark`.

- [ ] **Step 1: Update the failing test for the new token count**

Current `tests/palette-tokens.test.ts`'s first test asserts `toHaveLength(24)`. Change it and add one new test:

```ts
// tests/palette-tokens.test.ts — replace the whole file
import { describe, expect, it } from 'vitest';
import { PALETTE_TOKENS, PALETTE_GROUPS, PALETTE_DEFAULTS, ALL_TOKENS } from '../src/shared/palette-tokens';
import { RAMP_TOKENS } from '../src/shared/ramp-tokens';

describe('palette-tokens', () => {
  it('has exactly 22 tokens (surface-accent/-soft removed, replaced by ramp customization)', () => {
    expect(PALETTE_TOKENS).toHaveLength(22);
  });

  it('no longer includes surface-accent or surface-accent-soft', () => {
    expect(PALETTE_TOKENS).not.toContain('surface-accent');
    expect(PALETTE_TOKENS).not.toContain('surface-accent-soft');
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

  it('ALL_TOKENS combines the semantic tokens and the ramp tokens', () => {
    expect(ALL_TOKENS).toHaveLength(PALETTE_TOKENS.length + RAMP_TOKENS.length);
    for (const token of PALETTE_TOKENS) expect(ALL_TOKENS).toContain(token);
    for (const token of RAMP_TOKENS) expect(ALL_TOKENS).toContain(token);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/palette-tokens.test.ts`
Expected: FAIL — `PALETTE_TOKENS` still has 24 entries, `ALL_TOKENS` doesn't exist yet

- [ ] **Step 3: Update the implementation**

In `src/shared/palette-tokens.ts`:

1. Add the import at the top:

```ts
import { RAMP_TOKENS, type RampToken } from './ramp-tokens';
```

2. Remove `'surface-accent'` and `'surface-accent-soft'` from the `PALETTE_TOKENS` array (lines 6-7 in the current file).

3. Add, right after the existing `export type PaletteToken = (typeof PALETTE_TOKENS)[number];` line:

```ts
export type AnyPaletteToken = PaletteToken | RampToken;
export const ALL_TOKENS: readonly AnyPaletteToken[] = [...PALETTE_TOKENS, ...RAMP_TOKENS];
```

4. Change the `PaletteOverrides` type to use `AnyPaletteToken` instead of `PaletteToken`:

```ts
export type PaletteOverrides = {
  light: Partial<Record<AnyPaletteToken, string>>;
  dark: Partial<Record<AnyPaletteToken, string>>;
};
```

5. Remove `'surface-accent'` and `'surface-accent-soft'` from the `PALETTE_GROUPS`' `'Surfaces'` group's `tokens` array (currently lines 43-44).

6. Remove the `'surface-accent'` and `'surface-accent-soft'` key/value pairs from both `PALETTE_DEFAULTS.light` (currently lines 74-75) and `PALETTE_DEFAULTS.dark` (currently lines 100-101).

The final file should have `PALETTE_TOKENS` with these 22 entries, in this order (only the two removed relative to before):

```
surface-app, surface-card, surface-sunken, surface-ink, surface-overlay, surface-chip,
text-strong, text-body, text-muted, text-faint,
line-hairline, line-strong,
status-hot, status-hot-bg, status-warm, status-warm-bg, status-due, status-due-bg, status-won, status-won-bg, status-info, status-info-bg
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/palette-tokens.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run typecheck to catch any other consumer that needs updating**

Run: `npm run typecheck`
Expected: errors, if any, will point at other files still referencing `surface-accent`/`surface-accent-soft` as a `PaletteToken` (there shouldn't be any outside `palette-tokens.ts` itself and the test file you just updated — the semantic-token list was never hardcoded elsewhere) or at `PaletteToken`-typed parameters that now need `AnyPaletteToken` (Tasks 7, 8, and 10 handle those explicitly). If you see an error here that isn't in `custom-palette-queries.ts`, `validate-palette-import.ts`, `ipc-contract.ts`, or `ColorCustomizationScreen.tsx`, stop and report it — those four are the only files this plan expects to need updating.

- [ ] **Step 6: Commit**

```bash
git add src/shared/palette-tokens.ts tests/palette-tokens.test.ts
git commit -m "feat: remove surface-accent/-soft, add AnyPaletteToken for ramp support"
```

---

## Task 7: Update the IPC contract and the query layer to accept ramp tokens

**Files:**
- Modify: `src/shared/ipc-contract.ts`
- Modify: `src/main/db/custom-palette-queries.ts`

**Interfaces:**
- Consumes: `ALL_TOKENS`, `AnyPaletteToken` (Task 6).
- Produces: `paletteTokenSchema` now validates against all 25 tokens (22 semantic + 3 ramp); `setPaletteOverride`/`resetPalette` accept `AnyPaletteToken` where they previously accepted `PaletteToken`.

No new test — these are type-level widenings and a zod schema change with no new branching logic; `npm run typecheck` and the existing `tests/custom-palette-queries.test.ts` (unchanged, still exercises the same read-modify-write behavior, now just also valid for ramp keys) are the checks.

- [ ] **Step 1: Widen the IPC contract's token schema**

In `src/shared/ipc-contract.ts`, change line 3's import:

```ts
// before
import { PALETTE_TOKENS, type PaletteOverrides } from './palette-tokens';

// after
import { ALL_TOKENS, type PaletteOverrides } from './palette-tokens';
```

And change line 128:

```ts
// before
export const paletteTokenSchema = z.enum(PALETTE_TOKENS);

// after
export const paletteTokenSchema = z.enum(ALL_TOKENS);
```

- [ ] **Step 2: Widen the query layer's token parameter type**

In `src/main/db/custom-palette-queries.ts`, change the import on line 3:

```ts
// before
import type { PaletteMode, PaletteOverrides, PaletteToken } from '@shared/palette-tokens';

// after
import type { PaletteMode, PaletteOverrides, AnyPaletteToken } from '@shared/palette-tokens';
```

And change `setPaletteOverride`'s `token` parameter type (currently line 37):

```ts
// before
export function setPaletteOverride(
  db: BetterSQLite3Database,
  mode: PaletteMode,
  token: PaletteToken,
  value: string | null,
): void {

// after
export function setPaletteOverride(
  db: BetterSQLite3Database,
  mode: PaletteMode,
  token: AnyPaletteToken,
  value: string | null,
): void {
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run the existing query-layer tests to confirm no behavior changed**

Run: `npx vitest run tests/custom-palette-queries.test.ts`
Expected: PASS (6 tests, unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc-contract.ts src/main/db/custom-palette-queries.ts
git commit -m "feat: accept ramp tokens in the IPC contract and query layer"
```

---

## Task 8: Accept ramp tokens in import validation

**Files:**
- Modify: `src/shared/validate-palette-import.ts`
- Modify: `tests/validate-palette-import.test.ts`

**Interfaces:**
- Consumes: `ALL_TOKENS`, `AnyPaletteToken` (Task 6).
- Produces: `validatePaletteImport` now accepts `ramp-accent`/`ramp-ink`/`ramp-neutral` keys (with the same hex/rgba format check as every other token) and silently drops `surface-accent`/`surface-accent-soft` (no longer known tokens) instead of accepting them.

- [ ] **Step 1: Add failing tests for the new behavior**

Add these two tests to `tests/validate-palette-import.test.ts` (keep all existing tests as-is):

```ts
  it('accepts ramp tokens with a valid hex value', () => {
    const input = { light: { 'ramp-accent': '#ff0000', 'ramp-ink': '#000000' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual(input);
  });

  it('drops surface-accent and surface-accent-soft now that they are no longer known tokens', () => {
    const input = { light: { 'surface-accent': '#ff0000', 'surface-app': '#123456' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': '#123456' }, dark: {} });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate-palette-import.test.ts`
Expected: FAIL — `ramp-accent`/`ramp-ink` are dropped as unknown tokens (not yet added to `KNOWN_TOKENS`), and `surface-accent` is still accepted (hasn't been removed from `PALETTE_TOKENS` from this file's point of view until Task 6's change propagates — if Task 6 already ran, this second test may already pass; run it anyway to confirm the first new test's failure)

- [ ] **Step 3: Update the implementation**

In `src/shared/validate-palette-import.ts`, change the import and the two type annotations:

```ts
// before
import { PALETTE_TOKENS, type PaletteMode, type PaletteOverrides, type PaletteToken } from './palette-tokens';
import { RGBA_PATTERN } from './palette-color';

const KNOWN_TOKENS = new Set<string>(PALETTE_TOKENS);

/** The only two shapes this app's own values ever take — see palette-color.ts. */
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

function isValidColorValue(entry: string): boolean {
  return HEX_PATTERN.test(entry) || RGBA_PATTERN.test(entry);
}

function sanitizeMode(value: unknown): Partial<Record<PaletteToken, string>> {
  const result: Partial<Record<PaletteToken, string>> = {};
  if (typeof value !== 'object' || value === null) return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (KNOWN_TOKENS.has(key) && typeof entry === 'string' && isValidColorValue(entry)) {
      result[key as PaletteToken] = entry;
    }
  }
  return result;
}

// after
import { ALL_TOKENS, type PaletteMode, type PaletteOverrides, type AnyPaletteToken } from './palette-tokens';
import { RGBA_PATTERN } from './palette-color';

const KNOWN_TOKENS = new Set<string>(ALL_TOKENS);

/** The only two shapes this app's own values ever take — see palette-color.ts. */
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

function isValidColorValue(entry: string): boolean {
  return HEX_PATTERN.test(entry) || RGBA_PATTERN.test(entry);
}

function sanitizeMode(value: unknown): Partial<Record<AnyPaletteToken, string>> {
  const result: Partial<Record<AnyPaletteToken, string>> = {};
  if (typeof value !== 'object' || value === null) return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (KNOWN_TOKENS.has(key) && typeof entry === 'string' && isValidColorValue(entry)) {
      result[key as AnyPaletteToken] = entry;
    }
  }
  return result;
}
```

The rest of the file (`validatePaletteImport` itself) is unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate-palette-import.test.ts`
Expected: PASS (11 tests — 9 existing + 2 new)

- [ ] **Step 5: Commit**

```bash
git add src/shared/validate-palette-import.ts tests/validate-palette-import.test.ts
git commit -m "feat: accept ramp tokens in imported palette validation"
```

---

## Task 9: Apply ramp expansion in the renderer

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `expandRampOverrides` (Task 5).
- Produces: the injected `<style>` tag now includes derived ramp CSS variables whenever a `ramp-*` override is present.

No new test — same category as Task 9 of the original color-customization plan (DOM-side effect wiring, verified by typecheck/lint/build).

- [ ] **Step 1: Add the import and wrap the existing call**

`App.tsx` currently has (around line 7):

```ts
import { buildPaletteStyleTag } from '@shared/build-palette-style';
```

Add a second import right after it:

```ts
import { expandRampOverrides } from '@shared/expand-ramp-overrides';
```

And in the injection effect (currently around lines 102-111):

```tsx
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

Change only the last line inside the effect:

```tsx
    styleEl.textContent = buildPaletteStyleTag(expandRampOverrides(overrides));
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Verify the renderer still builds**

Run: `npx vite build --config vite.renderer.config.mts`
Expected: build succeeds. Clean up with `rm -rf dist` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: expand ramp overrides before injecting the palette style tag"
```

---

## Task 10: Add the Ramps section to the color customization UI

**Files:**
- Modify: `src/renderer/features/settings/ColorCustomizationScreen.tsx`

**Interfaces:**
- Consumes: `RAMP_TOKENS`, `RAMP_LABELS`, `RAMP_ANCHOR_DEFAULTS`, `type RampToken` (Task 1); `type AnyPaletteToken` (Task 6); everything already in this file (`PALETTE_GROUPS`, `PALETTE_DEFAULTS`, `parseColor`, `window.api.theme.*`).
- Produces: a 5th "Ramps" group rendered in each mode's section, with the same reset/reset-all behavior as every other group.

This task extracts the existing per-token row markup into a small local `ColorRow` component (used by both the semantic-token loop and the new ramp loop) — this is the one factoring this plan introduces, justified because the row markup (the ref-based native `change` listener, the reset button) would otherwise be duplicated verbatim for the 3 ramp rows.

No new test — same category as Task 10 of the original plan (UI layer; the logic underneath — `RAMP_*` catalogs, `deriveRampOverrides` — already has direct tests). Verified via typecheck/lint/build.

- [ ] **Step 1: Replace the whole file**

The current file is 176 lines (already includes the final-review fix's uncontrolled-input pattern). Replace it entirely with:

```tsx
// src/renderer/features/settings/ColorCustomizationScreen.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload, RotateCcw } from 'lucide-react';
import {
  PALETTE_GROUPS,
  PALETTE_DEFAULTS,
  type PaletteMode,
  type PaletteToken,
  type AnyPaletteToken,
} from '@shared/palette-tokens';
import type { PaletteOverrides } from '@shared/palette-tokens';
import { RAMP_TOKENS, RAMP_LABELS, RAMP_ANCHOR_DEFAULTS, type RampToken } from '@shared/ramp-tokens';
import { parseColor, withAlpha } from '@shared/palette-color';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';

const MODES: PaletteMode[] = ['light', 'dark'];
const EMPTY_OVERRIDES: PaletteOverrides = { light: {}, dark: {} };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function ColorRow({
  label,
  value,
  hasOverride,
  ariaLabel,
  onPick,
  onReset,
}: {
  label: string;
  value: string;
  hasOverride: boolean;
  ariaLabel: string;
  onPick: (hex: string) => void;
  onReset: () => void;
}) {
  const hex = parseColor(value).hex;
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="flex-1 font-sans text-label text-text-body">{label}</span>
      <input
        // Keyed on the committed hex so the DOM node remounts (picking up a
        // fresh `defaultValue`) whenever the effective value changes from
        // outside this input's own drag — a reset, an import, or this row's
        // own commit landing in the query cache. Uncontrolled otherwise, so
        // the OS color panel can update the swatch live while dragging
        // without React fighting it on every tick.
        key={hex}
        type="color"
        aria-label={ariaLabel}
        defaultValue={hex}
        ref={(node) => {
          if (!node) return;
          const onCommit = (event: Event) => {
            onPick((event.target as HTMLInputElement).value);
          };
          // Native `change` fires once, on commit — not React's `onChange`
          // prop, which for a color input maps to the native `input` event
          // and would fire continuously while dragging in the OS picker.
          node.addEventListener('change', onCommit);
          return () => node.removeEventListener('change', onCommit);
        }}
        className="h-7 w-10 cursor-pointer rounded-xs border border-line-hairline bg-transparent p-0"
      />
      {hasOverride ? (
        <button
          type="button"
          aria-label={`Reset ${ariaLabel} to default`}
          onClick={onReset}
          className="text-text-muted hover:text-text-strong"
        >
          <RotateCcw size={12} strokeWidth={1.75} />
        </button>
      ) : (
        <span className="w-3" />
      )}
    </div>
  );
}

export function ColorCustomizationScreen({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const paletteQuery = useQuery({
    queryKey: ['customPalette'],
    queryFn: () => window.api.theme.getPaletteOverrides(),
  });
  const overrides = paletteQuery.data ?? EMPTY_OVERRIDES;

  const setOverrideMutation = useMutation({
    mutationFn: (input: { mode: PaletteMode; token: AnyPaletteToken; value: string | null }) =>
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

  function effectiveRampValue(mode: PaletteMode, ramp: RampToken): string {
    return overrides[mode][ramp] ?? RAMP_ANCHOR_DEFAULTS[ramp];
  }

  function handlePick(mode: PaletteMode, token: PaletteToken, pickedHex: string) {
    const { alpha } = parseColor(effectiveValue(mode, token));
    setOverrideMutation.mutate({ mode, token, value: withAlpha(pickedHex, alpha) });
  }

  function handleRampPick(mode: PaletteMode, ramp: RampToken, pickedHex: string) {
    // Ramp anchors are always plain opaque hex (see the ramp shade tables) —
    // no alpha-preservation step needed, unlike the semantic tokens.
    setOverrideMutation.mutate({ mode, token: ramp, value: pickedHex });
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
                {group.tokens.map((token) => (
                  <ColorRow
                    key={token}
                    label={token}
                    value={effectiveValue(mode, token)}
                    hasOverride={overrides[mode][token] !== undefined}
                    ariaLabel={`${mode} ${token}`}
                    onPick={(hex) => handlePick(mode, token, hex)}
                    onReset={() => setOverrideMutation.mutate({ mode, token, value: null })}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="mb-3">
            <span className="mb-1 block font-sans text-micro text-text-muted">Ramps</span>
            <div className="flex flex-col gap-1">
              {RAMP_TOKENS.map((ramp) => (
                <ColorRow
                  key={ramp}
                  label={RAMP_LABELS[ramp]}
                  value={effectiveRampValue(mode, ramp)}
                  hasOverride={overrides[mode][ramp] !== undefined}
                  ariaLabel={`${mode} ${RAMP_LABELS[ramp]}`}
                  onPick={(hex) => handleRampPick(mode, ramp, hex)}
                  onReset={() => setOverrideMutation.mutate({ mode, token: ramp, value: null })}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks and lints**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Verify the renderer still builds**

Run: `npx vite build --config vite.renderer.config.mts`
Expected: build succeeds. Clean up with `rm -rf dist` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/features/settings/ColorCustomizationScreen.tsx
git commit -m "feat: add Ramps section to the color customization page"
```

---

## Task 11: Full verification and decisions log

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full required check suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all three pass; the test count should be the pre-existing count plus 23 (7 + 7 + 5 + 4 from Tasks 1-3 and 5, plus 3 new/changed in Task 6's file [7 total, +1 net new], plus 2 new in Task 8 — count precisely from the actual run rather than assuming this arithmetic, and correct it in the log entry if it differs, the way the original color-customization plan's own arithmetic mistake had to be corrected after the fact).

- [ ] **Step 2: Add a decisions log entry**

Append to `CLAUDE.md`'s `## Decisions log` section (newest entry on top), covering: why ramp customization was needed (the `surface-accent` confusion — a token exposed on the page that barely affected anything), the key technical fact that made it cheap (Tailwind's ramp utilities already reference `var()`, so no component rewrites), the shade-derivation algorithm (one anchor pick per ramp, HSL-lightness-preserving math, constant hue/saturation), the decision to give ramps separate light/dark values despite the ramps' own defaults being mode-invariant, the removal of `surface-accent`/`surface-accent-soft`, and the same honest "not clicked through in a live window" verification-gap statement every other entry in this log makes — name specifically what wasn't checked: the Ramps pickers actually reflecting/writing the right values, whether a picked accent color visibly changes buttons/tabs/badges in a real running app, and whether the derived shades look visually coherent (the algorithm is verified by unit test and hand-computed math, not by eye).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record ramp color customization decisions"
```

---

## Self-Review Notes

- **Spec coverage:** shade derivation algorithm → Tasks 2-3; mode-specific ramp overrides → Task 5/9 (expansion runs per-mode, independently); `surface-accent`/-soft removal → Task 6; naming (`ramp-accent` not `ramp-lime`) → Task 1; UI → Task 10; testing → Tasks 1, 2, 3, 5's test steps plus Task 6/8's updated test files.
- **Type consistency check:** `RampToken`, `RAMP_TOKENS`, `RAMP_LABELS`, `RAMP_FAMILY`, `RAMP_ANCHOR_SHADE`, `RAMP_SHADE_DEFAULTS`, `RAMP_ANCHOR_DEFAULTS` are defined once (Task 1) and imported everywhere else (Tasks 3, 5, 6, 10) rather than redefined; `AnyPaletteToken`/`ALL_TOKENS` defined once (Task 6) and imported by Tasks 7, 8, 10; `CssVarOverrides` defined once (Task 4) and imported by Task 5; `deriveRampOverrides`'s exact return shape (keys like `lime-400`) matches what `expandRampOverrides` expects and what `buildPaletteStyleTag`'s `declarations()` templates into `--color-${token}`.
- **No placeholders:** every step above has real, verified code (the HSL math and its test expectations were independently computed and cross-checked in Python and Node before being written into this plan, not estimated).
