import { CloudOff, TriangleAlert, Timer } from 'lucide-react';
import type { SyncStatus } from '@shared/types';
import { Button } from '@/components/ui/button';

export function StateBanner({ status, onRetry }: { status: SyncStatus; onRetry: () => void }) {
  if (status.kind === 'synced' || status.kind === 'syncing') return null;

  const content = {
    offline: {
      Icon: CloudOff,
      title: 'Offline',
      detail: 'Showing the last synced copy. Editing is disabled until the connection returns.',
    },
    'rate-limited': {
      Icon: Timer,
      title: 'Rate limited by GitHub',
      detail: 'Syncing pauses until the limit resets.',
    },
    error: {
      Icon: TriangleAlert,
      title: 'Sync failed',
      detail: status.kind === 'error' ? status.message : '',
    },
  }[status.kind];

  const { Icon, title, detail } = content;

  return (
    <div className="mx-5 mt-4 flex items-center gap-3 rounded-tile bg-surface-sunken px-4 py-3">
      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-text-muted" />
      <span className="font-sans text-micro font-semibold text-text-strong">{title}</span>
      <span className="font-sans text-micro text-text-muted">{detail}</span>
      <Button variant="secondary" size="sm" className="ml-auto" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
