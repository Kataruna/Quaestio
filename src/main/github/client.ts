import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';

const ThrottledOctokit = Octokit.plugin(throttling, retry);

/**
 * One client per signed-in session — created fresh with whatever token is
 * current, never cached across a sign-out/sign-in.
 *
 * The installed `@octokit/plugin-throttling@11.0.5` types `onRateLimit`/
 * `onSecondaryRateLimit` as returning `void`, but its runtime (see
 * `dist-src/index.js`'s `wantRetry` handling) actually reads the return
 * value to decide whether to retry. The handlers below return a boolean
 * anyway; TypeScript's contextual typing for void-returning function types
 * allows a callback to return a value there (the same rule that lets
 * `Array.prototype.forEach` callbacks return values), so this typechecks
 * while still driving the real retry behavior.
 *
 * `options` is typed with just the fields used (`method`, `url`) rather than
 * the plugin's real `Required<EndpointDefaults>` type, because that type
 * (and the `octokit` parameter's `Octokit` type) live in `@octokit/core`/
 * `@octokit/types` — transitive dependencies here, not ones this project
 * depends on directly.
 */
export function createGitHubClient(token: string) {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (
        retryAfter: number,
        options: { method: string; url: string },
        _octokit: unknown,
        retryCount: number,
      ) => {
        console.warn(
          `Rate limit hit for ${options.method} ${options.url}, retrying after ${retryAfter}s`,
        );
        // Retry once. A second retry on an already-exhausted rate limit
        // window just burns the same wait again for no benefit.
        return retryCount < 1;
      },
      onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }) => {
        console.warn(
          `Secondary rate limit hit for ${options.method} ${options.url} (retry-after ${retryAfter}s); not retrying`,
        );
        // Secondary limits (abuse detection) don't get an automatic retry —
        // retrying immediately is exactly the behavior that triggers them.
        return false;
      },
    },
  });
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
