import type { GitHubClient } from './client';

/**
 * All issues for one repo, every state, every page. The endpoint also
 * returns pull requests — the caller filters those out afterward
 * (`isPullRequest` in `@shared/map-github-issue`), since there's no
 * server-side way to exclude them from this endpoint.
 */
export async function fetchAllIssues(client: GitHubClient, owner: string, repo: string) {
  return client.paginate(client.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });
}
