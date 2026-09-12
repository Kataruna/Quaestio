import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: LucideIcon;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-ink-700',
  secondary: 'bg-surface-sunken text-text-strong hover:bg-neutral-200',
  ghost: 'bg-transparent text-text-muted hover:bg-surface-sunken',
};

const SIZES: Record<Size, string> = {
  sm: 'h-[34px] px-4 text-label',
  md: 'h-10 px-5 text-body',
};

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft: IconLeft,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium',
        'transition-colors duration-[140ms] ease-[var(--ease-standard)]',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {IconLeft ? <IconLeft size={size === 'sm' ? 14 : 16} strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}
