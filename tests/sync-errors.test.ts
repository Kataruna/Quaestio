import { describe, expect, it } from 'vitest';
import { isNotModified, isNetworkError, rateLimitResetAt } from '../src/main/sync/errors';

describe('isNotModified', () => {
  it('is true for a 304 error', () => {
    expect(isNotModified({ status: 304 })).toBe(true);
  });

  it('is false for a 200-shaped non-error value', () => {
    expect(isNotModified({ status: 200 })).toBe(false);
  });

  it('is false for a plain network error with no status', () => {
    expect(isNotModified(new TypeError('fetch failed'))).toBe(false);
  });
});

describe('rateLimitResetAt', () => {
  it('reads a primary rate limit reset time from a 403 with x-ratelimit-reset', () => {
    const resetAt = rateLimitResetAt({
      status: 403,
      response: { headers: { 'x-ratelimit-reset': '1700000000' } },
    });
    expect(resetAt).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('reads a primary rate limit reset time from a 429', () => {
    const resetAt = rateLimitResetAt({
      status: 429,
      response: { headers: { 'x-ratelimit-reset': '1700000000' } },
    });
    expect(resetAt).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('derives a reset time from retry-after when x-ratelimit-reset is absent (secondary rate limit)', () => {
    const before = Date.now();
    const resetAt = rateLimitResetAt({ status: 403, response: { headers: { 'retry-after': '30' } } });
    expect(resetAt).not.toBeNull();
    const resetMs = new Date(resetAt as string).getTime();
    expect(resetMs).toBeGreaterThanOrEqual(before + 30_000);
    expect(resetMs).toBeLessThan(before + 31_000);
  });

  it('returns null for a plain 403 with neither header (a real permissions error)', () => {
    expect(rateLimitResetAt({ status: 403, response: { headers: {} } })).toBeNull();
  });

  it('returns null for unrelated status codes', () => {
    expect(rateLimitResetAt({ status: 404 })).toBeNull();
  });

  it('returns null for a non-HTTP error', () => {
    expect(rateLimitResetAt(new TypeError('fetch failed'))).toBeNull();
  });
});

describe('isNetworkError', () => {
  it('is true for an error with no status', () => {
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
  });

  it('is false for an HTTP error carrying a status', () => {
    expect(isNetworkError({ status: 500 })).toBe(false);
  });

  it('is true for a null or non-object error', () => {
    expect(isNetworkError(null)).toBe(true);
    expect(isNetworkError('boom')).toBe(true);
  });
});
