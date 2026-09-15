# Repo tab groups — design spec

Status: approved by owner (2026-09-15), pending implementation plan.

## Summary

A toggle-able "tab islands" feature for the repo tab strip (Opera Browser
Islands-style), off by default. When on, tracked-repo tabs can be dragged to
reorder, merged into groups by dropping one tab onto another, and dragged
back out to leave a group. Groups default to "one per repo owner" the first
time the feature is turned on, then evolve however the user drags them —
owner is a starting point, not a hard rule.

## Non-goals

- No custom group naming or coloring (that's Opera's full feature set; this
  app's version is visual containment only, labeled with the owner name when
  every member shares one).
- No dragging an entire group as a block to reorder groups relative to each
  other — only per-tab drags (reorder / join / leave), matching what was
  actually asked for.
- No changes to the other three `SettingsScreen` toggles (`pushSubtasks`,
  `mapLabels`, `notifyP1`) — they stay exactly as they are today: fixture-only
  `useState`, never wired to IPC. This feature is the first thing in the app
  wired to real, persisted app-level settings; that pattern isn't retrofitted
  onto the other three here.

## A. Data model & persistence

Two new SQLite tables, both additive (no destructive migration):

```ts
// src/main/db/schema.ts
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(), // always 1, single row
  tabGroupsEnabled: integer('tabGroupsEnabled', { mode: 'boolean' }).notNull().default(false),
});

export const tabLayout = sqliteTable('tab_layout', {
  id: integer('id').primaryKey(), // always 1, single row
  layout: text('layout').notNull().default('[]'), // JSON-encoded TabSlot[]
});
```

Shared type (`src/shared/types.ts`):

```ts
export type TabSlot =
  | { kind: 'repo'; fullName: string }
  | { kind: 'group'; id: string; repoFullNames: string[] };
```

A group's owner label is **derived, not stored**: shown only when every
`repoFullNames` entry shares the same `owner` (the `owner/` prefix of
`fullName`). Storing it separately would just be another thing that can go
stale.

### Pure functions (all unit-tested, `src/shared/tab-layout.ts`)

- `buildInitialTabLayout(trackedRepos: Repo[]): TabSlot[]` — one-shot,
  clean-slate grouping: every owner with 2+ tracked repos becomes a group;
  an owner with exactly 1 repo stays standalone. Runs exactly once, the
  first time `tab_layout` has no stored row.
- `reconcileTabLayout(storedSlots: TabSlot[], trackedRepos: Repo[]): TabSlot[]`
  — runs on every subsequent read:
  1. Drop any slot referencing a `fullName` no longer in `trackedRepos`.
  2. Dissolve any group left with fewer than 2 members (0 → drop the slot;
     1 → replace with a plain `{kind:'repo'}` slot in the same position).
  3. For any `trackedRepos` entry with no existing slot (a genuinely new
     repo since the layout was last saved): if a `{kind:'group'}` slot
     exists where every member shares this repo's owner, append it there;
     otherwise append a new standalone `{kind:'repo'}` slot at the end.
     **This step never creates a new group from two standalones** — a group
     the user manually broke up stays broken up, even if a same-owner repo
     shows up later.
- `groupOwnerLabel(repoFullNames: string[]): string | null` — the derived
  label described above.
- `applyDrop(slots: TabSlot[], draggedFullName: string, target: DropTarget): TabSlot[]`
  — see section C.

Turning the toggle **off** never touches `tab_layout` — reconciliation only
runs when the grouped view is actually being read (toggle on), so a saved
arrangement sits untouched while the toggle is off and reappears exactly as
left when it's switched back on.

## B. IPC surface

```ts
// src/shared/ipc-contract.ts — added to Api
settings: {
  get(): Promise<{ tabGroupsEnabled: boolean }>;
  setTabGroupsEnabled(input: { enabled: boolean }): Promise<void>;
};
tabLayout: {
  get(): Promise<TabSlot[]>;
  set(input: { slots: TabSlot[] }): Promise<void>;
};
```

- `tabLayout.get()`: no stored row → `buildInitialTabLayout(tracked)`,
  persist, return. A stored row → `reconcileTabLayout(stored, tracked)`,
  persist only if it actually changed, return. This is the **only** place
  reconciliation happens.
- `tabLayout.set()`: a trivial full replace. The renderer computes the
  entire new arrangement client-side (pure local drag state) and persists it
  once a drag drops — no conflict check, no GitHub round-trip, same
  local-only precedent as `dueDate` (Post-Slice-7 QoL work). `slots` is
  validated with zod (`z.array` of a discriminated union matching `TabSlot`)
  but **not** cross-checked against the live tracked-repos list — that's
  `get()`'s job on the next read, keeping `set()` cheap.
