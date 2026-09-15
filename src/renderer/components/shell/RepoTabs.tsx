import { Plus } from 'lucide-react';
import type { Repo } from '@shared/types';
import { RepoTabChip } from './RepoTabChip';

export function RepoTabs({
  repos,
  activeFullName,
  onSelect,
  onUntrack,
  onAdd,
}: {
  repos: Repo[];
  activeFullName: string;
  onSelect: (fullName: string) => void;
  onUntrack: (fullName: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex shrink-0 items-end gap-1 bg-surface-sunken px-4 pt-2.5">
      {repos.map((repo) => (
        <RepoTabChip
          key={repo.fullName}
          repo={repo}
          active={repo.fullName === activeFullName}
          onSelect={onSelect}
          onUntrack={onUntrack}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Track a repository"
        className="mb-2 ml-1.5 inline-flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-surface-card text-text-muted shadow-xs transition-colors hover:text-text-strong"
      >
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
