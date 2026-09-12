import { Plus, X } from 'lucide-react';
import type { Repo } from '@shared/types';
import { cn } from '@/lib/cn';

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
      {repos.map((repo) => {
        const active = repo.fullName === activeFullName;
        return (
          <div
            key={repo.fullName}
            className={cn(
              'flex items-center gap-2.5 rounded-t-[12px] px-4',
              active
                ? 'bg-surface-card pb-2.5 pt-2.5 shadow-[0_-1px_4px_rgba(14,15,16,0.05)]'
                : 'bg-white/45 pb-2.5 pt-2.5',
            )}
          >
            {active ? <span className="h-1.5 w-1.5 rounded-pill bg-lime-400" /> : null}
            <button
              type="button"
              onClick={() => onSelect(repo.fullName)}
              className={cn(
                'font-display text-body-s',
                active ? 'font-semibold text-text-strong' : 'font-medium text-text-muted',
              )}
            >
              {repo.fullName}
            </button>
            <span className="font-sans text-micro text-text-faint">{repo.openIssueCount}</span>
            {active ? (
              <button
                type="button"
                onClick={() => onUntrack(repo.fullName)}
                aria-label={`Stop tracking ${repo.fullName}`}
                className="text-text-faint transition-colors hover:text-text-strong"
              >
                <X size={12} strokeWidth={2} />
              </button>
            ) : null}
          </div>
        );
      })}
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
