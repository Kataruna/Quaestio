import { useEffect, useState } from 'react';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import type { Issue, SyncStatus, User } from '@shared/types';
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
import { issues, repos as repoFixtures, searchResults, syncStatus as initialStatus } from '@/lib/fixtures';

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceFlowStarted | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  const [screen, setScreen] = useState<ScreenId>('board');
  const [repos, setRepos] = useState(repoFixtures);
  const [activeRepo, setActiveRepo] = useState('acme/atlas-web');
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);

  const tracked = repos.filter((repo) => repo.tracked);
  const activeIssues = issues.filter((issue) => issue.repoFullName === activeRepo);

  useEffect(() => {
    // `void` satisfies `@typescript-eslint/no-floating-promises` — verified
    // directly against this project's eslint.config.js before writing this
    // task: a bare `.then().finally()` chain with no `void` and no `.catch`
    // fails that rule, but prefixing `void` (with `.finally` still present)
    // passes clean, and — checked separately — does not trip
    // `react-hooks/set-state-in-effect` either, since that rule only flags
    // *synchronous* setState calls in the effect body, not ones inside a
    // promise callback.
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
    setRepos((current) =>
      current.map((repo) => (repo.fullName === fullName ? { ...repo, tracked: false } : repo)),
    );
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar status={status} onSync={() => setStatus({ kind: 'syncing' })} />

      {tracked.length === 0 ? (
        <EmptyState onTrack={() => setPickerOpen(true)} userLogin={user.login} />
      ) : (
        <>
          <RepoTabs
            repos={tracked}
            activeFullName={activeRepo}
            onSelect={setActiveRepo}
            onUntrack={untrack}
            onAdd={() => setPickerOpen(true)}
          />
          {import.meta.env.DEV ? (
            <div className="px-5 pt-4">
              <StateGallery
                onPick={setStatus}
                loading={loading}
                onToggleLoading={() => setLoading((current) => !current)}
              />
            </div>
          ) : null}
          <StateBanner status={status} onRetry={() => setStatus({ kind: 'syncing' })} />
          <div className="flex min-h-0 flex-1 gap-4 px-5 pb-6 pt-4">
            <SidebarRail active={screen} onSelect={setScreen} user={user} onSignOut={handleSignOut} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {screen === 'board' ? (
                <BoardScreen
                  repoFullName={activeRepo}
                  issues={activeIssues}
                  loading={loading}
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
        onConfirm={(next) => {
          setRepos(next);
          setPickerOpen(false);
        }}
      />
      <IssueDetailDialog issue={openIssue} onClose={() => setOpenIssue(null)} />
    </div>
  );
}
