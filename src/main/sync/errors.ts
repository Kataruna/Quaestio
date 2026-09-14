interface HttpErrorLike {
  status: number;
  response?: { headers?: Record<string, string | undefined> };
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

/** A conditional GET's "nothing changed since your ETag" response. */
export function isNotModified(error: unknown): boolean {
  return isHttpErrorLike(error) && error.status === 304;
}

/**
 * GitHub reports both primary (403/429 with `x-ratelimit-remaining: 0`) and
 * secondary (403 with `retry-after`, abuse detection) rate limits as HTTP
 * errors carrying one of these headers. A 403 with neither is a real
 * permissions error (e.g. the token lost repo access), not a rate limit —
 * returns `null` so the caller falls through to its generic error handling.
 */
export function rateLimitResetAt(error: unknown): string | null {
  if (!isHttpErrorLike(error) || (error.status !== 403 && error.status !== 429)) return null;
  const headers = error.response?.headers ?? {};
  const reset = headers['x-ratelimit-reset'];
  if (reset) return new Date(Number(reset) * 1000).toISOString();
  const retryAfter = headers['retry-after'];
  if (retryAfter) return new Date(Date.now() + Number(retryAfter) * 1000).toISOString();
  return null;
}

/**
 * Octokit's HTTP errors always carry `.status`; a request that never
 * reached GitHub (no connection, DNS failure, timeout) doesn't.
 * ponytail: a heuristic, not real network-stack inspection — good enough
 * because every caller here only ever throws from a GitHub fetch, never
 * from unrelated code, so "no `.status`" reliably means "never got a
 * response."
 */
export function isNetworkError(error: unknown): boolean {
  return !isHttpErrorLike(error);
}
