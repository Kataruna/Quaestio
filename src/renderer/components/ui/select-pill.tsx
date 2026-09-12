import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectPillProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly string[];
}

export function SelectPill({ options, className, ...props }: SelectPillProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        className={cn(
          'h-[34px] appearance-none rounded-pill border border-line-hairline bg-surface-card',
          'pl-4 pr-9 font-sans text-label font-medium text-text-strong',
          'transition-colors duration-[140ms] ease-[var(--ease-standard)]',
          'hover:bg-surface-sunken focus:outline-none',
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
