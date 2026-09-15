import type { GitHubClient } from './client';

export interface IssueWritePatch {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
  labels?: string[];
  /** GitHub's write API is always an array, even though this app's `Issue`
   * type keeps a single `assignee` for display (see CLAUDE.md's Slice 5
   * decision log) — `[]` unassigns, `[login]` assigns. */
  assignees?: string[];
  /** GitHub's native Issue Type, by name (e.g. `"Bug"`) — see
   * `GITHUB_TYPE_NAME` in `@shared/map-github-issue`. */
  type?: string;
}

export async function updateIssue(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
  patch: IssueWritePatch,
) {
  const { data } = await client.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    ...patch,
  });
  return data;
}

export async function createIssue(
  client: GitHubClient,
  owner: string,
  repo: string,
  title: string,
  body: string | undefined,
) {
  const { data } = await client.rest.issues.create({ owner, repo, title, body });
  return data;
}

export async function createIssueComment(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
) {
  const { data } = await client.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  return data;
}
