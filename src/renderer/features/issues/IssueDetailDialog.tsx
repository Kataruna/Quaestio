import { useState } from 'react';
import { ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import type { Issue, Subtask } from '@shared/types';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressTrack } from '@/components/ui/progress-track';
import { TYPE_LABEL } from '@/features/board/IssueCard';
import { cn } from '@/lib/cn';

const TYPE_CHIP: Record<Issue['type'], string> = {
  bug: 'bg-status-hot-bg text-status-hot',
  feature: 'bg-status-info-bg text-status-info',
  chore: 'bg-surface-sunken text-text-muted',
};

const PRIORITY_COLOR: Record<Issue['priority'], string> = {
  p1: 'text-status-hot',
  p2: 'text-status-warm',
  p3: 'text-text-strong',
};

function formatLongDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return `${parsed.getUTCDate()} ${parsed.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })}`;
}

export function IssueDetailDialog({
  issue,
  onClose,
}: {
  issue: Issue | null;
  onClose: () => void;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(issue?.subtasks ?? []);
  // Tracks the previous `issue` value so we can re-seed `subtasks` during
  // render (the React-endorsed alternative to a setState-in-effect, which
  // eslint-plugin-react-hooks flags as a cascading-render risk) exactly when
  // a new issue prop comes in.
  const [prevIssue, setPrevIssue] = useState(issue);

  if (issue !== prevIssue) {
    setPrevIssue(issue);
    setSubtasks(issue?.subtasks ?? []);
  }

  if (!issue)
    return (
      <Dialog open={false} onClose={onClose}>
        {null}
      </Dialog>
    );

  const done = subtasks.filter((task) => task.done).length;
  const percent = subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100);

  function toggleSubtask(id: string) {
    setSubtasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  return (
    <Dialog open onClose={onClose} className="w-[620px] p-6">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-pill px-3 py-1.5',
            'font-sans text-[9px] font-bold uppercase tracking-[0.07em]',
            TYPE_CHIP[issue.type],
          )}
        >
          {TYPE_LABEL[issue.type]}
        </span>
        <span className="select-text font-mono text-[11px] font-medium text-text-faint">
          {issue.repoFullName} #{issue.number}
        </span>
        <span className="ml-auto flex gap-2">
          <IconButton
            icon={ExternalLink}
            label="Open on GitHub"
            size="sm"
            onClick={() => window.open(issue.htmlUrl, '_blank')}
          />
          <IconButton icon={MoreHorizontal} label="More actions" size="sm" />
        </span>
      </div>

      <h2 className="mb-2.5 mt-3.5 select-text font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-strong text-pretty">
        {issue.title}
      </h2>

      <div className="mb-[18px] select-text font-sans text-body text-text-body text-pretty">
        {/* rehypeRaw must run before rehypeSanitize: raw parses embedded HTML
            (e.g. the <img> tags GitHub inserts for pasted screenshots) into
            the tree, then sanitize strips anything unsafe from it. Using raw
            alone would be unsafe; sanitize alone leaves embedded HTML as
            inert text, which is the bug this fixes. */}
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
          {issue.body}
        </Markdown>
      </div>

      <dl className="mb-[18px] grid grid-cols-4 gap-3 rounded-[18px] bg-surface-sunken px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-micro text-text-faint">Owner</dt>
          <dd className="m-0 font-sans text-label font-medium text-text-strong">
            {issue.assignee?.login ?? 'Unassigned'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-micro text-text-faint">Priority</dt>
          <dd
            className={cn('m-0 font-sans text-label font-medium', PRIORITY_COLOR[issue.priority])}
          >
            {issue.priority.toUpperCase()}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-micro text-text-faint">Milestone</dt>
          <dd className="m-0 font-sans text-label font-medium text-text-strong">
            {issue.milestone ?? '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-micro text-text-faint">Due</dt>
          <dd className="m-0 font-sans text-label font-medium text-text-strong">
            {formatLongDate(issue.dueDate)}
          </dd>
        </div>
      </dl>

      <div className="mb-3 flex items-center gap-2.5">
        <h3 className="font-display text-title-s font-semibold text-text-strong">Subtasks</h3>
        <span className="font-sans text-micro text-text-faint">
          {done} of {subtasks.length} · local, not pushed to GitHub
        </span>
        <ProgressTrack value={percent} height={6} className="ml-auto w-[90px]" />
      </div>

      <div className="mb-4 flex flex-col gap-2.5">
        {subtasks.map((task) => (
          <Checkbox
            key={task.id}
            checked={task.done}
            label={task.title}
            onCheckedChange={() => toggleSubtask(task.id)}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconLeft={Plus}>
          Subtask
        </Button>
        <span className="ml-auto font-sans text-micro text-text-faint">
          Opened {formatLongDate(issue.createdAt)} by {issue.assignee?.login ?? 'unknown'}
        </span>
      </div>
    </Dialog>
  );
}
