import { describe, expect, it } from 'vitest';
import { hasSyncConflict } from '@shared/sync-conflict';

describe('hasSyncConflict', () => {
  it('is false when the live updatedAt matches what editing started with', () => {
    expect(hasSyncConflict('2026-03-21T09:00:00Z', '2026-03-21T09:00:00Z')).toBe(false);
  });

  it('is true when GitHub has a newer updatedAt than editing started with', () => {
    expect(hasSyncConflict('2026-03-21T09:00:00Z', '2026-03-21T10:00:00Z')).toBe(true);
  });

  it('is true for any mismatch, not just a later one', () => {
    expect(hasSyncConflict('2026-03-21T10:00:00Z', '2026-03-21T09:00:00Z')).toBe(true);
  });
});
