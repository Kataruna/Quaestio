import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectPill } from '@/components/ui/select-pill';
import { Switch } from '@/components/ui/switch';

const INTERVAL_OPTIONS = ['Every 5 min', 'Every 15 min', 'Hourly', 'Manual only'] as const;

interface Row {
  id: string;
  title: string;
  detail: string;
}

const TOGGLE_ROWS: Row[] = [
  {
    id: 'pushSubtasks',
    title: 'Push subtask progress as a comment',
    detail: 'Subtasks are local by default',
  },
  {
    id: 'mapLabels',
    title: 'Map labels to types',
    detail: 'bug → Bug · enhancement → Feature · everything else → Chore',
  },
  {
    id: 'notifyP1',
    title: 'Notify on new P1',
    detail: 'Desktop notification when a P1 lands in a tracked repo',
  },
];

export function SettingsScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pushSubtasks: false,
    mapLabels: true,
    notifyP1: true,
  });

  return (
    <div className="max-w-[560px] rounded-card bg-surface-card p-6 shadow-card">
      <h1 className="mb-1 font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
        Sync
      </h1>
      <p className="mb-[18px] font-sans text-micro text-text-muted">
        Last pull 2 min ago · 4 repos · 40 issues
      </p>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Pull interval</span>
            <span className="font-sans text-micro text-text-muted">
              How often Issue Desk checks GitHub for changes
            </span>
          </span>
          <SelectPill className="ml-auto" options={INTERVAL_OPTIONS} aria-label="Pull interval" />
        </div>

        {TOGGLE_ROWS.map((row, index) => (
          <div
            key={row.id}
            className={
              index === TOGGLE_ROWS.length - 1
                ? 'flex items-center gap-3.5 py-3.5'
                : 'flex items-center gap-3.5 border-b border-line-hairline py-3.5'
            }
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-label font-medium text-text-strong">{row.title}</span>
              <span className="font-sans text-micro text-text-muted">{row.detail}</span>
            </span>
            <span className="ml-auto">
              <Switch
                label={row.title}
                checked={toggles[row.id] ?? false}
                onCheckedChange={(next) =>
                  setToggles((current) => ({ ...current, [row.id]: next }))
                }
              />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2.5 rounded-[18px] bg-surface-sunken px-4 py-3.5">
        <span className="h-[7px] w-[7px] rounded-pill bg-status-won" />
        <span className="font-sans text-micro text-text-muted">All four repos synced cleanly</span>
        <Button variant="secondary" size="sm" iconLeft={RefreshCw} className="ml-auto">
          Sync now
        </Button>
      </div>
    </div>
  );
}
