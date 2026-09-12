import type { Issue, IssueType, Priority } from '@shared/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ProgressTrack } from '@/components/ui/progress-track';
import { cn } from '@/lib/cn';

export const TYPE_DOT: Record<IssueType, string> = {
  bug: 'bg-status-hot',
  feature: 'bg-status-info',
  chore: 'bg-neutral-400',
};

export const TYPE_LABEL: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  chore: 'Chore',
};

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  p1: 'hot',
  p2: 'warm',
  p3: 'neutral',
};

const PRIORITY_LABEL: Record<Priority, string> = { p1: 'P1', p2: 'P2', p3: 'P3' };

function formatDue(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  const parsed = new Date(dueDate);
  // The design writes dates long and human: "Due 28 March".
  return `Due ${parsed.getUTCDate()} ${parsed.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })}`;
}

export function IssueCard({
  issue,
  active = false,
  onOpen,
}: {
  issue: Issue;
  /** The one card marked as in progress. The design allows at most one lime card per view. */
  active?: boolean;
  onOpen: (issue: Issue) => void;
}) {
  const done = issue.subtasks.filter((task) => task.done).length;
  const total = issue.subtasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <article className="relative">
      {/* The notch tab, riding above the card's squared top-left corner. */}
      <span
        className={cn(
          'absolute -top-[13px] left-0 z-10 inline-flex h-[15px] items-center gap-1.5 rounded-t-[7px] px-3.5',
          'font-sans text-[9px] font-bold uppercase tracking-[0.07em]',
          active ? 'bg-surface-accent text-ink-900' : 'bg-surface-card text-text-muted',
        )}
      >
        <span
          className={cn('h-[5px] w-[5px] rounded-pill', active ? 'bg-ink-900' : TYPE_DOT[issue.type])}
        />
        {TYPE_LABEL[issue.type]}
      </span>

      <button
        type="button"
        onClick={() => onOpen(issue)}
        className={cn(
          'w-full rounded-[4px_22px_22px_22px] p-4 text-left shadow-card',
          'transition-[box-shadow,transform] duration-[220ms] ease-[var(--ease-out-soft)]',
          'hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.97]',
          active ? 'bg-surface-accent' : 'bg-surface-card',
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar name={issue.assignee?.name ?? 'Unassigned'} size="xs" />
          <span
            className={cn('font-sans text-micro', active ? 'text-ink-900/72' : 'text-text-muted')}
          >
            {issue.assignee?.login ?? 'unassigned'}
          </span>
          <span
            className={cn(
              'font-mono text-[11px] font-medium',
              active ? 'text-ink-900/50' : 'text-text-faint',
            )}
          >
            #{issue.number}
          </span>
          <span className="ml-auto">
            {active ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-ink-900 px-2.5 py-1 font-sans text-micro font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-pill bg-lime-400" />
                In progress
              </span>
            ) : (
              <Badge tone={PRIORITY_TONE[issue.priority]} dot={issue.priority !== 'p3'}>
                {PRIORITY_LABEL[issue.priority]}
              </Badge>
            )}
          </span>
        </div>

        <h3
          className={cn(
            'mb-1.5 mt-3 font-display text-title-s font-semibold tracking-[-0.02em] text-pretty',
            active ? 'text-ink-900' : 'text-text-strong',
          )}
        >
          {issue.title}
        </h3>

        <p
          className={cn(
            'm-0 line-clamp-3 font-sans text-body text-pretty',
            active ? 'text-ink-900/72' : 'text-text-muted',
          )}
        >
          {issue.body}
        </p>

        <div className="mt-3.5 flex items-center gap-2.5">
          <span
            className={cn('font-sans text-micro', active ? 'text-ink-900/72' : 'text-text-muted')}
          >
            {issue.milestone ? `Milestone ${issue.milestone} · ` : ''}
            {formatDue(issue.dueDate)}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span
              className={cn('font-sans text-micro', active ? 'text-ink-900/60' : 'text-text-faint')}
            >
              {done}/{total}
            </span>
            <ProgressTrack
              value={percent}
              height={5}
              tone={active ? 'ink' : 'lime'}
              className="w-[52px]"
            />
          </span>
        </div>
      </button>
    </article>
  );
}
