import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ExternalLink, Pencil, Plus, RotateCcw } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import type { Issue, Subtask } from '@shared/types';
import type { IssuePatch } from '@shared/ipc-contract';
import { priorityFromLabels, labelsForPriority } from '@shared/label-mapping';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressTrack } from '@/components/ui/progress-track';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Tag } from '@/components/ui/tag';
import { Avatar } from '@/components/ui/avatar';
import { showToast } from '@/components/ui/toast';
import { TYPE_LABEL } from '@/features/board/IssueCard';
import { useGitHubImageSrc } from '@/lib/use-github-image';
import { cn } from '@/lib/cn';

/** A pasted-screenshot in the issue body. GitHub's attachment URLs need an
 * authenticated fetch (see `useGitHubImageSrc`) — a plain <img src> pointed
 * at them directly gets blocked by CORB. Renders nothing until resolved. */
function BodyImage({ src, alt }: { src: string; alt?: string }) {
  const resolvedSrc = useGitHubImageSrc(src);
  if (!resolvedSrc) return null;
  return <img src={resolvedSrc} alt={alt ?? ''} className="my-3 h-auto max-w-full rounded-lg" />;
}

// Tailwind's preflight zeroes every element's margin, so without this the
// body's paragraphs, lists, and image butt up against each other with no
// gap. `last:mb-0` keeps that spacing from adding a trailing gap before the
// metadata grid below.
const BODY_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-line-strong pl-3 text-text-muted last:mb-0">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-surface-sunken p-3 last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  h5: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  h6: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-title-s font-semibold text-text-strong">
      {children}
    </h3>
  ),
  img: ({ src, alt }) => (typeof src === 'string' ? <BodyImage src={src} alt={alt} /> : null),
};

const TYPE_CHIP: Record<Issue['type'], string> = {
  bug: 'bg-status-hot-bg text-status-hot',
  feature: 'bg-status-info-bg text-status-info',
  task: 'bg-surface-sunken text-text-muted',
};

// Matches Badge's `hot`/`warm`/`neutral` tones — the same colors the
// priority badge already uses on cards and in search, so the select in this
// dialog reads as the same control instead of a third, unstyled variant.
const PRIORITY_CHIP: Record<Issue['priority'], string> = {
  p1: 'bg-status-hot-bg text-status-hot',
  p2: 'bg-status-warm-bg text-status-warm',
  p3: 'bg-surface-sunken text-text-muted',
};

function formatLongDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return `${parsed.getUTCDate()} ${parsed.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })}`;
}

/** The pre-write conflict check found the issue changed on GitHub since
 * editing started (CLAUDE.md) — the write was never attempted. */
class ConflictError extends Error {
  constructor(public latest: Issue) {
    super('This issue changed on GitHub since you started editing.');
  }
}

/** The pre-write conflict check found the issue is gone (404/410/301). */
class DeletedError extends Error {
  constructor() {
    super('This issue was deleted on GitHub.');
  }
}

