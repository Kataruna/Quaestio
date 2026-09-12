import type { SyncStatus } from '@shared/types';
import { Button } from '@/components/ui/button';

const STATES: SyncStatus[] = [
  { kind: 'synced', at: '2026-03-26T10:28:00Z' },
  { kind: 'syncing' },
  { kind: 'offline' },
  { kind: 'rate-limited', resetAt: '2026-03-26T11:00:00Z' },
  { kind: 'error', message: 'GitHub returned 500 on the last pull' },
];

export function StateGallery({
  onPick,
  loading,
  onToggleLoading,
}: {
  onPick: (status: SyncStatus) => void;
  loading: boolean;
  onToggleLoading: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-tile bg-surface-sunken px-4 py-3">
      <span className="font-sans text-micro font-semibold text-text-muted">Preview state</span>
      {STATES.map((status) => (
        <Button key={status.kind} variant="ghost" size="sm" onClick={() => onPick(status)}>
          {status.kind}
        </Button>
      ))}
      <Button variant="ghost" size="sm" onClick={onToggleLoading}>
        {loading ? 'loading: on' : 'loading: off'}
      </Button>
    </div>
  );
}
