# Ramp color customization — design spec

Status: approved in chat, written up for record and for the implementation plan to build from.

## Background

The [color customization feature](2026-09-16-color-customization-design.md) shipped with semantic-tokens-only scope: it deliberately excluded the raw `--color-lime-*`/`--color-ink-*`/`--color-neutral-*` ramps, since most of the UI's "brand chrome" (primary buttons, accent dots, badges, tab indicators) reads those ramps directly rather than through a semantic alias.

After shipping, the owner tried customizing `surface-accent` (a semantic token exposed on the page, aliasing lime) expecting it to change buttons/badges/dots — it didn't, because those components use `bg-lime-400` directly, not `surface-accent`. This is a real defect in what the UI *promises*: exposing a token that visibly affects almost nothing is misleading, not a documentation gap. This spec fixes it by making the ramps themselves customizable.

## Key technical fact that makes this cheap

Tailwind v4 compiles every color utility to a `var()` reference, never an inlined literal — confirmed by inspecting the built CSS: `.bg-lime-400{background-color:var(--color-lime-400)}`, `.bg-ink-900{background-color:var(--color-ink-900)}`. This means overriding the ramp's own CSS custom properties reaches every component that uses that ramp, with **zero changes to any of the ~24 files** that reference `bg-lime-*`/`bg-ink-*`/`bg-neutral-*` directly. This is why the original "make the ramps reachable" idea (rewriting every component to use a semantic alias instead) was unnecessary — the existing var()-based mechanism the app already relies on for dark mode and semantic-token customization applies here too, unchanged.

## Scope

Three ramps become customizable, each via **one color pick that derives every shade in that ramp** (not 21 individual pickers):

| Internal token | UI label | Anchor shade | Ramp shades derived |
|---|---|---|---|
| `ramp-accent` | Accent | `lime-400` | `lime-100`…`lime-700` (7) |
| `ramp-ink` | Ink | `ink-900` | `ink-600`…`ink-900` (4) |
| `ramp-neutral` | Neutral | `neutral-400` | `neutral-0`…`neutral-700` (10) |

(`ramp-accent` was named `ramp-lime` in earlier drafts of this design — renamed because it names the *color*, not the *role*, which is what caused the original confusion this feature fixes. `ramp-ink`/`ramp-neutral` already read as their functional role and are unchanged.)

Anchor choice: the shade each ramp's real components actually use most (`lime-400` is `surface-accent`'s current default and the shade almost every accent dot uses; `ink-900` is the primary button/badge/rail color; `neutral-400` sits in the middle of its ramp, which is the numerically simplest anchor to derive both lighter and darker shades from).

**Unlike the semantic tokens, ramps get separate Light and Dark values** (owner's explicit choice, reversing the ramps' current mode-invariant behavior) — 6 pickers total (3 ramps × 2 modes), not 3.

**`surface-accent` and `surface-accent-soft` are removed** from the existing "Surfaces" group — now redundant and actively confusing next to a picker that actually reaches everywhere. The original 24-semantic-token catalog (Task 1 of the original plan) drops to 22: the "Surfaces" group loses these 2, going from 8 tokens to 6 (see "Data model" below).

## Shade derivation algorithm

Pure function, no new dependency (same spirit as the existing `parseColor`/`withAlpha` helpers):

1. Convert the anchor's **default** hex and the **default** hex of every other shade in that ramp to HSL.
2. For each non-anchor shade, compute `deltaL = defaultShade.L - defaultAnchor.L` (lightness only).
3. Convert the **user's picked** anchor hex to HSL, getting `{H, S, L}`.
4. For each shade: `newL = clamp(L + deltaL, 0, 100)`; the derived shade is `{H, S, newL}` converted back to hex. The anchor's own "derived" value is just the picked hex unchanged (`deltaL = 0` by construction).

Hue and saturation are held constant across every derived shade — a deliberate simplification (the original lime ramp varies saturation slightly shade-to-shade; reproducing that exactly would need per-shade saturation deltas too, which is more moving parts for a visually marginal improvement). Constant-hue/saturation tint-and-shade generation is the standard, good-enough approach for a "pick one color, get a coherent ramp" feature.

Needs: hex↔HSL conversion (new, small, pure — same file or a sibling to `palette-color.ts`), a per-ramp table of default shade hexes (already fully known — see the table below), and the pure function `deriveRampOverrides(ramp, mode, anchorHex): Record<string, string>` (e.g. `{ 'lime-100': '#...', 'lime-200': '#...', ..., 'lime-400': anchorHex, ... }`).

