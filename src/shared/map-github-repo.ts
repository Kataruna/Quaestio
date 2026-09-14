import type { Repo } from './types';

/**
 * The subset of GitHub's repo shape (from `GET /user/repos` or
 * `GET /repos/{owner}/{repo}`) this app actually uses.
 *
 * Checked against `components["schemas"]["repository"]` in
 * `node_modules/@octokit/openapi-types/types.d.ts` (the type actually
 * returned by `octokit.rest.repos.listForAuthenticatedUser`). Both
 * `updated_at` and `created_at` are typed `string | null` there — the
 * OpenAPI spec is defensive, since GitHub always sends a real timestamp for
 * an existing repo in practice — so `mapGitHubRepo` accepts the wider type
 * and falls back rather than assuming it can't happen.
 */
interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  open_issues_count: number;
  updated_at: string | null;
  created_at: string | null;
}

/**
 * Maps every GitHub-derived field. `tracked` is deliberately excluded —
 * it's local-only state GitHub has no concept of, and the DB layer
 * (`repos-queries.ts`'s `upsertRepos`) is responsible for merging it in
 * from whatever's already stored, never overwriting it on a refresh.
 *
 * `updatedAt` falls back to `created_at`, and then to the epoch, if GitHub
 * sends a null timestamp — `Repo.updatedAt` is a required `string` (it
 * drives the "updated Xh ago" text in `RepoPickerDialog`), so a missing
 * value must resolve to *something* rather than crash the mapper.
 */
export function mapGitHubRepo(raw: GitHubRepoResponse): Omit<Repo, 'tracked'> {
  return {
    id: raw.id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    isPrivate: raw.private,
    openIssueCount: raw.open_issues_count,
    updatedAt: raw.updated_at ?? raw.created_at ?? new Date(0).toISOString(),
  };
}
