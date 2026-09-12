import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { SelectPill } from '@/components/ui/select-pill';

const SORT_OPTIONS = ['Priority', 'Due date', 'Recently updated', 'Issue number'] as const;
const ASSIGNEE_OPTIONS = [
  'Assignee: All',
  'sarah-kwan',
  'm-ito',
  'dpatel',
  'ravi-n',
  'lm-chen',
] as const;

export function BoardToolbar({
  repoName,
  openCount,
  search,
  onSearchChange,
}: {
  repoName: string;
  openCount: number;
  search: string;
  onSearchChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <h1 className="font-display text-page font-semibold tracking-[-0.02em] text-text-strong">
          {repoName}
        </h1>
        <p className="mt-0.5 font-sans text-micro text-text-muted">
          {openCount} open issues · main · last commit 4h ago
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <SearchField
          className="w-[210px]"
          placeholder="Search issues"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <SelectPill options={SORT_OPTIONS} aria-label="Sort issues" />
        <SelectPill options={ASSIGNEE_OPTIONS} aria-label="Filter by assignee" />
        <Button variant="primary" size="sm" iconLeft={Plus}>
          New Task
        </Button>
      </div>
    </div>
  );
}
