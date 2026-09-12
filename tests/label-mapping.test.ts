import { describe, expect, it } from 'vitest';
import { issueTypeFromLabels, priorityFromLabels } from '@shared/label-mapping';

describe('issueTypeFromLabels', () => {
  it('maps the bug label to bug', () => {
    expect(issueTypeFromLabels(['bug'])).toBe('bug');
  });

  it('maps the enhancement label to feature', () => {
    expect(issueTypeFromLabels(['enhancement'])).toBe('feature');
  });

  it('maps anything else to chore', () => {
    expect(issueTypeFromLabels(['documentation'])).toBe('chore');
  });

  it('falls back to chore when there are no labels', () => {
    expect(issueTypeFromLabels([])).toBe('chore');
  });

  it('ignores label casing', () => {
    expect(issueTypeFromLabels(['Bug'])).toBe('bug');
  });

  it('prefers bug when an issue is labelled both bug and enhancement', () => {
    expect(issueTypeFromLabels(['enhancement', 'bug'])).toBe('bug');
  });
});

describe('priorityFromLabels', () => {
  it('reads an explicit p1 label', () => {
    expect(priorityFromLabels(['p1'])).toBe('p1');
  });

  it('reads the priority: high form', () => {
    expect(priorityFromLabels(['priority: high'])).toBe('p1');
  });

  it('reads p2', () => {
    expect(priorityFromLabels(['bug', 'p2'])).toBe('p2');
  });

  it('defaults to p3 when no priority label is present', () => {
    expect(priorityFromLabels(['bug'])).toBe('p3');
  });

  it('prefers the highest priority when several are present', () => {
    expect(priorityFromLabels(['p3', 'p1'])).toBe('p1');
  });
});
