import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/fixtures';

export function EmptyState({ onTrack }: { onTrack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-10 text-center">
      <div aria-hidden className="relative mb-2 h-[84px] w-[120px]">
        <span className="absolute left-0 top-0 h-3 w-[46px] rounded-t-[6px] bg-neutral-200" />
        <span className="absolute left-0 top-[11px] h-[73px] w-[120px] rounded-[3px_18px_18px_18px] bg-neutral-200" />
      </div>
      <h2 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
        No repositories tracked
      </h2>
      <p className="m-0 max-w-[320px] font-sans text-body text-text-muted">
        Pick the repos you want on the board. Issue Desk pulls their open issues and leaves the rest
        alone.
      </p>
      <span className="mt-1.5">
        <Button variant="primary" iconLeft={Plus} onClick={onTrack}>
          Track a repository
        </Button>
      </span>
      <span className="font-sans text-micro text-text-faint">
        Signed in as {currentUser.login}
      </span>
    </div>
  );
}
