import { useEffect, useState } from 'react';

// One in-flight/resolved fetch per URL, shared by every component that
// renders the same attachment (a card preview and the issue dialog can both
// reference the same pasted screenshot) so it's only fetched through IPC once.
const cache = new Map<string, Promise<string | null>>();

function fetchOnce(url: string): Promise<string | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = window.api.images.fetch({ url }).catch(() => null);
    cache.set(url, pending);
  }
  return pending;
}

/**
 * GitHub gates issue-attachment images (github.com/user-attachments/...,
 * *.githubusercontent.com) behind its own session — an <img src> pointed at
 * them directly gets blocked by CORB in the renderer. This resolves the URL
 * through the authenticated main process instead, returning a `data:` URL
 * once ready (or `null` while pending / on failure, so callers can render
 * nothing rather than a broken-image icon).
 */
export function useGitHubImageSrc(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(null);
  // Re-seeds `resolved` to null when `url` changes, the same
  // compare-during-render pattern `Avatar` uses for `imageFailed` — the
  // React-endorsed alternative to a setState-in-effect.
  const [prevUrl, setPrevUrl] = useState(url);

  if (url !== prevUrl) {
    setPrevUrl(url);
    setResolved(null);
  }

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void fetchOnce(url).then((src) => {
      if (!cancelled) setResolved(src);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}
