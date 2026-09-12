import type { Issue, IssueType } from '@shared/types';
import { IssueCard, TYPE_DOT, TYPE_LABEL } from './IssueCard';
import { cn } from '@/lib/cn';

export function BoardColumn({
  type,
  issues,
  activeIssueNumber,
  onOpenIssue,
}: {
  type: IssueType;
  issues: Issue[];
  activeIssueNumber: number | null;
  onOpenIssue: (issue: Issue) => void;
}) {
  return (
    <section className="flex flex-col gap-[22px]">
      <header className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-pill', TYPE_DOT[type])} />
        <h2 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
          {TYPE_LABEL[type]}
        </h2>
        <span className="border-b-[1.5px] border-lime-400 pb-0.5 font-sans text-label font-medium text-text-strong">
          {issues.length}
        </span>
      </header>

      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          active={issue.number === activeIssueNumber}
          onOpen={onOpenIssue}
        />
      ))}

      {issues.length === 0 ? (
        <div className="rounded-[22px] bg-ink-900/[0.035] p-[18px] text-center font-sans text-micro text-text-faint">
          Nothing here
        </div>
      ) : null}
    </section>
  );
}
