import { describe, expect, it } from 'vitest';
import { priorityFromLabels, labelsForPriority } from '@shared/label-mapping';

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

  it('reads the priority:high form with no space', () => {
    expect(priorityFromLabels(['priority:high'])).toBe('p1');
  });

  it('reads the critical synonym for p1', () => {
    expect(priorityFromLabels(['critical'])).toBe('p1');
  });

  it('reads the priority: medium form', () => {
    expect(priorityFromLabels(['priority: medium'])).toBe('p2');
  });

  it('reads the priority:medium form with no space', () => {
    expect(priorityFromLabels(['priority:medium'])).toBe('p2');
  });
});

describe('labelsForPriority', () => {
  it('adds the canonical p1 label', () => {
    expect(labelsForPriority('p1', ['bug'])).toEqual(['bug', 'p1']);
  });

  it('swaps an existing priority label for the new one', () => {
    expect(labelsForPriority('p2', ['bug', 'p1'])).toEqual(['bug', 'p2']);
  });

  it('strips the priority label entirely for p3, the implicit default', () => {
    expect(labelsForPriority('p3', ['bug', 'p1'])).toEqual(['bug']);
  });

  it('strips a non-canonical priority-convention label too', () => {
    expect(labelsForPriority('p2', ['priority: high'])).toEqual(['p2']);
  });

  it('is a no-op when already at that priority with no label (p3)', () => {
    expect(labelsForPriority('p3', ['bug'])).toEqual(['bug']);
  });

  it('round-trips through priorityFromLabels', () => {
    const labels = labelsForPriority('p1', ['bug']);
    expect(priorityFromLabels(labels)).toBe('p1');
  });
});
