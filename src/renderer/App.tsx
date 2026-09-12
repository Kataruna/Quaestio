import { useState } from 'react';
import type { Issue, SyncStatus } from '@shared/types';
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
import { issues, repos as repoFixtures, syncStatus as initialStatus } from '@/lib/fixtures';

export function App() {
  const [screen, setScreen] = useState<ScreenId>('board');
  const [repos, setRepos] = useState(repoFixtures);
  const [activeRepo, setActiveRepo] = useState('acme/atlas-web');
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);

  const tracked = repos.filter((repo) => repo.tracked);

  function untrack(fullName: string) {
    setRepos((current) =>
      current.map((repo) => (repo.fullName === fullName ? { ...repo, tracked: false } : repo)),
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar status={status} onSync={() => setStatus({ kind: 'syncing' })} />

      {tracked.length === 0 ? (
        <EmptyState onTrack={() => setPickerOpen(true)} />
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
            <SidebarRail active={screen} onSelect={setScreen} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {screen === 'board' ? (
                <BoardScreen
                  repoFullName={activeRepo}
                  issues={issues}
                  loading={loading}
                  onOpenIssue={setOpenIssue}
                />
              ) : null}
              {screen === 'search' ? <SearchScreen /> : null}
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
