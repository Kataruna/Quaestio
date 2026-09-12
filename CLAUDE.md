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

- [x] **Slice 0 — Scaffold.** Set up Forge (Vite + TS), React, Tailwind, shadcn, strict TS, ESLint, Prettier, Vitest, and scripts. Add GitHub Actions CI that runs typecheck, lint, and test on `windows-latest` and `macos-latest`.
  *Done when:* `npm start` opens a window and all checks pass.
- [x] **Slice 1 — Design system + static UI.** Extract tokens, build the app shell, and build every design screen using fixtures. Add stubs for the typed IPC contract and all UI states.
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

### Slice 1 — Design system and static UI (2026-09-12)

- **Board layout is columns by type** (design 1a). The dense-row alternative (1c) was explored in the handoff and not built.
- **One card treatment: the notch tab** (design 1b-A). B and C were alternatives, not additional components.
- **Screens not in the handoff, built in the same visual language:** sign-in (PAT + device flow), device-code screen, loading skeletons, offline / rate-limited / sync-error banners, and placeholder screens for the Milestones and People rail destinations, which the design lists (in the sidebar rail data) but never draws as a screen.
- **Modals use the native `<dialog>` element** (`src/renderer/components/ui/dialog.tsx`, using `showModal()`/`close()` and a backdrop click handler) for focus trapping and Escape handling, rather than a dialog dependency.
- **Screen routing is local component state** (`useState<ScreenId>` in `App.tsx`). Five destinations does not justify a router, and no router package is installed.
- **The Slice 0 decision to hand-write design-system primitives held for the whole slice:** `src/renderer/components/ui/` has 14 hand-written files, not `shadcn init` output — 13 from the initial primitives pass plus `dialog.tsx` added later for the modal work.
- **Two components reset local state from a changed prop by comparing against a stored previous value during render, not via a `useEffect` that calls `setState`:** `RepoPickerDialog` re-seeds `selected`/`filter` when `open` flips closed→open, and `IssueDetailDialog` re-seeds `subtasks` when the `issue` prop changes. Both compare the new prop to a `prevX` state variable inside the render body and call `setState` synchronously when it differs, instead of an effect — `eslint-plugin-react-hooks`'s `set-state-in-effect` rule (in the `recommended` config since Task 5) flags the effect-based version as a cascading-render risk, and CLAUDE.md forbids `eslint-disable`. Reuse this pattern for any future component that needs to re-seed state when a prop changes.
- **A dev-only state gallery** (`src/renderer/features/StateGallery.tsx`, gated on `import.meta.env.DEV` in `App.tsx`) makes every sync state (synced/syncing/offline/rate-limited/error) and the board loading skeleton reachable for visual review. It is not present in packaged builds.

### Slice 0 — Scaffold (2026-09-12)

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| electron | 44.3.0 |
| @electron-forge/cli | 7.11.2 |
| react / react-dom | 19.3.0 |
| typescript | 6.0.3 |
| typescript-eslint | 8.70.0 |
| tailwindcss | 4.3.3 |
| vite | 5.4.21 |
| @vitejs/plugin-react | 5.2.0 |
| vitest | 3.2.7 |
| eslint | 10.10.0 |
| zod | 4.6.2 |
| @tanstack/react-query | 5.102.8 |
| react-markdown | 10.1.0 |
| remark-gfm | 4.0.1 |
| rehype-sanitize | 6.0.0 |

**Decisions:**

