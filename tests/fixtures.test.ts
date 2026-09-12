import { describe, expect, it } from 'vitest';
import { issues, repos } from '../src/renderer/lib/fixtures';
import { issueTypeFromLabels, priorityFromLabels } from '@shared/label-mapping';

describe('issue fixtures', () => {
  it('gives every issue a unique number', () => {
    const numbers = issues.map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('agrees with the label mapping wherever labels imply a type', () => {
    for (const item of issues) {
      if (item.labels.length === 0) continue;
      expect(issueTypeFromLabels(item.labels)).toBe(item.type);
    }
  });

  it('agrees with the label mapping wherever a priority label is present', () => {
    // Rows with no p1/p2 label carry no priority signal, so asserting on them
    // would only be testing the p3 default — and would break the moment a
    // fixture sets a priority from somewhere other than a label.
    const withPriorityLabel = issues.filter((item) =>
      item.labels.some((label) => /^p[12]$/i.test(label)),
    );
    expect(withPriorityLabel.length).toBeGreaterThan(0);
    for (const item of withPriorityLabel) {
      expect(priorityFromLabels(item.labels)).toBe(item.priority);
    }
  });

  it('covers all three issue types so the board has three populated columns', () => {
    expect(new Set(issues.map((i) => i.type))).toEqual(new Set(['bug', 'feature', 'chore']));
  });
});

describe('repo fixtures', () => {
  it('has four tracked repos, matching the design mockup', () => {
    expect(repos.filter((r) => r.tracked)).toHaveLength(4);
  });

  it('builds fullName from owner and name', () => {
    for (const repo of repos) {
      expect(repo.fullName).toBe(`${repo.owner}/${repo.name}`);
    }
  });
});
