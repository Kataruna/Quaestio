import { ipcMain } from 'electron';
import { listIssuesInput, getIssueInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import { listIssues, getIssue } from '../db/issues-queries';

export function registerIssuesHandlers(): void {
  // Both handlers below are synchronous — `better-sqlite3` reads are
  // synchronous, so there's nothing to `await` — but `ipcMain.handle`
  // accepts a plain return value just as well as a promise.
  ipcMain.handle(CHANNELS.issuesList, (_event, rawInput: unknown) => {
    // `search` is validated but intentionally unused — Slice 6 owns turning
    // it into a real filter. Until then this always returns every cached
    // issue for the repo, matching how `BoardScreen` already does its own
    // client-side text filtering.
    const { repoFullName } = listIssuesInput.parse(rawInput);
    return listIssues(getDb(), repoFullName);
  });

  ipcMain.handle(CHANNELS.issuesGet, (_event, rawInput: unknown) => {
    const { repoFullName, number } = getIssueInput.parse(rawInput);
    return getIssue(getDb(), repoFullName, number);
  });
}
