import { mapGitHubUser } from './map-github-user';
import type { Comment } from './types';

/** The subset of `GET /repos/{owner}/{repo}/issues/{number}/comments` this app uses. */
interface GitHubCommentResponse {
  id: number | bigint;
  user: { login: string; avatar_url: string } | null;
  body?: string | null;
  created_at: string;
  updated_at: string;
}

export function mapGitHubComment(raw: GitHubCommentResponse): Comment {
  return {
    id: Number(raw.id),
    author: raw.user
      ? mapGitHubUser({ login: raw.user.login, name: null, avatar_url: raw.user.avatar_url })
      : null,
    body: raw.body ?? '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}
