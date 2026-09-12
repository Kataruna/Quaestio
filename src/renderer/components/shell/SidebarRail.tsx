import { Calendar, LayoutGrid, Search, SlidersHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ScreenId = 'board' | 'search' | 'milestones' | 'people' | 'settings';

const ITEMS: { id: ScreenId; icon: LucideIcon; label: string }[] = [
  { id: 'board', icon: LayoutGrid, label: 'Board' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'milestones', icon: Calendar, label: 'Milestones' },
  { id: 'people', icon: Users, label: 'People' },
  { id: 'settings', icon: SlidersHorizontal, label: 'Settings' },
];

export function SidebarRail({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  return (
    // The rail floats clear of content — no divider, per the design system.
    <nav aria-label="Main" className="flex w-14 shrink-0 flex-col items-center gap-2 py-1">
      {ITEMS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-label={label}
          title={label}
          aria-current={active === id ? 'page' : undefined}
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-pill',
            'transition-colors duration-[140ms] ease-[var(--ease-standard)] active:scale-[0.97]',
            active === id
              ? 'bg-ink-900 text-white'
              : 'text-text-muted hover:bg-surface-sunken hover:text-text-strong',
          )}
        >
          <Icon size={17} strokeWidth={1.75} />
        </button>
      ))}
    </nav>
  );
}