**Ramp default values** (from `tokens.css` — identical for light and dark today, since ramps are currently mode-invariant; this feature's *defaults* stay the single existing set, only *overrides* become mode-specific):

| Ramp | Shades (default hex) |
|---|---|
| lime | 100:`#f1fbd9` 200:`#e2f8ac` 300:`#d4f57d` **400:`#c7f24c`** 500:`#b6e230` 600:`#9cc81c` 700:`#6e8f14` |
| ink | 600:`#3a3e42` 700:`#232629` 800:`#16181a` **900:`#0e0f10`** |
| neutral | 0:`#ffffff` 25:`#fbfbf9` 50:`#f4f4f1` 100:`#eeeeea` 200:`#e4e4de` 300:`#d6d6cf` **400:`#b4b5ae`** 500:`#8a8d8f` 600:`#6e7174` 700:`#4a4d50` |

(Bold = anchor shade.)

## Data model

No new table, no new IPC channel, no new mutation type — reuses the existing `custom_palette` storage and `theme.*` IPC surface entirely. The three ramp tokens are stored in the *same* per-mode override map as the 22 semantic tokens, just under their own key names (`ramp-accent`/`ramp-ink`/`ramp-neutral`) rather than a `--color-*` name — because, unlike a semantic token, a ramp override doesn't map 1:1 to a single CSS variable; it expands to several.

A new pure function, `expandRampOverrides(overrides: PaletteOverrides): PaletteOverrides`, runs **before** the existing `buildPaletteStyleTag` (which is otherwise untouched): it walks each mode's override map, and for every `ramp-*` key present, replaces it with the N derived `lime-100`/`ink-700`/etc. entries (calling `deriveRampOverrides`), leaving every other (semantic) key as-is. `buildPaletteStyleTag(expandRampOverrides(overrides))` — one new expansion step, zero changes to the CSS-string builder itself.

`validatePaletteImport` extends its known-key allowlist to include the 3 new ramp tokens, reusing its existing hex/rgba format check unchanged (a ramp anchor pick is stored as a plain hex, same shape as any other token override).

**Removing `surface-accent`/`surface-accent-soft`:** these two are deleted from `PALETTE_TOKENS`/`PALETTE_GROUPS`/`PALETTE_DEFAULTS` (the "Surfaces" group's editable set: `surface-app`, `surface-card`, `surface-sunken`, `surface-ink`, `surface-overlay`, `surface-chip` — 6, down from 8). Any existing stored override under those two keys becomes inert (harmless — `effectiveValue` will simply never look them up once they're gone from the token list; no migration needed since these are additive JSON-blob keys, not SQL columns).

## UI

A 5th group, **"Ramps"**, added to each mode's section in `ColorCustomizationScreen` — same rendering loop, same per-token reset button, same "Reset all" behavior as every existing group. `effectiveValue` for a ramp token falls back to the ramp's anchor default (the bolded values in the table above) instead of `PALETTE_DEFAULTS`. No new UI component, no new interaction pattern.

## Testing

- `deriveRampOverrides` and the hex↔HSL helpers: pure function, direct unit tests — including the identity case (anchor's own derived value equals the picked hex exactly) and a clamping case (a very light or very dark pick that would otherwise push a derived shade's lightness outside 0–100).
- `expandRampOverrides`: pure function, direct unit tests — a mode with no ramp overrides passes through unchanged; a mode with one ramp override expands to exactly that ramp's shade count; semantic-token entries alongside a ramp entry are both preserved in the output.
- `validatePaletteImport`: extend existing tests to cover the 3 new token names being accepted, and confirm `surface-accent`/`surface-accent-soft` are now silently dropped (no longer known tokens) rather than erroring — consistent with the module's existing "drop what's unrecognized" philosophy.
- UI wiring (the new "Ramps" group, updated Surfaces group): not unit tested, consistent with how the rest of `ColorCustomizationScreen` is verified (typecheck/lint/build, manual click-through flagged as a gap).

## Known limitations (stated up front)

1. Hue and saturation are held constant across all derived shades in a ramp — a picked color's ramp will look slightly more "flat" (less saturation variation) than the original hand-tuned lime ramp specifically (ink and neutral are already near-zero saturation, so this doesn't change their character).
2. An extreme pick (pure black or pure white) can clamp two adjacent derived shades to the same lightness, collapsing a visual step in that ramp. Rare in practice, not fixed here.
3. Removing `surface-accent`/`surface-accent-soft` means anyone who already set a custom value there loses that specific override silently (falls back to being unused, not an error) — acceptable since the feature that introduced them shipped very recently in the same session and the replacement (`ramp-accent`) is strictly more capable.
