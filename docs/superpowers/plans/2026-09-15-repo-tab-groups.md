# Repo Tab Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle-able, off-by-default "tab islands" feature to the repo tab strip: tabs auto-group by owner when first enabled, then the user can freely drag to reorder, merge into a group (drop on a tab's center), or pull out of a group (drop elsewhere).

**Architecture:** Two new SQLite tables (`settings`, `tab_layout`) hold the only new persisted state, both additive migrations. A `TabSlot[]` (standalone repo or named-by-owner group) is the one data structure that drives rendering; two pure functions (`buildInitialTabLayout`, `reconcileTabLayout`) keep it in sync with the live tracked-repos list, and a third (`applyDrop`) computes the result of every drag gesture. All three are fully unit-tested; the renderer wiring (new `RepoTabIslands` component, native HTML5 drag-and-drop, a new Settings toggle) gets no new test infrastructure, matching this codebase's existing precedent of zero renderer/DOM tests.

**Tech Stack:** Existing stack only — Drizzle/better-sqlite3, zod, TanStack Query, native HTML5 Drag and Drop API (`draggable`, `onDragStart`/`onDragOver`/`onDrop`, `crypto.randomUUID()`). No new npm dependency.

**Spec:** `docs/superpowers/specs/2026-09-15-repo-tab-groups-design.md`

## Global Constraints

- No new npm dependency — drag-and-drop is native HTML5 DnD; the app's existing stack covers everything else.
- TypeScript `strict: true` stays satisfied everywhere: no `any`, no `@ts-ignore`, no `eslint-disable`. `noUncheckedIndexedAccess` is on — every array index access must be null-checked or destructured, never asserted with `!` where a plain guard works.
- Every IPC payload is validated with zod in the main process (CLAUDE.md).
- SQLite schema changes are additive only (new tables) — no destructive migration.
- This feature never touches GitHub or the network — same "local-only" precedent as `dueDate`/`subtasks`. No online-gating needed on any of its IPC handlers.
- Match this codebase's existing test precedent exactly: full unit coverage for every pure function and every DB query function; zero new test infrastructure for React components or IPC handlers (there is none today).
- Run `npm run typecheck && npm run lint && npm test` before every commit in this plan — all three must pass (CLAUDE.md).
- Commit after each task (CLAUDE.md: "work one slice at a time... after each slice passes its checks, commit it").

---

## File Structure

New files:
- `src/shared/tab-layout.ts` — pure functions: `buildInitialTabLayout`, `reconcileTabLayout`, `groupOwnerLabel`, `applyDrop` (+ `DropTarget` type).
- `tests/tab-layout.test.ts`
- `src/main/db/settings-queries.ts` — `getSettings`, `setTabGroupsEnabled`.
- `src/main/db/tab-layout-queries.ts` — `getStoredTabLayout`, `setStoredTabLayout`.
- `tests/settings-queries.test.ts`
- `tests/tab-layout-queries.test.ts`
- `src/main/ipc/settings.ts` — `registerSettingsHandlers`.
- `src/main/ipc/tab-layout.ts` — `registerTabLayoutHandlers`.
- `src/renderer/components/shell/RepoTabChip.tsx` — the single tab-chip visual, extracted so `RepoTabs` and the new `RepoTabIslands` share it instead of duplicating markup.
- `src/renderer/components/shell/RepoTabIslands.tsx` — the grouped/draggable tab strip, rendered instead of `RepoTabs` when the setting is on.

Modified files:
- `src/main/db/schema.ts` — add `settings`, `tabLayout` tables.
- `drizzle/*` — generated migration (Task 1).
- `src/shared/types.ts` — add `TabSlot`.
- `src/shared/ipc-contract.ts` — new schemas/types, `Api.settings`, `Api.tabLayout`.
- `src/shared/channels.ts` — 4 new channel names.
- `src/main/index.ts` — register the two new handler modules.
- `src/preload/index.ts` — wire `settings` and `tabLayout` onto `window.api`.
- `src/renderer/components/shell/RepoTabs.tsx` — use the extracted `RepoTabChip` (behavior/output unchanged).
- `src/renderer/App.tsx` — read the setting, choose `RepoTabs` vs `RepoTabIslands`, invalidate `['tab-layout']` on track/untrack.
- `src/renderer/features/settings/SettingsScreen.tsx` — one new, real (IPC-backed) toggle row.
- `CLAUDE.md` — Decisions log entry (Task 8).

---

### Task 1: Schema + migration

**Files:**
- Modify: `src/main/db/schema.ts`
- Create: `drizzle/000X_*.sql` (generated, exact name TBD by drizzle-kit's random tag)

**Interfaces:**
- Produces: `settings` and `tabLayout` Drizzle table objects, importable from `./schema` — `src/main/db/settings-queries.ts` and `src/main/db/tab-layout-queries.ts` (Task 3) depend on them.

- [ ] **Step 1: Add the two tables to the schema**

Open `src/main/db/schema.ts`. After the `repos` table's closing `});` and before the `issues` table (or anywhere after the imports — table declaration order in this file doesn't matter to Drizzle), add:

```ts
/**
 * Single-row table (`id` is always 1) holding app-wide, local-only settings.
 * The first real piece of persisted app settings in this app — the other
 * toggles on `SettingsScreen` stay fixture-only `useState`, unwired, as they
 * were before this feature.
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  tabGroupsEnabled: integer('tabGroupsEnabled', { mode: 'boolean' }).notNull().default(false),
});

/**
 * Single-row table (`id` is always 1) holding the repo-tab-strip layout as
 * JSON — a `TabSlot[]` (see `shared/types.ts`). Local-only view state,
 * unrelated to GitHub. Kept even while `settings.tabGroupsEnabled` is off,
 * so turning the feature back on restores exactly what the user had.
 */
export const tabLayout = sqliteTable('tab_layout', {
  id: integer('id').primaryKey(),
  layout: text('layout').notNull().default('[]'),
});
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: a new file appears under `drizzle/`, e.g. `drizzle/0003_<random-name>.sql`, containing two `CREATE TABLE` statements for `settings` and `tab_layout` (matching the style of the existing `drizzle/0002_premium_plazm.sql`), and `drizzle/meta/_journal.json` gains a new entry.

- [ ] **Step 3: Verify the migration applies cleanly**

Run: `npm test`
Expected: PASS (existing tests each spin up a fresh in-memory DB via `migrate()` — if the new migration SQL were invalid, every existing `*-queries.test.ts` file would fail here).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/db/schema.ts drizzle/
git commit -m "feat: add settings and tab_layout tables"
```

---

### Task 2: Shared tab-layout pure functions

