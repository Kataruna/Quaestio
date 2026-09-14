import { ipcMain } from 'electron';
import {
  listIssuesInput,
  getIssueInput,
  createIssueInput,
  updateIssueInput,
  getCommentsInput,
  addCommentInput,
  type GetCommentsResult,
} from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { mapGitHubComment } from '@shared/map-github-comment';
import { mapGitHubIssue } from '@shared/map-github-issue';
import { getDb } from '../db/client';
import { listIssues, getIssue, upsertIssues, deleteIssue } from '../db/issues-queries';
import { listComments, replaceComments, insertComment } from '../db/comments-queries';
import { getAuthenticatedClient } from '../github/auth';
import { fetchIssueComments } from '../github/issues';
import { createIssue, createIssueComment } from '../github/issue-writes';
import { isOnline } from '../sync/scheduler';
import { isGone, performIssueUpdate } from '../sync/issue-update';

function splitRepoFullName(repoFullName: string): [string, string] {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Not a valid "owner/repo" full name: ${repoFullName}`);
  }
  return [owner, repo];
}

export function registerIssuesHandlers(): void {
  // Both read handlers below are synchronous — `better-sqlite3` reads are
  // synchronous, so there's nothing to `await` — but `ipcMain.handle`
  // accepts a plain return value just as well as a promise.
  ipcMain.handle(CHANNELS.issuesList, (_event, rawInput: unknown) => {
    const { repoFullName, search } = listIssuesInput.parse(rawInput);
    return listIssues(getDb(), repoFullName, search);
  });

  ipcMain.handle(CHANNELS.issuesGet, (_event, rawInput: unknown) => {
    const { repoFullName, number } = getIssueInput.parse(rawInput);
    return getIssue(getDb(), repoFullName, number);
  });

  ipcMain.handle(CHANNELS.issuesCreate, async (_event, rawInput: unknown) => {
    const { repoFullName, title, body } = createIssueInput.parse(rawInput);
    if (!isOnline()) throw new Error('Writes are disabled while offline');
    const client = getAuthenticatedClient();
    if (!client) throw new Error('Not signed in');
    const [owner, repo] = splitRepoFullName(repoFullName);
    const raw = await createIssue(client, owner, repo, title, body);
    const issue = mapGitHubIssue(raw, repoFullName);
    upsertIssues(getDb(), [issue]);
    return issue;
  });

  ipcMain.handle(CHANNELS.issuesUpdate, async (_event, rawInput: unknown) => {
    const { repoFullName, number, expectedUpdatedAt, patch } = updateIssueInput.parse(rawInput);
    if (!isOnline()) throw new Error('Writes are disabled while offline');
    const client = getAuthenticatedClient();
    if (!client) throw new Error('Not signed in');
    const [owner, repo] = splitRepoFullName(repoFullName);
    return performIssueUpdate(client, getDb(), owner, repo, repoFullName, number, expectedUpdatedAt, patch);
  });

  ipcMain.handle(CHANNELS.issuesGetComments, async (_event, rawInput: unknown): Promise<GetCommentsResult> => {
    const { repoFullName, number } = getCommentsInput.parse(rawInput);
    const db = getDb();
    const cached = getIssue(db, repoFullName, number);
    const client = getAuthenticatedClient();
    if (!client) {
      // Signed out or (transiently) offline — serve whatever's cached
      // rather than failing the dialog open (this app is offline-first).
      return { kind: 'ok', comments: cached ? listComments(db, cached.id) : [] };
    }
    const [owner, repo] = splitRepoFullName(repoFullName);
    try {
      const raw = await fetchIssueComments(client, owner, repo, number);
      const fetched = raw.map(mapGitHubComment);
      if (cached) replaceComments(db, cached.id, fetched);
      return { kind: 'ok', comments: fetched };
    } catch (error) {
      if (isGone(error)) {
        if (cached) deleteIssue(db, cached.id);
        return { kind: 'deleted' };
      }
      console.warn(
        `Failed to fetch comments for ${repoFullName}#${number}:`,
        error instanceof Error ? error.message : error,
      );
      return { kind: 'ok', comments: cached ? listComments(db, cached.id) : [] };
    }
  });

  ipcMain.handle(CHANNELS.issuesAddComment, async (_event, rawInput: unknown) => {
    const { repoFullName, number, body } = addCommentInput.parse(rawInput);
    if (!isOnline()) throw new Error('Writes are disabled while offline');
    const client = getAuthenticatedClient();
    if (!client) throw new Error('Not signed in');
    const [owner, repo] = splitRepoFullName(repoFullName);
    const raw = await createIssueComment(client, owner, repo, number, body);
    const comment = mapGitHubComment(raw);
    const db = getDb();
    const cached = getIssue(db, repoFullName, number);
    if (cached) insertComment(db, cached.id, comment);
    return comment;
  });
}
