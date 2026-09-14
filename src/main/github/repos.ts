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
