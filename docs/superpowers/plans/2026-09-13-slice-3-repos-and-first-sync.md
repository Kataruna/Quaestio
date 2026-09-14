# Slice 3 — Repos + First Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Issue Desk's Slice 1 fixture data for repos and issues with the real thing — the user picks tracked repositories from their actual GitHub repo list, tracking a repo runs its initial issue sync into a local SQLite cache, and the board reads issues from that cache through IPC, so the app still shows real data after quitting and reopening **offline**.

**Architecture:** A new `better-sqlite3` + Drizzle ORM cache lives entirely in the main process (`src/main/db/`). Two new pure mapping functions (`map-github-repo.ts`, `map-github-issue.ts`, alongside the existing `map-github-user.ts` and `label-mapping.ts`) turn GitHub's raw API shapes into this app's own `Repo`/`Issue` types; a thin sync module (`src/main/sync/`) ties GitHub fetchers, mappers, and DB upserts together. The already-declared `repos.*`/`issues.*` IPC surface (built as stubs in Slice 1) gets real handlers for the first time — no IPC contract changes are needed, since `signInWithTokenInput`-style validation and the `Api` interface for these channels already exist. `repos.list()` opportunistically refreshes from GitHub and always falls back to the SQLite cache on failure (the same "try live, fall back to cache" pattern Slice 2 used for `getCurrentUser()`); `issues.list()` reads the cache only — GitHub sync for issues happens once, when a repo is newly tracked. Polling, incremental (`since`/ETag) sync, and a live sync-status indicator are explicitly **out of scope** — that's Slice 4.

**Tech Stack:** `better-sqlite3` + `drizzle-orm` (runtime deps) and `drizzle-kit` (dev-only CLI for generating migrations) — all already declared in CLAUDE.md's Tech Stack, not yet installed. Everything else reuses Slice 1/2's work: the `Api` IPC contract, `@octokit/rest` + the throttled client factory, `mapGitHubUser`, `issueTypeFromLabels`/`priorityFromLabels`, and the existing `RepoTabs`/`RepoPickerDialog`/`EmptyState`/`BoardScreen` UI (none of which need visual changes — only how `App.tsx` feeds them data changes).

---

## Decisions locked before this plan

- **Scope boundary with Slice 4:** this slice does exactly one GitHub sync per tracked repo — the moment it becomes tracked. There is no polling, no `since`/ETag incremental sync, no rate-limit UI, and no working "Sync now" button yet. `TitleBar`'s sync-status pill and its `onSync` handler stay exactly as Slice 1 left them (driven by the dev-only `StateGallery` toggle) — Slice 4 owns making that real. `repos.list()` does refresh live on every call (see below); that's the one exception, justified because "let the user pick tracked repos from their repo list" has no sync semantics of its own to defer to Slice 4.
- **`repos.list()` refresh pattern:** every call to `repos.list()` first attempts a live `GET /user/repos` fetch (paginated) and upserts the result into SQLite — preserving each repo's local `tracked` flag, which GitHub knows nothing about — then always returns whatever is now in SQLite, whether or not the live fetch succeeded. This mirrors Slice 2's `getCurrentUser()` fix: a network failure is not a reason to show nothing.
- **`issues.list()` is a pure cache read.** No live fetch happens here. The only point where an individual repo's issues get fetched from GitHub in this slice is `repos.setTracked()`, for any repo that newly transitions from untracked to tracked. If that fetch fails (e.g. tracking a repo while offline), the tracked flag still gets set — the repo just starts with zero cached issues until a later slice's sync succeeds. There is no user-facing indicator of this failure in Slice 3; that's part of Slice 4's sync-status work.
- **`search` on `issues.list()` is validated but unused.** `ListIssuesInput`'s optional `search` field (already declared in `ipc-contract.ts` since Slice 1) is accepted and zod-validated but ignored server-side — Slice 6 ("local search/filter/sort using SQLite queries") owns turning it into a real filter. Until then, `BoardScreen`'s own client-side text filter (already built in Slice 1) is the only search behavior, unchanged.
- **Subtasks stay empty and local-only.** `Issue.subtasks` is "local, not pushed to GitHub" per its own type comment. GitHub never supplies them, so every issue mapped from GitHub gets `subtasks: []`. `IssueDetailDialog`'s "+ Subtask" button is already non-functional (no `onClick`) — this slice doesn't wire it up; building subtask persistence isn't on the roadmap for any slice yet, and inventing it now would be scope creep. `upsertIssues` never overwrites an existing row's `subtasks` column on re-sync, so this remains safe to revisit later without a migration.
- **Cross-repo search stays on fixtures.** `SearchScreen`'s `searchResults` fixture is untouched — cross-repo search is Slice 6 territory, and there is no roadmap item asking for it sooner.
- **The native-module ABI gotcha, and how this plan sequences around it.** `better-sqlite3` is a native module. Once Electron Forge's Vite plugin rebuilds it for Electron's Node ABI (which happens the moment `npm start`, `npm run package`, or `npm run make` runs), the binary in `node_modules` no longer loads under plain Node — so a subsequent `npm test` (which runs under plain Node via Vitest, not Electron) fails with a `NODE_MODULE_VERSION` mismatch, the *opposite* direction from the gotcha CLAUDE.md's "Known gotchas" section already documents. To avoid hitting this mid-plan, every task that runs `npm test` against real SQLite (Tasks 6, 7) does so **before** any task in this plan invokes `npm start`/`npm run package` for the first time (Task 13). Task 13 is the only task that triggers Forge's rebuild, and it ends by running `npm rebuild better-sqlite3` to restore plain-Node compatibility, followed by one final `npm test` to prove the repo is left in a state where automated checks pass cleanly — matching CLAUDE.md's definition of done. This is recorded as a new bullet in CLAUDE.md's "Known gotchas" section in Task 1.
- **No new IPC contract changes.** `src/shared/ipc-contract.ts` already declares `signInWithTokenInput`-sibling schemas `setTrackedInput`, `listIssuesInput`, `getIssueInput`, and the full `Api.repos`/`Api.issues` interface, all from Slice 1. This slice only writes the real handlers behind them.

---

## File structure

| Path | Responsibility |
|---|---|
| `src/main/db/schema.ts` | Drizzle table definitions: `repos`, `issues` |
| `drizzle.config.ts` | Drizzle Kit config (schema location, migration output folder) |
| `drizzle/` | Generated SQL migration files — committed, bundled into the packaged app |
| `src/main/db/client.ts` | Opens the SQLite file via `better-sqlite3`, wraps it with Drizzle, runs migrations at startup |
| `src/main/db/repos-queries.ts` | Pure(ish) query functions: `listRepos`, `upsertRepos` (tracked-preserving merge), `setTrackedRepos` |
| `src/main/db/issues-queries.ts` | Pure(ish) query functions: `listIssues`, `getIssue`, `upsertIssues` (row ↔ `Issue` conversion) |
| `src/shared/map-github-repo.ts` | Pure function: raw GitHub repo → `Omit<Repo, 'tracked'>` |
| `src/shared/map-github-issue.ts` | Pure functions: `isPullRequest`, raw GitHub issue → `Issue` |
| `src/main/github/repos.ts` | `fetchUserRepos(client)` — paginated `GET /user/repos` |
| `src/main/github/issues.ts` | `fetchAllIssues(client, owner, repo)` — paginated `GET /repos/{owner}/{repo}/issues?state=all` |
| `src/main/github/auth.ts` | Modify — add `getAuthenticatedClient()`, the one sanctioned way other main-process modules get a client without touching the raw token |
| `src/main/sync/initial-sync.ts` | `syncRepoIssues(client, db, repoFullName)` — fetch, filter PRs, map, upsert |
| `src/main/ipc/repos.ts` | `registerReposHandlers()` — `repos:list`, `repos:set-tracked` |
| `src/main/ipc/issues.ts` | `registerIssuesHandlers()` — `issues:list`, `issues:get` |
| `src/main/index.ts` | Modify — run migrations and register the two new handler sets at startup |
| `forge.config.ts` | Modify — `extraResource: ['drizzle']` so migrations ship in the packaged app |
| `vite.main.config.ts` | Modify — mark `better-sqlite3` external |
| `src/renderer/App.tsx` | Modify — real repo/issue loading via IPC, replacing the `repos`/`issues` fixtures |
| `tests/map-github-repo.test.ts`, `tests/map-github-issue.test.ts` | Unit tests for the two new pure mappers |
| `tests/repos-queries.test.ts`, `tests/issues-queries.test.ts` | Unit tests for the DB query layer, against a real in-memory SQLite database |

