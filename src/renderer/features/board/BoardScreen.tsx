import { useMemo, useState } from 'react';
import type { Issue, IssueType } from '@shared/types';
import { BoardColumn } from './BoardColumn';
import { BoardToolbar } from './BoardToolbar';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS: IssueType[] = ['bug', 'feature', 'chore'];

export function BoardScreen({
  repoFullName,
  issues,
  loading = false,
  onOpenIssue,
}: {
  repoFullName: string;
  issues: Issue[];
  loading?: boolean;
  onOpenIssue: (issue: Issue) => void;
}) {
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    // The board is a working view of open issues, not a full history — a
    // repo synced from GitHub (state=all) includes closed issues, which
    // would otherwise pile up here forever with no way to distinguish them
    // from active work.
    const open = issues.filter((issue) => issue.state === 'open');
    const needle = search.trim().toLowerCase();
    if (!needle) return open;
    return open.filter(
      (issue) =>
        issue.title.toLowerCase().includes(needle) || issue.body.toLowerCase().includes(needle),
    );
  }, [issues, search]);

  const repoName = repoFullName.split('/')[1] ?? repoFullName;

  return (
    <div className="flex h-full flex-col gap-[18px]">
      {/* Frozen: the toolbar (repo name, search, sort) never scrolls with
          the columns below it. */}
      <BoardToolbar
        repoName={repoName}
        // The repo-level open count, so it stays put while the user searches —
        // deliberately from `issues`, not the search-filtered `visible`.
        openCount={issues.filter((issue) => issue.state === 'open').length}
        search={search}
        onSearchChange={setSearch}
      />

      {/* `min-h-0` is required for a flex child to actually shrink and
          scroll instead of growing to fit its content. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-3 items-start gap-4">
            {COLUMNS.map((type) => (
              <div key={type} className="flex flex-col gap-[22px]">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
                <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 items-start gap-4">
            {COLUMNS.map((type) => (
              <BoardColumn
                key={type}
                type={type}
                issues={visible.filter((issue) => issue.type === type)}
                // Exactly one lime card per view, as the design system requires.
                activeIssueNumber={489}
                onOpenIssue={onOpenIssue}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
