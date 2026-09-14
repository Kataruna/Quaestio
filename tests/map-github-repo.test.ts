import { describe, expect, it } from 'vitest';
import { mapGitHubRepo } from '@shared/map-github-repo';

describe('mapGitHubRepo', () => {
  it('maps every GitHub-derived field, excluding tracked', () => {
    const result = mapGitHubRepo({
      id: 42,
      name: 'atlas-web',
      full_name: 'acme/atlas-web',
      owner: { login: 'acme' },
      private: true,
      open_issues_count: 7,
      updated_at: '2026-03-26T10:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(result).toEqual({
      id: 42,
      owner: 'acme',
      name: 'atlas-web',
      fullName: 'acme/atlas-web',
      isPrivate: true,
      openIssueCount: 7,
      updatedAt: '2026-03-26T10:00:00Z',
    });
  });

  it('maps a public repo correctly', () => {
    const result = mapGitHubRepo({
      id: 5,
      name: 'edge-proxy',
      full_name: 'acme/edge-proxy',
      owner: { login: 'acme' },
      private: false,
      open_issues_count: 2,
      updated_at: '2026-03-20T11:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(result.isPrivate).toBe(false);
  });

  it('falls back to created_at when updated_at is null', () => {
    const result = mapGitHubRepo({
      id: 9,
      name: 'null-updated',
      full_name: 'acme/null-updated',
      owner: { login: 'acme' },
      private: false,
      open_issues_count: 0,
      updated_at: null,
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(result.updatedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('falls back to the epoch when both updated_at and created_at are null', () => {
    const result = mapGitHubRepo({
      id: 10,
      name: 'null-both',
      full_name: 'acme/null-both',
      owner: { login: 'acme' },
      private: false,
      open_issues_count: 0,
      updated_at: null,
      created_at: null,
    });
    expect(result.updatedAt).toBe(new Date(0).toISOString());
  });
});
