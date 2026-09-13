import { useState } from 'react';
import { Calendar, LayoutGrid, Search, SlidersHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@shared/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  user,
  onSignOut,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
  user: User | null;
  onSignOut: () => void;
}) {
  // No design mockup exists for this — Slice 2 added it. A second click on
  // the avatar (or picking "Sign out") is the only way to dismiss it; there
  // is no outside-click handler, which keeps this simple for a first pass.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      aria-label="Main"
      className="flex w-14 shrink-0 flex-col items-center justify-between py-1"
    >
      <div className="flex flex-col items-center gap-2">
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
      </div>

      {user ? (
        <div className="relative">
          {menuOpen ? (
            <div className="absolute bottom-12 left-0 z-10 w-48 rounded-tile bg-surface-card p-3 shadow-floating">
              <p className="truncate font-sans text-label font-medium text-text-strong">
                {user.name}
              </p>
              <p className="truncate font-sans text-micro text-text-faint">@{user.login}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </Button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={`Signed in as ${user.login}`}
            aria-expanded={menuOpen}
            className="rounded-pill transition-transform active:scale-[0.97]"
          >
            <Avatar name={user.name} size="sm" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
