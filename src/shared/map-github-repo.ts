import type { Repo } from './types';

/** The subset of GitHub's repo shape (from `GET /user/repos` or
 * `GET /repos/{owner}/{repo}`) this app actually uses. */
interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  open_issues_count: number;
  updated_at: string;
}

/**
 * Maps every GitHub-derived field. `tracked` is deliberately excluded —
 * it's local-only state GitHub has no concept of, and the DB layer
 * (`repos-queries.ts`'s `upsertRepos`) is responsible for merging it in
 * from whatever's already stored, never overwriting it on a refresh.
 */
export function mapGitHubRepo(raw: GitHubRepoResponse): Omit<Repo, 'tracked'> {
  return {
    id: raw.id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    isPrivate: raw.private,
    openIssueCount: raw.open_issues_count,
    updatedAt: raw.updated_at,
  };
}
