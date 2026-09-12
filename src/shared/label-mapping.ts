import type { IssueType, Priority } from './types';

const BUG_LABELS = new Set(['bug', 'defect']);
const FEATURE_LABELS = new Set(['enhancement', 'feature']);

const P1_LABELS = new Set(['p1', 'priority: high', 'priority:high', 'critical']);
const P2_LABELS = new Set(['p2', 'priority: medium', 'priority:medium']);

function normalise(labels: readonly string[]): string[] {
  return labels.map((label) => label.trim().toLowerCase());
}

/**
 * The design's Settings screen states the rule:
 * bug -> Bug, enhancement -> Feature, everything else -> Chore.
 * Bug wins when an issue carries both, because a broken thing outranks a wanted one.
 */
export function issueTypeFromLabels(labels: readonly string[]): IssueType {
  const normalised = normalise(labels);
  if (normalised.some((label) => BUG_LABELS.has(label))) return 'bug';
  if (normalised.some((label) => FEATURE_LABELS.has(label))) return 'feature';
  return 'chore';
}

/** GitHub has no priority field; it is carried by convention in labels. */
export function priorityFromLabels(labels: readonly string[]): Priority {
  const normalised = normalise(labels);
  if (normalised.some((label) => P1_LABELS.has(label))) return 'p1';
  if (normalised.some((label) => P2_LABELS.has(label))) return 'p2';
  return 'p3';
}