export function IssueDetailDialog({
  issue,
  online,
  onClose,
}: {
  issue: Issue | null;
  /** CLAUDE.md: "Writes are disabled while offline (MVP)." */
  online: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [subtasks, setSubtasks] = useState<Subtask[]>(issue?.subtasks ?? []);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [editBaseUpdatedAt, setEditBaseUpdatedAt] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  // The patch travels with the conflict so "Overwrite" can retry the exact
  // write that was blocked — not just a title/body edit, any of them (a
  // label add, an assignee change, a close/reopen).
  const [conflict, setConflict] = useState<{ latest: Issue; patch: IssuePatch } | null>(null);

  // Re-seeds every local editable draft when the dialog switches to a
  // different issue (or closes). Keyed on the issue *number*, not object
  // identity — react-query hands back a new `Issue` object on every
  // optimistic write and every background refetch of the same issue, and
  // keying on identity would wipe out in-progress edits and subtask state
  // out from under the user on each one. This is the render-time re-seed
  // pattern from Slice 1 (the endorsed alternative to a setState-in-effect,
  // which eslint-plugin-react-hooks flags as a cascading-render risk).
  const [prevIssueNumber, setPrevIssueNumber] = useState(issue?.number ?? null);
  if ((issue?.number ?? null) !== prevIssueNumber) {
    setPrevIssueNumber(issue?.number ?? null);
    setSubtasks(issue?.subtasks ?? []);
    setEditing(false);
    setTitleDraft(issue?.title ?? '');
    setBodyDraft(issue?.body ?? '');
    setEditBaseUpdatedAt(null);
    setLabelDraft('');
    setAssigneeDraft(issue?.assignee?.login ?? '');
    setCommentDraft('');
    setConflict(null);
  }

  // CLAUDE.md: "fetch [comments] when an issue is opened and cache them.
  // Do not background-sync every comment."
  const commentsQuery = useQuery({
    queryKey: ['comments', issue?.repoFullName ?? '', issue?.number ?? 0],
    queryFn: () =>
      window.api.issues.getComments({
        repoFullName: issue?.repoFullName ?? '',
        number: issue?.number ?? 0,
      }),
    enabled: issue !== null,
  });
  const comments = commentsQuery.data?.kind === 'ok' ? commentsQuery.data.comments : [];

  // Typeahead suggestions for the labels and assignee inputs — best-effort
  // (both IPC calls degrade to [] on any failure, so free typing always
  // still works even if these never resolve).
  const repoLabelsQuery = useQuery({
    queryKey: ['repo-labels', issue?.repoFullName ?? ''],
    queryFn: () => window.api.repos.listLabels({ repoFullName: issue?.repoFullName ?? '' }),
    enabled: issue !== null,
  });
  const collaboratorsQuery = useQuery({
    queryKey: ['repo-collaborators', issue?.repoFullName ?? ''],
    queryFn: () => window.api.repos.listCollaborators({ repoFullName: issue?.repoFullName ?? '' }),
    enabled: issue !== null,
  });

  // A 404/410/301 fetching comments means the issue itself is gone — close
  // the dialog rather than show a comment thread for nothing.
  useEffect(() => {
    if (commentsQuery.data?.kind === 'deleted') {
      showToast('This issue was deleted on GitHub.', 'error');
      onClose();
    }
  }, [commentsQuery.data, onClose]);

  const updateMutation = useMutation({
    mutationFn: async (vars: { patch: IssuePatch; expectedUpdatedAt: string }) => {
      if (!issue) throw new Error('No issue open');
      const result = await window.api.issues.update({
        repoFullName: issue.repoFullName,
        number: issue.number,
        expectedUpdatedAt: vars.expectedUpdatedAt,
        patch: vars.patch,
      });
      if (result.kind === 'conflict') throw new ConflictError(result.latest);
      if (result.kind === 'deleted') throw new DeletedError();
      return result.issue;
    },
    onMutate: async (vars) => {
      if (!issue) return { previous: undefined };
      const key = ['issues', issue.repoFullName];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Issue[]>(key);
      const optimistic = patchToOptimisticIssue(vars.patch);
      queryClient.setQueryData<Issue[]>(key, (old) =>
        old?.map((i) => (i.number === issue.number ? { ...i, ...optimistic } : i)) ?? old,
      );
      return { previous };
    },
    onError: (error, vars, context) => {
      if (!issue) return;
      const key = ['issues', issue.repoFullName];
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (error instanceof ConflictError) {
        setConflict({ latest: error.latest, patch: vars.patch });
      } else if (error instanceof DeletedError) {
        queryClient.setQueryData<Issue[]>(key, (old) => old?.filter((i) => i.number !== issue.number) ?? old);
        showToast('This issue was deleted on GitHub.', 'error');
        onClose();
      } else {
        // A generic failure rolls the cache back to its pre-optimistic
        // value — the assignee input is independent local state, so it
        // needs the same reset or it keeps showing the rejected login.
        setAssigneeDraft(issue.assignee?.login ?? '');
        showToast(`Failed to save: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
      }
    },
    onSuccess: (updated) => {
      if (!issue) return;
      queryClient.setQueryData<Issue[]>(['issues', issue.repoFullName], (old) =>
        old?.map((i) => (i.number === updated.number ? updated : i)) ?? old,
      );
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!issue) throw new Error('No issue open');
      return window.api.issues.addComment({ repoFullName: issue.repoFullName, number: issue.number, body });
    },
    onSuccess: (comment) => {
      if (!issue) return;
      queryClient.setQueryData<Awaited<ReturnType<typeof window.api.issues.getComments>>>(
        ['comments', issue.repoFullName, issue.number],
        (old) => (old?.kind === 'ok' ? { kind: 'ok', comments: [...old.comments, comment] } : old),
      );
      setCommentDraft('');
    },
    onError: (error) => {
      showToast(`Failed to add comment: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });

  // Local-only field (like subtasks) — no GitHub call, so no conflict check
  // and no optimistic-rollback dance needed, just write-then-adopt-result.
  const dueDateMutation = useMutation({
    mutationFn: async (dueDate: string | null) => {
      if (!issue) throw new Error('No issue open');
      return window.api.issues.setDueDate({ repoFullName: issue.repoFullName, number: issue.number, dueDate });
    },
    onSuccess: (updated) => {
      if (!issue || !updated) return;
      queryClient.setQueryData<Issue[]>(['issues', issue.repoFullName], (old) =>
        old?.map((i) => (i.number === updated.number ? updated : i)) ?? old,
      );
    },
    onError: (error) => {
      showToast(`Failed to save due date: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });

  if (!issue)
    return (
      <Dialog open={false} onClose={onClose}>
        {null}
      </Dialog>
    );

  // Nested function declarations don't inherit the null-narrowing above —
  // TypeScript can't assume a closure will only ever run while this
  // particular narrowing still holds — so this is the non-null alias every
  // handler below closes over instead of the raw `issue` param.
  const currentIssue = issue;
  const done = subtasks.filter((task) => task.done).length;
  const percent = subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100);
  const disabled = !online || updateMutation.isPending;

  function toggleSubtask(id: string) {
    setSubtasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function beginEdit() {
    setEditing(true);
    setTitleDraft(currentIssue.title);
    setBodyDraft(currentIssue.body);
    setEditBaseUpdatedAt(currentIssue.updatedAt);
  }

  function saveEdit() {
    updateMutation.mutate(
      {
        patch: { title: titleDraft, body: bodyDraft },
        expectedUpdatedAt: editBaseUpdatedAt ?? currentIssue.updatedAt,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  function setState(state: 'open' | 'closed', stateReason: 'completed' | 'not_planned' | 'reopened') {
    updateMutation.mutate({ patch: { state, stateReason }, expectedUpdatedAt: currentIssue.updatedAt });
  }

  function changeType(type: Issue['type']) {
    if (type === currentIssue.type) return;
    updateMutation.mutate({ patch: { type }, expectedUpdatedAt: currentIssue.updatedAt });
  }

  /** Priority has no GitHub field of its own (label-mapping.ts) — changing
   * it is really a labels edit, so it goes through the same patch/optimistic
   * path as every other labels change. */
  function changePriority(priority: Issue['priority']) {
    if (priority === currentIssue.priority) return;
    updateMutation.mutate({
      patch: { labels: labelsForPriority(priority, currentIssue.labels) },
      expectedUpdatedAt: currentIssue.updatedAt,
    });
  }

  /** Takes an optional override so picking a suggestion from the Combobox
   * can commit immediately, without waiting for `labelDraft` state to catch up. */
  function addLabel(overrideLabel?: string) {
    const label = (overrideLabel ?? labelDraft).trim();
    if (!label || currentIssue.labels.includes(label)) {
      setLabelDraft('');
      return;
    }
    updateMutation.mutate({
      patch: { labels: [...currentIssue.labels, label] },
      expectedUpdatedAt: currentIssue.updatedAt,
    });
    setLabelDraft('');
  }

  function removeLabel(label: string) {
    updateMutation.mutate({
      patch: { labels: currentIssue.labels.filter((l) => l !== label) },
      expectedUpdatedAt: currentIssue.updatedAt,
    });
  }

  /** Same override pattern as `addLabel`, for picking a suggested collaborator. */
  function saveAssignee(overrideLogin?: string) {
    const login = (overrideLogin ?? assigneeDraft).trim();
    if (login === (currentIssue.assignee?.login ?? '')) return;
    updateMutation.mutate({
      patch: { assigneeLogin: login || null },
      expectedUpdatedAt: currentIssue.updatedAt,
    });
  }

  function submitComment() {
    const body = commentDraft.trim();
    if (!body) return;
    addCommentMutation.mutate(body);
  }

  /** "Overwrite": retry the exact patch that was blocked, against what's now
   * on GitHub — `latest.updatedAt` as the new baseline trivially passes the
   * conflict check since nothing else has changed since that fetch. */
  function overwriteConflict() {
    if (!conflict) return;
    const { latest, patch } = conflict;
    setConflict(null);
    updateMutation.mutate(
      { patch, expectedUpdatedAt: latest.updatedAt },
      { onSuccess: () => setEditing(false) },
    );
  }

  /** "Reload": discard local edits and adopt what's actually on GitHub. */
  function reloadConflict() {
    if (!conflict) return;
    const { latest } = conflict;
    queryClient.setQueryData<Issue[]>(['issues', currentIssue.repoFullName], (old) =>
      old?.map((i) => (i.number === latest.number ? latest : i)) ?? old,
    );
    setEditing(false);
    setTitleDraft(latest.title);
    setBodyDraft(latest.body);
    setAssigneeDraft(latest.assignee?.login ?? '');
    setConflict(null);
  }

  return (
    <Dialog open onClose={onClose} className="max-h-[85vh] w-[620px] p-0">
      {/* Frozen header: never scrolls. Only the content below it does. */}
      <div className="flex items-center gap-2.5 px-6 pb-0 pt-6">
        <span className="relative inline-flex">
          <select
            value={issue.type}
            onChange={(e) => changeType(e.target.value as Issue['type'])}
            disabled={disabled}
            aria-label="Issue type"
            className={cn(
              'appearance-none rounded-pill border-0 py-1.5 pl-3 pr-6',
              'font-sans text-[9px] font-bold uppercase tracking-[0.07em]',
              'cursor-pointer disabled:pointer-events-none disabled:opacity-60',
              TYPE_CHIP[issue.type],
            )}
          >
            {(Object.keys(TYPE_LABEL) as Issue['type'][]).map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            strokeWidth={2}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70"
          />
        </span>
        <span className="select-text font-mono text-[11px] font-medium text-text-faint">
          {issue.repoFullName} #{issue.number}
        </span>
        {issue.state === 'closed' ? (
          <span className="rounded-pill bg-surface-sunken px-2.5 py-1 font-sans text-micro font-medium text-text-muted">
            Closed
          </span>
        ) : null}
        <span className="ml-auto flex gap-2">
          {!editing ? (
            <IconButton icon={Pencil} label="Edit title and body" size="sm" onClick={beginEdit} disabled={disabled} />
          ) : null}
          {issue.state === 'open' ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setState('closed', 'completed')} disabled={disabled}>
                Close
              </Button>
              <button
                type="button"
                onClick={() => setState('closed', 'not_planned')}
                disabled={disabled}
                className="font-sans text-micro text-text-faint underline decoration-dotted disabled:pointer-events-none disabled:opacity-40"
              >
                Not planned
              </button>
            </>
          ) : (
            <Button variant="secondary" size="sm" iconLeft={RotateCcw} onClick={() => setState('open', 'reopened')} disabled={disabled}>
              Reopen
            </Button>
          )}
          <IconButton
            icon={ExternalLink}
            label="Open on GitHub"
            size="sm"
            onClick={() => window.open(issue.htmlUrl, '_blank')}
          />
        </span>
      </div>

      {!online ? (
        <p className="mx-6 mt-3 rounded-[10px] bg-status-hot-bg px-3 py-2 font-sans text-micro font-medium text-status-hot">
          Writes are disabled while offline.
        </p>
      ) : null}

      {conflict ? (
        <div className="mx-6 mt-3 flex items-center gap-3 rounded-[10px] bg-status-warm-bg px-3 py-2.5">
          <p className="m-0 flex-1 font-sans text-micro font-medium text-status-warm">
            This issue changed on GitHub since you started editing.
          </p>
          <Button variant="ghost" size="sm" onClick={reloadConflict}>
            Reload
          </Button>
          <Button variant="secondary" size="sm" onClick={overwriteConflict}>
            Overwrite
          </Button>
        </div>
      ) : null}

      {editing ? (
        <div className="flex flex-col gap-2.5 px-6 pb-0 pt-3.5">
          <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} disabled={disabled} autoFocus />
          <Textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            rows={6}
            disabled={disabled}
          />
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={disabled}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <h2 className="mb-2.5 mt-3.5 select-text px-6 font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-strong text-pretty">
          {issue.title}
        </h2>
      )}

      {/* Everything below the title scrolls; `min-h-0` is required for a
          flex child to actually shrink and scroll instead of growing to fit
          its content. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {!editing ? (
          <div className="mb-[18px] select-text font-sans text-body text-text-body text-pretty">
            {/* rehypeRaw must run before rehypeSanitize: raw parses embedded HTML
                (e.g. the <img> tags GitHub inserts for pasted screenshots) into
                the tree, then sanitize strips anything unsafe from it. Using raw
                alone would be unsafe; sanitize alone leaves embedded HTML as
                inert text, which is the bug this fixes. */}
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={BODY_COMPONENTS}
            >
              {issue.body}
            </Markdown>
          </div>
        ) : null}

        <dl className="mb-[18px] grid grid-cols-4 gap-3 rounded-[18px] bg-surface-sunken px-4 py-3.5">
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-micro text-text-faint">Owner</dt>
            <dd className="m-0">
              <Combobox
                value={assigneeDraft}
                onChange={setAssigneeDraft}
                onSelect={(login) => saveAssignee(login)}
                options={collaboratorsQuery.data ?? []}
                onBlur={() => saveAssignee()}
                placeholder="Unassigned"
                disabled={disabled}
                className="h-7 px-2 text-micro"
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-sans text-micro text-text-faint">Priority</dt>
            <dd className="m-0">
              <span className="relative inline-flex">
                <select
                  value={issue.priority}
                  onChange={(e) => changePriority(e.target.value as Issue['priority'])}
                  disabled={disabled}
                  aria-label="Priority"
                  className={cn(
                    'h-7 cursor-pointer appearance-none rounded-pill border-0 py-1 pl-2.5 pr-6',
                    'font-sans text-label font-medium disabled:pointer-events-none disabled:opacity-60',
                    PRIORITY_CHIP[issue.priority],
                  )}
                >
                  {(['p1', 'p2', 'p3'] as const).map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  strokeWidth={2}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70"
                />
              </span>
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
            <dd className="m-0">
              <input
                type="date"
                value={issue.dueDate ?? ''}
                onChange={(e) => dueDateMutation.mutate(e.target.value || null)}
                disabled={disabled}
                aria-label="Due date"
                className={cn(
                  'h-7 w-full rounded-md border-0 bg-transparent p-0',
                  'font-sans text-label font-medium text-text-strong',
                  'disabled:pointer-events-none disabled:opacity-60',
                )}
              />
            </dd>
          </div>
        </dl>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {issue.labels.map((label) => (
            <Tag key={label} onRemove={disabled ? undefined : () => removeLabel(label)}>
              {label}
            </Tag>
          ))}
          <Combobox
            value={labelDraft}
            onChange={setLabelDraft}
            onSelect={(label) => addLabel(label)}
            options={(repoLabelsQuery.data ?? []).filter((label) => !currentIssue.labels.includes(label))}
            onKeyDown={(e) => e.key === 'Enter' && addLabel()}
            placeholder="Add label"
            disabled={disabled}
            className="h-[26px] w-28 px-2.5 text-micro"
          />
        </div>

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

        <div className="mb-5 flex items-center gap-2">
          <Button variant="secondary" size="sm" iconLeft={Plus}>
            Subtask
          </Button>
          <span className="ml-auto font-sans text-micro text-text-faint">
            Opened {formatLongDate(issue.createdAt)} by {issue.assignee?.login ?? 'unknown'}
          </span>
        </div>

        <div className="border-t border-line-hairline pt-4">
          <h3 className="mb-3 font-display text-title-s font-semibold text-text-strong">
            Comments{comments.length > 0 ? ` (${comments.length})` : ''}
          </h3>

          {commentsQuery.isPending ? (
            <p className="font-sans text-micro text-text-faint">Loading comments…</p>
          ) : (
            <div className="mb-4 flex flex-col gap-3.5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar name={comment.author?.name ?? 'Unknown'} src={comment.author?.avatarUrl} size="xs" />
                  <div className="min-w-0 flex-1 rounded-[14px] bg-surface-sunken px-3.5 py-3">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-sans text-micro font-semibold text-text-strong">
                        {comment.author?.login ?? 'unknown'}
                      </span>
                      <span className="font-sans text-nano text-text-faint">
                        {formatLongDate(comment.createdAt)}
                      </span>
                    </div>
                    <div className="select-text font-sans text-body-s text-text-body text-pretty">
                      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                        {comment.body}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Leave a comment"
              rows={3}
              disabled={disabled}
            />
            <Button
              size="sm"
              className="self-end"
              iconLeft={Check}
              onClick={submitComment}
              disabled={disabled || addCommentMutation.isPending || commentDraft.trim().length === 0}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** The card/dialog display fields a given patch would change, applied
 * eagerly to the query cache before the write round-trips. */
function patchToOptimisticIssue(patch: IssuePatch): Partial<Issue> {
  const out: Partial<Issue> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.body !== undefined) out.body = patch.body;
  if (patch.state !== undefined) out.state = patch.state;
  if (patch.labels !== undefined) {
    out.labels = patch.labels;
    // Priority is derived from labels (GitHub has no native priority field)
    // — without recomputing it here, the priority badge would show the
    // pre-edit value until the write round-trips and the server's mapped
    // issue overwrites the cache, instead of updating immediately like
    // every other optimistic field.
    out.priority = priorityFromLabels(patch.labels);
  }
  if (patch.assigneeLogin !== undefined) {
    out.assignee = patch.assigneeLogin ? { login: patch.assigneeLogin, name: patch.assigneeLogin, avatarUrl: null } : null;
  }
  if (patch.type !== undefined) out.type = patch.type;
  return out;
}
