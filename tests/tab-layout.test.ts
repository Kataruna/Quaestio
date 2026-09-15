import { describe, expect, it } from 'vitest';
import { groupOwnerLabel, buildInitialTabLayout, reconcileTabLayout, applyDrop } from '@shared/tab-layout';
import type { TabSlot } from '@shared/types';

function repo(fullName: string) {
  return { fullName };
}

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
