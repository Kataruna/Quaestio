import { Bug, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '@shared/types';
import { IconButton } from '@/components/ui/icon-button';
import { isMac } from '@/lib/platform';
import { cn } from '@/lib/cn';

const STATUS_TEXT: Record<SyncStatus['kind'], string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
  'rate-limited': 'Rate limited',
  error: 'Sync failed',
};

const STATUS_DOT: Record<SyncStatus['kind'], string> = {
  synced: 'bg-lime-400',
  syncing: 'bg-lime-400 animate-pulse',
  offline: 'bg-neutral-400',
  'rate-limited': 'bg-status-due',
  error: 'bg-status-hot',
};

function relativeLabel(status: SyncStatus): string {
  if (status.kind === 'synced') return 'Synced 2 min ago';
  return STATUS_TEXT[status.kind];
}

export function TitleBar({
  status,
  onSync,
  devToolsOpen,
  onToggleDevTools,
}: {
  status: SyncStatus;
  onSync: () => void;
  /** Dev-build only — the state-preview panel's open/closed state. */
  devToolsOpen?: boolean;
  onToggleDevTools?: () => void;
}) {
  return (
    <header
      className={cn(
        'flex h-11 shrink-0 items-center gap-3.5 bg-surface-ink px-4',
        // Drag the window by the bar; children opt back out below.
        '[-webkit-app-region:drag]',
        // Leave room for the macOS traffic lights.
        isMac && 'pl-[78px]',
      )}
    >
      <span className="font-display text-micro font-semibold tracking-[0.14em] text-white">
        QUAESTIO
      </span>

      <span className="ml-auto flex items-center gap-2.5 [-webkit-app-region:no-drag]">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 font-sans text-micro font-medium text-white/80">
          <span className={cn('h-1.5 w-1.5 rounded-pill', STATUS_DOT[status.kind])} />
          {relativeLabel(status)}
        </span>
        <IconButton
          icon={RefreshCw}
          label="Sync now"
          size="sm"
          onClick={onSync}
          className="text-white/70 hover:bg-white/10 hover:text-white"
        />
        {import.meta.env.DEV && onToggleDevTools ? (
          <IconButton
            icon={Bug}
            label="Dev tools"
            size="sm"
            onClick={onToggleDevTools}
            className={cn(
              devToolsOpen ? 'bg-white/10 text-white' : 'text-white/70',
              'hover:bg-white/10 hover:text-white',
            )}
          />
        ) : null}
      </span>
    </header>
  );
}
