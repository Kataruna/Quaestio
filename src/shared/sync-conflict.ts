/**
 * CLAUDE.md's edit-conflict rule: "when the user starts editing a body,
 * record `updated_at`. Before saving, re-fetch the issue. If it changed on
 * GitHub in the meantime, warn the user and let them choose to overwrite or
 * reload." This is the comparison at the center of that check — pulled out
 * as its own pure function so it's unit-testable without a live GitHub call.
 */
export function hasSyncConflict(expectedUpdatedAt: string, liveUpdatedAt: string): boolean {
  return expectedUpdatedAt !== liveUpdatedAt;
}
