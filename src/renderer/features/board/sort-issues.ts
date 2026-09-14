import type { Issue } from '@shared/types';

export const SORT_OPTIONS = ['Priority', 'Due date', 'Recently updated', 'Issue number'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * Client-side, not SQLite: the board's query cache has to stay the full,
 * unfiltered per-repo issue list (IssueDetailDialog's optimistic updates
 * write straight into it), so sorting the already-loaded array is simpler
 * and just as fast at this app's scale. See `listIssues`'s `search` param
 * for the one filter this app does push into SQL (SearchScreen's cross-repo
 * search, which has no cache to protect).
 */
export function sortIssues(issues: Issue[], sort: SortOption): Issue[] {
  const sorted = [...issues];
  switch (sort) {
    case 'Priority':
      // 'p1' < 'p2' < 'p3' sorts most urgent first for free.
      return sorted.sort((a, b) => a.priority.localeCompare(b.priority));
    case 'Due date':
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    case 'Recently updated':
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'Issue number':
      return sorted.sort((a, b) => a.number - b.number);
  }
}
