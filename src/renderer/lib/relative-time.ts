/** "just now" / "N min ago" / "N hr ago", from an ISO timestamp to `now`
 * (defaults to `Date.now()`, overridable for tests). Clamped at 0 so a
 * timestamp that's slightly in the future (clock skew) doesn't read
 * negative. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
