import { useState } from 'react';
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
  src,
  size = 'xs',
  className,
}: {
  name: string;
  /** GitHub avatar URL. Falls back to initials when absent or when the image fails to load
   * (e.g. an offline launch — the CSP already allows https://avatars.githubusercontent.com). */
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        onError={() => setImageFailed(true)}
        className={cn('inline-block shrink-0 rounded-pill object-cover', SIZES[size], className)}
      />
    );
  }

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
