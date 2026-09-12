import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Tag({
  children,
  onRemove,
  className,
}: {
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-2 rounded-pill border border-line-hairline',
        'bg-surface-card px-3 font-sans text-micro font-medium text-text-muted',
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove filter"
          className="text-text-faint transition-colors hover:text-text-strong"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
