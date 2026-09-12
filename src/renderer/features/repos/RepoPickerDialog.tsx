import { useState } from 'react';
import type { Repo } from '@shared/types';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchField } from '@/components/ui/search-field';
import { cn } from '@/lib/cn';

function relativeUpdated(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'updated today';
  if (days === 1) return 'updated yesterday';
  if (days < 7) return `updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `updated ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

export function RepoPickerDialog({
  open,
  repos,
  userLogin,
  onClose,
  onConfirm,
}: {
  open: boolean;
  repos: Repo[];
  userLogin: string;
  onClose: () => void;
  onConfirm: (next: Repo[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  // Tracks the previous `open` value so we can re-seed state during render
  // (the React-endorsed alternative to a setState-in-effect, which
  // eslint-plugin-react-hooks flags as a cascading-render risk) exactly when
  // the dialog transitions from closed to open.
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelected(new Set(repos.filter((repo) => repo.tracked).map((repo) => repo.id)));
      setFilter('');
    }
  }

  const visible = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const addedCount = [...selected].filter(
    (id) => !repos.find((repo) => repo.id === id)?.tracked,
  ).length;

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onClose={onClose} className="w-[540px] p-6">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
          Track a repository
        </h2>
        {/*
          "selected", not "tracked": this counts the live checkbox selection, which
          changes on every click and only becomes the tracked set once Save is
          pressed. The Save button's `addedCount` carries the "what will change"
          signal separately.
        */}
        <span className="ml-auto font-sans text-micro text-text-faint">
          {selected.size} of {repos.length} selected
        </span>
      </div>
      <p className="mb-4 mt-1.5 font-sans text-body text-text-muted">
        Only tracked repos sync. Everything else stays untouched on GitHub.
      </p>

      <SearchField
        className="mb-3.5 w-full"
        placeholder="Filter your repositories"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
        {visible.map((repo) => {
          const checked = selected.has(repo.id);
          return (
            <div
              key={repo.id}
              className={cn(
                'flex items-center gap-3 rounded-[16px] px-3.5 py-3',
                checked ? 'bg-surface-sunken' : 'bg-transparent',
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(repo.id)} />
              <span className="flex flex-col gap-0.5">
                <span className="font-display text-body font-semibold text-text-strong">
                  {repo.fullName}
                </span>
                <span className="font-sans text-micro text-text-muted">
                  {repo.openIssueCount} open · {relativeUpdated(repo.updatedAt)}
                </span>
              </span>
              <span className="ml-auto font-sans text-micro text-text-muted">
                {repo.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
          );
        })}
        {visible.length === 0 ? (
          <p className="py-6 text-center font-sans text-micro text-text-faint">
            No repositories match that filter
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <span className="font-sans text-micro text-text-faint">Signed in as {userLogin}</span>
        <span className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onConfirm(repos.map((repo) => ({ ...repo, tracked: selected.has(repo.id) })))
            }
          >
            {addedCount > 0 ? `Add ${addedCount} repo${addedCount === 1 ? '' : 's'}` : 'Save'}
          </Button>
        </span>
      </div>
    </Dialog>
  );
}
