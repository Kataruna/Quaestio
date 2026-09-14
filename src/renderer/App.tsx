import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import type { Repo, SyncStatus, User } from '@shared/types';
import { TitleBar } from '@/components/shell/TitleBar';
import { SidebarRail, type ScreenId } from '@/components/shell/SidebarRail';
import { RepoTabs } from '@/components/shell/RepoTabs';
import { StateBanner } from '@/components/shell/StateBanner';
import { PlaceholderScreen } from '@/features/PlaceholderScreen';
import { BoardScreen } from '@/features/board/BoardScreen';
import { RepoPickerDialog } from '@/features/repos/RepoPickerDialog';
import { EmptyState } from '@/features/repos/EmptyState';
import { IssueDetailDialog } from '@/features/issues/IssueDetailDialog';
import { CreateIssueDialog } from '@/features/issues/CreateIssueDialog';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { StateGallery } from '@/features/StateGallery';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { DeviceCodeScreen } from '@/features/auth/DeviceCodeScreen';
import { ToastHost } from '@/components/ui/toast';
import { isMac } from '@/lib/platform';
import { syncStatus as initialStatus } from '@/lib/fixtures';

/**
 * Keeps `current` as the active repo only if it's still tracked in `repos`;
 * otherwise falls back to the first tracked repo, or `null` if none are
 * tracked. Used everywhere `activeRepo` needs to survive (or be replaced
 * after) a repos list change — a fresh fetch, tracking/untracking a repo, or
 * a sign-out/sign-in-as-different-user cycle leaving a stale value behind.
 */
