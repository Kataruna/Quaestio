import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { SelectPill } from '@/components/ui/select-pill';
import { SORT_OPTIONS, type SortOption } from './sort-issues';
import { modKey } from '@/lib/platform';

export const ASSIGNEE_ALL = 'Assignee: All';

export function BoardToolbar({
  repoName,
  openCount,
  search,
  onSearchChange,
  sort,
  onSortChange,
  assignee,
  onAssigneeChange,
  assigneeOptions,
  onNewIssue,
}: {
  repoName: string;
  openCount: number;
  search: string;
  onSearchChange: (next: string) => void;
  sort: SortOption;
  onSortChange: (next: SortOption) => void;
  assignee: string;
  onAssigneeChange: (next: string) => void;
  assigneeOptions: string[];
  onNewIssue: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <h1 className="font-display text-page font-semibold tracking-[-0.02em] text-text-strong">
          {repoName}
        </h1>
        <p className="mt-0.5 font-sans text-micro text-text-muted">{openCount} open issues</p>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <SearchField
          className="w-[210px]"
          placeholder="Search issues"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <SelectPill
          options={SORT_OPTIONS}
          aria-label="Sort issues"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        />
        <SelectPill
          options={assigneeOptions}
          aria-label="Filter by assignee"
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value)}
        />
        <Button variant="primary" size="sm" iconLeft={Plus} onClick={onNewIssue} title={`New issue (${modKey}N)`}>
          New Task
        </Button>
      </div>
    </div>
  );
}
