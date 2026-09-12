import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-pill px-0.5',
        'transition-colors duration-[140ms] ease-[var(--ease-standard)]',
        checked ? 'bg-ink-900' : 'bg-neutral-300',
      )}
    >
      <span
        className={cn(
          'h-5 w-5 rounded-pill bg-white',
          'transition-transform duration-[140ms] ease-[var(--ease-standard)]',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
