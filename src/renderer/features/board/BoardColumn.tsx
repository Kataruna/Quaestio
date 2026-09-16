import type { Issue } from '@shared/types';
import { IssueCard } from './IssueCard';
import { cn } from '@/lib/cn';

export function BoardColumn({
  heading,
  dotClassName,
  issues,
  activeIssueNumber,
  onOpenIssue,
}: {
  heading: string;
  dotClassName: string;
  issues: Issue[];
  activeIssueNumber: number | null;
  onOpenIssue: (issue: Issue) => void;
}) {
  return (
    // `gap-[9px]` here + `pt-[13px]` on the scroll wrapper below = 22px total
    // between header and card, matching the original single-gap spacing —
    // the 13px just moved from the section gap into the scroll container's
    // own padding, where the notch tab needs it to avoid being clipped.
    <section className="flex h-full min-h-0 flex-col gap-[9px]">
      {/* Frozen: each column's own header never scrolls with its cards. */}
      <header className="flex shrink-0 items-center gap-2">
        <span className={cn('h-2 w-2 rounded-pill', dotClassName)} />
        <h2 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
          {heading}
        </h2>
        <span className="border-b-[1.5px] border-lime-400 pb-0.5 font-sans text-label font-medium text-text-strong">
          {issues.length}
        </span>
      </header>

      {/* `min-h-0` is required for a flex child to actually shrink and
          scroll instead of growing to fit its content. `pt-[13px]` gives
          the first card's notch tab (`IssueCard`'s `-top-[13px]`) room to
          render — without it, this container's own overflow clips the notch
          right at its top edge, a boundary that didn't exist before each
          column scrolled independently. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto pt-[13px]">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            active={issue.number === activeIssueNumber}
            onOpen={onOpenIssue}
          />
        ))}

        {issues.length === 0 ? (
          <div className="rounded-[22px] bg-surface-sunken p-[18px] text-center font-sans text-micro text-text-faint">
            Nothing here
          </div>
        ) : null}
      </div>
    </section>
  );
}