---

### Task 1: Install the DB dependencies, mark `better-sqlite3` external, document the ABI gotcha

**Files:**
- Modify: `package.json`, `package-lock.json`, `vite.main.config.ts`, `CLAUDE.md`

- [ ] **Step 1: Verify versions before installing**

```bash
npm view better-sqlite3 version
npm view drizzle-orm version
npm view drizzle-kit version
npm view better-sqlite3 engines
```

At the time this plan was written, these resolved to `better-sqlite3@13.0.3` (engines: `node >=22` — this is the toolchain-Node requirement for `npm install`/`node-gyp`, not the Electron ABI it gets rebuilt against later; verify your local `node --version` satisfies it, and if not, fall back to the newest `better-sqlite3@12.x` release instead, which supports Node 20+), `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`. If the registry now shows different numbers, use those instead — don't force an install that doesn't match what's actually published.

- [ ] **Step 2: Install**

```bash
npm install --save-exact better-sqlite3@13.0.3 drizzle-orm@0.45.2
npm install --save-exact --save-dev drizzle-kit@0.31.10 @types/better-sqlite3@9.6.0
```

- [ ] **Step 3: Mark `better-sqlite3` external in the main-process Vite config**

Read `vite.main.config.ts` first — it should look like this (from Slice 2's `@shared` alias fix):

```ts
import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    lib: {
      entry: 'src/main/index.ts',
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
  },
});
```

Add `build.rollupOptions.external` so Rollup doesn't try to bundle the native binary:

```ts
import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    lib: {
      entry: 'src/main/index.ts',
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
    rollupOptions: {
      // Native modules can't be bundled — Rollup would try to parse the
      // compiled .node binary as JS. `better-sqlite3` is required at
      // runtime from the packaged app's node_modules instead.
      external: ['better-sqlite3'],
    },
  },
});
```

- [ ] **Step 4: Verify the app still builds clean**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass exactly as before (25 tests) — this step only installs packages and touches build config, no application code yet.

- [ ] **Step 5: Add the ABI-mismatch gotcha to CLAUDE.md's "Known gotchas" section**

Read the current "Known gotchas" section first — find the existing `better-sqlite3` bullet (about Vite externalization, Forge rebuilding it, and the `NODE_MODULE_VERSION` error meaning the rebuild didn't happen). Add a new sentence to the end of that same bullet:

```markdown
  The reverse also happens: once Forge has rebuilt it for Electron's ABI (via `npm start`/`package`/`make`), a later `npm test` run (plain Node, via Vitest) fails the same `NODE_MODULE_VERSION` way until you run `npm rebuild better-sqlite3` to restore plain-Node compatibility.
```

- [ ] **Step 6: Append to CLAUDE.md's Decisions log**

Add a new dated section above the existing `### Slice 2` entry:

```markdown
### Slice 3 — Repos + first sync (2026-09-13)

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| better-sqlite3 | 13.0.3 |
| drizzle-orm | 0.45.2 |
| drizzle-kit | 0.31.10 (dev) |
| @types/better-sqlite3 | 9.6.0 (dev) |
```

(Read the actual installed versions from `package.json` first and use those if Step 1's registry check found different numbers.)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.main.config.ts CLAUDE.md
git commit -m "chore: install better-sqlite3 and Drizzle ORM for the local cache"
```

---

### Task 2: Drizzle schema

**Files:**
- Create: `src/main/db/schema.ts`

- [ ] **Step 1: Write `src/main/db/schema.ts`**

```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

/**
 * `id` is GitHub's own numeric repo id — stable across renames, unlike
 * `fullName`. `tracked` is local-only state GitHub has no concept of;
 * `repos-queries.ts`'s `upsertRepos` is responsible for never clobbering it
 * on a refresh.
 */
export const repos = sqliteTable('repos', {
  id: integer('id').primaryKey(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('fullName').notNull().unique(),
  isPrivate: integer('isPrivate', { mode: 'boolean' }).notNull(),
  openIssueCount: integer('openIssueCount').notNull(),
  updatedAt: text('updatedAt').notNull(),
  tracked: integer('tracked', { mode: 'boolean' }).notNull().default(false),
});

/**
 * `id` is GitHub's numeric issue id (globally unique across repos, unlike
 * `number` which only counts within one repo). `labels` and `subtasks` are
 * JSON-encoded arrays — SQLite has no native array type, and neither field
 * needs to be queried by individual element in this slice, so a JSON text
 * column is simpler than a join table. `assignee*` columns are flattened
 * (not a JSON blob) because `assigneeLogin` is genuinely useful to filter or
 * display without deserializing, and there are only three fields.
 */
export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey(),
  number: integer('number').notNull(),
  repoFullName: text('repoFullName').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  state: text('state').notNull().$type<'open' | 'closed'>(),
  type: text('type').notNull().$type<'bug' | 'feature' | 'chore'>(),
  priority: text('priority').notNull().$type<'p1' | 'p2' | 'p3'>(),
  labels: text('labels').notNull(),
  assigneeLogin: text('assigneeLogin'),
  assigneeName: text('assigneeName'),
  assigneeAvatarUrl: text('assigneeAvatarUrl'),
  milestone: text('milestone'),
  dueDate: text('dueDate'),
  subtasks: text('subtasks').notNull().default('[]'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  htmlUrl: text('htmlUrl').notNull(),
});
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

Expected: both clean. No runtime test for a schema-definition file by itself — it's exercised indirectly once Task 6/7's query tests run migrations generated from it.

- [ ] **Step 3: Commit**

```bash
git add src/main/db/schema.ts
git commit -m "feat: add the Drizzle schema for repos and issues"
```

---

### Task 3: Drizzle Kit config and the initial migration

**Files:**
- Create: `drizzle.config.ts`, `drizzle/` (generated)

- [ ] **Step 1: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
```

- [ ] **Step 2: Generate the migration**

```bash
npx drizzle-kit generate
```

Expected: a new `drizzle/0000_<generated-name>.sql` file (containing `CREATE TABLE` statements for `repos` and `issues`) plus a `drizzle/meta/` folder. `drizzle-kit generate` for the `sqlite` dialect diffs the TS schema module directly — it does not open a live database connection, so this works regardless of what ABI `better-sqlite3`'s installed binary currently targets.

- [ ] **Step 3: Inspect the generated SQL**

```bash
cat drizzle/0000_*.sql
```

Confirm it contains `CREATE TABLE` statements for both `repos` and `issues` matching Task 2's schema (all the same columns, `id` as the primary key on both, `fullName` unique on `repos`). If drizzle-kit produced something unexpected (e.g. it couldn't resolve the schema import), stop and report BLOCKED with what you found.

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts drizzle/
git commit -m "chore: generate the initial Drizzle migration for repos and issues"
```

---

### Task 4: Pure mapper — GitHub repo → `Repo`, test-first

**Files:**
- Create: `src/shared/map-github-repo.ts`, `tests/map-github-repo.test.ts`

- [ ] **Step 1: Write the failing test at `tests/map-github-repo.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mapGitHubRepo } from '@shared/map-github-repo';

describe('mapGitHubRepo', () => {
  it('maps every GitHub-derived field, excluding tracked', () => {
    const result = mapGitHubRepo({
      id: 42,
      name: 'atlas-web',
      full_name: 'acme/atlas-web',
      owner: { login: 'acme' },
      private: true,
      open_issues_count: 7,
      updated_at: '2026-03-26T10:00:00Z',
    });
    expect(result).toEqual({
      id: 42,
      owner: 'acme',
      name: 'atlas-web',
      fullName: 'acme/atlas-web',
      isPrivate: true,
      openIssueCount: 7,
      updatedAt: '2026-03-26T10:00:00Z',
    });
  });

  it('maps a public repo correctly', () => {
    const result = mapGitHubRepo({
      id: 5,
      name: 'edge-proxy',
      full_name: 'acme/edge-proxy',
      owner: { login: 'acme' },
      private: false,
      open_issues_count: 2,
      updated_at: '2026-03-20T11:00:00Z',
    });
    expect(result.isPrivate).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "@shared/map-github-repo"`.

- [ ] **Step 3: Write `src/shared/map-github-repo.ts`**

```ts
import type { Repo } from './types';

/** The subset of GitHub's repo shape (from `GET /user/repos` or
 * `GET /repos/{owner}/{repo}`) this app actually uses. */
interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  open_issues_count: number;
  updated_at: string;
}

/**
 * Maps every GitHub-derived field. `tracked` is deliberately excluded —
 * it's local-only state GitHub has no concept of, and the DB layer
 * (`repos-queries.ts`'s `upsertRepos`) is responsible for merging it in
 * from whatever's already stored, never overwriting it on a refresh.
 */
export function mapGitHubRepo(raw: GitHubRepoResponse): Omit<Repo, 'tracked'> {
  return {
    id: raw.id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    isPrivate: raw.private,
    openIssueCount: raw.open_issues_count,
    updatedAt: raw.updated_at,
  };
}
```

- [ ] **Step 4: Run it to confirm it passes**

```bash
npm test
```

Expected: `Tests 2 passed` for this file, `27 passed` total (25 existing + 2 new).

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm run lint
git add src/shared/map-github-repo.ts tests/map-github-repo.test.ts
git commit -m "feat: add a pure mapper from GitHub's repo shape to this app's Repo type"
```

---

### Task 5: Pure mapper — GitHub issue → `Issue`, and PR filtering, test-first

**Files:**
- Create: `src/shared/map-github-issue.ts`, `tests/map-github-issue.test.ts`

Before finalizing this file, check the real installed Octokit response types for the issues-list endpoint against the narrow interface drafted below — the same discipline Slice 2 used for `@octokit/plugin-throttling` and `@octokit/auth-oauth-device`:

```bash
grep -n "IssuesListForRepoResponseData\|listForRepo" node_modules/@octokit/openapi-types/types.d.ts | head -20
```

(The exact type name and file may differ from this guess — `@octokit/rest`'s response types are generated and can be hard to grep for directly. If you can't find the specific shape quickly, that's fine: this mapper's input interface only declares the handful of fields it actually reads, structurally — the real Octokit response object will have many more fields than this interface, which is fine, since a wider object is assignable to a narrower parameter type. What matters is confirming the fields this interface DOES declare — `id`, `number`, `title`, `body`, `state`, `labels`, `assignee`, `milestone`, `created_at`, `updated_at`, `html_url`, `pull_request` — have the types this file assumes, particularly whether `body` can be `null` and whether `labels` entries can be plain strings as well as objects.)

- [ ] **Step 1: Write the failing tests at `tests/map-github-issue.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isPullRequest, mapGitHubIssue } from '@shared/map-github-issue';

describe('isPullRequest', () => {
  it('is true when a pull_request field is present', () => {
    expect(isPullRequest({ pull_request: { url: 'https://api.github.com/x' } })).toBe(true);
  });

  it('is false when there is no pull_request field', () => {
    expect(isPullRequest({})).toBe(false);
  });
});

describe('mapGitHubIssue', () => {
  const base = {
    id: 482,
    number: 482,
    title: 'Token refresh loop on expired session',
    body: 'Client retries indefinitely.' as string | null,
    state: 'open' as const,
    labels: ['bug', 'p1'],
    assignee: { login: 'sarah-kwan', avatar_url: 'https://avatars.githubusercontent.com/u/1' } as {
      login: string;
      avatar_url: string;
    } | null,
    milestone: { title: '1.4' } as { title: string } | null,
    created_at: '2026-03-21T09:00:00Z',
    updated_at: '2026-03-26T08:12:00Z',
    html_url: 'https://github.com/acme/atlas-web/issues/482',
  };

  it('maps a fully-populated issue', () => {
    const result = mapGitHubIssue(base, 'acme/atlas-web');
    expect(result).toEqual({
      id: 482,
      number: 482,
      repoFullName: 'acme/atlas-web',
      title: 'Token refresh loop on expired session',
      body: 'Client retries indefinitely.',
      state: 'open',
      type: 'bug',
      priority: 'p1',
      labels: ['bug', 'p1'],
      assignee: { login: 'sarah-kwan', name: 'sarah-kwan', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
      milestone: '1.4',
      dueDate: null,
      subtasks: [],
      createdAt: '2026-03-21T09:00:00Z',
      updatedAt: '2026-03-26T08:12:00Z',
      htmlUrl: 'https://github.com/acme/atlas-web/issues/482',
    });
  });

  it('falls back to an empty string when body is null', () => {
    const result = mapGitHubIssue({ ...base, body: null }, 'acme/atlas-web');
    expect(result.body).toBe('');
  });

  it('maps a null assignee to null', () => {
    const result = mapGitHubIssue({ ...base, assignee: null }, 'acme/atlas-web');
    expect(result.assignee).toBeNull();
  });

  it('maps a null milestone to null', () => {
    const result = mapGitHubIssue({ ...base, milestone: null }, 'acme/atlas-web');
    expect(result.milestone).toBeNull();
  });

  it('normalises label objects to their names', () => {
    const result = mapGitHubIssue({ ...base, labels: [{ name: 'enhancement' }, 'p2'] }, 'acme/atlas-web');
    expect(result.labels).toEqual(['enhancement', 'p2']);
    expect(result.type).toBe('feature');
    expect(result.priority).toBe('p2');
  });

  it('always maps dueDate to null and subtasks to an empty array', () => {
    const result = mapGitHubIssue(base, 'acme/atlas-web');
    expect(result.dueDate).toBeNull();
    expect(result.subtasks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "@shared/map-github-issue"`.

- [ ] **Step 3: Write `src/shared/map-github-issue.ts`**

```ts
import { mapGitHubUser } from './map-github-user';
import { issueTypeFromLabels, priorityFromLabels } from './label-mapping';
import type { Issue } from './types';

interface GitHubLabel {
  name: string;
}

/** The subset of GitHub's issue shape (from `GET /repos/{owner}/{repo}/issues`)
 * this app actually uses. */
interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: (string | GitHubLabel)[];
  assignee: { login: string; avatar_url: string } | null;
  milestone: { title: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * The issues endpoint also returns pull requests — GitHub's own documented
 * way to tell them apart is the presence of a `pull_request` field, which
 * only PRs carry.
 */
export function isPullRequest(raw: { pull_request?: unknown }): boolean {
  return raw.pull_request !== undefined;
}

function labelNames(labels: (string | GitHubLabel)[]): string[] {
  return labels.map((label) => (typeof label === 'string' ? label : label.name));
}

/**
 * Maps a raw GitHub issue onto this app's `Issue` type. `repoFullName` isn't
 * part of GitHub's issue response (it's implied by which endpoint you
 * called), so the caller supplies it. `dueDate` is always null — GitHub has
 * no issue due-date field, and a later slice derives one from the milestone
 * instead. `subtasks` is always empty — it's a local-only checklist GitHub
 * knows nothing about.
 */
export function mapGitHubIssue(raw: GitHubIssueResponse, repoFullName: string): Issue {
  const labels = labelNames(raw.labels);
  return {
    id: raw.id,
    number: raw.number,
    repoFullName,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    type: issueTypeFromLabels(labels),
    priority: priorityFromLabels(labels),
    labels,
    assignee: raw.assignee
      ? mapGitHubUser({ login: raw.assignee.login, name: null, avatar_url: raw.assignee.avatar_url })
      : null,
    milestone: raw.milestone?.title ?? null,
    dueDate: null,
    subtasks: [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
  };
}
```

- [ ] **Step 4: Run it to confirm it passes**

```bash
npm test
```

Expected: `Tests 8 passed` for this file, `35 passed` total (27 existing + 2 from `isPullRequest` + 6 from `mapGitHubIssue`).

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm run lint
git add src/shared/map-github-issue.ts tests/map-github-issue.test.ts
git commit -m "feat: add a pure mapper from GitHub's issue shape to this app's Issue type"
```

---

### Task 6: DB queries — repos, test-first against a real in-memory database

**Files:**
- Create: `src/main/db/repos-queries.ts`, `tests/repos-queries.test.ts`

Unlike `secure-store.ts`/`github/auth.ts` in Slice 2, this file is genuinely testable: `better-sqlite3` is a general Node native module, not an Electron-only API, and the only Electron-specific detail (`app.getPath('userData')` for the file location) lives in `db/client.ts` (Task 8), not here. These query functions take a Drizzle database instance as a parameter, so tests can hand them a real `:memory:` SQLite database with the actual generated migration applied.

- [ ] **Step 1: Write the failing tests at `tests/repos-queries.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { listRepos, upsertRepos, setTrackedRepos } from '../src/main/db/repos-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('repos-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('upsertRepos inserts a new repo as untracked by default', () => {
    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(listRepos(db)).toEqual([
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
        tracked: false,
      },
    ]);
  });

  it('upsertRepos preserves an existing tracked flag and updates other fields', () => {
    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    setTrackedRepos(db, [1]);

    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 9,
        updatedAt: '2026-02-01T00:00:00Z',
      },
    ]);

    const [repo] = listRepos(db);
    expect(repo?.tracked).toBe(true);
    expect(repo?.openIssueCount).toBe(9);
  });

  it('setTrackedRepos sets exactly the given ids tracked and untracks everything else', () => {
    upsertRepos(db, [
      { id: 1, owner: 'a', name: 'one', fullName: 'a/one', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
      { id: 2, owner: 'a', name: 'two', fullName: 'a/two', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
    ]);

    setTrackedRepos(db, [1]);
    expect(listRepos(db).find((repo) => repo.id === 1)?.tracked).toBe(true);
    expect(listRepos(db).find((repo) => repo.id === 2)?.tracked).toBe(false);

    setTrackedRepos(db, [2]);
    expect(listRepos(db).find((repo) => repo.id === 1)?.tracked).toBe(false);
    expect(listRepos(db).find((repo) => repo.id === 2)?.tracked).toBe(true);
  });

  it('setTrackedRepos returns only the ids that newly became tracked', () => {
    upsertRepos(db, [
      { id: 1, owner: 'a', name: 'one', fullName: 'a/one', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
      { id: 2, owner: 'a', name: 'two', fullName: 'a/two', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
    ]);

    setTrackedRepos(db, [1]);
    const newly = setTrackedRepos(db, [1, 2]);
    expect(newly).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../src/main/db/repos-queries"`.

- [ ] **Step 3: Write `src/main/db/repos-queries.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { repos } from './schema';
import type { Repo } from '@shared/types';

export function listRepos(db: BetterSQLite3Database): Repo[] {
  return db.select().from(repos).all();
}

/**
 * Upserts the GitHub-derived fields for each repo, preserving whatever
 * `tracked` value already exists locally (or defaulting to `false` for a
 * repo seen for the first time) — GitHub has no concept of "tracked," so a
 * refresh must never clobber this app's own local state.
 */
export function upsertRepos(db: BetterSQLite3Database, incoming: Omit<Repo, 'tracked'>[]): void {
  const existingTracked = new Map(listRepos(db).map((repo) => [repo.id, repo.tracked]));
  for (const repo of incoming) {
    db.insert(repos)
      .values({ ...repo, tracked: existingTracked.get(repo.id) ?? false })
      .onConflictDoUpdate({
        target: repos.id,
        set: {
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          openIssueCount: repo.openIssueCount,
          updatedAt: repo.updatedAt,
        },
      })
      .run();
  }
}

/**
 * Sets `tracked = true` for exactly the given ids and `false` for every
 * other repo — matching `SetTrackedInput`'s contract that `repoIds` is the
 * complete desired tracked set, not a delta. Returns the ids that
 * transitioned from untracked to tracked, so the caller knows which repos
 * need their first issue sync.
 */
export function setTrackedRepos(db: BetterSQLite3Database, repoIds: number[]): number[] {
  const before = new Map(listRepos(db).map((repo) => [repo.id, repo.tracked]));
  const wantTracked = new Set(repoIds);
  for (const [id, wasTracked] of before) {
    const shouldTrack = wantTracked.has(id);
    if (shouldTrack !== wasTracked) {
      db.update(repos).set({ tracked: shouldTrack }).where(eq(repos.id, id)).run();
    }
  }
  return repoIds.filter((id) => !(before.get(id) ?? false));
}
```

- [ ] **Step 4: Run it to confirm it passes**

```bash
npm test
```

Expected: `Tests 4 passed` for this file, `39 passed` total.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm run lint
git add src/main/db/repos-queries.ts tests/repos-queries.test.ts
git commit -m "feat: add the repos DB query layer, with tracked-preserving upsert"
```

---

### Task 7: DB queries — issues, test-first against a real in-memory database

**Files:**
- Create: `src/main/db/issues-queries.ts`, `tests/issues-queries.test.ts`

- [ ] **Step 1: Write the failing tests at `tests/issues-queries.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Issue } from '@shared/types';
import { listIssues, getIssue, upsertIssues } from '../src/main/db/issues-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function issue(partial: Partial<Issue> & Pick<Issue, 'id' | 'number' | 'repoFullName'>): Issue {
  return {
    title: 'Untitled',
    body: '',
    state: 'open',
    type: 'chore',
    priority: 'p3',
    labels: [],
    assignee: null,
    milestone: null,
    dueDate: null,
    subtasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    htmlUrl: `https://github.com/${partial.repoFullName}/issues/${partial.number}`,
    ...partial,
  };
}

describe('issues-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('upsertIssues then listIssues round-trips every field', () => {
    const original = issue({
      id: 1,
      number: 1,
      repoFullName: 'acme/web',
      title: 'Fix the thing',
      body: 'Details here.',
      state: 'open',
      type: 'bug',
      priority: 'p1',
      labels: ['bug', 'p1'],
      assignee: { login: 'sarah-kwan', name: 'Sarah Kwan', avatarUrl: 'https://x/1' },
      milestone: '1.4',
    });
    upsertIssues(db, [original]);
    expect(listIssues(db, 'acme/web')).toEqual([original]);
  });

  it('listIssues only returns issues for the requested repo', () => {
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web' }),
      issue({ id: 2, number: 1, repoFullName: 'acme/other' }),
    ]);
    expect(listIssues(db, 'acme/web').map((i) => i.id)).toEqual([1]);
  });

  it('getIssue finds by repoFullName and number', () => {
    upsertIssues(db, [issue({ id: 1, number: 42, repoFullName: 'acme/web', title: 'Found me' })]);
    expect(getIssue(db, 'acme/web', 42)?.title).toBe('Found me');
  });

  it('getIssue returns null when nothing matches', () => {
    expect(getIssue(db, 'acme/web', 999)).toBeNull();
  });

  it('upsertIssues is idempotent and updates changed fields on re-sync', () => {
    upsertIssues(db, [issue({ id: 1, number: 1, repoFullName: 'acme/web', title: 'Old title', state: 'open' })]);
    upsertIssues(db, [issue({ id: 1, number: 1, repoFullName: 'acme/web', title: 'New title', state: 'closed' })]);

    const results = listIssues(db, 'acme/web');
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('New title');
    expect(results[0]?.state).toBe('closed');
  });

  it('a null assignee round-trips as null, not a partially-filled object', () => {
    upsertIssues(db, [issue({ id: 1, number: 1, repoFullName: 'acme/web', assignee: null })]);
    expect(listIssues(db, 'acme/web')[0]?.assignee).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../src/main/db/issues-queries"`.

- [ ] **Step 3: Write `src/main/db/issues-queries.ts`**

```ts
import { and, eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { issues } from './schema';
import type { Issue } from '@shared/types';

function rowToIssue(row: typeof issues.$inferSelect): Issue {
  return {
    id: row.id,
    number: row.number,
    repoFullName: row.repoFullName,
    title: row.title,
    body: row.body,
    state: row.state,
    type: row.type,
    priority: row.priority,
    labels: JSON.parse(row.labels) as string[],
    assignee: row.assigneeLogin
      ? {
          login: row.assigneeLogin,
          name: row.assigneeName ?? row.assigneeLogin,
          avatarUrl: row.assigneeAvatarUrl,
        }
      : null,
    milestone: row.milestone,
    dueDate: row.dueDate,
    subtasks: JSON.parse(row.subtasks) as Issue['subtasks'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    htmlUrl: row.htmlUrl,
  };
}

export function listIssues(db: BetterSQLite3Database, repoFullName: string): Issue[] {
  return db.select().from(issues).where(eq(issues.repoFullName, repoFullName)).all().map(rowToIssue);
}

export function getIssue(db: BetterSQLite3Database, repoFullName: string, number: number): Issue | null {
  const row = db
    .select()
    .from(issues)
    .where(and(eq(issues.repoFullName, repoFullName), eq(issues.number, number)))
    .get();
  return row ? rowToIssue(row) : null;
}

/**
 * `subtasks` is intentionally excluded from the `onConflictDoUpdate` set —
 * it's local-only and GitHub never supplies it, so a re-sync must never
 * erase a user's local checklist progress once that becomes editable in a
 * later slice. Every incoming `Issue` currently has `subtasks: []` anyway
 * (see `map-github-issue.ts`), so this has no visible effect yet — it's a
 * guard against future drift, not a workaround for a bug today.
 */
export function upsertIssues(db: BetterSQLite3Database, incoming: Issue[]): void {
  for (const issue of incoming) {
    const row = {
      id: issue.id,
      number: issue.number,
      repoFullName: issue.repoFullName,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      type: issue.type,
      priority: issue.priority,
      labels: JSON.stringify(issue.labels),
      assigneeLogin: issue.assignee?.login ?? null,
      assigneeName: issue.assignee?.name ?? null,
      assigneeAvatarUrl: issue.assignee?.avatarUrl ?? null,
      milestone: issue.milestone,
      dueDate: issue.dueDate,
      subtasks: JSON.stringify(issue.subtasks),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      htmlUrl: issue.htmlUrl,
    };
    db.insert(issues)
      .values(row)
      .onConflictDoUpdate({
        target: issues.id,
        set: {
          number: row.number,
          repoFullName: row.repoFullName,
          title: row.title,
          body: row.body,
          state: row.state,
          type: row.type,
          priority: row.priority,
          labels: row.labels,
          assigneeLogin: row.assigneeLogin,
          assigneeName: row.assigneeName,
          assigneeAvatarUrl: row.assigneeAvatarUrl,
          milestone: row.milestone,
          dueDate: row.dueDate,
          updatedAt: row.updatedAt,
          htmlUrl: row.htmlUrl,
        },
      })
      .run();
  }
}
```

- [ ] **Step 4: Run it to confirm it passes**

```bash
npm test
```

Expected: `Tests 6 passed` for this file, `45 passed` total.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm run lint
git add src/main/db/issues-queries.ts tests/issues-queries.test.ts
git commit -m "feat: add the issues DB query layer, preserving local-only subtasks on re-sync"
```

---

### Task 8: DB client, migration runner, and packaging the migrations folder

**Files:**
- Create: `src/main/db/client.ts`
- Modify: `forge.config.ts`

- [ ] **Step 1: Write `src/main/db/client.ts`**

```ts
import { app } from 'electron';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';

const DB_FILE_NAME = 'issue-desk.db';

let db: BetterSQLite3Database | null = null;

function dbFilePath(): string {
  return path.join(app.getPath('userData'), DB_FILE_NAME);
}

/**
 * Where the generated SQL migrations live at runtime. In dev, the bundled
 * main entry is `.vite/build/main.js`, so `../../drizzle` resolves to the
 * project root's `drizzle/` folder. In a packaged app, `drizzle/` isn't
 * inside the asar archive — `forge.config.ts`'s `extraResource` copies it
 * next to the app instead, reachable via `process.resourcesPath`.
 */
function migrationsFolder(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(__dirname, '../../drizzle');
}

/** Opens the SQLite file (creating it on first launch) and wraps it with
 * Drizzle. Safe to call more than once — the connection is memoized. */
export function getDb(): BetterSQLite3Database {
  if (!db) {
    const sqlite = new Database(dbFilePath());
    db = drizzle(sqlite);
  }
  return db;
}

/** Runs any migrations not yet applied. Must be called once at startup,
 * before any query touches the database. */
export function runMigrations(): void {
  migrate(getDb(), { migrationsFolder: migrationsFolder() });
}
```

- [ ] **Step 2: Add `extraResource` to `forge.config.ts`**

Read the current file first — the `packagerConfig` block should look like this:

```ts
  packagerConfig: {
    asar: true,
  },
```

Change it to:

```ts
  packagerConfig: {
    asar: true,
    // The Drizzle migrations aren't part of the Vite-bundled main process —
    // they're static .sql files `db/client.ts`'s `runMigrations()` reads
    // from disk at startup. asar archives can't be read as a plain
    // directory the way `migrationsFolder()` expects, so this copies
    // `drizzle/` next to the packaged app instead, reachable via
    // `process.resourcesPath`.
    extraResource: ['drizzle'],
  },
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass, 45 tests unchanged. This task only adds a client module (not yet called from anywhere) and a packaging config change — no behavior change yet, and no `npm run package` run in this task (that verification is deliberately deferred to Task 13, so as not to trigger Forge's native-module rebuild before this plan's remaining DB-touching tasks have run their tests — see this plan's "Decisions locked" section on the ABI gotcha).

- [ ] **Step 4: Commit**

```bash
git add src/main/db/client.ts forge.config.ts
git commit -m "feat: add the DB client, migration runner, and package the migrations folder"
```

---

### Task 9: GitHub fetchers, and `getAuthenticatedClient()` on the auth service

**Files:**
- Create: `src/main/github/repos.ts`, `src/main/github/issues.ts`
- Modify: `src/main/github/auth.ts`

Before writing the fetchers, confirm `octokit.paginate` is available and its call signature, since `@octokit/rest` bundles the paginate plugin by default (the throttled client from Task 4 of Slice 2 is `Octokit.plugin(throttling, retry)` layered on top of `@octokit/rest`, which already includes it):

```bash
grep -rn "paginate" node_modules/@octokit/plugin-paginate-rest/dist-types/types.d.ts | head -10
```

- [ ] **Step 1: Write `src/main/github/repos.ts`**

```ts
import type { GitHubClient } from './client';

/**
 * Every repo the signed-in user can see — personal and any org repos they
 * have access to — every page. This becomes the list `RepoPickerDialog`
 * offers; only repos the user explicitly tracks get their issues synced.
 */
export async function fetchUserRepos(client: GitHubClient) {
  return client.paginate(client.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
  });
}
```

- [ ] **Step 2: Write `src/main/github/issues.ts`**

```ts
import type { GitHubClient } from './client';

/**
 * All issues for one repo, every state, every page. The endpoint also
 * returns pull requests — the caller filters those out afterward
 * (`isPullRequest` in `@shared/map-github-issue`), since there's no
 * server-side way to exclude them from this endpoint.
 */
export async function fetchAllIssues(client: GitHubClient, owner: string, repo: string) {
  return client.paginate(client.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });
}
```

- [ ] **Step 3: Add `getAuthenticatedClient()` to `src/main/github/auth.ts`**

Read the current file first. Add this import to the existing `import { createGitHubClient } from './client';` line, changing it to also bring in the type:

```ts
import { createGitHubClient, type GitHubClient } from './client';
```

Add this function near `getCurrentUser`:

```ts
/**
 * Returns a client for the current session, or `null` if signed out. Other
 * main-process modules (repo and issue sync) need a client but must never
 * see the raw token — this is the one sanctioned way to get one.
 */
export function getAuthenticatedClient(): GitHubClient | null {
  return currentToken ? createGitHubClient(currentToken) : null;
}
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass, 45 tests unchanged (these fetchers aren't called from anywhere yet, and `getAuthenticatedClient` isn't either — no test needed for either, matching this codebase's established convention that thin Electron/network-calling glue doesn't get unit tests, only pure logic does). If `client.paginate`'s actual call signature differs from what's used above, adjust to match — don't force it with `any`.

- [ ] **Step 5: Commit**

```bash
git add src/main/github/repos.ts src/main/github/issues.ts src/main/github/auth.ts
git commit -m "feat: add paginated GitHub fetchers for repos and issues"
```

---

### Task 10: Sync orchestration

**Files:**
- Create: `src/main/sync/initial-sync.ts`

- [ ] **Step 1: Write `src/main/sync/initial-sync.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { GitHubClient } from '../github/client';
import { fetchAllIssues } from '../github/issues';
import { isPullRequest, mapGitHubIssue } from '@shared/map-github-issue';
import { upsertIssues } from '../db/issues-queries';

/**
 * Fetches every issue for one repo (all pages, all states), filters out
 * pull requests, maps each to this app's `Issue` type, and upserts the
 * result into SQLite. This is a full sync, not incremental — Slice 4 adds
 * `since`/ETag-based incremental sync on top of this for repeat syncs.
 */
export async function syncRepoIssues(
  client: GitHubClient,
  db: BetterSQLite3Database,
  repoFullName: string,
): Promise<void> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Not a valid "owner/repo" full name: ${repoFullName}`);
  }
  const raw = await fetchAllIssues(client, owner, repo);
  const issues = raw.filter((item) => !isPullRequest(item)).map((item) => mapGitHubIssue(item, repoFullName));
  upsertIssues(db, issues);
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass, 45 tests unchanged. No test for this file — it's orchestration glue tying together a network fetcher, a pure mapper (already tested), and a DB upsert (already tested), matching the same "thin composition, no test" pattern already established for `sync`-adjacent main-process modules in this codebase.

- [ ] **Step 3: Commit**

```bash
git add src/main/sync/initial-sync.ts
git commit -m "feat: add the initial per-repo issue sync"
```

---

### Task 11: IPC handlers for repos and issues, wired into startup

**Files:**
- Create: `src/main/ipc/repos.ts`, `src/main/ipc/issues.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Write `src/main/ipc/repos.ts`**

```ts
import { ipcMain } from 'electron';
import { setTrackedInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { mapGitHubRepo } from '@shared/map-github-repo';
import { getDb } from '../db/client';
import { listRepos, upsertRepos, setTrackedRepos } from '../db/repos-queries';
import { getAuthenticatedClient } from '../github/auth';
import { fetchUserRepos } from '../github/repos';
import { syncRepoIssues } from '../sync/initial-sync';

export function registerReposHandlers(): void {
  ipcMain.handle(CHANNELS.reposList, async () => {
    const db = getDb();
    const client = getAuthenticatedClient();
    if (client) {
      try {
        const raw = await fetchUserRepos(client);
        upsertRepos(db, raw.map(mapGitHubRepo));
      } catch (error) {
        // A failed live refresh is not a reason to show nothing — this app
        // is offline-first (CLAUDE.md), so fall back to whatever's already
        // cached below.
        console.warn(
          'Failed to refresh the repo list from GitHub:',
          error instanceof Error ? error.message : error,
        );
      }
    }
    return listRepos(db);
  });

  ipcMain.handle(CHANNELS.reposSetTracked, async (_event, rawInput: unknown) => {
    const { repoIds } = setTrackedInput.parse(rawInput);
    const db = getDb();
    const newlyTrackedIds = new Set(setTrackedRepos(db, repoIds));
    const client = getAuthenticatedClient();
    if (client) {
      for (const repo of listRepos(db).filter((repo) => newlyTrackedIds.has(repo.id))) {
        try {
          await syncRepoIssues(client, db, repo.fullName);
        } catch (error) {
          // Tracking still succeeds even if the first sync fails (e.g.
          // offline) — the repo just starts with no cached issues until a
          // later successful sync. There's no abort-the-whole-operation
          // here, and no per-repo error surfaced to the renderer yet —
          // that's part of Slice 4's sync-status work.
          console.warn(
            `Failed to sync issues for ${repo.fullName}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
    return listRepos(db);
  });
}
```

- [ ] **Step 2: Write `src/main/ipc/issues.ts`**

```ts
import { ipcMain } from 'electron';
import { listIssuesInput, getIssueInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import { listIssues, getIssue } from '../db/issues-queries';

export function registerIssuesHandlers(): void {
  ipcMain.handle(CHANNELS.issuesList, async (_event, rawInput: unknown) => {
    // `search` is validated but intentionally unused — Slice 6 owns turning
    // it into a real filter. Until then this always returns every cached
    // issue for the repo, matching how `BoardScreen` already does its own
    // client-side text filtering.
    const { repoFullName } = listIssuesInput.parse(rawInput);
    return listIssues(getDb(), repoFullName);
  });

  ipcMain.handle(CHANNELS.issuesGet, async (_event, rawInput: unknown) => {
    const { repoFullName, number } = getIssueInput.parse(rawInput);
    return getIssue(getDb(), repoFullName, number);
  });
}
```

- [ ] **Step 3: Wire migrations and the new handlers into `src/main/index.ts`**

Read the current file first — it should look like this:

```ts
import { app, BrowserWindow } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';
import { registerAuthHandlers } from './ipc/auth';
import { restoreSession } from './github/auth';

if (squirrelStartup) {
  app.quit();
}

function start(): void {
  const window = createMainWindow();
  applyNavigationPolicy(window);
}

async function bootstrap(): Promise<void> {
  await restoreSession();
  registerAuthHandlers();
  start();
}

void app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});
```

Replace it with:

```ts
import { app, BrowserWindow } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';
import { registerAuthHandlers } from './ipc/auth';
import { registerReposHandlers } from './ipc/repos';
import { registerIssuesHandlers } from './ipc/issues';
import { restoreSession } from './github/auth';
import { runMigrations } from './db/client';

if (squirrelStartup) {
  app.quit();
}

function start(): void {
  const window = createMainWindow();
  applyNavigationPolicy(window);
}

async function bootstrap(): Promise<void> {
  // Migrations run before anything else touches the database — every
  // handler registered below can be invoked the instant the renderer loads,
  // so the schema must already be current.
  runMigrations();
  await restoreSession();
  registerAuthHandlers();
  registerReposHandlers();
  registerIssuesHandlers();
  start();
}

void app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass, 45 tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/repos.ts src/main/ipc/issues.ts src/main/index.ts
git commit -m "feat: wire the repos and issues IPC handlers, running migrations at startup"
```

---

### Task 12: Renderer — replace the repo and issue fixtures with real IPC data

**Files:**
- Modify: `src/renderer/App.tsx`

Do **not** run `npm start` or `npm run package` at the end of this task — only `npm run typecheck`, `npm run lint`, and `npm test`. Running the app or packaging it would trigger Electron Forge's native-module rebuild of `better-sqlite3` for Electron's ABI, which would then break `npm test` for the rest of this plan (see the "Decisions locked" section's note on the ABI gotcha). The one interactive launch check for this whole slice happens in Task 13, on purpose, as the very last thing before this plan's final ABI-restore step.

- [ ] **Step 1: Rewrite `src/renderer/App.tsx`**

Read the current file first — it should match Slice 2's final state (the auth gate, `SidebarRail` with `user`/`onSignOut`, still importing `repos`/`issues` from `@/lib/fixtures`).

Replace it with:

```tsx
import { useEffect, useState } from 'react';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import type { Issue, Repo, SyncStatus, User } from '@shared/types';
import { TitleBar } from '@/components/shell/TitleBar';
import { SidebarRail, type ScreenId } from '@/components/shell/SidebarRail';
import { RepoTabs } from '@/components/shell/RepoTabs';
import { StateBanner } from '@/components/shell/StateBanner';
import { PlaceholderScreen } from '@/features/PlaceholderScreen';
import { BoardScreen } from '@/features/board/BoardScreen';
import { RepoPickerDialog } from '@/features/repos/RepoPickerDialog';
import { EmptyState } from '@/features/repos/EmptyState';
import { IssueDetailDialog } from '@/features/issues/IssueDetailDialog';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { StateGallery } from '@/features/StateGallery';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { DeviceCodeScreen } from '@/features/auth/DeviceCodeScreen';
import { searchResults, syncStatus as initialStatus } from '@/lib/fixtures';

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceFlowStarted | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  const [screen, setScreen] = useState<ScreenId>('board');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const tracked = repos.filter((repo) => repo.tracked);
  // A stable primitive to key the repo-loading effect on, instead of the
  // `user` object itself — `getCurrentUser()` returns a freshly mapped
  // object on every call, so keying on object identity would refetch the
  // repo list on every `auth:updated` event even for the same signed-in
  // person.
  const userLogin = user?.login ?? null;

  useEffect(() => {
    void window.api.auth
      .getUser()
      .then(setUser)
      .catch(() => {
        setAuthError('Could not check sign-in status');
      })
      .finally(() => setAuthChecked(true));

    return window.api.auth.onUpdated(() => {
      void window.api.auth
        .getUser()
        .then((next) => {
          setUser(next);
          if (next) setDeviceCode(null);
        })
        .catch((error: unknown) => {
          console.error('Failed to refresh sign-in status', error);
        });
    });
  }, []);

  useEffect(() => {
    if (!userLogin) return;
    setReposLoading(true);
    void window.api.repos
      .list()
      .then((next) => {
        setRepos(next);
        setActiveRepo((current) => current ?? next.find((repo) => repo.tracked)?.fullName ?? null);
      })
      .catch((error: unknown) => {
        console.error('Failed to load repositories', error);
      })
      .finally(() => setReposLoading(false));
  }, [userLogin]);

  useEffect(() => {
    if (!activeRepo) {
      setIssues([]);
      return;
    }
    setIssuesLoading(true);
    void window.api.issues
      .list({ repoFullName: activeRepo })
      .then(setIssues)
      .catch((error: unknown) => {
        console.error('Failed to load issues', error);
      })
      .finally(() => setIssuesLoading(false));
  }, [activeRepo]);

  function handleUseToken(token: string) {
    setAuthBusy(true);
    setAuthError(undefined);
    void window.api.auth
      .signInWithToken({ token })
      .then(setUser)
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Sign-in failed');
      })
      .finally(() => setAuthBusy(false));
  }

  function handleUseDeviceFlow() {
    setAuthBusy(true);
    setAuthError(undefined);
    void window.api.auth
      .startDeviceFlow()
      .then(setDeviceCode)
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Could not start device flow');
      })
      .finally(() => setAuthBusy(false));
  }

  function handleSignOut() {
    void window.api.auth
      .signOut()
      .then(() => {
        setUser(null);
        setAuthError(undefined);
        setDeviceCode(null);
      })
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'Sign-out failed');
      });
  }

  function untrack(fullName: string) {
    const repoIds = repos
      .filter((repo) => repo.tracked && repo.fullName !== fullName)
      .map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((next) => {
        setRepos(next);
        setActiveRepo((current) =>
          current === fullName ? (next.find((repo) => repo.tracked)?.fullName ?? null) : current,
        );
      })
      .catch((error: unknown) => {
        console.error('Failed to untrack repository', error);
      });
  }

  function confirmTracked(next: Repo[]) {
    const repoIds = next.filter((repo) => repo.tracked).map((repo) => repo.id);
    void window.api.repos
      .setTracked({ repoIds })
      .then((updated) => {
        setRepos(updated);
        setActiveRepo((current) => current ?? updated.find((repo) => repo.tracked)?.fullName ?? null);
        setPickerOpen(false);
      })
      .catch((error: unknown) => {
        console.error('Failed to update tracked repositories', error);
      });
  }

  if (!authChecked) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-app">
        <span className="font-display text-title-m text-text-muted">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-surface-app">
        {deviceCode ? (
          <DeviceCodeScreen
            userCode={deviceCode.userCode}
            verificationUri={deviceCode.verificationUri}
            onCancel={() => setDeviceCode(null)}
          />
        ) : (
          <SignInScreen
            onUseToken={handleUseToken}
            onUseDeviceFlow={handleUseDeviceFlow}
            error={authError}
            busy={authBusy}
          />
        )}
      </div>
    );
  }

  if (reposLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-app">
        <span className="font-display text-title-m text-text-muted">Loading your repositories…</span>
      </div>
    );
  }

  const activeFullName = activeRepo ?? tracked[0]?.fullName ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar status={status} onSync={() => setStatus({ kind: 'syncing' })} />

      {tracked.length === 0 ? (
        <EmptyState onTrack={() => setPickerOpen(true)} userLogin={user.login} />
      ) : (
        <>
          <RepoTabs
            repos={tracked}
            activeFullName={activeFullName}
            onSelect={setActiveRepo}
            onUntrack={untrack}
            onAdd={() => setPickerOpen(true)}
          />
          {import.meta.env.DEV ? (
            <div className="px-5 pt-4">
              <StateGallery
                onPick={setStatus}
                loading={devLoading}
                onToggleLoading={() => setDevLoading((current) => !current)}
              />
            </div>
          ) : null}
          <StateBanner status={status} onRetry={() => setStatus({ kind: 'syncing' })} />
          <div className="flex min-h-0 flex-1 gap-4 px-5 pb-6 pt-4">
            <SidebarRail active={screen} onSelect={setScreen} user={user} onSignOut={handleSignOut} />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {screen === 'board' ? (
                <BoardScreen
                  repoFullName={activeFullName}
                  issues={issues}
                  loading={issuesLoading || devLoading}
                  onOpenIssue={setOpenIssue}
                />
              ) : null}
              {screen === 'search' ? <SearchScreen results={searchResults} /> : null}
              {screen === 'settings' ? <SettingsScreen /> : null}
              {screen === 'milestones' ? <PlaceholderScreen title="Milestones" /> : null}
              {screen === 'people' ? <PlaceholderScreen title="People" /> : null}
            </main>
          </div>
        </>
      )}

      <RepoPickerDialog
        open={pickerOpen}
        repos={repos}
        userLogin={user.login}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmTracked}
      />
      <IssueDetailDialog issue={openIssue} onClose={() => setOpenIssue(null)} />
    </div>
  );
}
```

Notes on this rewrite, for the implementer's own sanity check while working through it:
- `repos`/`issues` are no longer imported from `@/lib/fixtures` — only `searchResults`/`syncStatus` remain (cross-repo search stays on fixtures until Slice 6, per this plan's "Decisions locked" section).
- The dev-only loading toggle was renamed `devLoading` (was `loading`) so it doesn't collide with the new, real `issuesLoading` state; `BoardScreen`'s `loading` prop is now `issuesLoading || devLoading`, so both the real fetch and the manual QA toggle still work.
- `activeFullName` falls back through `activeRepo ?? tracked[0]?.fullName ?? ''` rather than a non-null assertion, consistent with this codebase's existing style (e.g. `BoardScreen`'s `repoFullName.split('/')[1] ?? repoFullName`) under `noUncheckedIndexedAccess`.

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all three pass, 45 tests unchanged (this task changes no test files).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: load real repos and issues from SQLite via IPC, replacing the Slice 1 fixtures"
```

