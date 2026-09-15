import type { GitHubClient } from './client';

/**
 * Every repo the signed-in user can see — personal and any org repos they
 * have access to — every page. This becomes the list `RepoPickerDialog`
 * offers; only repos the user explicitly tracks get their issues synced.
 */
export async function fetchUserRepos(client: GitHubClient) {
  return client.paginate(client.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
  });
}

/** The repo's existing labels, for the labels-dropdown typeahead. */
export async function fetchRepoLabels(client: GitHubClient, owner: string, repo: string) {
  return client.paginate(client.rest.issues.listLabelsForRepo, { owner, repo, per_page: 100 });
}

/**
 * The repo's collaborators, for the assignee typeahead — only these logins
 * can actually be assigned (GitHub silently drops a non-collaborator from
 * `assignees` on write). Requires push access to the repo; the caller treats
 * a 403 as "no suggestions" rather than a hard failure.
 */
export async function fetchRepoCollaborators(client: GitHubClient, owner: string, repo: string) {
  return client.paginate(client.rest.repos.listCollaborators, { owner, repo, per_page: 100 });
}
