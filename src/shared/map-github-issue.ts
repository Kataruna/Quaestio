import { mapGitHubUser } from './map-github-user';
import { priorityFromLabels } from './label-mapping';
import type { Issue, IssueState, IssueType } from './types';

/**
 * The real `components["schemas"]["issue"].labels[number]` object type
 * (checked in `node_modules/@octokit/openapi-types/types.d.ts`) marks
 * `name` optional, not required.
 */
interface GitHubLabel {
  name?: string;
}

/** The subset of GitHub's issue shape (from `GET /repos/{owner}/{repo}/issues`)
 * this app actually uses.
 *
 * Checked against `components["schemas"]["issue"]` in
 * `node_modules/@octokit/openapi-types/types.d.ts` (the type actually
 * returned by `octokit.rest.issues.listForRepo`, via
 * `Endpoints["GET /repos/{owner}/{repo}/issues"]`). Two fields are wider
 * than a first-pass draft would assume:
 * - `id` is `number | bigint` there (openapi-types generates `bigint` for
 *   `format: int64` fields defensively; GitHub's actual JSON responses are
 *   plain numbers), so `mapGitHubIssue` converts it with `Number(...)`.
 * - `state` is plain `string`, not a `'open' | 'closed'` literal union
 *   (only the JSDoc `@description` documents the two allowed values), so
 *   `mapGitHubIssue` normalises it instead of assigning it directly.
 * `body` is also optional (`body?: string | null`) there, not just
 * nullable — this interface reflects that so the real response type stays
 * assignable to it.
 */
interface GitHubIssueResponse {
  id: number | bigint;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  labels: (string | GitHubLabel)[];
  /**
   * GitHub's native Issue Type (Settings → Issue Types on the repo/org),
   * not a label. `null` for repos that don't have Issue Types enabled, or
   * an issue that hasn't been given one.
   */
  type?: { name: string } | null;
  assignee: { login: string; avatar_url: string } | null;
  milestone: { title: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * The issues endpoint also returns pull requests — GitHub's own documented
 * way to tell them apart is the presence of a `pull_request` field, which
 * only PRs carry.
 */
export function isPullRequest(raw: { pull_request?: unknown }): boolean {
  return raw.pull_request !== undefined;
}

/**
 * A label object with no `name` isn't a label named `""` — it isn't
 * usable as a label at all, so it's dropped rather than turned into an
 * empty chip in the UI.
 */
function labelNames(labels: (string | GitHubLabel)[]): string[] {
  return labels.flatMap((label) => (typeof label === 'string' ? [label] : label.name ? [label.name] : []));
}

/**
 * GitHub's schema types `state` as a plain `string` (only documented, not
 * enforced, to be `'open' | 'closed'`). Anything other than `'closed'` maps
 * to `'open'`, matching GitHub's own documented behaviour. Defaulting to
 * `'open'` is safer than `'closed'`: a wrongly-visible issue is just an
 * annoyance the user will see and ignore, but a wrongly-hidden issue could
 * silently drop something from the board that still needs attention.
 */
function normaliseState(state: string): IssueState {
  return state === 'closed' ? 'closed' : 'open';
}

/**
 * GitHub's Issue Type is independent of labels — an issue's `type.name` is
 * whatever the repo's Issue Types are configured as. This app only has
 * columns for the three built-in names GitHub ships by default; anything
 * else (a custom type, or Issue Types not enabled) falls back to `task`.
 */
function issueTypeFromGitHub(type: { name: string } | null | undefined): IssueType {
  const name = type?.name.trim().toLowerCase();
  if (name === 'bug') return 'bug';
  if (name === 'feature') return 'feature';
  return 'task';
}

/** The reverse of `issueTypeFromGitHub` — GitHub's default Issue Type names,
 * exactly as it expects them on a write (`PATCH .../issues/{n}`'s `type`
 * field takes the type's name as a plain string). Only the three built-in
 * default type names this app has columns for are supported for writing,
 * matching what it already reads. */
export const GITHUB_TYPE_NAME: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
};

/**
 * Maps a raw GitHub issue onto this app's `Issue` type. `repoFullName` isn't
 * part of GitHub's issue response (it's implied by which endpoint you
 * called), so the caller supplies it. `dueDate` is always null here —
 * it's local-only (see `Issue.dueDate`'s comment), and `upsertIssues`
 * excludes it from a re-sync's overwrite set so this null never clobbers a
 * value the user picked. `subtasks` is always empty for the same reason —
 * it's a local-only checklist GitHub knows nothing about.
 */
export function mapGitHubIssue(raw: GitHubIssueResponse, repoFullName: string): Issue {
  const labels = labelNames(raw.labels);
  return {
    id: Number(raw.id),
    number: raw.number,
    repoFullName,
    title: raw.title,
    body: raw.body ?? '',
    state: normaliseState(raw.state),
    type: issueTypeFromGitHub(raw.type),
    priority: priorityFromLabels(labels),
    labels,
    assignee: raw.assignee
      ? mapGitHubUser({ login: raw.assignee.login, name: null, avatar_url: raw.assignee.avatar_url })
      : null,
    milestone: raw.milestone?.title ?? null,
    dueDate: null,
    subtasks: [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
  };
}