---

### Task 13: Final verification, packaging proof, ABI restore, and the owner's manual test script

**Files:** none for code — this task verifies, restores the native-module ABI, and updates `CLAUDE.md`.

- [ ] **Step 1: Run every check**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all clean, 45 tests.

- [ ] **Step 2: Verify the packaged app actually includes and can run the migrations**

```bash
npm run package
```

This is the first command in this whole plan that triggers Electron Forge's native-module rebuild of `better-sqlite3` — expected, and the reason this check is placed last. Confirm the build completes without error, and that the migrations folder landed where `db/client.ts`'s `migrationsFolder()` expects it in a packaged build:

```bash
find out -iname "*.sql" -path "*drizzle*"
```

Expected: at least one `.sql` file found under the packaged app's resources directory. If it's missing, `extraResource` in `forge.config.ts` didn't work as expected — stop and report BLOCKED with what you found, don't proceed to the ABI-restore step with a broken package.

- [ ] **Step 3: Launch and confirm no console errors**

```bash
npm start
```

Same headless-environment caveat as every prior slice's final task — confirm what you can (process launches, both Vite dev servers connect, no uncaught JS errors in the renderer console), and state plainly what requires a real display and a real signed-in GitHub session to see (the actual repo picker populated with real repos, a tracked repo's issues appearing on the board).

