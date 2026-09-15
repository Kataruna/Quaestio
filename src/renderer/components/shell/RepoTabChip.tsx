import { X } from 'lucide-react';
import type { DragEvent } from 'react';
import type { Repo } from '@shared/types';
import { cn } from '@/lib/cn';

export interface RepoTabDragHandlers {
  draggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export function RepoTabChip({
  repo,
  active,
  onSelect,
  onUntrack,
  dragHandlers,
  dropIndicator = null,
  displayName,
}: {
  repo: Repo;
  active: boolean;
  onSelect: (fullName: string) => void;
  onUntrack: (fullName: string) => void;
  /** Only passed by `RepoTabIslands` — a plain `RepoTabs` chip isn't draggable. */
  dragHandlers?: RepoTabDragHandlers;
  /** Visual feedback for the current drag-hover zone, driven by `RepoTabIslands`. */
  dropIndicator?: 'before' | 'center' | 'after' | null;
  /** Overrides the label text — `RepoTabIslands` passes a bare repo name
   * for a chip that matches its group's owner label. Defaults to the full
   * `owner/name`, which is what a plain `RepoTabs` chip always shows. */
  displayName?: string;
}) {
  return (
    <div
      {...(dragHandlers ?? {})}
      className={cn(
        'relative flex items-center gap-2.5 rounded-pill px-4 py-2.5',
        active ? 'bg-surface-card shadow-xs' : 'bg-white/45',
        dropIndicator === 'center' ? 'ring-2 ring-inset ring-lime-500' : null,
      )}
    >
      {dropIndicator === 'before' ? <span className="absolute inset-y-0 left-0 w-0.5 bg-lime-500" /> : null}
      {dropIndicator === 'after' ? <span className="absolute inset-y-0 right-0 w-0.5 bg-lime-500" /> : null}
      {active ? <span className="h-1.5 w-1.5 rounded-pill bg-lime-400" /> : null}
      <button
        type="button"
        onClick={() => onSelect(repo.fullName)}
        className={cn(
          'font-display text-body-s',
          active ? 'font-semibold text-text-strong' : 'font-medium text-text-muted',
        )}
      >
        {displayName ?? repo.fullName}
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
}
