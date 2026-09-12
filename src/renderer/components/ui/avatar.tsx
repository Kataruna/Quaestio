import { cn } from '@/lib/cn';

type Size = 'xs' | 'sm' | 'md';

const SIZES: Record<Size, string> = {
  xs: 'h-[22px] w-[22px] text-[9px]',
  sm: 'h-7 w-7 text-nano',
  md: 'h-9 w-9 text-label',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  size = 'xs',
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill',
        'bg-surface-sunken font-sans font-semibold text-text-muted',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
