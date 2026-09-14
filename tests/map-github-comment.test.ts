import { describe, expect, it } from 'vitest';
import { mapGitHubComment } from '@shared/map-github-comment';

describe('mapGitHubComment', () => {
  const base = {
    id: 501,
    user: { login: 'sarah-kwan', avatar_url: 'https://avatars.githubusercontent.com/u/1' } as {
      login: string;
      avatar_url: string;
    } | null,
    body: 'Looks good to me.' as string | null | undefined,
    created_at: '2026-03-21T09:00:00Z',
    updated_at: '2026-03-21T09:00:00Z',
  };

  it('maps a fully-populated comment', () => {
    expect(mapGitHubComment(base)).toEqual({
      id: 501,
      author: { login: 'sarah-kwan', name: 'sarah-kwan', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
      body: 'Looks good to me.',
      createdAt: '2026-03-21T09:00:00Z',
      updatedAt: '2026-03-21T09:00:00Z',
    });
  });

  it('maps a null user to a null author', () => {
    expect(mapGitHubComment({ ...base, user: null }).author).toBeNull();
  });

  it('falls back to an empty string when body is null', () => {
    expect(mapGitHubComment({ ...base, body: null }).body).toBe('');
  });

  it('falls back to an empty string when body is absent', () => {
    expect(mapGitHubComment({ ...base, body: undefined }).body).toBe('');
  });

  it('converts a bigint id to a number', () => {
    expect(mapGitHubComment({ ...base, id: 501n }).id).toBe(501);
  });
});