**Files:**
- Modify: `src/shared/types.ts`
- Create: `src/shared/tab-layout.ts`
- Test: `tests/tab-layout.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (consumed by Task 3's IPC handlers and Task 6's renderer component):
  - `TabSlot` (in `shared/types.ts`): `{ kind: 'repo'; fullName: string } | { kind: 'group'; id: string; repoFullNames: string[] }`
  - `groupOwnerLabel(repoFullNames: readonly string[]): string | null`
  - `buildInitialTabLayout(trackedRepos: readonly { fullName: string }[]): TabSlot[]`
  - `reconcileTabLayout(storedSlots: TabSlot[], trackedRepos: readonly { fullName: string }[]): TabSlot[]`
  - `type DropTarget = { fullName: string; zone: 'before' | 'center' | 'after' } | { end: true }`
  - `applyDrop(slots: TabSlot[], draggedFullName: string, target: DropTarget): TabSlot[]`

- [ ] **Step 1: Add the `TabSlot` type**

In `src/shared/types.ts`, after the `Comment` interface (before `SyncStatus`), add:

```ts
/**
 * One slot in the repo tab strip's layout — a standalone tab, or a group of
 * tabs rendered together as one "island." Local-only view state; GitHub has
 * no concept of it. See `shared/tab-layout.ts` for the functions that build
 * and update this.
 */
export type TabSlot =
  | { kind: 'repo'; fullName: string }
  | { kind: 'group'; id: string; repoFullNames: string[] };
```

- [ ] **Step 2: Write the failing tests for `groupOwnerLabel`**

Create `tests/tab-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupOwnerLabel } from '@shared/tab-layout';

