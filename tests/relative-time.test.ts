import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../src/renderer/lib/relative-time';

const BASE = new Date('2026-01-01T12:00:00Z').getTime();
function ago(ms: number): string {
  return new Date(BASE - ms).toISOString();
}

describe('formatRelativeTime', () => {
  it('reads "just now" under 45 seconds', () => {
    expect(formatRelativeTime(ago(0), BASE)).toBe('just now');
    expect(formatRelativeTime(ago(44_000), BASE)).toBe('just now');
  });

  it('reads in minutes between 45s and an hour', () => {
    expect(formatRelativeTime(ago(60_000), BASE)).toBe('1 min ago');
    expect(formatRelativeTime(ago(14 * 60_000), BASE)).toBe('14 min ago');
  });

  it('reads in hours between an hour and a day', () => {
    expect(formatRelativeTime(ago(60 * 60_000), BASE)).toBe('1 hr ago');
    expect(formatRelativeTime(ago(5 * 60 * 60_000), BASE)).toBe('5 hr ago');
  });

  it('reads in days beyond 24 hours, singular for exactly one', () => {
    expect(formatRelativeTime(ago(24 * 60 * 60_000), BASE)).toBe('1 day ago');
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60_000), BASE)).toBe('3 days ago');
  });

  it('clamps a future timestamp (clock skew) to "just now" instead of going negative', () => {
    expect(formatRelativeTime(ago(-5000), BASE)).toBe('just now');
  });
});
