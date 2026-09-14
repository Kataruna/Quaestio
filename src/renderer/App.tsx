import { useEffect, useState } from 'react';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import type { Issue, Repo, SyncStatus, User } from '@shared/types';
import { TitleBar } from '@/components/shell/TitleBar';
import { SidebarRail, type ScreenId } from '@/components/shell/SidebarRail';
import { RepoTabs } from '@/components/shell/RepoTabs';
import { StateBanner } from '@/components/shell/StateBanner';
import { PlaceholderScreen } from '@/features/PlaceholderScreen';
import { BoardScreen } from '@/features/board/BoardScreen';
import { RepoPickerDialog } from '@/features/repos/RepoPickerDialog';
import { EmptyState } from '@/features/repos/EmptyState';
import { IssueDetailDialog } from '@/features/issues/IssueDetailDialog';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { StateGallery } from '@/features/StateGallery';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { DeviceCodeScreen } from '@/features/auth/DeviceCodeScreen';
import { searchResults, syncStatus as initialStatus } from '@/lib/fixtures';

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
  const [issues, setIssues] = useState<Issue[]>([]);
  // Same derived-loading approach as `reposLoadedFor`, keyed on the repo the
  // current `issues` array was fetched for instead of `activeRepo` itself.
  const [issuesLoadedFor, setIssuesLoadedFor] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const tracked = repos.filter((repo) => repo.tracked);
  // A stable primitive to key the repo-loading effect on, instead of the
  // `user` object itself — `getCurrentUser()` returns a freshly mapped
  // object on every call, so keying on object identity would refetch the
  // repo list on every `auth:updated` event even for the same signed-in
  // person.
  const userLogin = user?.login ?? null;
  const reposLoading = userLogin !== null && reposLoadedFor !== userLogin;
  const issuesLoading = activeRepo !== null && issuesLoadedFor !== activeRepo;

  useEffect(() => {
    void window.api.auth
      .getUser()
      .then(setUser)
      .catch(() => {
        setAuthError('Could not check sign-in status');
      })
      .finally(() => setAuthChecked(true));

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
        setActiveRepo((current) => current ?? next.find((repo) => repo.tracked)?.fullName ?? null);
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

  useEffect(() => {
    if (!activeRepo) return;
    let cancelled = false;
    void window.api.issues
      .list({ repoFullName: activeRepo })
      .then((next) => {
        if (!cancelled) setIssues(next);
      })
      .catch((error: unknown) => {
        console.error('Failed to load issues', error);
      })
      .finally(() => {
        if (!cancelled) setIssuesLoadedFor(activeRepo);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRepo]);

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
        setActiveRepo((current) =>
          current === fullName ? (next.find((repo) => repo.tracked)?.fullName ?? null) : current,
        );
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
        setActiveRepo((current) =>
          current && updated.some((repo) => repo.tracked && repo.fullName === current)
            ? current
            : (updated.find((repo) => repo.tracked)?.fullName ?? null),
        );
        setPickerOpen(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to update tracked repositories', error);
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

  const activeFullName = activeRepo ?? tracked[0]?.fullName ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar status={status} onSync={() => setStatus({ kind: 'syncing' })} />

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
          {import.meta.env.DEV ? (
            <div className="px-5 pt-4">
              <StateGallery
                onPick={setStatus}
                loading={devLoading}
                onToggleLoading={() => setDevLoading((current) => !current)}
              />
            </div>
          ) : null}
          <StateBanner status={status} onRetry={() => setStatus({ kind: 'syncing' })} />
          <div className="flex min-h-0 flex-1 gap-4 px-5 pb-6 pt-4">
            <SidebarRail active={screen} onSelect={setScreen} user={user} onSignOut={handleSignOut} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {screen === 'board' ? (
                <BoardScreen
                  repoFullName={activeFullName}
                  issues={issues}
                  loading={issuesLoading || devLoading}
                  onOpenIssue={setOpenIssue}
                />
              ) : null}
              {screen === 'search' ? <SearchScreen results={searchResults} /> : null}
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
      <IssueDetailDialog issue={openIssue} onClose={() => setOpenIssue(null)} />
    </div>
  );
}