function pickActiveRepo(repos: Repo[], current: string | null): string | null {
  if (current && repos.some((repo) => repo.tracked && repo.fullName === current)) {
    return current;
  }
  return repos.find((repo) => repo.tracked)?.fullName ?? null;
}

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceFlowStarted | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  const [screen, setScreen] = useState<ScreenId>('board');
  const [repos, setRepos] = useState<Repo[]>([]);
  // `reposLoadedFor` names the signed-in user whose repo list `repos`
  // currently reflects. `reposLoading` is derived from comparing it against
  // `userLogin`, rather than toggled with a separate boolean, so the only
  // setState calls inside the fetch effect below live in `.then`/`.catch`/
  // `.finally` callbacks (nested function scopes) instead of directly in the
  // effect body — a direct, synchronous `setReposLoading(true)` at the top
  // of the effect trips `react-hooks/set-state-in-effect` ("Avoid calling
  // setState() directly within an effect"), which this project's ESLint
  // config enables and CLAUDE.md forbids silencing with eslint-disable.
  const [reposLoadedFor, setReposLoadedFor] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The issue's number, not the object — IssueDetailDialog derives the live
  // issue from the react-query cache below, so an optimistic write (or a
  // background sync) updating that cache is actually visible in the open
  // dialog instead of the stale snapshot captured at click time.
  const [openIssueNumber, setOpenIssueNumber] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [online, setOnline] = useState(true);

  const queryClient = useQueryClient();

  const tracked = repos.filter((repo) => repo.tracked);
  // A stable primitive to key the repo-loading effect on, instead of the
  // `user` object itself — `getCurrentUser()` returns a freshly mapped
  // object on every call, so keying on object identity would refetch the
  // repo list on every `auth:updated` event even for the same signed-in
  // person.
  const userLogin = user?.login ?? null;
  const reposLoading = userLogin !== null && reposLoadedFor !== userLogin;

  const issuesQuery = useQuery({
    queryKey: ['issues', activeRepo],
    queryFn: () => window.api.issues.list({ repoFullName: activeRepo as string }),
    enabled: activeRepo !== null,
  });
  const issues = issuesQuery.data ?? [];
  const issuesLoading = activeRepo !== null && issuesQuery.isPending;
  const openIssue = issues.find((issue) => issue.number === openIssueNumber) ?? null;

  useEffect(() => {
    void window.api.auth
      .getUser()
      .then(setUser)
      .catch(() => {
        setAuthError('Could not check sign-in status');
      })
      .finally(() => setAuthChecked(true));

    // Fires when sign-in, sign-out, or a background device-flow login
    // changes who's signed in — re-check who that is now.
    return window.api.auth.onUpdated(() => {
      void window.api.auth
        .getUser()
        .then((next) => {
          setUser(next);
          if (next) setDeviceCode(null);
        })
        .catch((error: unknown) => {
          console.error('Failed to refresh sign-in status', error);
        });
    });
  }, []);

  useEffect(() => {
    if (!userLogin) return;
    let cancelled = false;
    void window.api.repos
      .list()
      .then((next) => {
        if (cancelled) return;
        setRepos(next);
        // Keep the current active repo only if it's still tracked after
        // refetch — a leftover `activeRepo` from a previous session
        // (sign-out doesn't clear it) must not be trusted just because
        // it's truthy; it needs to still exist in the newly-fetched
        // tracked set (as in `confirmTracked` below).
        setActiveRepo((current) => pickActiveRepo(next, current));
      })
      .catch((error: unknown) => {
        console.error('Failed to load repositories', error);
      })
      .finally(() => {
        if (!cancelled) setReposLoadedFor(userLogin);
      });
    return () => {
      cancelled = true;
    };
  }, [userLogin]);

  // Tells the main-process scheduler which repo tab is currently being
  // viewed, so it knows to poll it every 60s instead of every 5 min
  // (CLAUDE.md's polling schedule) and to sync it immediately on switch.
  useEffect(() => {
    void window.api.sync.setActiveRepo({ repoFullName: activeRepo }).catch((error: unknown) => {
      console.error('Failed to update the active repo for sync', error);
    });
  }, [activeRepo]);

  // The sync status indicator is driven by the main-process scheduler, not
  // local UI state — pull the current value once (a fresh window created via
  // macOS `activate` would otherwise start blank until the next change), then
  // stay live via the push channel.
  useEffect(() => {
    void window.api.sync.getStatus().then(setStatus);
    return window.api.sync.onStatusChanged(setStatus);
  }, []);

  // Invalidates the matching TanStack Query key whenever a background sync
  // actually changed a repo's cached data (CLAUDE.md: "after a sync changes
  // data, the main process emits sync:updated ... the renderer invalidates
  // the matching TanStack Query keys"). react-query only refetches this if
  // `['issues', repoFullName]` is currently observed — an inactive tab's
  // query is just marked stale and refetches next time it's opened.
  useEffect(() => {
    return window.api.sync.onUpdated((repoFullName) => {
      void queryClient.invalidateQueries({ queryKey: ['issues', repoFullName] });
    });
  }, [queryClient]);

  // GitHub sync rules: "Pause polling while offline" and "Writes are
  // disabled while offline (MVP)." The renderer is the only place that can
  // observe connectivity (Electron's main process has no built-in
  // online/offline signal), so it reports `navigator.onLine` to the
  // scheduler on every change, and also tracks it locally to gate the
  // issue-detail edit controls.
  useEffect(() => {
    function report(nextOnline: boolean) {
      setOnline(nextOnline);
      void window.api.sync.setOnline({ online: nextOnline }).catch((error: unknown) => {
        console.error('Failed to report online status', error);
      });
    }
    report(navigator.onLine);
    const handleOnline = () => report(true);
    const handleOffline = () => report(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // CLAUDE.md: "Keyboard shortcuts use Cmd on macOS and Ctrl on Windows" —
  // checks the platform-specific modifier only, never `metaKey || ctrlKey`,
  // so a Windows Ctrl+N doesn't also fire for a stray Cmd+N and vice versa.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 'n') {
        if (!activeRepo || createOpen || openIssueNumber !== null) return;
        event.preventDefault();
        setCreateOpen(true);
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setScreen('search');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRepo, createOpen, openIssueNumber]);

  function handleUseToken(token: string) {
    setAuthBusy(true);
    setAuthError(undefined);
    void window.api.auth
      .signInWithToken({ token })
      .then(setUser)
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Sign-in failed');
      })
      .finally(() => setAuthBusy(false));
  }

  function handleUseDeviceFlow() {
    setAuthBusy(true);
    setAuthError(undefined);
    void window.api.auth
      .startDeviceFlow()
      .then(setDeviceCode)
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Could not start device flow');
      })
      .finally(() => setAuthBusy(false));
  }

  function handleSignOut() {
    void window.api.auth
      .signOut()
      .then(() => {
        setUser(null);
        setAuthError(undefined);
        setDeviceCode(null);
      })
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Sign-out failed');
      });
  }

  function untrack(fullName: string) {
    const repoIds = repos
      .filter((repo) => repo.tracked && repo.fullName !== fullName)
      .map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((next) => {
        setRepos(next);
        setActiveRepo((current) => pickActiveRepo(next, current));
      })
      .catch((error: unknown) => {
        console.error('Failed to untrack repository', error);
      });
  }

  function confirmTracked(next: Repo[]) {
    const repoIds = next.filter((repo) => repo.tracked).map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((updated) => {
        setRepos(updated);
        // Keep the current tab only if it's still tracked after this
        // confirm — the user may have untracked the active repo and tracked
        // a different one in the same picker session, in which case
        // `current` would otherwise point at a repo no longer in `tracked`
        // and no tab would render as active.
        setActiveRepo((current) => pickActiveRepo(updated, current));
        setPickerOpen(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to update tracked repositories', error);
      });
  }

  function handleSyncNow() {
    // Optimistic — the real status (synced/rate-limited/offline/error)
    // arrives shortly after via the `sync.onStatusChanged` push.
    setStatus({ kind: 'syncing' });
    void window.api.sync.now().catch((error: unknown) => {
      console.error('Manual sync failed', error);
    });
  }

  if (!authChecked) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-app">
        <span className="font-display text-title-m text-text-muted">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-surface-app">
        {deviceCode ? (
          <DeviceCodeScreen
            userCode={deviceCode.userCode}
            verificationUri={deviceCode.verificationUri}
            onCancel={() => setDeviceCode(null)}
          />
        ) : (
          <SignInScreen
            onUseToken={handleUseToken}
            onUseDeviceFlow={handleUseDeviceFlow}
            error={authError}
            busy={authBusy}
          />
        )}
      </div>
    );
  }

  if (reposLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-app">
        <span className="font-display text-title-m text-text-muted">Loading your repositories…</span>
      </div>
    );
  }

  // Belt-and-suspenders fallback that should be unreachable in practice: the
  // repo-loading effect normalizes `activeRepo` to a valid tracked fullName or
  // `null` before `reposLoading` goes false, so this rendering an empty string
  // instead of `tracked[0]?.fullName` would signal an upstream invariant breach.
  const activeFullName = activeRepo ?? tracked[0]?.fullName ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar
        status={status}
        onSync={handleSyncNow}
        devToolsOpen={devToolsOpen}
        onToggleDevTools={() => setDevToolsOpen((current) => !current)}
      />

      {tracked.length === 0 ? (
        <EmptyState onTrack={() => setPickerOpen(true)} userLogin={user.login} />
      ) : (
        <>
          <RepoTabs
            repos={tracked}
            activeFullName={activeFullName}
            onSelect={setActiveRepo}
            onUntrack={untrack}
            onAdd={() => setPickerOpen(true)}
          />
          {import.meta.env.DEV && devToolsOpen ? (
            <div className="px-5 pt-4">
              <StateGallery
                onPick={setStatus}
                loading={devLoading}
                onToggleLoading={() => setDevLoading((current) => !current)}
              />
            </div>
          ) : null}
          <StateBanner status={status} onRetry={handleSyncNow} />
          <div className="flex min-h-0 flex-1 gap-4 px-5 pb-6 pt-4">
            <SidebarRail active={screen} onSelect={setScreen} user={user} onSignOut={handleSignOut} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {screen === 'board' ? (
                <BoardScreen
                  repoFullName={activeFullName}
                  issues={issues}
                  loading={issuesLoading || devLoading}
                  onOpenIssue={(issue) => setOpenIssueNumber(issue.number)}
                  onNewIssue={() => setCreateOpen(true)}
                />
              ) : null}
              {screen === 'search' ? (
                <SearchScreen repoFullNames={tracked.map((repo) => repo.fullName)} />
              ) : null}
              {screen === 'settings' ? <SettingsScreen /> : null}
              {screen === 'milestones' ? <PlaceholderScreen title="Milestones" /> : null}
              {screen === 'people' ? <PlaceholderScreen title="People" /> : null}
            </main>
          </div>
        </>
      )}

      <RepoPickerDialog
        open={pickerOpen}
        repos={repos}
        userLogin={user.login}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmTracked}
      />
      <IssueDetailDialog
        issue={openIssue}
        online={online}
        onClose={() => setOpenIssueNumber(null)}
      />
      <CreateIssueDialog
        open={createOpen}
        repoFullName={activeFullName}
        online={online}
        onClose={() => setCreateOpen(false)}
      />
      <ToastHost />
    </div>
  );
}
