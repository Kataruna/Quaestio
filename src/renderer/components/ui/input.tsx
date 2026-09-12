import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-pill border border-line-hairline bg-surface-card px-4',
        'font-sans text-body-s text-text-strong placeholder:text-text-faint',
        'select-text transition-colors duration-[140ms] ease-[var(--ease-standard)]',
        'focus:border-lime-500 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
