import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs',
          'border transition-colors duration-[140ms] ease-[var(--ease-standard)]',
          checked ? 'border-lime-500 bg-lime-400' : 'border-line-strong bg-surface-card',
        )}
      >
        {checked ? <Check size={12} strokeWidth={2.5} className="text-ink-900" /> : null}
      </span>
      {label ? (
        <span
          className={cn(
            'font-sans text-body-s',
            checked ? 'text-text-faint line-through' : 'text-text-body',
          )}
        >
          {label}
        </span>
      ) : null}
    </label>
  );
}
