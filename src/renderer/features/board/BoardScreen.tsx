import { useMemo, useState } from 'react';
import type { Issue, IssueType } from '@shared/types';
import { BoardColumn } from './BoardColumn';
import { BoardToolbar, ASSIGNEE_ALL } from './BoardToolbar';
import { TYPE_DOT, TYPE_LABEL } from './IssueCard';
import { SORT_OPTIONS, sortIssues, type SortOption } from './sort-issues';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS: IssueType[] = ['bug', 'feature', 'task'];
const SKELETON_COLUMNS = COLUMNS.length + 1;

export function BoardScreen({
  repoFullName,
  issues,
  loading = false,
  onOpenIssue,
  onNewIssue,
}: {
  repoFullName: string;
  issues: Issue[];
  loading?: boolean;
  onOpenIssue: (issue: Issue) => void;
  onNewIssue: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const [assignee, setAssignee] = useState(ASSIGNEE_ALL);

  const assigneeOptions = useMemo(
    () => [ASSIGNEE_ALL, ...new Set(issues.flatMap((issue) => (issue.assignee ? [issue.assignee.login] : [])))],
    [issues],
  );

  const visible = useMemo(() => {
    // The board is a working view of open issues, not a full history — a
    // repo synced from GitHub (state=all) includes closed issues, which
    // would otherwise pile up here forever with no way to distinguish them
    // from active work.
    let open = issues.filter((issue) => issue.state === 'open');
    if (assignee !== ASSIGNEE_ALL) open = open.filter((issue) => issue.assignee?.login === assignee);
    const needle = search.trim().toLowerCase();
    if (needle) {
      open = open.filter(
        (issue) =>
          issue.title.toLowerCase().includes(needle) || issue.body.toLowerCase().includes(needle),
      );
    }
    return sortIssues(open, sort);
  }, [issues, search, assignee, sort]);

  // Issues with no labels at all fall out of `type`'s bug/feature/task
  // classification (the mapper defaults label-less issues to 'task') into
  // their own column, so a truly untagged issue doesn't get miscounted as
  // deliberately a task.
  const unlabeled = useMemo(() => visible.filter((issue) => issue.labels.length === 0), [visible]);

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
        sort={sort}
        onSortChange={setSort}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        assigneeOptions={assigneeOptions}
        onNewIssue={onNewIssue}
      />

      {loading ? (
        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: `repeat(${SKELETON_COLUMNS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: SKELETON_COLUMNS }, (_, i) => (
            <div key={i} className="flex flex-col gap-[22px]">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
              <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
            </div>
          ))}
        </div>
      ) : (
        // No `overflow-y-auto` here, and no `items-start` — each column
        // scrolls its own cards independently (see BoardColumn), so this
        // grid row must stretch (the default) to give every column the same
        // full height to scroll within, not just size to its own content.
        <div
          className="grid min-h-0 flex-1 gap-4"
          style={{ gridTemplateColumns: `repeat(${SKELETON_COLUMNS}, minmax(0, 1fr))` }}
        >
          {COLUMNS.map((type) => (
            <BoardColumn
              key={type}
              heading={TYPE_LABEL[type]}
              dotClassName={TYPE_DOT[type]}
              issues={visible.filter(
                (issue) => issue.type === type && issue.labels.length > 0,
              )}
              // Exactly one lime card per view, as the design system requires.
              activeIssueNumber={489}
              onOpenIssue={onOpenIssue}
            />
          ))}
          <BoardColumn
            heading="Unlabeled"
            dotClassName="bg-neutral-400"
            issues={unlabeled}
            activeIssueNumber={489}
            onOpenIssue={onOpenIssue}
          />
        </div>
      )}
    </div>
  );
}
