# Issue Desk — Project Rules for Claude Code

Issue Desk (working name) is a desktop app for managing GitHub Issues on **Windows and macOS**.
GitHub is always the source of truth. The app keeps a local SQLite cache so it opens instantly and can be read offline.
Edits are written to GitHub immediately.

## How the owner works (read this first)

The owner **vibe codes** and does not review code line by line. That means you are responsible for verifying your own work.

- Before you say a task is done, run `npm run typecheck`, `npm run lint`, and `npm test`. All three must pass. Fix any failures, and report anything you could not fix.
- Never hide problems. Do not use `any`, `@ts-ignore`, `eslint-disable`, or skipped tests to make checks pass.
- Work one slice at a time (see Roadmap). After each slice passes its checks, commit it with a clear message.
- End every slice with:
  1. a plain-language summary,
  2. step-by-step manual test instructions (what to click and what should happen),
  3. known issues and open questions.
- Ask before you: add a dependency that isn't in the stack below, change the architecture, or write a migration that drops or rewrites data.
- Keep this file up to date. Record pinned versions and important decisions in the "Decisions log" at the bottom.

## Tech stack

When scaffolding, install the **latest stable** version of each package, pin exact versions (no `^`), and record them in the Decisions log.

- **Shell:** Electron, scaffolded with the Electron Forge **Vite + TypeScript** template
- **UI:** React, Tailwind CSS, shadcn/ui, lucide-react icons
- **UI data state:** TanStack Query
- **GitHub:** Octokit (`@octokit/rest`, `@octokit/plugin-throttling`, `@octokit/plugin-retry`, `@octokit/auth-oauth-device`)
- **Local cache:** SQLite via `better-sqlite3` + Drizzle ORM (with migrations)
- **Validation:** zod (for all IPC inputs)
- **Markdown:** `react-markdown` + `remark-gfm` + `rehype-sanitize`
- **Tests:** Vitest
- **Quality:** TypeScript `strict: true`, ESLint, Prettier

## Architecture

The process boundary is the most important rule in this project.

- **Main process (Node):** owns the GitHub token, all network calls, SQLite, and the sync engine.
- **Renderer (React):** UI only. It never touches the token, the network, or the database directly.
- **Preload:** uses `contextBridge` to expose a typed `window.api` with specific named functions. Never expose `ipcRenderer` itself.
- **IPC contract:** every channel and payload type is defined once in `src/shared/ipc-contract.ts`. The main process validates every incoming payload with zod.
- **Push updates:** after a sync changes data, the main process emits `sync:updated` with the repo id. The renderer then invalidates the matching TanStack Query keys.

```
design/               Claude Design handoff bundle — READ-ONLY reference, never edit
src/
  main/
    github/           Octokit client, auth (device flow + PAT), API wrappers
    db/               Drizzle schema, migrations, queries
    sync/             sync engine: pure functions + scheduler
    ipc/              IPC handlers, one file per domain
    secure-store.ts   token storage via safeStorage
  preload/index.ts    contextBridge -> window.api
  renderer/
    components/ui/    shadcn components
    features/         auth, repos, issues, settings
    lib/
  shared/             ipc-contract.ts, shared types
tests/
```

## Security rules (never break these)

