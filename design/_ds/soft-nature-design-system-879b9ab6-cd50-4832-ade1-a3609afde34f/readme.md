# Soft Nature Design System

Soft Nature is a light, capsule-shaped interface language for **dense operational software** — CRM pipelines, schedules, task boards, patient timelines. Warm off-white canvas, pure-white cards floating on soft shadow, near-black chrome, and a single high-voltage lime accent that marks exactly one thing per view: what is happening *now*.

## Sources

Everything here is derived from three reference screenshots supplied by the user, stored in `uploads/`:

| File | What it shows |
| --- | --- |
| `uploads/ .jpg` | "WORKSPACE" CRM dashboard — schedule capsule, KPI row, New Leads card grid, Your Days Tasks board, floating video call + AI summary panel |
| `uploads/ -2.jpg` | Same dashboard, angled detail view — legible type, chip and card construction |
| `uploads/Instagram.jpg` | "Cardiology" clinical dashboard — patient timeline, metric cards, tab rail, citron accent |

**No codebase, Figma file, font binaries, icon set, or logo were provided.** Everything below is a reconstruction from those images. Values that could be measured were measured; values that could not were chosen to be internally consistent and are flagged in "Substitutions" at the bottom. If the real source exists, attach it and this system should be re-derived from it — screenshots are lossy.

Scope chosen by the user: **CRM workspace dashboard** (desktop) plus a **mobile app kit**. The clinical dashboard informed the token set (citron accent, timeline patterns) but has no UI kit.

---

## CONTENT FUNDAMENTALS

How Soft Nature writes.

**Voice.** Flat, operational, unsentimental. The interface states facts and counts; it never congratulates, explains itself, or sells. There is no marketing voice anywhere in the product surface.

**Person.** Second person possessive for the user's own things — "Your Schedule", "Your Days Tasks". First person is never used. The product does not speak as "we".

**Casing.** Title Case for section headings and object labels ("New Leads", "Hot Client", "Send Proposal", "Call scheduled" — note that verb-phrase *states* drop to sentence case). ALL CAPS with wide tracking is reserved for the page wordmark only ("WORKSPACE"). Micro-labels above values are sentence case and quiet ("Source", "Status", "Amount", "Diagnosis").

**Length.** Labels are one to three words. Values are unpadded — "7 Leads", "16 Tasks", "34 Deals", "$ 20 000", "89 bpm", "36.8 °C". Full sentences appear only in generated summary text, and even there they stay clipped ("Reduce the number of security incidents by 50%").

**Numbers and dates.** Numerals always, never spelled out. Dates are written long and human in chrome ("28 March") and dotted in dense card metadata ("28.03.2023 at 2 pm"). Times are lowercase with a space ("2:15 pm", "3:00 pm"). Currency uses a space after the symbol and a space thousands separator ("$ 20 000"). Deltas are signed and bare: "+10", "−20", "↑3".

**Naming people and companies.** Always full name plus role plus company, on two lines: "Jane Doe" / "Marketing Director at Microsoft". Never just a first name, never a handle.

**States.** Written as short status phrases, not sentences: "Call scheduled", "Waiting Proposal", "Hot Client", "Great interest", "Medium interest", "Non interested", "Overdue", "Due Today", "Completed". Note the reference's slightly terse, non-idiomatic register — keep it; do not smooth "Non interested" into "Not interested" unless the user asks.

**Emoji.** None. Not in labels, not in empty states, not in notifications. Temperature and sentiment are carried by colour dots and tinted badges instead.

**Punctuation.** No terminal periods on labels or card text. No exclamation marks. Ampersands are avoided in favour of "and" except inside very tight chips.

**Empty and loading states** (not present in the source — house rule): state the absence plainly and offer the one action. "No leads yet" + a `New Lead` button. Do not editorialise.

---

## VISUAL FOUNDATIONS

