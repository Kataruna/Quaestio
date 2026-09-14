import { describe, expect, it } from 'vitest';
import type { Issue } from '@shared/types';
import { sortIssues } from '../src/renderer/features/board/sort-issues';

function issue(partial: Partial<Issue> & Pick<Issue, 'number'>): Issue {
  return {
    id: partial.number,
    repoFullName: 'acme/web',
    title: `Issue ${partial.number}`,
    body: '',
    state: 'open',
    type: 'task',
    priority: 'p3',
    labels: [],
    assignee: null,
    milestone: null,
    dueDate: null,
    subtasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    htmlUrl: `https://github.com/acme/web/issues/${partial.number}`,
    ...partial,
  };
}

describe('sortIssues', () => {
  const issues = [
    issue({ number: 3, priority: 'p2', dueDate: '2026-03-01', updatedAt: '2026-01-01T00:00:00Z' }),
    issue({ number: 1, priority: 'p1', dueDate: null, updatedAt: '2026-03-01T00:00:00Z' }),
    issue({ number: 2, priority: 'p3', dueDate: '2026-02-01', updatedAt: '2026-02-01T00:00:00Z' }),
  ];

  it('does not mutate the input array', () => {
    const original = [...issues];
    sortIssues(issues, 'Issue number');
    expect(issues).toEqual(original);
  });

  it('sorts by priority, most urgent first', () => {
    expect(sortIssues(issues, 'Priority').map((i) => i.number)).toEqual([1, 3, 2]);
  });

  it('sorts by due date ascending, with no-due-date last', () => {
    expect(sortIssues(issues, 'Due date').map((i) => i.number)).toEqual([2, 3, 1]);
  });

  it('sorts by recently updated first', () => {
    expect(sortIssues(issues, 'Recently updated').map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it('sorts by issue number ascending', () => {
    expect(sortIssues(issues, 'Issue number').map((i) => i.number)).toEqual([1, 2, 3]);
  });
});
