import { describe, expect, it } from 'vitest';
import { isPullRequest, mapGitHubIssue } from '@shared/map-github-issue';

describe('isPullRequest', () => {
  it('is true when a pull_request field is present', () => {
    expect(isPullRequest({ pull_request: { url: 'https://api.github.com/x' } })).toBe(true);
  });

  it('is false when there is no pull_request field', () => {
    expect(isPullRequest({})).toBe(false);
  });
});

describe('mapGitHubIssue', () => {
  const base = {
    id: 482,
    number: 482,
    title: 'Token refresh loop on expired session',
    body: 'Client retries indefinitely.' as string | null,
    state: 'open' as const,
    labels: ['bug', 'p1'],
    assignee: { login: 'sarah-kwan', avatar_url: 'https://avatars.githubusercontent.com/u/1' } as {
      login: string;
      avatar_url: string;
    } | null,
    milestone: { title: '1.4' } as { title: string } | null,
    created_at: '2026-03-21T09:00:00Z',
    updated_at: '2026-03-26T08:12:00Z',
    html_url: 'https://github.com/acme/atlas-web/issues/482',
  };

  it('maps a fully-populated issue', () => {
    const result = mapGitHubIssue(base, 'acme/atlas-web');
    expect(result).toEqual({
      id: 482,
      number: 482,
      repoFullName: 'acme/atlas-web',
      title: 'Token refresh loop on expired session',
      body: 'Client retries indefinitely.',
      state: 'open',
      type: 'bug',
      priority: 'p1',
      labels: ['bug', 'p1'],
      assignee: { login: 'sarah-kwan', name: 'sarah-kwan', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
      milestone: '1.4',
      dueDate: null,
      subtasks: [],
      createdAt: '2026-03-21T09:00:00Z',
      updatedAt: '2026-03-26T08:12:00Z',
      htmlUrl: 'https://github.com/acme/atlas-web/issues/482',
    });
  });

  it('falls back to an empty string when body is null', () => {
    const result = mapGitHubIssue({ ...base, body: null }, 'acme/atlas-web');
    expect(result.body).toBe('');
  });

  it('maps a null assignee to null', () => {
    const result = mapGitHubIssue({ ...base, assignee: null }, 'acme/atlas-web');
    expect(result.assignee).toBeNull();
  });

  it('maps a null milestone to null', () => {
    const result = mapGitHubIssue({ ...base, milestone: null }, 'acme/atlas-web');
    expect(result.milestone).toBeNull();
  });

  it('normalises label objects to their names', () => {
    const result = mapGitHubIssue({ ...base, labels: [{ name: 'enhancement' }, 'p2'] }, 'acme/atlas-web');
    expect(result.labels).toEqual(['enhancement', 'p2']);
    expect(result.type).toBe('feature');
    expect(result.priority).toBe('p2');
  });

  it('always maps dueDate to null and subtasks to an empty array', () => {
    const result = mapGitHubIssue(base, 'acme/atlas-web');
    expect(result.dueDate).toBeNull();
    expect(result.subtasks).toEqual([]);
  });

  it('maps a closed issue to the closed state', () => {
    expect(mapGitHubIssue({ ...base, state: 'closed' }, 'acme/atlas-web').state).toBe('closed');
  });

  it('normalises an unrecognized state value to open', () => {
    expect(mapGitHubIssue({ ...base, state: 'archived' }, 'acme/atlas-web').state).toBe('open');
  });

  it('falls back to an empty string when body is absent', () => {
    expect(mapGitHubIssue({ ...base, body: undefined }, 'acme/atlas-web').body).toBe('');
  });

  it('converts a bigint id to a number', () => {
    expect(mapGitHubIssue({ ...base, id: 482n }, 'acme/atlas-web').id).toBe(482);
  });

  it('drops label objects that have no name', () => {
    expect(mapGitHubIssue({ ...base, labels: [{ name: 'bug' }, {}] }, 'acme/atlas-web').labels).toEqual(['bug']);
  });
});