**Canvas and light.** The app sits on a warm off-white (`--surface-app` #F4F4F1), not pure white and not grey-blue. Cards are pure white on top of it. The whole system reads as daylight on paper — there is no dark mode in the source, and none is defined here.

**Colour.** One accent: lime `#C7F24C`. It appears at most twice per screen — the live schedule block and the active task card — never as a background wash, never as a gradient. Near-black `--ink-900` is the second "colour": it carries the floating schedule capsule, the active rail button, the primary button. Status hues (red / orange / yellow / green / blue) appear only as 7–9px dots or as tinted badge pairs (light bg + saturated text). Citron `#F2E93B` is the secondary accent carried over from the clinical surface; do not mix it with lime in one view.

**Type.** Two families. **Outfit** (geometric sans) for anything display: the wordmark, section titles, card titles, and every large numeral. **Plus Jakarta Sans** for body, labels, and micro-metadata. **DM Mono** appears only for raw measured values. Display type is tracked tight (−0.02em); the wordmark is tracked wide (+0.14em) in caps. The contrast that defines the look is *scale*, not weight: a 38px numeral sits directly beside an 11px label.

**Spacing.** A 2/4/6/8/10/12/16/20/24/32/40/48/64/80 scale. Cards are padded 16–20px, grids gap 16px, sections gap 32px. Density is high but never cramped — every card has visible breathing room around its avatar row.

**Backgrounds.** Flat colour only. No gradients, no patterns, no textures, no hand-drawn illustration, no full-bleed photography. The only photographic content is human: circular avatars and the rectangular video-call feed. Imagery is warm, naturally lit, mid-contrast portraiture — no filters, no duotone, no grain.

**Corners.** Everything is soft. Cards 26px, inner tiles 14px, small chips and fields fully round (999px), the device/screen frame 34px. Nothing in Soft Nature has a sharp corner except a data-line or chart stroke.

**Cards.** White, 26px radius, `0 2px 8px rgba(14,15,16,.05)`, **no border**. Hover adds a slightly larger shadow and a 2px lift. A card's top-right corner almost always holds a small circular `arrow-up-right` IconButton. The active card in a list inverts to lime with ink text; the "focused" chrome card inverts to ink with white text.

**Borders and lines.** Hairlines (`#E4E4DE`) are used only on outlined pill Tags and inside form fields. Cards and sections are separated by whitespace and shadow, not rules.

**Shadows.** Five steps, all low-opacity neutral black, all vertically offset, no coloured or spread-heavy shadows. There are no inner shadows in the source; `--shadow-inset-top` exists but should stay unused unless a surface genuinely needs a lip.

**Transparency and blur.** Used sparingly and only on ink chrome: white at 10–14% for secondary pills inside the black capsule, and a 55%-black scrim behind floating overlay panels. `--blur-glass` (18px) is for the floating call/summary panel over content — nowhere else. Content cards are always fully opaque.

**Protection.** Text over the video feed sits on a small solid ink capsule, not a gradient scrim. Soft Nature prefers a capsule to a fade.

**Animation.** Short and soft: 140ms for colour, 220ms for shadow and transform, 380ms for progress fills. Easing is `cubic-bezier(.4,0,.2,1)` in and `cubic-bezier(.22,.61,.36,1)` out. **No bounce, no spring, no overshoot.** Entrances are a 6px rise plus a fade. Nothing rotates except a chevron (180°) and a refresh glyph.

**Hover.** Ink surfaces darken (`--ink-900` → `--ink-700`), lime darkens (`400` → `500`), white cards gain shadow and rise 2px, ghost controls pick up a `--surface-sunken` fill. Opacity is never used for hover.

**Press.** Uniform `scale(.97)`, no colour change beyond the hover state, no shadow change. Release is instant (80ms).

**Focus.** A 3px lime halo (`--shadow-focus`), never a hard outline.

**Layout rules.** A 56px icon rail is pinned to the left edge, floating clear of the content (it is not a panel — there is no divider). The schedule capsule floats at the top, inset from every edge, overlapping nothing. Content is a single scrolling column of sections; each section is a header row plus a horizontally-scrolling card row. Cards are fixed-width in their row and clip at the viewport edge to signal more content — the reference deliberately shows a half-card cut off at the right.

---

## ICONOGRAPHY

**No icon assets shipped with the source.** The reference screenshots use a light, uniform, rounded-cap outline set at roughly 1.5px stroke on a 24px grid — visually consistent with Lucide.

**Substitution (flagged):** this system uses **Lucide** (`lucide@0.474.0`). The `Icon` component loads the Lucide icon data once from the UMD build and renders a real `<svg>` with `stroke="currentColor"` at 1.75px — there is no icon font, no sprite sheet, and no bundled SVG directory, because none was available to copy. If the real icon set exists, drop the SVGs into `assets/icons/` and swap the render in `components/core/Icon.jsx`.

**Rules.** 16px is the default; 14px inside chips, 17px in the rail, 18–20px inside a large IconButton. Icons are monochrome and inherit text colour — they are never lime, never multi-colour, never filled. Icons never appear without either a label or a circular button container. The most-used glyphs are `search`, `sliders-horizontal`, `arrow-up-right`, `plus`, `bell`, `calendar`, `message-circle`, `users`, `layout-grid`, `video`, `mic`, `phone`, `check`, `chevron-down`, `download`, `pencil`, `more-horizontal`.

**Emoji are never used as icons.** Unicode characters are used in exactly two places: `×` to dismiss a Tag, and `↑ ↓` inside delta pills (rendered as Lucide arrows in components).

**Logo: none.** No logo or brand mark was supplied. Wherever a mark would go, set the name in Outfit — `SOFT NATURE` in caps at +0.14em for chrome, "Soft Nature" in sentence case for prose. **Do not draw, reconstruct, or generate a mark.** See `guidelines/wordmark.card.html`.

---

## Index

Root manifest:

- `styles.css` — the single entry point consumers link. `@import` lines only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`, `base.css`
- `guidelines/` — 16 foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — reusable primitives, grouped below
- `ui_kits/` — full-screen product recreations
- `assets/` — empty: no logos, icons, illustrations or imagery were supplied with the source
- `thumbnail.html` — homepage tile
- `SKILL.md` — Agent Skills entry point

### Components

`components/core/` — **Icon**, **Button**, **IconButton**, **Card**, **Avatar**, **AvatarStack**, **Badge**, **Tag**
`components/forms/` — **Input**, **SearchField**, **SelectPill**, **Checkbox**, **Switch**
`components/data/` — **StatBlock**, **FilterChip**, **InterestScale**, **ProgressTrack**
`components/navigation/` — **SidebarRail**, **SectionHeader**, **PillBar**

Each directory carries a `*.card.html` specimen; each component has a `.d.ts` props contract and a `.prompt.md` usage note.

**Intentional additions.** The source is three screenshots, not a component library, so the inventory was inferred from what is visibly reused. Two entries are additions rather than observations: `Icon` (a wrapper the glyph set needs in order to exist at all) and `Switch` (no toggle appears in the references; included because the forms group is otherwise unusable for settings surfaces). `ProgressTrack` is derived from the schedule capsule's fill, not from a standalone bar.

### UI kits

- `ui_kits/workspace/` — CRM workspace dashboard, desktop. Screens: Workspace, Leads, Tasks, Live Call.
- `ui_kits/mobile/` — companion phone app. Screens: Today, Lead detail, Task composer.

---

## Substitutions and gaps

1. **Fonts.** No binaries supplied. Outfit + Plus Jakarta Sans + DM Mono are the closest Google Fonts matches to the reference lettering and are loaded from Google Fonts in `tokens/fonts.css`. **Please send the real font files** and this becomes exact.
2. **Icons.** Lucide substituted — see ICONOGRAPHY.
3. **Logo.** None exists in the sources; none was created.
4. **Photography.** No imagery was supplied. Avatars in the kits render as initials, not photos.
5. **Measurements.** Radii, paddings and type sizes were read off screenshots at moderate resolution. They are consistent, but they are estimates, not extracted values.
