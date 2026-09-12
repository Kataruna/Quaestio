import { describe, expect, it } from 'vitest';
import { mapGitHubUser } from '@shared/map-github-user';

describe('mapGitHubUser', () => {
  it('maps login, name, and avatar_url', () => {
    const result = mapGitHubUser({
      login: 'sarah-kwan',
      name: 'Sarah Kwan',
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
    });
    expect(result).toEqual({
      login: 'sarah-kwan',
      name: 'Sarah Kwan',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    });
  });

  it('falls back to the login when name is null', () => {
    // GitHub allows a profile with no display name set.
    const result = mapGitHubUser({
      login: 'sarah-kwan',
      name: null,
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
    });
    expect(result.name).toBe('sarah-kwan');
  });
});
