import { describe, expect, it } from 'vitest';
import {
  computeDueRepos,
  ACTIVE_INTERVAL_MS,
  BACKGROUND_INTERVAL_MS,
} from '../src/main/sync/scheduler';

describe('computeDueRepos', () => {
  it('is due for a repo never polled before, regardless of which repo is active', () => {
    const due = computeDueRepos({
      trackedRepoFullNames: ['acme/web'],
      activeRepoFullName: null,
      windowFocused: true,
      lastPolledAt: new Map(),
      now: 1_000_000,
    });
    expect(due).toEqual(['acme/web']);
  });

  it('polls the focused active repo on a 60s cadence', () => {
    const lastPolledAt = new Map([['acme/web', 0]]);
    const params = {
      trackedRepoFullNames: ['acme/web'],
      activeRepoFullName: 'acme/web',
      windowFocused: true,
      lastPolledAt,
    };
    expect(computeDueRepos({ ...params, now: ACTIVE_INTERVAL_MS - 1 })).toEqual([]);
    expect(computeDueRepos({ ...params, now: ACTIVE_INTERVAL_MS })).toEqual(['acme/web']);
  });

  it('falls back to the 5-minute cadence for the active repo when the window is unfocused', () => {
    const lastPolledAt = new Map([['acme/web', 0]]);
    const params = {
      trackedRepoFullNames: ['acme/web'],
      activeRepoFullName: 'acme/web',
      windowFocused: false,
      lastPolledAt,
    };
    expect(computeDueRepos({ ...params, now: ACTIVE_INTERVAL_MS })).toEqual([]);
    expect(computeDueRepos({ ...params, now: BACKGROUND_INTERVAL_MS })).toEqual(['acme/web']);
  });

  it('polls a non-active tracked repo on the 5-minute cadence even while focused', () => {
    const lastPolledAt = new Map([['acme/other', 0]]);
    const params = {
      trackedRepoFullNames: ['acme/other'],
      activeRepoFullName: 'acme/web',
      windowFocused: true,
      lastPolledAt,
    };
    expect(computeDueRepos({ ...params, now: ACTIVE_INTERVAL_MS })).toEqual([]);
    expect(computeDueRepos({ ...params, now: BACKGROUND_INTERVAL_MS })).toEqual(['acme/other']);
  });

  it('only returns repos that are actually due, not every tracked repo', () => {
    const lastPolledAt = new Map([
      ['acme/due', 0],
      ['acme/not-due', BACKGROUND_INTERVAL_MS],
    ]);
    const due = computeDueRepos({
      trackedRepoFullNames: ['acme/due', 'acme/not-due'],
      activeRepoFullName: null,
      windowFocused: true,
      lastPolledAt,
      now: BACKGROUND_INTERVAL_MS,
    });
    expect(due).toEqual(['acme/due']);
  });
});
