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

/**
 * One issue, live. Used for the pre-write conflict check (CLAUDE.md: "before
 * saving, re-fetch the issue") — a 404/410/301 here means the issue is gone
 * (deleted or transferred), which the caller is responsible for handling.
 */
export async function fetchIssue(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
) {
  const { data } = await client.rest.issues.get({ owner, repo, issue_number: issueNumber });
  return data;
}

/** CLAUDE.md: fetch comments when an issue is opened; never background-sync them. */
export async function fetchIssueComments(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
) {
  return client.paginate(client.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
}