describe('groupOwnerLabel', () => {
  it('returns the shared owner when every repo has the same owner', () => {
    expect(groupOwnerLabel(['acme/web', 'acme/api'])).toBe('acme');
  });

  it('returns null when owners differ', () => {
    expect(groupOwnerLabel(['acme/web', 'other/api'])).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(groupOwnerLabel([])).toBeNull();
  });

  it('returns the owner for a single repo', () => {
    expect(groupOwnerLabel(['acme/web'])).toBe('acme');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: FAIL — `Cannot find module '@shared/tab-layout'` (the file doesn't exist yet).

- [ ] **Step 4: Create `src/shared/tab-layout.ts` with `groupOwnerLabel`**

```ts
import type { TabSlot } from './types';

function ownerOf(fullName: string): string {
  const [owner] = fullName.split('/');
  return owner ?? fullName;
}

/**
 * The label shown above a group — the shared owner, but only when every
 * member actually has one. A manually-created mixed-owner group (owner is
 * just the default starting point, not a hard rule — see the design spec)
 * renders with no label at all rather than a misleading one.
 */
export function groupOwnerLabel(repoFullNames: readonly string[]): string | null {
  const first = repoFullNames[0];
  if (first === undefined) return null;
  const owner = ownerOf(first);
  return repoFullNames.every((fullName) => ownerOf(fullName) === owner) ? owner : null;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing tests for `buildInitialTabLayout`**

Append to `tests/tab-layout.test.ts`:

```ts
import { buildInitialTabLayout } from '@shared/tab-layout';

function repo(fullName: string) {
  return { fullName };
}

describe('buildInitialTabLayout', () => {
  it('groups repos that share an owner', () => {
    const slots = buildInitialTabLayout([repo('acme/web'), repo('acme/api')]);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ kind: 'group', repoFullNames: ['acme/web', 'acme/api'] });
  });

  it('leaves a lone owner standalone', () => {
    const slots = buildInitialTabLayout([repo('acme/web')]);
    expect(slots).toEqual([{ kind: 'repo', fullName: 'acme/web' }]);
  });

  it('preserves the order owners first appear in, mixing groups and standalones', () => {
    const slots = buildInitialTabLayout([repo('acme/web'), repo('solo/only'), repo('acme/api')]);
    expect(slots.map((slot) => slot.kind)).toEqual(['group', 'repo']);
    expect(slots[1]).toEqual({ kind: 'repo', fullName: 'solo/only' });
  });

  it('gives every group a unique id', () => {
    const slots = buildInitialTabLayout([repo('acme/web'), repo('acme/api'), repo('other/a'), repo('other/b')]);
    const ids = slots.filter((slot) => slot.kind === 'group').map((slot) => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(2);
  });

  it('returns an empty layout for no tracked repos', () => {
    expect(buildInitialTabLayout([])).toEqual([]);
  });
});
```

(Move the `import { groupOwnerLabel } from '@shared/tab-layout';` line and this new import together into one `import { groupOwnerLabel, buildInitialTabLayout } from '@shared/tab-layout';` at the top of the file — don't leave two separate import statements from the same module.)

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: FAIL — `buildInitialTabLayout is not a function` / `Cannot find export`.

- [ ] **Step 8: Implement `buildInitialTabLayout`**

Append to `src/shared/tab-layout.ts`:

```ts
/**
 * One-shot, clean-slate grouping: every owner with 2+ tracked repos becomes
 * a group; a lone owner stays standalone. Runs exactly once — the first
 * time the tab layout is ever read and nothing has been saved yet.
 */
export function buildInitialTabLayout(trackedRepos: readonly { fullName: string }[]): TabSlot[] {
  const ownerOrder: string[] = [];
  const byOwner = new Map<string, string[]>();
  for (const repo of trackedRepos) {
    const owner = ownerOf(repo.fullName);
    const existing = byOwner.get(owner);
    if (existing) {
      existing.push(repo.fullName);
    } else {
      byOwner.set(owner, [repo.fullName]);
      ownerOrder.push(owner);
    }
  }

  const slots: TabSlot[] = [];
  for (const owner of ownerOrder) {
    const fullNames = byOwner.get(owner) ?? [];
    if (fullNames.length >= 2) {
      slots.push({ kind: 'group', id: crypto.randomUUID(), repoFullNames: fullNames });
    } else {
      const [only] = fullNames;
      if (only) slots.push({ kind: 'repo', fullName: only });
    }
  }
  return slots;
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 10: Write the failing tests for `reconcileTabLayout`**

Append to `tests/tab-layout.test.ts` (add `reconcileTabLayout` to the existing `@shared/tab-layout` import, and add `TabSlot` to a new `import type { TabSlot } from '@shared/types';`):

```ts
describe('reconcileTabLayout', () => {
  it('drops a slot for a repo that is no longer tracked', () => {
    const stored: TabSlot[] = [{ kind: 'repo', fullName: 'acme/web' }];
    expect(reconcileTabLayout(stored, [])).toEqual([]);
  });

  it('dissolves a group down to a standalone repo when only one member is still tracked', () => {
    const stored: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'acme/api'] }];
    expect(reconcileTabLayout(stored, [repo('acme/web')])).toEqual([{ kind: 'repo', fullName: 'acme/web' }]);
  });

  it('drops a group entirely when none of its members are still tracked', () => {
    const stored: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'acme/api'] }];
    expect(reconcileTabLayout(stored, [])).toEqual([]);
  });

  it('keeps a group intact when all its members are still tracked', () => {
    const stored: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'acme/api'] }];
    const result = reconcileTabLayout(stored, [repo('acme/web'), repo('acme/api')]);
    expect(result).toEqual(stored);
  });

  it('joins a new repo to an existing matching-owner group', () => {
    const stored: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'acme/api'] }];
    const result = reconcileTabLayout(stored, [repo('acme/web'), repo('acme/api'), repo('acme/docs')]);
    expect(result).toEqual([{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'acme/api', 'acme/docs'] }]);
  });

  it('does NOT merge a new repo with a lone standalone same-owner repo', () => {
    const stored: TabSlot[] = [{ kind: 'repo', fullName: 'acme/web' }];
    const result = reconcileTabLayout(stored, [repo('acme/web'), repo('acme/api')]);
    expect(result).toEqual([
      { kind: 'repo', fullName: 'acme/web' },
      { kind: 'repo', fullName: 'acme/api' },
    ]);
  });

  it('lands a new repo standalone when no matching-owner group exists', () => {
    expect(reconcileTabLayout([], [repo('acme/web')])).toEqual([{ kind: 'repo', fullName: 'acme/web' }]);
  });

  it('never auto-joins a mixed-owner group even with a matching-looking new repo', () => {
    const stored: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'other/api'] }];
    const result = reconcileTabLayout(stored, [repo('acme/web'), repo('other/api'), repo('acme/docs')]);
    expect(result).toEqual([
      { kind: 'group', id: 'g1', repoFullNames: ['acme/web', 'other/api'] },
      { kind: 'repo', fullName: 'acme/docs' },
    ]);
  });
});
```

- [ ] **Step 11: Run to verify it fails**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: FAIL — `reconcileTabLayout is not a function`.

- [ ] **Step 12: Implement `reconcileTabLayout`**

Append to `src/shared/tab-layout.ts`:

```ts
/**
 * Runs on every read after the first: drops slots for repos no longer
 * tracked, dissolves any group left with fewer than 2 members, and appends
 * any genuinely new repo (tracked since the layout was last saved) — joining
 * it to an *existing* matching-owner group if one exists, otherwise leaving
 * it standalone. Deliberately never creates a new group from two
 * standalones: a group the user manually broke up stays broken up, even if
 * a same-owner repo shows up later.
 */
export function reconcileTabLayout(
  storedSlots: TabSlot[],
  trackedRepos: readonly { fullName: string }[],
): TabSlot[] {
  const trackedFullNames = new Set(trackedRepos.map((repo) => repo.fullName));

  const survivors: TabSlot[] = [];
  for (const slot of storedSlots) {
    if (slot.kind === 'repo') {
      if (trackedFullNames.has(slot.fullName)) survivors.push(slot);
      continue;
    }
    const remaining = slot.repoFullNames.filter((fullName) => trackedFullNames.has(fullName));
    if (remaining.length >= 2) {
      survivors.push({ kind: 'group', id: slot.id, repoFullNames: remaining });
    } else {
      const [only] = remaining;
      if (only) survivors.push({ kind: 'repo', fullName: only });
    }
  }

  const known = new Set(
    survivors.flatMap((slot) => (slot.kind === 'repo' ? [slot.fullName] : slot.repoFullNames)),
  );
  for (const repo of trackedRepos) {
    if (known.has(repo.fullName)) continue;
    const owner = ownerOf(repo.fullName);
    let matchingGroup: Extract<TabSlot, { kind: 'group' }> | undefined;
    for (const slot of survivors) {
      if (slot.kind === 'group' && groupOwnerLabel(slot.repoFullNames) === owner) {
        matchingGroup = slot;
        break;
      }
    }
    if (matchingGroup) {
      matchingGroup.repoFullNames.push(repo.fullName);
    } else {
      survivors.push({ kind: 'repo', fullName: repo.fullName });
    }
    known.add(repo.fullName);
  }

  return survivors;
}
```

- [ ] **Step 13: Run to verify it passes**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 14: Write the failing tests for `applyDrop`**

Append to `tests/tab-layout.test.ts` (add `applyDrop` and `type DropTarget` to the `@shared/tab-layout` import):

```ts
describe('applyDrop', () => {
  it('reorders two standalone tabs: drop before', () => {
    const slots: TabSlot[] = [{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'a/2' }];
    const result = applyDrop(slots, 'a/2', { fullName: 'a/1', zone: 'before' });
    expect(result).toEqual([{ kind: 'repo', fullName: 'a/2' }, { kind: 'repo', fullName: 'a/1' }]);
  });

  it('reorders two standalone tabs: drop after', () => {
    const slots: TabSlot[] = [{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'a/2' }];
    const result = applyDrop(slots, 'a/1', { fullName: 'a/2', zone: 'after' });
    expect(result).toEqual([{ kind: 'repo', fullName: 'a/2' }, { kind: 'repo', fullName: 'a/1' }]);
  });

  it('center-drop on a standalone tab creates a new group', () => {
    const slots: TabSlot[] = [{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'b/2' }];
    const result = applyDrop(slots, 'b/2', { fullName: 'a/1', zone: 'center' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'group', repoFullNames: ['a/1', 'b/2'] });
  });

  it('center-drop on a tab already in a group joins that group', () => {
    const slots: TabSlot[] = [
      { kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/2'] },
      { kind: 'repo', fullName: 'b/1' },
    ];
    const result = applyDrop(slots, 'b/1', { fullName: 'a/1', zone: 'center' });
    expect(result).toEqual([{ kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/2', 'b/1'] }]);
  });

  it('dragging a tab out of its 2-member group to the end dissolves the group', () => {
    const slots: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/2'] }];
    const result = applyDrop(slots, 'a/2', { end: true });
    expect(result).toEqual([{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'a/2' }]);
  });

  it('dragging a tab out of a 3-member group keeps the group intact for the remaining two', () => {
    const slots: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/2', 'a/3'] }];
    const result = applyDrop(slots, 'a/2', { end: true });
    expect(result).toEqual([
      { kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/3'] },
      { kind: 'repo', fullName: 'a/2' },
    ]);
  });

  it('reordering within a group keeps the members in that same group', () => {
    const slots: TabSlot[] = [{ kind: 'group', id: 'g1', repoFullNames: ['a/1', 'a/2', 'a/3'] }];
    const result = applyDrop(slots, 'a/3', { fullName: 'a/1', zone: 'before' });
    expect(result).toEqual([{ kind: 'group', id: 'g1', repoFullNames: ['a/3', 'a/1', 'a/2'] }]);
  });

  it('dropping at the end appends a standalone tab', () => {
    const slots: TabSlot[] = [{ kind: 'repo', fullName: 'a/1' }];
    const result = applyDrop(slots, 'b/2', { end: true });
    expect(result).toEqual([{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'b/2' }]);
  });

  it('dropping a tab onto itself is a no-op container-wise (still removes-then-reinserts at the same place)', () => {
    const slots: TabSlot[] = [{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'a/2' }];
    const result = applyDrop(slots, 'a/1', { fullName: 'a/2', zone: 'before' });
    expect(result).toEqual([{ kind: 'repo', fullName: 'a/1' }, { kind: 'repo', fullName: 'a/2' }]);
  });
});
```

- [ ] **Step 15: Run to verify it fails**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: FAIL — `applyDrop is not a function`.

- [ ] **Step 16: Implement `applyDrop`**

Append to `src/shared/tab-layout.ts`:

```ts
export type DropTarget = { fullName: string; zone: 'before' | 'center' | 'after' } | { end: true };

/**
 * Removes `fullName` from wherever it currently sits (dissolving its group
 * if that leaves exactly 1 member), returning a new slots array. A helper
 * for `applyDrop`, not exported — every drop starts by picking the dragged
 * repo up off the board before placing it back down.
 */
function removeFromSlots(slots: TabSlot[], fullName: string): TabSlot[] {
  const result: TabSlot[] = [];
  for (const slot of slots) {
    if (slot.kind === 'repo') {
      if (slot.fullName !== fullName) result.push(slot);
      continue;
    }
    if (!slot.repoFullNames.includes(fullName)) {
      result.push(slot);
      continue;
    }
    const remaining = slot.repoFullNames.filter((f) => f !== fullName);
    if (remaining.length >= 2) {
      result.push({ kind: 'group', id: slot.id, repoFullNames: remaining });
    } else {
      const [only] = remaining;
      if (only) result.push({ kind: 'repo', fullName: only });
    }
  }
  return result;
}

/** Center-zone drop: merge `draggedFullName` into whatever `targetFullName` is in. */
function mergeIntoGroup(slots: TabSlot[], draggedFullName: string, targetFullName: string): TabSlot[] {
  const result: TabSlot[] = [];
  let merged = false;
  for (const slot of slots) {
    if (slot.kind === 'group' && slot.repoFullNames.includes(targetFullName)) {
      result.push({ kind: 'group', id: slot.id, repoFullNames: [...slot.repoFullNames, draggedFullName] });
      merged = true;
      continue;
    }
    if (slot.kind === 'repo' && slot.fullName === targetFullName) {
      result.push({ kind: 'group', id: crypto.randomUUID(), repoFullNames: [targetFullName, draggedFullName] });
      merged = true;
      continue;
    }
    result.push(slot);
  }
  return merged ? result : [...result, { kind: 'repo', fullName: draggedFullName }];
}

/** Edge-zone drop: insert `draggedFullName` immediately before/after
 * `targetFullName`, inside whatever container (a group, or the top level)
 * the target is already in. */
function insertAdjacent(
  slots: TabSlot[],
  draggedFullName: string,
  targetFullName: string,
  zone: 'before' | 'after',
): TabSlot[] {
  const result: TabSlot[] = [];
  let inserted = false;
  for (const slot of slots) {
    if (slot.kind === 'repo' && slot.fullName === targetFullName) {
      const draggedSlot: TabSlot = { kind: 'repo', fullName: draggedFullName };
      if (zone === 'before') result.push(draggedSlot, slot);
      else result.push(slot, draggedSlot);
      inserted = true;
      continue;
    }
    if (slot.kind === 'group' && slot.repoFullNames.includes(targetFullName)) {
      const index = slot.repoFullNames.indexOf(targetFullName);
      const repoFullNames = [...slot.repoFullNames];
      repoFullNames.splice(zone === 'before' ? index : index + 1, 0, draggedFullName);
      result.push({ kind: 'group', id: slot.id, repoFullNames });
      inserted = true;
      continue;
    }
    result.push(slot);
  }
  return inserted ? result : [...result, { kind: 'repo', fullName: draggedFullName }];
}

/** Computes the new layout after dragging `draggedFullName` onto `target`.
 * See the design spec's "Drag-and-drop" section for the exact zone rules. */
export function applyDrop(slots: TabSlot[], draggedFullName: string, target: DropTarget): TabSlot[] {
  const withoutDragged = removeFromSlots(slots, draggedFullName);

  if ('end' in target) {
    return [...withoutDragged, { kind: 'repo', fullName: draggedFullName }];
  }
  if (target.zone === 'center') {
    return mergeIntoGroup(withoutDragged, draggedFullName, target.fullName);
  }
  return insertAdjacent(withoutDragged, draggedFullName, target.fullName, target.zone);
}
```

- [ ] **Step 17: Run to verify it passes**

Run: `npx vitest run tests/tab-layout.test.ts`
Expected: PASS (26 tests).

- [ ] **Step 18: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 19: Commit**

```bash
git add src/shared/types.ts src/shared/tab-layout.ts tests/tab-layout.test.ts
git commit -m "feat: pure tab-layout functions (build, reconcile, applyDrop)"
```

---

### Task 3: DB query layer

**Files:**
- Create: `src/main/db/settings-queries.ts`
- Create: `src/main/db/tab-layout-queries.ts`
- Test: `tests/settings-queries.test.ts`
- Test: `tests/tab-layout-queries.test.ts`

**Interfaces:**
- Consumes: `settings`/`tabLayout` tables (Task 1), `TabSlot` (Task 2).
- Produces (consumed by Task 4's IPC handlers):
  - `getSettings(db): { tabGroupsEnabled: boolean }`
  - `setTabGroupsEnabled(db, enabled: boolean): void`
  - `getStoredTabLayout(db): TabSlot[] | null`
  - `setStoredTabLayout(db, slots: TabSlot[]): void`

- [ ] **Step 1: Write the failing tests for settings-queries**

Create `tests/settings-queries.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getSettings, setTabGroupsEnabled } from '../src/main/db/settings-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('settings-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('defaults tabGroupsEnabled to false when no row exists yet', () => {
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });

  it('setTabGroupsEnabled persists true', () => {
    setTabGroupsEnabled(db, true);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: true });
  });

  it('setTabGroupsEnabled can flip back to false', () => {
    setTabGroupsEnabled(db, true);
    setTabGroupsEnabled(db, false);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });

  it('getSettings creates the row on first read, and a later read sees the same defaults', () => {
    getSettings(db);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/settings-queries.test.ts`
Expected: FAIL — `Cannot find module '../src/main/db/settings-queries'`.

- [ ] **Step 3: Implement `src/main/db/settings-queries.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { settings } from './schema';

const SETTINGS_ROW_ID = 1;

/** Single-row table — creates the row with defaults on first read if it doesn't exist yet. */
export function getSettings(db: BetterSQLite3Database): { tabGroupsEnabled: boolean } {
  const row = db.select().from(settings).where(eq(settings.id, SETTINGS_ROW_ID)).get();
  if (row) return { tabGroupsEnabled: row.tabGroupsEnabled };
  db.insert(settings).values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: false }).run();
  return { tabGroupsEnabled: false };
}

export function setTabGroupsEnabled(db: BetterSQLite3Database, enabled: boolean): void {
  db.insert(settings)
    .values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: enabled })
    .onConflictDoUpdate({ target: settings.id, set: { tabGroupsEnabled: enabled } })
    .run();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/settings-queries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing tests for tab-layout-queries**

Create `tests/tab-layout-queries.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { TabSlot } from '@shared/types';
import { getStoredTabLayout, setStoredTabLayout } from '../src/main/db/tab-layout-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('tab-layout-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('returns null when no layout has ever been saved', () => {
    expect(getStoredTabLayout(db)).toBeNull();
  });

  it('round-trips a layout of standalone and grouped slots', () => {
    const slots: TabSlot[] = [
      { kind: 'repo', fullName: 'acme/web' },
      { kind: 'group', id: 'g1', repoFullNames: ['acme/api', 'acme/docs'] },
    ];
    setStoredTabLayout(db, slots);
    expect(getStoredTabLayout(db)).toEqual(slots);
  });

  it('overwrites the previous layout on a second save', () => {
    setStoredTabLayout(db, [{ kind: 'repo', fullName: 'acme/web' }]);
    setStoredTabLayout(db, [{ kind: 'repo', fullName: 'acme/api' }]);
    expect(getStoredTabLayout(db)).toEqual([{ kind: 'repo', fullName: 'acme/api' }]);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/tab-layout-queries.test.ts`
Expected: FAIL — `Cannot find module '../src/main/db/tab-layout-queries'`.

- [ ] **Step 7: Implement `src/main/db/tab-layout-queries.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tabLayout } from './schema';
import type { TabSlot } from '@shared/types';

const LAYOUT_ROW_ID = 1;

/** `null` means no row exists yet — the caller (`tab-layout:get`'s IPC
 * handler) uses that to choose between `buildInitialTabLayout` and
 * `reconcileTabLayout`. */
export function getStoredTabLayout(db: BetterSQLite3Database): TabSlot[] | null {
  const row = db.select().from(tabLayout).where(eq(tabLayout.id, LAYOUT_ROW_ID)).get();
  if (!row) return null;
  return JSON.parse(row.layout) as TabSlot[];
}

export function setStoredTabLayout(db: BetterSQLite3Database, slots: TabSlot[]): void {
  const layout = JSON.stringify(slots);
  db.insert(tabLayout)
    .values({ id: LAYOUT_ROW_ID, layout })
    .onConflictDoUpdate({ target: tabLayout.id, set: { layout } })
    .run();
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run tests/tab-layout-queries.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/main/db/settings-queries.ts src/main/db/tab-layout-queries.ts tests/settings-queries.test.ts tests/tab-layout-queries.test.ts
git commit -m "feat: settings and tab-layout DB query layer"
```

---

### Task 4: IPC contract, channels, main-process handlers, wiring

**Files:**
- Modify: `src/shared/channels.ts`
- Modify: `src/shared/ipc-contract.ts`
- Create: `src/main/ipc/settings.ts`
- Create: `src/main/ipc/tab-layout.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Interfaces:**
- Consumes: `getSettings`/`setTabGroupsEnabled`/`getStoredTabLayout`/`setStoredTabLayout` (Task 3), `buildInitialTabLayout`/`reconcileTabLayout` (Task 2), `listRepos` (existing, `src/main/db/repos-queries.ts`).
- Produces: `window.api.settings.get/setTabGroupsEnabled`, `window.api.tabLayout.get/set` — consumed by Task 6 (`RepoTabIslands`) and Task 7 (`App.tsx`/`SettingsScreen`).

This app has no existing test coverage for IPC handlers or zod schemas in isolation (repos.ts/issues.ts have none either) — this task's verification is `typecheck` + `lint` + the full existing suite staying green, matching that precedent exactly.

- [ ] **Step 1: Add the four channel names**

In `src/shared/channels.ts`, inside the `CHANNELS` object, after `imagesFetch: 'images:fetch',` add:

```ts
  settingsGet: 'settings:get',
  settingsSetTabGroupsEnabled: 'settings:set-tab-groups-enabled',
  tabLayoutGet: 'tab-layout:get',
  tabLayoutSet: 'tab-layout:set',
```

- [ ] **Step 2: Add the IPC schemas and `Api` entries**

In `src/shared/ipc-contract.ts`:

1. Add `TabSlot` to the top import: `import type { Comment, Issue, Repo, SyncStatus, TabSlot, User } from './types';`
2. After `export const setActiveRepoInput = ...` / `export type SetActiveRepoInput = ...` block (or anywhere in the schemas section), add:

```ts
export const setTabGroupsEnabledInput = z.object({ enabled: z.boolean() });
export type SetTabGroupsEnabledInput = z.infer<typeof setTabGroupsEnabledInput>;

const tabSlotSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('repo'), fullName: z.string().min(1) }),
  z.object({
    kind: z.literal('group'),
    id: z.string().min(1),
    repoFullNames: z.array(z.string().min(1)).min(2),
  }),
]);

export const setTabLayoutInput = z.object({ slots: z.array(tabSlotSchema) });
export type SetTabLayoutInput = z.infer<typeof setTabLayoutInput>;
```

3. In the `Api` interface, after the `images: { ... };` block, add:

```ts
  settings: {
    get(): Promise<{ tabGroupsEnabled: boolean }>;
    setTabGroupsEnabled(input: SetTabGroupsEnabledInput): Promise<void>;
  };
  tabLayout: {
    get(): Promise<TabSlot[]>;
    set(input: SetTabLayoutInput): Promise<void>;
  };
```

- [ ] **Step 3: Create `src/main/ipc/settings.ts`**

```ts
import { ipcMain } from 'electron';
import { setTabGroupsEnabledInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import { getSettings, setTabGroupsEnabled } from '../db/settings-queries';

export function registerSettingsHandlers(): void {
  ipcMain.handle(CHANNELS.settingsGet, () => getSettings(getDb()));

  ipcMain.handle(CHANNELS.settingsSetTabGroupsEnabled, (_event, rawInput: unknown) => {
    const { enabled } = setTabGroupsEnabledInput.parse(rawInput);
    setTabGroupsEnabled(getDb(), enabled);
  });
}
```

- [ ] **Step 4: Create `src/main/ipc/tab-layout.ts`**

```ts
import { ipcMain } from 'electron';
import { setTabLayoutInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { buildInitialTabLayout, reconcileTabLayout } from '@shared/tab-layout';
import { getDb } from '../db/client';
import { listRepos } from '../db/repos-queries';
import { getStoredTabLayout, setStoredTabLayout } from '../db/tab-layout-queries';

export function registerTabLayoutHandlers(): void {
  ipcMain.handle(CHANNELS.tabLayoutGet, () => {
    const db = getDb();
    const tracked = listRepos(db).filter((repo) => repo.tracked);
    const stored = getStoredTabLayout(db);
    const slots = stored === null ? buildInitialTabLayout(tracked) : reconcileTabLayout(stored, tracked);
    if (stored === null || JSON.stringify(stored) !== JSON.stringify(slots)) {
      setStoredTabLayout(db, slots);
    }
    return slots;
  });

  ipcMain.handle(CHANNELS.tabLayoutSet, (_event, rawInput: unknown) => {
    const { slots } = setTabLayoutInput.parse(rawInput);
    setStoredTabLayout(getDb(), slots);
  });
}
```

- [ ] **Step 5: Register both handler modules in `src/main/index.ts`**

Add two imports after `import { registerSyncHandlers } from './ipc/sync';`:

```ts
import { registerSettingsHandlers } from './ipc/settings';
import { registerTabLayoutHandlers } from './ipc/tab-layout';
```

Add two calls after `registerSyncHandlers();` inside `bootstrap()`:

```ts
  registerSettingsHandlers();
  registerTabLayoutHandlers();
```

- [ ] **Step 6: Wire the preload**

In `src/preload/index.ts`, after the `images: { fetch: ... },` block (before the closing `};` of `const api: Api = {`), add:

```ts
  settings: {
    get: () => ipcRenderer.invoke(CHANNELS.settingsGet),
    setTabGroupsEnabled: (input) => ipcRenderer.invoke(CHANNELS.settingsSetTabGroupsEnabled, input),
  },
  tabLayout: {
    get: () => ipcRenderer.invoke(CHANNELS.tabLayoutGet),
    set: (input) => ipcRenderer.invoke(CHANNELS.tabLayoutSet, input),
  },
```

- [ ] **Step 7: Full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS (no test count change — this task adds no new test files).

- [ ] **Step 8: Commit**

```bash
git add src/shared/channels.ts src/shared/ipc-contract.ts src/main/ipc/settings.ts src/main/ipc/tab-layout.ts src/main/index.ts src/preload/index.ts
git commit -m "feat: settings and tab-layout IPC surface"
```

---

### Task 5: Extract `RepoTabChip`, refactor `RepoTabs`

**Files:**
- Create: `src/renderer/components/shell/RepoTabChip.tsx`
- Modify: `src/renderer/components/shell/RepoTabs.tsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks (pure UI extraction).
- Produces: `RepoTabChip` — consumed by both `RepoTabs.tsx` (this task) and `RepoTabIslands.tsx` (Task 6).

No automated test: this codebase has zero renderer/DOM tests (matches the spec's stated testing precedent). Verification is typecheck/lint plus the manual visual check called out in Task 8.

- [ ] **Step 1: Create `RepoTabChip.tsx`**

This is the exact per-repo markup currently inline in `RepoTabs.tsx`, parameterized and extended with two new optional props (`dragHandlers`, `dropIndicator`) that only `RepoTabIslands` (Task 6) will ever pass — when omitted, the rendered output is byte-for-byte what `RepoTabs` renders today.

```tsx
import { X } from 'lucide-react';
import type { DragEvent } from 'react';
import type { Repo } from '@shared/types';
import { cn } from '@/lib/cn';

export interface RepoTabDragHandlers {
  draggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export function RepoTabChip({
  repo,
  active,
  onSelect,
  onUntrack,
  dragHandlers,
  dropIndicator = null,
}: {
  repo: Repo;
  active: boolean;
  onSelect: (fullName: string) => void;
  onUntrack: (fullName: string) => void;
  /** Only passed by `RepoTabIslands` — a plain `RepoTabs` chip isn't draggable. */
  dragHandlers?: RepoTabDragHandlers;
  /** Visual feedback for the current drag-hover zone, driven by `RepoTabIslands`. */
  dropIndicator?: 'before' | 'center' | 'after' | null;
}) {
  return (
    <div
      {...(dragHandlers ?? {})}
      className={cn(
        'relative flex items-center gap-2.5 rounded-t-[12px] px-4',
        active
          ? 'bg-surface-card pb-2.5 pt-2.5 shadow-[0_-1px_4px_rgba(14,15,16,0.05)]'
          : 'bg-white/45 pb-2.5 pt-2.5',
        dropIndicator === 'center' ? 'ring-2 ring-inset ring-lime-500' : null,
      )}
    >
      {dropIndicator === 'before' ? <span className="absolute inset-y-0 left-0 w-0.5 bg-lime-500" /> : null}
      {dropIndicator === 'after' ? <span className="absolute inset-y-0 right-0 w-0.5 bg-lime-500" /> : null}
      {active ? <span className="h-1.5 w-1.5 rounded-pill bg-lime-400" /> : null}
      <button
        type="button"
        onClick={() => onSelect(repo.fullName)}
        className={cn(
          'font-display text-body-s',
          active ? 'font-semibold text-text-strong' : 'font-medium text-text-muted',
        )}
      >
        {repo.fullName}
      </button>
      <span className="font-sans text-micro text-text-faint">{repo.openIssueCount}</span>
      {active ? (
        <button
          type="button"
          onClick={() => onUntrack(repo.fullName)}
          aria-label={`Stop tracking ${repo.fullName}`}
          className="text-text-faint transition-colors hover:text-text-strong"
        >
          <X size={12} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Refactor `RepoTabs.tsx` to use it**

Replace the full contents of `src/renderer/components/shell/RepoTabs.tsx`:

```tsx
import { Plus } from 'lucide-react';
import type { Repo } from '@shared/types';
import { RepoTabChip } from './RepoTabChip';

export function RepoTabs({
  repos,
  activeFullName,
  onSelect,
  onUntrack,
  onAdd,
}: {
  repos: Repo[];
  activeFullName: string;
  onSelect: (fullName: string) => void;
  onUntrack: (fullName: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex shrink-0 items-end gap-1 bg-surface-sunken px-4 pt-2.5">
      {repos.map((repo) => (
        <RepoTabChip
          key={repo.fullName}
          repo={repo}
          active={repo.fullName === activeFullName}
          onSelect={onSelect}
          onUntrack={onUntrack}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Track a repository"
        className="mb-2 ml-1.5 inline-flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-surface-card text-text-muted shadow-xs transition-colors hover:text-text-strong"
      >
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/shell/RepoTabChip.tsx src/renderer/components/shell/RepoTabs.tsx
git commit -m "refactor: extract RepoTabChip out of RepoTabs"
```

---

### Task 6: `RepoTabIslands` — the draggable, grouped tab strip

**Files:**
- Create: `src/renderer/components/shell/RepoTabIslands.tsx`

**Interfaces:**
- Consumes: `RepoTabChip`/`RepoTabDragHandlers` (Task 5), `TabSlot`/`applyDrop`/`groupOwnerLabel`/`DropTarget` (Task 2), `window.api.tabLayout.get/set` (Task 4), `showToast` (existing, `src/renderer/components/ui/toast.tsx`).
- Produces: `RepoTabIslands` — consumed by Task 7 (`App.tsx`), with the exact same external prop shape as `RepoTabs` so `App.tsx` can swap between them.

No automated test (same reasoning as Task 5) — the interactive logic it calls (`applyDrop`) already has full coverage from Task 2; this component is thin wiring around it. Verification is typecheck/lint plus the manual checklist in Task 8.

- [ ] **Step 1: Create `RepoTabIslands.tsx`**

```tsx
import { useState } from 'react';
import type { DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { Repo, TabSlot } from '@shared/types';
import { applyDrop, groupOwnerLabel, type DropTarget } from '@shared/tab-layout';
import { showToast } from '@/components/ui/toast';
import { RepoTabChip } from './RepoTabChip';

type Zone = 'before' | 'center' | 'after';
type Hover = { fullName: string; zone: Zone } | null;

/** Splits a chip into a 25/50/25 left/center/right drop zone — the left and
 * right edges reorder next to the target, the center merges into a group
 * with it (see the design spec's "Drag-and-drop" section). */
function zoneFromEvent(e: DragEvent<HTMLDivElement>): Zone {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'center';
}

export function RepoTabIslands({
  repos,
  activeFullName,
  onSelect,
  onUntrack,
  onAdd,
}: {
  repos: Repo[];
  activeFullName: string;
  onSelect: (fullName: string) => void;
  onUntrack: (fullName: string) => void;
  onAdd: () => void;
}) {
  const queryClient = useQueryClient();
  // `dataTransfer.getData()` is only readable at drop/dragend (a browser
  // security restriction) — during dragover it isn't, so which repo is
  // being dragged has to be tracked separately, in local state, to drive
  // the live hover indicator.
  const [draggedFullName, setDraggedFullName] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const layoutQuery = useQuery({
    queryKey: ['tab-layout'],
    queryFn: () => window.api.tabLayout.get(),
  });
  const slots = layoutQuery.data ?? [];

  const setLayoutMutation = useMutation({
    mutationFn: (next: TabSlot[]) => window.api.tabLayout.set({ slots: next }),
    onError: (error) => {
      showToast(
        `Failed to save tab layout: ${error instanceof Error ? error.message : 'unknown error'}`,
        'error',
      );
      // No conflict/rollback dance needed (this never touches GitHub) — just
      // pull back whatever's actually persisted.
      void queryClient.invalidateQueries({ queryKey: ['tab-layout'] });
    },
  });

  function commitDrop(target: DropTarget) {
    if (!draggedFullName) return;
    const next = applyDrop(slots, draggedFullName, target);
    queryClient.setQueryData(['tab-layout'], next);
    setLayoutMutation.mutate(next);
    setHover(null);
    setDraggedFullName(null);
  }

  function repoByFullName(fullName: string): Repo | undefined {
    return repos.find((repo) => repo.fullName === fullName);
  }

  function renderChip(fullName: string) {
    const repo = repoByFullName(fullName);
    if (!repo) return null;
    return (
      <RepoTabChip
        key={fullName}
        repo={repo}
        active={fullName === activeFullName}
        onSelect={onSelect}
        onUntrack={onUntrack}
        dropIndicator={hover?.fullName === fullName ? hover.zone : null}
        dragHandlers={{
          draggable: true,
          onDragStart: (e) => {
            e.dataTransfer.setData('text/plain', fullName);
            setDraggedFullName(fullName);
          },
          onDragEnd: () => {
            setDraggedFullName(null);
            setHover(null);
          },
          onDragOver: (e) => {
            e.preventDefault();
            if (fullName === draggedFullName) return;
            setHover({ fullName, zone: zoneFromEvent(e) });
          },
          onDragLeave: () => {
            setHover((current) => (current?.fullName === fullName ? null : current));
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fullName === draggedFullName) return;
            commitDrop({ fullName, zone: zoneFromEvent(e) });
          },
        }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-end gap-1 bg-surface-sunken px-4 pt-2.5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        commitDrop({ end: true });
      }}
    >
      {slots.map((slot) => {
        if (slot.kind === 'repo') return renderChip(slot.fullName);
        const label = groupOwnerLabel(slot.repoFullNames);
        return (
          <div
            key={slot.id}
            className="flex flex-col gap-1 rounded-[14px] border border-line-hairline bg-white/70 p-1"
          >
            {label ? (
              <span className="px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.07em] text-text-faint">
                {label}
              </span>
            ) : null}
            <div className="flex items-end gap-1">
              {slot.repoFullNames.map((fullName) => renderChip(fullName))}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Track a repository"
        className="mb-2 ml-1.5 inline-flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-surface-card text-text-muted shadow-xs transition-colors hover:text-text-strong"
      >
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/shell/RepoTabIslands.tsx
git commit -m "feat: RepoTabIslands — draggable, groupable repo tabs"
```

---

### Task 7: Wire up `App.tsx` and `SettingsScreen`

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/features/settings/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `RepoTabIslands` (Task 6), `window.api.settings.get/setTabGroupsEnabled` (Task 4).
- Produces: the feature is now reachable end-to-end (toggle in Settings, grouped tabs in the header).

- [ ] **Step 1: `App.tsx` — read the setting, choose which tab strip to render**

Add the import, alongside the existing `RepoTabs` import:

```ts
import { RepoTabIslands } from '@/components/shell/RepoTabIslands';
```

Add a query right after the existing `issuesQuery` block (after the `const openIssue = ...` line):

```ts
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() });
  const tabGroupsEnabled = settingsQuery.data?.tabGroupsEnabled ?? false;
```

Replace the `<RepoTabs .../>` call in the render with a conditional:

```tsx
          {tabGroupsEnabled ? (
            <RepoTabIslands
              repos={tracked}
              activeFullName={activeFullName}
              onSelect={setActiveRepo}
              onUntrack={untrack}
              onAdd={() => setPickerOpen(true)}
            />
          ) : (
            <RepoTabs
              repos={tracked}
              activeFullName={activeFullName}
              onSelect={setActiveRepo}
              onUntrack={untrack}
              onAdd={() => setPickerOpen(true)}
            />
          )}
```

- [ ] **Step 2: `App.tsx` — invalidate `['tab-layout']` on track/untrack**

In `untrack()`, add the invalidation alongside the existing `setActiveRepo` call inside `.then`:

```ts
  function untrack(fullName: string) {
    const repoIds = repos
      .filter((repo) => repo.tracked && repo.fullName !== fullName)
      .map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((next) => {
        setRepos(next);
        setActiveRepo((current) => pickActiveRepo(next, current));
        void queryClient.invalidateQueries({ queryKey: ['tab-layout'] });
      })
      .catch((error: unknown) => {
        console.error('Failed to untrack repository', error);
      });
  }
```

Do the same in `confirmTracked()`:

```ts
  function confirmTracked(next: Repo[]) {
    const repoIds = next.filter((repo) => repo.tracked).map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((updated) => {
        setRepos(updated);
        setActiveRepo((current) => pickActiveRepo(updated, current));
        void queryClient.invalidateQueries({ queryKey: ['tab-layout'] });
        setPickerOpen(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to update tracked repositories', error);
      });
  }
```

(`queryClient` is already in scope in both — `App.tsx` already calls `useQueryClient()` near the top.)

- [ ] **Step 3: `SettingsScreen.tsx` — wire a real toggle row**

Add imports at the top:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/ui/toast';
```

Inside `export function SettingsScreen() {`, after the existing `const [toggles, setToggles] = useState(...)` block, add:

```ts
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() });
  const tabGroupsEnabled = settingsQuery.data?.tabGroupsEnabled ?? false;
  const setTabGroupsMutation = useMutation({
    mutationFn: (enabled: boolean) => window.api.settings.setTabGroupsEnabled({ enabled }),
    onSuccess: (_data, enabled) => {
      queryClient.setQueryData(['settings'], { tabGroupsEnabled: enabled });
    },
    onError: (error) => {
      showToast(`Failed to save setting: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });
```

Add a new row in the JSX, right after the "Pull interval" row's closing `</div>` and before the `{TOGGLE_ROWS.map(...)}` block:

```tsx
        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Group tabs by owner</span>
            <span className="font-sans text-micro text-text-muted">
              Drag tabs to rearrange or group them, Opera-Islands style. Off by default.
            </span>
          </span>
          <span className="ml-auto">
            <Switch
              label="Group tabs by owner"
              checked={tabGroupsEnabled}
              onCheckedChange={(next) => setTabGroupsMutation.mutate(next)}
            />
          </span>
        </div>
```

- [ ] **Step 4: Full verification**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx src/renderer/features/settings/SettingsScreen.tsx
git commit -m "feat: wire the tab-groups toggle into Settings and App"
```

---

### Task 8: Final verification and documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full verification, one more time, clean**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 2: Manual test checklist (record results, don't skip recording even if a display isn't available in this environment)**

1. Track 3+ repos across at least 2 different owners.
2. Open Settings → toggle "Group tabs by owner" on. Expected: same-owner repos merge into one bordered/labeled island; a repo whose owner has no other tracked repo stays a plain tab.
3. Drag a tab from inside a group to the left/right edge of a tab outside the group. Expected: it moves there as a standalone tab; if its old group now has exactly 1 member left, that member becomes a plain tab too.
4. Drag one standalone tab onto the center of another standalone tab. Expected: a new group forms containing both.
5. Drag a tab onto the center of a tab that's already inside a group. Expected: it joins that group.
6. Drag a tab to the empty space past the last tab. Expected: it becomes a standalone tab at the end.
7. Untrack a repo that's the second-to-last member of a group (via the X on its active tab). Expected: the group dissolves to a plain tab for the one left.
8. Track a brand-new repo whose owner matches an existing group. Expected: it joins that group automatically.
9. Toggle the setting off, then back on. Expected: the exact arrangement from before toggling off reappears (not a fresh owner-based regroup).
10. Quit and relaunch the app with the toggle on. Expected: the arrangement survives.

If a display is available in this environment, run through this list with `npm start` and note actual results. If not (no display), state that plainly rather than claiming it was verified — this app's own CLAUDE.md log entries do the same when a sandbox has no display.

- [ ] **Step 3: Add the Decisions log entry**

In `CLAUDE.md`, add a new entry at the top of the `## Decisions log` section (right after the `## Decisions log` heading, before the existing most-recent entry):

```markdown
### Repo tab groups (2026-09-15)

Opera-Islands-style tab grouping, off by default — see `docs/superpowers/specs/2026-09-15-repo-tab-groups-design.md` for the full design (brainstormed and approved before implementation) and `docs/superpowers/plans/2026-09-15-repo-tab-groups.md` for the implementation plan.

- **Two new SQLite tables, both single-row:** `settings` (`tabGroupsEnabled`, the first real piece of app-settings persistence — the other three `SettingsScreen` toggles stay exactly as they were, unwired fixture `useState`) and `tab_layout` (a JSON-encoded `TabSlot[]`).
- **All the interesting logic is three pure, fully unit-tested functions** in `src/shared/tab-layout.ts`: `buildInitialTabLayout` (one-shot owner-grouping, runs only when no layout has ever been saved), `reconcileTabLayout` (runs on every later read — drops untracked repos, dissolves groups down to <2 members, and joins a genuinely new repo to an *existing* matching-owner group but never manufactures a new one from two standalones, so a group the user broke up stays broken up), and `applyDrop` (every drag gesture, driven by a 25/50/25 left/center/right zone split per tab — edges reorder, center merges into a group).
- **No new dependency** — drag-and-drop is native HTML5 DnD (`draggable`/`onDragStart`/`onDragOver`/`onDrop`), the same mechanism every browser tab strip already uses.
- **`RepoTabChip` was extracted out of `RepoTabs`** so the new `RepoTabIslands` (rendered instead of `RepoTabs` when the setting is on) doesn't duplicate the tab markup — `RepoTabs` itself is otherwise behaviorally unchanged.
- **Turning the toggle off never clears `tab_layout`** — reconciliation only runs while the grouped view is actually being read, so a saved arrangement sits untouched and reappears exactly as left when the toggle goes back on.
- **Verification gap:** typecheck/lint/test all pass ([N] tests, [M] new — fill in from the actual `npm test` output). [State plainly here whether the manual test checklist in the implementation plan was actually run against a live window, or whether no display was available in this environment — do not claim the drag interactions were exercised unless they actually were.]
```

(Fill in the `[N]`/`[M]` test counts and the verification-gap sentence honestly based on what Step 1 and Step 2 actually showed — don't leave the bracketed placeholders in the committed file.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: log the repo tab groups feature in CLAUDE.md"
```
