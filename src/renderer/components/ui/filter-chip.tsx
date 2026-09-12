import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function FilterChip({
  children,
  active = false,
  dotColor,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  dotColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-pill px-3.5',
        'font-sans text-micro font-medium transition-colors duration-[140ms]',
        active
          ? 'bg-ink-900 text-white'
          : 'bg-surface-card text-text-muted hover:bg-surface-sunken',
      )}
    >
      {dotColor ? (
        <span className="h-1.5 w-1.5 rounded-pill" style={{ background: dotColor }} />
      ) : null}
      {children}
    </button>
  );
}