- BrowserWindow settings must be `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Store the token with Electron `safeStorage` (check `isEncryptionAvailable()` first) as an encrypted file in `app.getPath('userData')`. Never keep it in SQLite or localStorage, never send it to the renderer, and never log it.
- Issue and comment content is **untrusted**. Always render markdown through `rehype-sanitize`. Never use `rehype-raw` or `dangerouslySetInnerHTML` without sanitizing.
- Every link must open in the user's default browser. Use `setWindowOpenHandler`, allow only `https:` URLs, open them with `shell.openExternal`, and block `will-navigate`.
- Set a strict Content-Security-Policy in `index.html`.

## Implementing the Claude Design handoff

- `design/` is the **visual source of truth**: layout, spacing, colors, typography, and how components look.
- Extract the design tokens first (colors, font, radius, spacing, shadows). Put them in CSS variables and the Tailwind theme, and map them onto the shadcn theme variables.
- Rebuild every screen as clean React components, using shadcn primitives restyled to match the design. **Do not paste the prototype's HTML or JS into the app.**
- The mock data in the design becomes typed fixtures in `src/renderer/lib/fixtures.ts`. From Slice 3 onward, real IPC data replaces the fixtures.
- Every data view needs loading (skeleton), empty, error, offline, and rate-limited states. If the design doesn't include a state, create it in the same visual style and list it in your summary.
- Desktop details:
  - Keyboard shortcuts use `Cmd` on macOS and `Ctrl` on Windows.
  - If the design has a custom title bar, handle both the macOS traffic lights (`titleBarStyle: 'hiddenInset'`) and the Windows controls.
  - Support light and dark mode if the design includes both.
- If the design conflicts with this file: **the design wins on visuals; this file wins on architecture and security.** If it's unclear, ask.

## GitHub sync rules

- **Auth:** support two options:
  - A Personal Access Token input, for development.
  - The OAuth **Device Flow**. It needs a GitHub OAuth App with "Enable Device Flow" checked; ask the owner for the Client ID. Scopes: `repo`, `read:user`.
- **Initial sync** for each tracked repo: `GET /repos/{owner}/{repo}/issues?state=all&per_page=100`, paginated with `octokit.paginate`. Upsert the results into SQLite.
- **Filter out pull requests.** The issues endpoint also returns PRs; skip any item that has a `pull_request` field.
- **Incremental sync:** add `since=<cursor>&sort=updated&direction=asc`.
  - The cursor is the **maximum `updated_at` seen from GitHub**, never the local clock.
  - Upserts must be idempotent, because `since` can return items you already have.
- **Conditional requests:** store the `ETag` for each request URL and send `If-None-Match`. A 304 means nothing changed and does not count against the rate limit.
- **Polling schedule:**
  - Active repo: every 60 s while the window is focused.
  - Other tracked repos: every 5 min.
  - Sync immediately when the window regains focus.
  - Pause polling while offline.
- **Rate limits:** use the throttling plugin, and show a rate-limited state in the UI when throttled.
- **Comments:** fetch them when an issue is opened and cache them. Do not background-sync every comment.
- **Deleted or moved issues:** a 404 or 410 means deleted (remove it from the cache). A 301 means transferred (follow it or remove it).
- **Writes:** the renderer calls IPC, the main process calls the GitHub API, and on success the main process upserts the **returned** issue into SQLite.
  - The renderer uses TanStack Query optimistic updates, with rollback and an error toast on failure.
  - Writes are disabled while offline (MVP).
- **Edit conflicts:** when the user starts editing a body, record `updated_at`. Before saving, re-fetch the issue. If it changed on GitHub in the meantime, warn the user and let them choose to overwrite or reload.
- **Keep the sync logic in pure, unit-tested functions:** cursor math, PR filtering, merge and upsert, and ETag handling.

## Known gotchas

- **`better-sqlite3` is a native module:**
  - Mark it `external` in the Vite main-process config.
  - Make sure Electron Forge rebuilds it for Electron.
  - A `NODE_MODULE_VERSION` error means the rebuild didn't happen.
- **Drizzle migrations** must be included in the packaged app and run at startup.
- **`safeStorage`** only works after the app's `ready` event.
- **macOS builds** must run on a macOS machine or CI runner. Unsigned builds show a Gatekeeper warning on macOS and a SmartScreen warning on Windows, which is acceptable for now.

## Roadmap (one slice per session; check it off when done)

- [ ] **Slice 0 — Scaffold.** Set up Forge (Vite + TS), React, Tailwind, shadcn, strict TS, ESLint, Prettier, Vitest, and scripts. Add GitHub Actions CI that runs typecheck, lint, and test on `windows-latest` and `macos-latest`.
  *Done when:* `npm start` opens a window and all checks pass.
- [ ] **Slice 1 — Design system + static UI.** Extract tokens, build the app shell, and build every design screen using fixtures. Add stubs for the typed IPC contract and all UI states.
  *Done when:* every screen from `design/` is reachable and visually matches.
- [ ] **Slice 2 — Auth.** Add PAT login, then Device Flow. Store the token with safeStorage. Show the user's avatar and name, and add sign-out.
  *Done when:* login survives a restart, and sign-out clears the token.
- [ ] **Slice 3 — Repos + first sync.** Let the user pick tracked repos from their repo list. Run the initial sync into SQLite. The issue list reads from SQLite through IPC.
  *Done when:* after quitting and reopening the app **offline**, issues still show.
- [ ] **Slice 4 — Live sync.** Add `since` + ETag syncing, the polling schedule, rate-limit handling, a sync-status indicator, offline detection, and unit tests.
  *Done when:* an issue edited on github.com shows up in the app within about 60 s.
- [ ] **Slice 5 — Issue detail + edits.** Load comments. Support editing the title and body, open/close (with `state_reason`), labels, assignees, and adding comments. Use optimistic updates with rollback, plus the conflict check.
  *Done when:* edits appear on github.com, and a failed edit rolls back with an error toast.
- [ ] **Slice 6 — Create + find.** Add new-issue creation, local search/filter/sort using SQLite queries, and keyboard shortcuts.
- [ ] **Slice 7 — Release.** Add app icons and Forge makers (Windows installer and macOS DMG). Add a GitHub Actions release workflow that builds on version tags.
  *Done when:* installers downloaded from GitHub Releases install and run on both OSes.

## Commands (fill in after Slice 0)

- `npm start` — run the app in dev mode
- `npm run typecheck` / `npm run lint` / `npm test`
- `npm run make` — build installers

## Decisions log

<!-- Record pinned versions and key decisions here, newest first. -->
