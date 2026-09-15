import type { TabSlot } from './types';

function ownerOf(fullName: string): string {
  const [owner] = fullName.split('/');
  return owner ?? fullName;
}

function nameOf(fullName: string): string {
  const slash = fullName.indexOf('/');
  return slash === -1 ? fullName : fullName.slice(slash + 1);
}

/**
 * The label shown above a group — the owner shared by the most members
 * (a plurality, not necessarily all of them: a group that started as a
 * same-owner group still shows that owner even after one differently-owned
 * repo gets dragged in). Only a genuine tie for most-common owner (e.g. two
 * members with two different owners, one each) yields no label — that's a
 * "custom" group with no owner to reference at all.
 */
export function groupOwnerLabel(repoFullNames: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const fullName of repoFullNames) {
    const owner = ownerOf(fullName);
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [owner, count] of counts) {
    if (count > bestCount) {
      best = owner;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  return tied ? null : best;
}

/**
 * What a chip inside a group should display: just the repo name when it
 * matches the group's owner label (that owner is already shown once, at
 * the group's header, so repeating it on every chip is redundant) — the
 * full "owner/name" otherwise, either because this repo doesn't match the
 * group's (plurality) owner, or because the group has no owner label at
 * all (a tied/custom group, `groupLabel: null`). A standalone (non-grouped)
 * tab always passes `groupLabel: null`, so it always gets the full name.
 */
export function chipDisplayName(fullName: string, groupLabel: string | null): string {
  if (groupLabel === null || ownerOf(fullName) !== groupLabel) return fullName;
  return nameOf(fullName);
}

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
  if (!('end' in target) && target.fullName === draggedFullName) return slots;

  const withoutDragged = removeFromSlots(slots, draggedFullName);

  if ('end' in target) {
    return [...withoutDragged, { kind: 'repo', fullName: draggedFullName }];
  }
  if (target.zone === 'center') {
    return mergeIntoGroup(withoutDragged, draggedFullName, target.fullName);
  }
  return insertAdjacent(withoutDragged, draggedFullName, target.fullName, target.zone);
}
