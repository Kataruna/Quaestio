import { useState } from 'react';
import type { DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { Repo, TabSlot } from '@shared/types';
import { applyDrop, groupOwnerLabel, chipDisplayName, type DropTarget } from '@shared/tab-layout';
import { showToast } from '@/components/ui/toast';
import { RepoTabChip } from './RepoTabChip';

type Zone = 'before' | 'center' | 'after';
type Hover = { fullName: string; zone: Zone } | null;

/** Splits a chip into a 25/50/25 left/center/right drop zone — the left and
 * right edges reorder next to the target, the center merges into a group
 * with it (see the design spec's "Drag-and-drop" section). */
function zoneFromEvent(e: DragEvent<HTMLDivElement>): Zone {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'center';
}

export function RepoTabIslands({
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
  const queryClient = useQueryClient();
  // `dataTransfer.getData()` is only readable at drop/dragend (a browser
  // security restriction) — during dragover it isn't, so which repo is
  // being dragged has to be tracked separately, in local state, to drive
  // the live hover indicator.
  const [draggedFullName, setDraggedFullName] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const layoutQuery = useQuery({
    queryKey: ['tab-layout'],
    queryFn: () => window.api.tabLayout.get(),
  });
  const slots = layoutQuery.data ?? [];

  const setLayoutMutation = useMutation({
    mutationFn: (next: TabSlot[]) => window.api.tabLayout.set({ slots: next }),
    onError: (error) => {
      showToast(
        `Failed to save tab layout: ${error instanceof Error ? error.message : 'unknown error'}`,
        'error',
      );
      // No conflict/rollback dance needed (this never touches GitHub) — just
      // pull back whatever's actually persisted.
      void queryClient.invalidateQueries({ queryKey: ['tab-layout'] });
    },
  });

  function commitDrop(target: DropTarget) {
    if (!draggedFullName) return;
    const next = applyDrop(slots, draggedFullName, target);
    queryClient.setQueryData(['tab-layout'], next);
    setLayoutMutation.mutate(next);
    setHover(null);
    setDraggedFullName(null);
  }

  function repoByFullName(fullName: string): Repo | undefined {
    return repos.find((repo) => repo.fullName === fullName);
  }

  function renderChip(fullName: string, groupLabel: string | null = null) {
    const repo = repoByFullName(fullName);
    if (!repo) return null;
    return (
      <RepoTabChip
        key={fullName}
        repo={repo}
        active={fullName === activeFullName}
        onSelect={onSelect}
        onUntrack={onUntrack}
        displayName={chipDisplayName(fullName, groupLabel)}
        dropIndicator={hover?.fullName === fullName ? hover.zone : null}
        dragHandlers={{
          draggable: true,
          onDragStart: (e) => {
            e.dataTransfer.setData('text/plain', fullName);
            setDraggedFullName(fullName);
          },
          onDragEnd: () => {
            setDraggedFullName(null);
            setHover(null);
          },
          onDragOver: (e) => {
            e.preventDefault();
            if (fullName === draggedFullName) return;
            setHover({ fullName, zone: zoneFromEvent(e) });
          },
          onDragLeave: () => {
            setHover((current) => (current?.fullName === fullName ? null : current));
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fullName === draggedFullName) return;
            commitDrop({ fullName, zone: zoneFromEvent(e) });
          },
        }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 bg-surface-sunken px-4 py-2.5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        commitDrop({ end: true });
      }}
    >
      {layoutQuery.isError ? (
        <span className="font-sans text-micro text-text-muted">Couldn't load tab layout.</span>
      ) : null}
      {slots.map((slot) => {
        if (slot.kind === 'repo') return renderChip(slot.fullName);
        const label = groupOwnerLabel(slot.repoFullNames);
        const anchor = slot.repoFullNames[0];
        return (
          <div
            key={slot.id}
            className="flex items-center gap-1.5 rounded-[14px] border border-line-hairline bg-background-chip p-1"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (anchor) commitDrop({ fullName: anchor, zone: 'center' });
            }}
          >
            {label ? (
              <span className="pl-1 font-mono text-[9px] font-bold uppercase tracking-[0.07em] text-text-faint">
                {label}
              </span>
            ) : null}
            {slot.repoFullNames.map((fullName) => renderChip(fullName, label))}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Track a repository"
        className="ml-1.5 inline-flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-surface-card text-text-muted shadow-xs transition-colors hover:text-text-strong"
      >
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
