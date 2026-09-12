import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'hot' | 'warm' | 'due' | 'won' | 'info' | 'neutral';

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  hot: { chip: 'bg-status-hot-bg text-status-hot', dot: 'bg-status-hot' },
  warm: { chip: 'bg-status-warm-bg text-status-warm', dot: 'bg-status-warm' },
  due: { chip: 'bg-status-due-bg text-status-due', dot: 'bg-status-due' },
  won: { chip: 'bg-status-won-bg text-status-won', dot: 'bg-status-won' },
  info: { chip: 'bg-status-info-bg text-status-info', dot: 'bg-status-info' },
  neutral: { chip: 'bg-surface-sunken text-text-muted', dot: 'bg-neutral-400' },
};

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { chip, dot: dotClass } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-pill px-2.5',
        'font-sans text-micro font-medium',
        chip,
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-pill', dotClass)} /> : null}
      {children}
    </span>
  );
}
