import type { User } from './types';

/** The subset of GitHub's `GET /user` response this app actually uses. */
interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
}

export function mapGitHubUser(raw: GitHubUserResponse): User {
  return {
    login: raw.login,
    name: raw.name ?? raw.login,
    avatarUrl: raw.avatar_url,
  };
}
