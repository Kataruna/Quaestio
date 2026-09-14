import { useMemo, useState } from 'react';
import type { Issue } from '@shared/types';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { SearchField } from '@/components/ui/search-field';
import { Tag } from '@/components/ui/tag';
import { TYPE_LABEL } from '@/features/board/IssueCard';
import { cn } from '@/lib/cn';

const TYPE_TEXT: Record<Issue['type'], string> = {
  bug: 'text-status-hot',
  feature: 'text-status-info',
  task: 'text-neutral-500',
};

const PRIORITY_TONE: Record<Issue['priority'], BadgeTone> = {
  p1: 'hot',
  p2: 'warm',
  p3: 'neutral',
};

/** Splits a title around the matched term so the match can be marked. */
function highlight(title: string, needle: string) {
  if (!needle) return [title];
  const index = title.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return [title];
  return [
    title.slice(0, index),
    <mark key="m" className="bg-lime-200 text-ink-900">
      {title.slice(index, index + needle.length)}
    </mark>,
    title.slice(index + needle.length),
  ];
}

export function SearchScreen({ results }: { results: Issue[] }) {
  const [query, setQuery] = useState('refresh');
  const [filters, setFilters] = useState(['repo: atlas-web', 'priority: P1']);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return results.filter(
      (issue) =>
        issue.title.toLowerCase().includes(needle) || issue.body.toLowerCase().includes(needle),
    );
  }, [query, results]);

  return (
    <div className="flex max-w-[620px] flex-col gap-3.5">
      <SearchField
        className="w-full"
        placeholder="Search all tracked repos"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <Tag
            key={filter}
            onRemove={() => setFilters((current) => current.filter((item) => item !== filter))}
          >
            {filter}
          </Tag>
        ))}
        <Tag>+ filter</Tag>
        <span className="ml-auto self-center font-sans text-micro text-text-faint">
          {matches.length} result{matches.length === 1 ? '' : 's'}
        </span>
      </div>

      {matches.length === 0 ? (
        <p className="py-12 text-center font-sans text-body text-text-muted">
          {query.trim() ? `Nothing matches “${query}”` : 'Type to search your tracked repos'}
        </p>
      ) : (
        <div className="mt-1 flex flex-col gap-3.5">
          {matches.map((issue) => (
            <article key={issue.id} className="relative">
              <span
                className={cn(
                  'absolute -top-2.5 left-0 z-10 inline-flex h-3 items-center rounded-t-[6px] bg-surface-card px-3',
                  'font-sans text-[8px] font-bold uppercase tracking-[0.07em]',
                  TYPE_TEXT[issue.type],
                )}
              >
                {TYPE_LABEL[issue.type]} · {issue.repoFullName.split('/')[1]}
              </span>
              <div className="rounded-[4px_18px_18px_18px] bg-surface-card px-4 py-3.5 shadow-card">
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-body font-semibold leading-[1.3] text-text-strong">
                    {highlight(issue.title, query.trim())}
                  </span>
                  <span className="ml-auto">
                    <Badge tone={PRIORITY_TONE[issue.priority]} dot={issue.priority !== 'p3'}>
                      {issue.priority.toUpperCase()}
                    </Badge>
                  </span>
                </div>
                <p className="mb-0 mt-1.5 font-sans text-body text-text-muted">
                  {issue.assignee?.login ?? 'unassigned'} · #{issue.number} ·{' '}
                  {issue.milestone ? `milestone ${issue.milestone}` : 'no due date'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