- [ ] **Step 4: Restore the native-module ABI for `npm test`**

`npm run package` and `npm start` both just rebuilt `better-sqlite3` for Electron's ABI. Restore plain-Node compatibility:

```bash
npm rebuild better-sqlite3
```

- [ ] **Step 5: Confirm the repo is left in a fully green, testable state**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all clean, 45 tests — proving the ABI restore worked and this plan doesn't leave the repository in a state where `npm test` mysteriously fails for the next person (or CI) to touch it.

- [ ] **Step 6: Write the manual test script into the report**

```markdown
## Manual test script (run this yourself — no automated check can)

1. `npm start`, sign in (however you signed in last — the session should already be there from Slice 2's testing).
2. You should land on "Loading your repositories…" briefly, then either the empty-state screen ("No repositories tracked") or your previously-tracked repos, if any survived from earlier fixture-era testing (they won't have — this is real data now, so expect the empty state on first run).
3. Click "Track a repository." The picker should show your actual GitHub repositories, not the fixture ones (`acme/atlas-web` etc. should be gone unless you happen to own a repo with that name).
4. Select one or two repos with a modest number of issues and save. You should land on the board with real issue cards from that repo — real titles, real labels-derived bug/feature/chore columns, real assignees' avatars where GitHub has one on file.
5. Click an issue card. The detail dialog should show the real title, real markdown body, and "Open on GitHub" should actually open the right issue in your browser.
6. Quit the app entirely and relaunch. The same tracked repos and their issues should still be there — this is the SQLite cache doing its job.
7. **Turn off Wi-Fi, then relaunch again.** The board should still show the same issues (read from SQLite, no network needed) — this is the actual "Done when" criterion for this slice.
8. Turn Wi-Fi back on. In the repo picker, untrack one of the two repos (uncheck it and save, or use the "×" on its tab). It should disappear from the tabs immediately.
9. Track a *different* repo you own. It should sync fresh and its issues should appear on the board within a few seconds.
```