- **`typescript` is pinned to `6.0.3`, not npm's `latest` (which resolves to `7.0.2`).** TypeScript 7 is the native Go-port compiler rewrite. `typescript-eslint@8.70.0` (needed for ESLint's type-aware flat-config linting) declares a peer range of `typescript: ">=4.8.4 <6.1.0"` — TS7 falls entirely outside it, and the failure is a hard crash in `typescript-eslint`'s type-utils, not a soft warning. `6.0.3` is the highest stable release still inside `typescript-eslint`'s supported range. Separately: TypeScript 6.0.3 itself already deprecates `baseUrl` (TS5101) ahead of its removal in TS 7.0 (TS5102); the project uses relative `paths` with no `baseUrl` instead — the fix TS's own error message prescribes, not a workaround unique to avoiding TS7.
- **`vitest` is pinned to `3.2.7`, not npm's `latest` (which resolves to `5.0.0`).** Vitest 5's own `vite` dependency requires `^6.4.0 || ^7.0.0 || ^8.0.0`; this project's `vite` is pinned to `5.4.21` (the version the Electron Forge template installed in Task 1; both the React and Tailwind Vite plugins were separately checked to admit that version before being installed, rather than the pin being chosen to satisfy them). `3.2.7`'s own `vite` dependency (`^5.0.0 || ^6.0.0 || ^7.0.0-0`) is the highest Vitest line that still admits the pinned `5.x`, so `npm ls vite` resolves to a single deduped installation rather than two.
- **`@vitejs/plugin-react` is pinned to `5.2.0`, not npm's `latest` (6.x)**, for the same reason as above — 6.x requires `vite@^8`, incompatible with the pinned `5.4.21`.
- **`vite.renderer.config.mts` is a `.mts` file, not `.ts`.** `@vitejs/plugin-react` ships pure ESM with no CommonJS export, and `package.json` has no `"type": "module"`. Vite's config loader would otherwise bundle a plain `.ts` config as CommonJS, and the ESM-only plugin would fail to load. The `.mts` extension is Vite's own documented fix; `vite.main.config.ts` and `vite.preload.config.ts` stay `.ts` since neither loads an ESM-only plugin.
- **The template's ESLint 8 / `.eslintrc.json` / `@typescript-eslint@5.62.0` setup was fully removed, not upgraded in place** — replaced with ESLint's flat-config system (`eslint.config.js`) and the combined `typescript-eslint@8.70.0` package, because the two toolchains cannot coexist safely and the type-aware linting this project wants requires the newer setup.
- **Fonts are self-hosted via `@fontsource`/`@fontsource-variable` packages, not loaded from Google Fonts as the design handoff bundle originally specified.** A remote font `@import` would violate the strict Content-Security-Policy `index.html` sets and would break the app's offline-launch requirement.
- **Design-system primitives (Button, Badge, Avatar, etc.) will be hand-written into shadcn's conventional file layout, not generated by `shadcn init`.** shadcn's default components ship styled for a different visual system (smaller corner radius, different color-variable naming) and would need every variant rewritten to match this project's design anyway.
- **`better-sqlite3` and Drizzle are deliberately not installed yet.** Slices 0–1 have no database — the UI runs on typed fixtures. Installing a native module before anything uses it would add Electron-native-rebuild risk to a CI setup that doesn't need it yet; it arrives in Slice 3.
- **The CI workflow rewrites git URLs from SSH to HTTPS before `npm ci`.** The Electron Forge template's lockfile resolves one transitive dependency (`@electron/node-gyp`) over `git+ssh://git@github.com/...`, which an unauthenticated GitHub Actions runner cannot clone. `.github/workflows/ci.yml` adds a `git config --global url."https://github.com/".insteadOf ssh://git@github.com/` step before `npm ci` to work around this.
- **The main and preload build entries need explicit, distinct output filenames.** When Task 2 restructured both entry files to `src/main/index.ts` and `src/preload/index.ts`, the Forge Vite plugin's default output naming (`[name].js`, derived from the entry's basename) made both targets write to the same file in the shared `.vite/build/` directory — silently dropping the preload bundle with no build error and no runtime error (`window.api` would simply never reach the renderer). `vite.main.config.ts` and `vite.preload.config.ts` now set explicit, distinct filenames (`main.js` and `preload.js`) to prevent this from recurring if the entry paths are ever touched again.
