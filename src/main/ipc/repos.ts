import { ipcMain } from 'electron';
import { setTrackedInput, repoFullNameInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { mapGitHubRepo } from '@shared/map-github-repo';
import { getDb } from '../db/client';
import { listRepos, upsertRepos, setTrackedRepos } from '../db/repos-queries';
import { getAuthenticatedClient } from '../github/auth';
import { fetchUserRepos, fetchRepoLabels, fetchRepoCollaborators } from '../github/repos';
import { syncRepoIssuesIncremental } from '../sync/incremental-sync';

function splitRepoFullName(repoFullName: string): [string, string] {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) throw new Error(`Not a valid "owner/repo" full name: ${repoFullName}`);
  return [owner, repo];
}

export function registerReposHandlers(): void {
  ipcMain.handle(CHANNELS.reposList, async () => {
    const db = getDb();
    const client = getAuthenticatedClient();
    if (client) {
      try {
        const raw = await fetchUserRepos(client);
        upsertRepos(db, raw.map(mapGitHubRepo));
      } catch (error) {
        // A failed live refresh is not a reason to show nothing — this app
        // is offline-first (CLAUDE.md), so fall back to whatever's already
        // cached below.
        console.warn(
          'Failed to refresh the repo list from GitHub:',
          error instanceof Error ? error.message : error,
        );
      }
    }
    return listRepos(db);
  });

  ipcMain.handle(CHANNELS.reposSetTracked, async (_event, rawInput: unknown) => {
    const { repoIds } = setTrackedInput.parse(rawInput);
    const db = getDb();
    const newlyTrackedIds = new Set(setTrackedRepos(db, repoIds));
    const client = getAuthenticatedClient();
    if (client) {
      for (const repo of listRepos(db).filter((repo) => newlyTrackedIds.has(repo.id))) {
        try {
          // A newly-tracked repo always has a null cursor, so this is a full
          // sync (same as before) that also seeds the cursor incremental
          // polling needs from here on — see `incremental-sync.ts`.
          await syncRepoIssuesIncremental(client, db, repo.fullName);
        } catch (error) {
          // Tracking still succeeds even if the first sync fails (e.g.
          // offline) — the repo just starts with no cached issues until a
          // later successful sync (the scheduler's own poll loop will pick
          // it up once it's tracked, and report the failure via the global
          // sync-status indicator then). No abort-the-whole-operation here.
          console.warn(
            `Failed to sync issues for ${repo.fullName}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
    return listRepos(db);
  });

  ipcMain.handle(CHANNELS.reposListLabels, async (_event, rawInput: unknown) => {
    const { repoFullName } = repoFullNameInput.parse(rawInput);
    const client = getAuthenticatedClient();
    if (!client) return [];
    try {
      const [owner, repo] = splitRepoFullName(repoFullName);
      const labels = await fetchRepoLabels(client, owner, repo);
      return labels.map((label) => label.name);
    } catch (error) {
      console.warn(`Failed to list labels for ${repoFullName}:`, error instanceof Error ? error.message : error);
      return [];
    }
  });

  ipcMain.handle(CHANNELS.reposListCollaborators, async (_event, rawInput: unknown) => {
    const { repoFullName } = repoFullNameInput.parse(rawInput);
    const client = getAuthenticatedClient();
    if (!client) return [];
    try {
      const [owner, repo] = splitRepoFullName(repoFullName);
      const collaborators = await fetchRepoCollaborators(client, owner, repo);
      return collaborators.map((user) => user.login);
    } catch (error) {
      // Listing collaborators requires push access — a read-only token 403s here,
      // which just means "no typeahead suggestions," not a real failure.
      console.warn(
        `Failed to list collaborators for ${repoFullName}:`,
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  });
}