- `settings.setTabGroupsEnabled` never clears or touches `tab_layout` —
  confirmed by section A's "off doesn't wipe state" rule.

## C. Drag-and-drop

**No new dependency.** Native HTML5 drag-and-drop (`draggable`,
`onDragStart`/`onDragOver`/`onDrop`, `e.dataTransfer`) — the same mechanism
every browser's own tab strip already uses, and this app has never needed a
DnD library before.

- `onDragStart` on a tab chip: `e.dataTransfer.setData('text/plain', fullName)`.
- Transient (non-persisted) React state tracks the current hover target,
  purely for the visual drop-position indicator.
- **Drop-zone rule per tab** — this is what disambiguates "reorder" from
  "group" out of the same gesture:
  - **left 25% / right 25%** of the target tab → reorder: insert the
    dragged repo immediately before/after the target, inside whatever
    container (a group, or the top level) the target is already in.
  - **center 50%** of the target tab → group: merge with the target. If
    the target is standalone, both become a brand-new group (`id` from
    `crypto.randomUUID()` — built into Node/Chromium, no dependency). If
    the target is already inside a group, the dragged repo joins that
    group (appended).
- Dropping in the empty strip past the last tab → dragged repo becomes
  standalone at the end.
- Dragging a tab **out of its group** to anywhere that isn't another tab's
  center zone → becomes standalone at that position. If the source group
  now has exactly 1 member left, that member reverts to a plain standalone
  tab (group dissolves) — mirrors `reconcileTabLayout`'s dissolve rule, so
  the same "group of 1 isn't a group" invariant holds everywhere.

All of the above funnels through one pure function,
`applyDrop(slots, draggedFullName, target): TabSlot[]`, called from the drop
handler. The handler then optimistically updates local state and fires
`tabLayout.set()` — fire-and-forget, with an error toast on failure
(matching the existing `dueDateMutation` pattern in `IssueDetailDialog`).

### Components

- `src/renderer/components/shell/RepoTabs.tsx` — **unchanged**, used when
  the toggle is off.
- `src/renderer/components/shell/RepoTabIslands.tsx` — **new**, used when
  the toggle is on. Renders `TabSlot[]` from the `tab-layout` query:
  a `{kind:'repo'}` slot renders one tab chip; a `{kind:'group'}` slot
  renders a tinted/rounded wrapper (existing `surface-sunken`-family
  tokens — no new colors) around its member chips, with the owner login as
  a small label above it only when `groupOwnerLabel` returns non-null.
- `RepoTabChip` — a small piece extracted from the current `RepoTabs.tsx`
  tab markup, shared by both components so the visual isn't duplicated.

## D. Settings integration

- `App.tsx` adds `useQuery(['settings'], () => window.api.settings.get())`,
  passing `tabGroupsEnabled` down to (a) the tab-strip area, which renders
  `RepoTabs` or `RepoTabIslands` based on it, and (b) `SettingsScreen`.
- `SettingsScreen` gets one new toggle row ("Group tabs by owner"), wired
  through a `useMutation` calling `settings.setTabGroupsEnabled`, updating
  the `['settings']` query cache on success — same `Switch` pattern already
  used for the (currently unwired) existing rows, just actually connected.
- When on, `RepoTabIslands` fires `useQuery(['tab-layout'], () => window.api.tabLayout.get())`.
- The existing track/untrack handlers in `App.tsx` also invalidate
  `['tab-layout']` — no separate optimistic-removal logic needed, since
  `reconcileTabLayout` already handles "repo no longer tracked" and "new
  repo appeared" on the next read.

### Edge cases (all covered by the design above, no extra mechanism needed)

- Untracking the active repo inside a group — existing `pickActiveRepo`
  logic in `App.tsx` is untouched; group membership just updates via
  reconcile.
- Offline — never touches GitHub, so no online-gating (same precedent as
  `dueDate`).
- Toggling off/on repeatedly — off never clears `tab_layout`, so no churn
  or data loss.
- All tracked repos sharing one owner — toggle-on produces a single group,
  no standalone tabs. Expected, not a special case.
- A repo transferred/renamed on GitHub — looks like "old fullName
  untracked, new fullName newly tracked" to reconcile, same as everywhere
  else in this app `fullName` is the join key.

## Testing plan

This app's entire test suite today is pure-function unit tests (main
process + shared) — there are zero renderer/DOM component tests anywhere.
Matching that precedent:

- Full unit coverage for `buildInitialTabLayout`, `reconcileTabLayout`,
  `applyDrop`, and `groupOwnerLabel` — this is where essentially all the
  interesting logic lives, and all four are pure functions with no DOM or
  Electron dependency.
- No new test infrastructure for the React drag handlers or IPC plumbing —
  consistent with how the rest of the renderer is (not) tested today.