- [ ] **Step 7: Tick Slice 3 in the CLAUDE.md Roadmap**

Change `- [ ] **Slice 3 — Repos + first sync.` to `- [x] **Slice 3 — Repos + first sync.` in `CLAUDE.md`'s Roadmap section. Do not touch any other slice's checkbox.

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: tick off Slice 3 in the roadmap"
git tag slice-3
```

---

## What the owner needs to do after this plan completes

Run the manual test script in Task 13, especially step 7 (the offline relaunch) — that's this slice's entire reason for existing.

## Known limitations, by design

- Tracking a repo while offline still marks it tracked, but its first issue sync silently fails — the repo shows an empty board until a later slice's sync succeeds. No error is surfaced to the user for this in Slice 3.
- `issues.list()` never re-fetches from GitHub on its own — issues only refresh when a repo is newly tracked. There is no polling, no "sync now" that does anything real yet, and no way to manually force a re-sync of an already-tracked repo's issues. All of that is Slice 4.
- `repos.list()`'s live refresh has no timeout or cancellation — if GitHub is slow to respond, opening the repo picker (or any point that re-triggers a repo list load) will simply wait. Slice 4's throttling/rate-limit work is the natural place to reconsider this.
- A rejected `repos.list()`/`issues.list()` IPC call (as opposed to a failed live GitHub refresh, which the main process already catches and falls back to cache for) renders as a false empty state in the renderer — indistinguishable from "you legitimately have no tracked repos" or "this repo has no open issues." This can only happen on a local SQLite/IPC-layer failure itself, not a GitHub outage, so it's a narrow, low-probability gap — but there's no dedicated error UI for it yet. Worth adding if it turns out to matter in practice.
- The DB file (`issue-desk.db`, in `app.getPath('userData')`) has no backup or export mechanism. If it's deleted, the next launch just re-syncs everything tracked from scratch (assuming the app is online) — not data loss in the sense of losing anything GitHub doesn't already have, except local-only `subtasks`, which don't exist yet either.
