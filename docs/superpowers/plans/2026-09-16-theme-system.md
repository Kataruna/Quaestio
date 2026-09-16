# Theme system (Light / Dark / System) — implementation plan

Status: revised after finding `design/Dark Mode/` — real dark-mode design tokens exist and replace the earlier draft palette. Awaiting review.

## Goal

Add a Light/Dark/System theme choice, persisted, using the design's own dark palette. "System" follows the OS live.

## What changed since the first draft

The first draft assumed no dark-mode design existed and improvised palette values. `design/Dark Mode/` (added to the repo just before this plan) contains real tokens: `dark.css`, plus four `.card.html` demo files (`dark-components`, `dark-surfaces`, `dark-status`, `dark-elevation`). This replaces every "draft" value below with a real one, and settles both open questions from the first draft:

1. **Dark palette values** — sourced directly from `dark.css` and the demo cards, not invented.
2. **`button.tsx`'s `bg-ink-700` hover** — **stays fixed in both themes.** `dark.css`'s own header states: *"Semantic aliases only: base ramps stay fixed so component code needs no changes."* The design's own `dark-components.card.html` renders `<Button variant="primary">` (which is `bg-ink-900 text-white hover:bg-ink-700`) under `data-theme="dark"` with **zero component changes**, captioned "every primitive under data-theme='dark' — no component changes needed." The readme's hover rule ("Ink surfaces darken: ink-900 → ink-700") is a fixed rule, not theme-relative. No code change needed for this.

