import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Issue, IssueType } from '@shared/types';
import { BoardColumn } from './BoardColumn';
import { BoardToolbar, ASSIGNEE_ALL } from './BoardToolbar';
import { TYPE_DOT, TYPE_LABEL } from './IssueCard';
import { SORT_OPTIONS, sortIssues, type SortOption } from './sort-issues';
import { Skeleton } from '@/components/ui/skeleton';
import { quickTransition } from '@/lib/motion';

const COLUMNS: IssueType[] = ['bug', 'feature', 'task', 'none'];
const SKELETON_COLUMNS = COLUMNS.length;

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

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            exit={{ opacity: 0 }}
            transition={quickTransition}
            className="grid items-start gap-4"
            style={{ gridTemplateColumns: `repeat(${SKELETON_COLUMNS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: SKELETON_COLUMNS }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...quickTransition, delay: i * 0.05 }}
                className="flex flex-col gap-[22px]"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
                <Skeleton className="h-[168px] rounded-[4px_22px_22px_22px]" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // No `overflow-y-auto` here, and no `items-start` — each column
          // scrolls its own cards independently (see BoardColumn), so this
          // grid row must stretch (the default) to give every column the same
          // full height to scroll within, not just size to its own content.
          <motion.div
            key="board"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={quickTransition}
            className="grid min-h-0 flex-1 gap-4"
            style={{ gridTemplateColumns: `repeat(${SKELETON_COLUMNS}, minmax(0, 1fr))` }}
          >
            {COLUMNS.map((type) => (
              <BoardColumn
                key={type}
                heading={TYPE_LABEL[type]}
                dotClassName={TYPE_DOT[type]}
                issues={visible.filter((issue) => issue.type === type)}
                // Exactly one lime card per view, as the design system requires.
                activeIssueNumber={489}
                onOpenIssue={onOpenIssue}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
