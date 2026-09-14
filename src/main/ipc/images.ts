import { ipcMain } from 'electron';
import { fetchImageInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getAuthenticatedClient } from '../github/auth';

/**
 * Only these hosts are ever fetched through the authenticated client — the
 * URL comes from untrusted issue-body markdown, so without this allowlist a
 * malicious body could make the main process (and its GitHub auth headers)
 * issue authenticated requests to an attacker-chosen host.
 */
export function isAllowedImageHost(hostname: string): boolean {
  return hostname === 'github.com' || hostname.endsWith('.githubusercontent.com');
}

export function registerImagesHandlers(): void {
  ipcMain.handle(CHANNELS.imagesFetch, async (_event, rawInput: unknown) => {
    const { url } = fetchImageInput.parse(rawInput);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:' || !isAllowedImageHost(parsed.hostname)) return null;

    const client = getAuthenticatedClient();
    if (!client) return null;

    try {
      // GitHub gates attachment URLs (github.com/user-attachments/...) behind
      // its own session; fetching them here, authenticated, is what
      // `getAuthenticatedClient()` exists for. Octokit accepts an absolute
      // URL in place of a route template and returns binary responses as an
      // ArrayBuffer (see @octokit/request's fetch-wrapper).
      const response = await client.request(`GET ${parsed.toString()}`);
      const bytes = response.data as ArrayBuffer;
      const contentType =
        (response.headers as Record<string, string>)['content-type']?.split(';')[0] ??
        'image/png';
      return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch (error) {
      console.warn(
        `Failed to fetch image attachment ${parsed.toString()}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  });
}