This also overturned most of "bucket B" from the first draft (raw `neutral-*`/`ink-*` utility usages that I'd assumed needed dark-specific fixes). Checking the design system's own component source (`_ds_bundle.js`) confirms it: `Switch`'s off-track is literally `background: var(--neutral-300)` — a raw ramp reference, by design, left unchanged in dark mode. So the neutral-200/300/400 raw usages in this app's `Switch`, `Badge`, `TitleBar`, `IssueCard`, `EmptyState` are correct as-is and need **no changes**. Confirmed by re-deriving each hex: our `--color-neutral-400` (`#b4b5ae`) already equals `--color-text-faint`, and `--color-neutral-200` (`#e4e4de`) already equals `--color-line-hairline` — these raw dots/fills were always semantically "faint"/"hairline" colors, just spelled as ramp literals, and the design confirms ramp literals don't move.

**What still needs a real decision** (custom Quaestio-built compositing, not part of the design-system's own primitives, so the "no changes needed" guarantee doesn't cover it):
- `BoardColumn`'s `bg-ink-900/[0.035]` — a barely-there tint calculated relative to a *light* card surface, to look like a subtle recess. At 3.5% alpha over a dark card, this is invisible. → replace with `bg-surface-sunken` (semantic, already has a correct dark value).
- `RepoTabIslands`'s `bg-white/70` — a translucent white pill wrapper. Solid light-on-dark in dark mode. → replace with `bg-surface-chip/70` (see new tokens below).

## Key design decision: drive it with `nativeTheme.themeSource`, not a `data-theme` attribute

`design/Dark Mode/dark.css` applies its palette via `[data-theme="dark"]` — but that's how the *static prototype* (plain HTML files, no Electron) toggles itself for the demo cards; it's not a mandate for how this app must apply the theme. Electron's `nativeTheme.themeSource = 'light' | 'dark' | 'system'` (main process) achieves the identical visual result with far less code, because it forces `prefers-color-scheme` for every renderer in the app (so `system`, explicit `light`, and explicit `dark` are all handled — no manual override logic needed) and it also drives native chrome: macOS traffic lights (this app uses `titleBarStyle: 'hiddenInset'`), scrollbars, native menus, none of which a CSS attribute can touch.

This means dark mode is a plain `@media (prefers-color-scheme: dark)` block in `tokens.css` — no `data-theme` attribute, no React context, no `App.tsx` effect, no pure `resolveTheme()` function to unit test. Main sets `themeSource` once at startup (from the persisted setting) and again in the `settings:set-theme` handler. This is an architecture choice, not a visual one — CLAUDE.md: "design wins on visuals, this file wins on architecture." The visuals (every color value) still come 1:1 from the design.

**Assumption to verify empirically before calling this done** (no display in this sandbox, same gap as every other slice in this repo's log): that `nativeTheme.themeSource` actually flips `prefers-color-scheme` inside the renderer's CSS engine. This is documented Electron behavior, but confirm by toggling the setting and watching the window repaint.

## Files touched

### 1. Schema + migration
- `src/main/db/schema.ts`: add `theme: text('theme', { enum: ['light', 'dark', 'system'] }).notNull().default('system')` to the `settings` table. Additive column, existing rows get the default — no data loss, no need to ask per CLAUDE.md.
- Run `npx drizzle-kit generate` to produce the migration SQL + snapshot (matches how `tabGroupsEnabled` and `syncCursor` were added).

### 2. Shared contract
- `src/shared/ipc-contract.ts`: `settings.get()` return type gains `theme: 'light' | 'dark' | 'system'`; add `settings.setTheme(input: SetThemeInput): Promise<void>`; add `setThemeInput` zod schema (`z.object({ theme: z.enum(['light', 'dark', 'system']) })`).
- `src/shared/channels.ts`: add `settingsSetTheme: 'settings:set-theme'`.

### 3. Main process
- `src/main/db/settings-queries.ts`: `getSettings` returns `theme` (default `'system'` on first-ever read, same insert-on-read pattern as today); add `setTheme(db, theme)` mirroring `setTabGroupsEnabled`.
- `src/main/ipc/settings.ts`: register `settings:set-theme` handler — validates input, persists via `setTheme`, and sets `nativeTheme.themeSource = theme`.
- `src/main/index.ts` (wherever startup sequencing lives): after the DB is ready and before `createMainWindow()`, read `getSettings(getDb()).theme` and set `nativeTheme.themeSource` so the very first paint already matches — avoids a light flash for dark/system-dark users.
- `src/main/window.ts`: compute `backgroundColor` from `nativeTheme.shouldUseDarkColors` at window-creation time instead of the hardcoded `'#F4F4F1'`, using the new dark `--color-surface-app` value `#0B0C0B` (see palette table) so the window's own frame background doesn't flash light in dark mode.

### 4. Renderer
- `src/renderer/features/settings/SettingsScreen.tsx`: add a `SelectPill` row ("Appearance" / Light, Dark, System), wired the same way as `tabGroupsEnabled`'s `Switch` — a `useMutation` calling `window.api.settings.setTheme`, with `queryClient.setQueryData(['settings'], ...)` on success.
- No other renderer code changes beyond the two compositing fixes below.

### 5. Dark palette — `src/renderer/styles/tokens.css`

Values below are taken directly from `design/Dark Mode/dark.css` and its demo cards (mapped from that file's unprefixed names, e.g. `--surface-app`, onto this project's `--color-` prefixed names — see the file's own header comment on why the prefix exists).

Add a `@media (prefers-color-scheme: dark) { :root { ... } }` block redeclaring:

| Token | Light (current) | Dark (from design) |
|---|---|---|
| `--color-surface-app` | `#f4f4f1` | `#0B0C0B` |
| `--color-surface-card` | `#ffffff` | `#181A17` |
| `--color-surface-sunken` | `#eeeeea` | `#1F211D` |
| `--color-surface-ink` | `#0e0f10` | `#272A25` |
| `--color-surface-accent` | `#c7f24c` | unchanged — lime is fixed across themes per design |
| `--color-surface-accent-soft` | `#f1fbd9` | `rgba(199,242,76,.12)` |
| `--color-text-strong` | `#16181a` | `#F4F5F0` |
| `--color-text-body` | `#232629` | `#DDDFD7` |
| `--color-text-muted` | `#6e7174` | `#9DA096` |
| `--color-text-faint` | `#b4b5ae` | `#6F736A` |
| `--color-line-hairline` | `#e4e4de` | `rgba(255,255,255,.10)` |
| `--color-line-strong` | `#d6d6cf` | `rgba(255,255,255,.18)` |
| `--color-status-hot` / `-bg` | `#f0433a` / `#fde4e2` | `#FF6B62` / `rgba(255,107,98,.16)` |
| `--color-status-warm` / `-bg` | `#fb8c3a` / `#feebda` | `#FFA45C` / `rgba(255,164,92,.16)` |
| `--color-status-due` / `-bg` | `#f5c93b` / `#fdf2d6` | `#FFD760` / `rgba(255,215,96,.16)` |
| `--color-status-won` / `-bg` | `#59c24c` / `#e1f5de` | `#7BDA6C` / `rgba(123,218,108,.16)` |
| `--color-status-info` / `-bg` | `#3d7bf7` / `#e0eafe` | `#6E9BFF` / `rgba(110,155,255,.16)` |
| `--shadow-xs` | `0 1px 2px rgba(14,15,16,.04)` | `0 1px 2px rgba(0,0,0,.40)` |
| `--shadow-card` | `0 2px 8px rgba(14,15,16,.05)` | `0 2px 8px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.05)` |
| `--shadow-card-hover` | `0 6px 20px rgba(14,15,16,.07)` | `0 8px 24px rgba(0,0,0,.50), inset 0 0 0 1px rgba(255,255,255,.07)` |
| `--shadow-floating` | `0 14px 40px rgba(14,15,16,.10)` | `0 16px 44px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.07)` |
| `--shadow-modal` | `0 28px 70px rgba(14,15,16,.16)` | `0 30px 80px rgba(0,0,0,.65), inset 0 0 0 1px rgba(255,255,255,.08)` |

New token (light + dark), added because it replaces a literal currently duplicated in `dialog.tsx` — see next section:
| `--color-surface-overlay` | `rgba(14,15,16,.55)` (already matches `dialog.tsx`'s hardcoded `bg-ink-900/55` exactly — ink-900 is rgb(14,15,16)) | `rgba(5,6,5,.66)` |

New token (light + dark), added only because `RepoTabIslands`'s group-wrapper fix (below) needs a semantic "chip surface" to apply `/70` opacity to — this is a real design-system token we never extracted at Slice 1 (`design/_ds/.../tokens/colors.css` already defines it):
| `--color-surface-chip` | `#ffffff` (`--neutral-0`, same as `--color-surface-card`) | `#1F211D` (same as `--color-surface-sunken` dark) |

`--color-lime-*`, `--color-ink-*`, `--color-neutral-*` (the raw ramps) are **not touched** — confirmed above that the design keeps them fixed across themes.

Also add, in `index.css`, a dark override for the hardcoded focus ring (`:focus-visible`'s `box-shadow`, currently a literal `rgba(182,226,48,.45)`, not a CSS variable):
```css
@media (prefers-color-scheme: dark) {
  :focus-visible { box-shadow: 0 0 0 3px rgba(199,242,76,.38); }
}
```
(value from `dark.css`'s `--shadow-focus`).

### 6. The two real compositing fixes
- `src/renderer/features/board/BoardColumn.tsx`: `bg-ink-900/[0.035]` → `bg-surface-sunken`.
- `src/renderer/components/shell/RepoTabIslands.tsx`: `bg-white/70` → `bg-surface-chip/70`.
- `src/renderer/components/ui/dialog.tsx` line 58: `bg-ink-900/55` → `bg-surface-overlay`.

Nothing else in the raw-palette grep list (`bg-ink-*`, `bg-neutral-*`, `bg-lime-*`, `text-ink-*`, `text-neutral-*` across 24 files) needs a change — established above via the design's own "no component changes needed" guarantee plus hex-matching the specific values already in use.

### 7. Tests
- `tests/settings-queries.test.ts` (new, or extend existing settings test if one exists — check first): SQLite round-trip in the style of `tests/tab-layout-queries.test.ts` — `getSettings` defaults `theme` to `'system'` on a fresh DB, `setTheme` persists and is read back, `getSettings` doesn't clobber `tabGroupsEnabled` when only theme is set (and vice versa).
- No pure function to unit-test for theme *resolution* — that logic lives entirely in Electron's `nativeTheme`.

### 8. Verification (per CLAUDE.md)
- `npm run typecheck && npm run lint && npm test` — must all pass.
- Manual, in a real window (flagged as unverified here otherwise, per this repo's existing honesty pattern): toggle Light/Dark/System in Settings and confirm the whole app repaints; quit and relaunch on each setting and confirm no flash of the wrong theme; switch OS appearance while on "System" and confirm live repaint; check macOS traffic lights follow the app's theme (not just the OS's) when an explicit Light/Dark is chosen; eyeball the two compositing fixes (board empty-column tint, grouped-tabs wrapper) and the dialog backdrop in both themes.

## Decisions log entry (to add after implementation)

Summarize: `nativeTheme.themeSource` chosen over `data-theme` for zero renderer-side logic + native-chrome coverage; dark palette taken directly from `design/Dark Mode/`, not improvised; raw-ramp utility usages across 24 files confirmed correct as-is (design's own "no component changes needed" guarantee, verified against the design system's own component source); two custom compositing spots (`BoardColumn`, `RepoTabIslands`) and the dialog backdrop fixed to use semantic tokens instead of light-relative literals.

## Workspace

Per the owner's choice: implement in an isolated git worktree (dev has substantial unrelated uncommitted WIP already). Branch off `dev`.
