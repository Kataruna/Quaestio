import { describe, expect, it } from 'vitest';
import { priorityFromLabels } from '@shared/label-mapping';

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
