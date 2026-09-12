import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required — an icon with no label is invisible to screen readers. */
  label: string;
  size?: Size;
  variant?: 'quiet' | 'filled';
}

const SIZES: Record<Size, { box: string; glyph: number }> = {
  sm: { box: 'h-7 w-7', glyph: 14 },
  md: { box: 'h-9 w-9', glyph: 16 },
  lg: { box: 'h-11 w-11', glyph: 20 },
};

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  variant = 'quiet',
  className,
  ...props
}: IconButtonProps) {
  const { box, glyph } = SIZES[size];
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-pill',
        'transition-colors duration-[140ms] ease-[var(--ease-standard)] active:scale-[0.97]',
        variant === 'quiet'
          ? 'text-text-muted hover:bg-surface-sunken hover:text-text-strong'
          : 'bg-surface-card text-text-strong shadow-xs hover:shadow-card',
        box,
        className,
      )}
      {...props}
    >
      <Icon size={glyph} strokeWidth={1.75} />
    </button>
  );
}
