import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { SyncStatus } from '@shared/types';
import type { GitHubClient } from '../github/client';
import { syncRepoIssuesIncremental } from './incremental-sync';
import { isNetworkError, rateLimitResetAt } from './errors';

/** Active repo: every 60s while the window is focused. Other tracked repos: every 5 min. */
export const ACTIVE_INTERVAL_MS = 60_000;
export const BACKGROUND_INTERVAL_MS = 5 * 60_000;
const TICK_MS = 15_000;

/**
 * Which of the tracked repos are due for a poll right now. Pure and
 * separately unit-tested — the one piece of interval math this module has.
 */
export function computeDueRepos(params: {
  trackedRepoFullNames: readonly string[];
  activeRepoFullName: string | null;
  windowFocused: boolean;
  lastPolledAt: ReadonlyMap<string, number>;
  now: number;
}): string[] {
  const { trackedRepoFullNames, activeRepoFullName, windowFocused, lastPolledAt, now } = params;
  return trackedRepoFullNames.filter((fullName) => {
    const interval =
      fullName === activeRepoFullName && windowFocused ? ACTIVE_INTERVAL_MS : BACKGROUND_INTERVAL_MS;
    const last = lastPolledAt.get(fullName) ?? 0;
    return now - last >= interval;
  });
}

export interface SchedulerDeps {
  getClient: () => GitHubClient | null;
  getDb: () => BetterSQLite3Database;
  getTrackedRepoFullNames: () => string[];
  onStatusChanged: (status: SyncStatus) => void;
  /** Fired only when a poll actually changed cached data (CLAUDE.md). */
  onDataChanged: (repoFullName: string) => void;
}

let deps: SchedulerDeps | null = null;
let activeRepoFullName: string | null = null;
let windowFocused = true;
let online = true;
let status: SyncStatus = { kind: 'syncing' };
let lastPolledAt = new Map<string, number>();
let tickTimer: ReturnType<typeof setInterval> | null = null;
// Guards against a tick firing while the previous one's requests are still
// in flight (a slow poll outliving the 15s tick interval) — without it,
// overlapping ticks could poll the same repo twice concurrently.
let inFlight = false;

function setStatus(next: SyncStatus): void {
  status = next;
  deps?.onStatusChanged(next);
}

export function getStatus(): SyncStatus {
  return status;
}

/** CLAUDE.md: "Writes are disabled while offline (MVP)" — the write IPC
 * handlers check this before ever calling GitHub. */
export function isOnline(): boolean {
  return online;
}

/** Switching the active (currently viewed) repo tab syncs it immediately. */
export function setActiveRepo(repoFullName: string | null): void {
  const changed = repoFullName !== activeRepoFullName;
  activeRepoFullName = repoFullName;
  if (changed && repoFullName) void pollOneNow(repoFullName);
}

/** CLAUDE.md: "Sync immediately when window regains focus." */
export function setWindowFocused(focused: boolean): void {
  const regained = focused && !windowFocused;
  windowFocused = focused;
  if (regained && activeRepoFullName) void pollOneNow(activeRepoFullName);
}

/** CLAUDE.md: "Pause polling while offline." */
export function setOnline(nextOnline: boolean): void {
  const cameBackOnline = nextOnline && !online;
  online = nextOnline;
  if (!online) setStatus({ kind: 'offline' });
  if (cameBackOnline) void tick();
}

async function pollOne(client: GitHubClient, db: BetterSQLite3Database, fullName: string): Promise<void> {
  lastPolledAt.set(fullName, Date.now());
  try {
    const { changed } = await syncRepoIssuesIncremental(client, db, fullName);
    setStatus({ kind: 'synced', at: new Date().toISOString() });
    if (changed) deps?.onDataChanged(fullName);
  } catch (error) {
    const resetAt = rateLimitResetAt(error);
    if (resetAt) {
      setStatus({ kind: 'rate-limited', resetAt });
    } else if (isNetworkError(error)) {
      setStatus({ kind: 'offline' });
    } else {
      console.warn(`Sync failed for ${fullName}:`, error instanceof Error ? error.message : error);
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Sync failed' });
    }
  }
}

async function pollOneNow(fullName: string): Promise<void> {
  if (!deps || inFlight || !online) return;
  const client = deps.getClient();
  if (!client) return;
  inFlight = true;
  try {
    await pollOne(client, deps.getDb(), fullName);
  } finally {
    inFlight = false;
  }
}

async function tick(): Promise<void> {
  if (!deps || inFlight) return;
  const client = deps.getClient();
  if (!client) return;
  if (!online) {
    setStatus({ kind: 'offline' });
    return;
  }
  const due = computeDueRepos({
    trackedRepoFullNames: deps.getTrackedRepoFullNames(),
    activeRepoFullName,
    windowFocused,
    lastPolledAt,
    now: Date.now(),
  });
  if (due.length === 0) return;
  inFlight = true;
  try {
    const db = deps.getDb();
    for (const fullName of due) {
      await pollOne(client, db, fullName);
    }
  } finally {
    inFlight = false;
  }
}

/** Polls every tracked repo immediately, ignoring each one's own interval — backs the "Sync now" button. */
export async function syncNow(): Promise<void> {
  if (!deps || inFlight) return;
  const client = deps.getClient();
  if (!client) return;
  if (!online) {
    setStatus({ kind: 'offline' });
    return;
  }
  inFlight = true;
  try {
    const db = deps.getDb();
    for (const fullName of deps.getTrackedRepoFullNames()) {
      await pollOne(client, db, fullName);
    }
  } finally {
    inFlight = false;
  }
}

export function startScheduler(nextDeps: SchedulerDeps): void {
  deps = nextDeps;
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => void tick(), TICK_MS);
  void tick();
}

export function stopScheduler(): void {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  deps = null;
  lastPolledAt = new Map();
}
