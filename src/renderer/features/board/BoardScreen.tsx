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
    const needle = search.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(needle) || issue.body.toLowerCase().includes(needle),
    );
  }, [issues, search]);

  const repoName = repoFullName.split('/')[1] ?? repoFullName;

  return (
    <div className="flex flex-col gap-[18px]">
      <BoardToolbar
        repoName={repoName}
        openCount={issues.length}
        search={search}
        onSearchChange={setSearch}
      />

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
  );
}
