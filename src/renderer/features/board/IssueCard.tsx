import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import type { Issue, IssueType, Priority } from '@shared/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ProgressTrack } from '@/components/ui/progress-track';
import { cn } from '@/lib/cn';

// The preview must stay inline (it sits inside a line-clamp-3 block and,
// higher up, a <button>): block elements collapse to fragments, links lose
// their href so no <a> ends up nested inside the card's interactive <button>,
// and a pasted screenshot is dropped entirely — the full image only shows
// once the card is expanded into the issue detail dialog.
const CARD_PREVIEW_COMPONENTS: Components = {
  img: () => null,
  hr: () => null,
  a: ({ children }) => <span className="underline">{children}</span>,
  p: ({ children }) => <>{children} </>,
  li: ({ children }) => <>• {children} </>,
  ul: ({ children }) => <>{children}</>,
  ol: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <>{children}</>,
  pre: ({ children }) => <>{children}</>,
  code: ({ children }) => (
    <code className="rounded bg-[currentColor]/10 px-1 font-mono text-[0.92em]">{children}</code>
  ),
  h1: 'strong',
  h2: 'strong',
  h3: 'strong',
  h4: 'strong',
  h5: 'strong',
  h6: 'strong',
};

export const TYPE_DOT: Record<IssueType, string> = {
  bug: 'bg-status-hot',
  feature: 'bg-status-info',
  task: 'bg-neutral-400',
  none: 'bg-neutral-400',
};

export const TYPE_LABEL: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
  none: 'No type',
};

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  p1: 'hot',
  p2: 'warm',
  p3: 'neutral',
};

const PRIORITY_LABEL: Record<Priority, string> = { p1: 'P1', p2: 'P2', p3: 'P3' };

// The design writes dates long and human: "Due 28 March".
function formatDue(dueDate: string): string {
  const parsed = new Date(dueDate);
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
  const metaParts = [
    issue.milestone ? `Milestone ${issue.milestone}` : null,
    issue.dueDate ? formatDue(issue.dueDate) : null,
  ].filter((part): part is string => part !== null);

  return (
    <article className="relative">
      {/* The notch tab, riding above the card's squared top-left corner. */}
      <span
        className={cn(
          'absolute -top-[13px] left-0 z-10 inline-flex h-[15px] items-center rounded-t-[7px] px-3.5',
          'select-text font-mono text-[9px] font-bold tracking-[0.07em]',
          active ? 'bg-surface-accent text-ink-900' : 'bg-surface-card text-text-muted',
        )}
      >
        #{issue.number}
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
          <Avatar
            name={issue.assignee?.name ?? 'Unassigned'}
            src={issue.assignee?.avatarUrl}
            size="xs"
          />
          <span
            className={cn('font-sans text-micro', active ? 'text-ink-900/72' : 'text-text-muted')}
          >
            {issue.assignee?.login ?? 'unassigned'}
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
            'mb-1.5 mt-3 select-text font-display text-title-s font-semibold tracking-[-0.02em] text-pretty',
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
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={CARD_PREVIEW_COMPONENTS}
          >
            {issue.body}
          </Markdown>
        </p>

        {issue.labels.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {issue.labels.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-3.5 flex items-center gap-2.5">
          {metaParts.length > 0 ? (
            <span
              className={cn('font-sans text-micro', active ? 'text-ink-900/72' : 'text-text-muted')}
            >
              {metaParts.join(' · ')}
            </span>
          ) : null}
          {total > 0 ? (
            <span className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  'font-sans text-micro',
                  active ? 'text-ink-900/60' : 'text-text-faint',
                )}
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
          ) : null}
        </div>
      </button>
    </article>
  );
}
