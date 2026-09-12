import { cn } from '@/lib/cn';

export function ProgressTrack({
  value,
  height = 5,
  tone = 'lime',
  className,
}: {
  /** 0–100 */
  value: number;
  height?: number;
  tone?: 'lime' | 'ink';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'block overflow-hidden rounded-pill',
        tone === 'ink' ? 'bg-ink-900/16' : 'bg-surface-sunken',
        className,
      )}
      style={{ height }}
    >
      <span
        className={cn(
          'block h-full rounded-pill transition-[width] duration-[380ms] ease-[var(--ease-out-soft)]',
          tone === 'ink' ? 'bg-ink-900' : 'bg-lime-400',
        )}
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}
