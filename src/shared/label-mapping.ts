import type { Priority } from './types';

const P1_LABELS = new Set(['p1', 'priority: high', 'priority:high', 'critical']);
const P2_LABELS = new Set(['p2', 'priority: medium', 'priority:medium']);

function normalise(labels: readonly string[]): string[] {
  return labels.map((label) => label.trim().toLowerCase());
}

/** GitHub has no priority field; it is carried by convention in labels. */
export function priorityFromLabels(labels: readonly string[]): Priority {
  const normalised = normalise(labels);
  if (normalised.some((label) => P1_LABELS.has(label))) return 'p1';
  if (normalised.some((label) => P2_LABELS.has(label))) return 'p2';
  return 'p3';
}
