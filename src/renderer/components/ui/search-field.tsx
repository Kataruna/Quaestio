import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SearchField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-faint"
      />
      <input
        type="search"
        className={cn(
          'h-9 w-full rounded-pill border border-line-hairline bg-surface-card pl-10 pr-4',
          'font-sans text-body-s text-text-strong placeholder:text-text-faint',
          'select-text transition-colors duration-[140ms] ease-[var(--ease-standard)]',
          'focus:border-lime-500 focus:outline-none',
        )}
        {...props}
      />
    </div>
  );
}
