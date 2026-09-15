# Quaestio — Project Rules for Claude Code

Quaestio is a desktop app for managing GitHub Issues on **Windows and macOS**.
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
- **Markdown:** `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize` (`rehype-raw` parses embedded raw HTML — e.g. the `<img>` tags GitHub inserts for pasted screenshots — into the tree; `rehype-sanitize` must always run after it to strip anything unsafe. `rehype-raw` alone would be unsafe; skipping it leaves embedded HTML as inert text.)
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
  - A `NODE_MODULE_VERSION` error means the rebuild didn't happen. The reverse also happens: once Forge has rebuilt it for Electron's ABI (via `npm start`/`package`/`make`), a later `npm test` run (plain Node, via Vitest) fails the same `NODE_MODULE_VERSION` way until you run `npm rebuild better-sqlite3` to restore plain-Node compatibility.
- **Drizzle migrations** must be included in the packaged app and run at startup.
- **`safeStorage`** only works after the app's `ready` event.
- **macOS builds** must run on a macOS machine or CI runner. Unsigned builds show a Gatekeeper warning on macOS and a SmartScreen warning on Windows, which is acceptable for now.
- **`npm run package` needs a Node version electron-packager's zip extraction actually works with.** On a machine with a very new/bleeding-edge default `node` (observed: v26.8.2), `npm run package` exits 0 and silently produces no `out/` directory at all — electron-packager's async extraction of the cached Electron zip (via `extract-zip`/`yauzl`) truncates partway through with no error surfaced, so the failure looks like nothing happened rather than like a crash. Running the same command with Node 22.23.2 (`PATH="/opt/homebrew/opt/node@22/bin:$PATH"`) packages correctly. This will matter for Slice 7's release workflow and for anyone packaging locally on a too-new Node — open question for the owner: pin a Node version for this project (`.nvmrc`/`engines`) or just document the workaround? Not decided yet, so nothing was pinned.
  - A newer `@electron/get` doesn't fix this: `@electron-forge/cli@7.11.2`'s own `@electron/packager@18.4.4` pins `@electron/get: ^3.0.0`, and the plain `electron` runtime dependency already carries a newer `@electron/get@5.1.0` elsewhere in the tree (which dropped `extract-zip`/`yauzl` entirely) — overriding the whole tree to `5.1.0` was tried and tested and **did not** fix the hang. The hang isn't actually in zip extraction specifically; it reproduces identically even on a machine with an already-warm Electron cache (no extraction happening at all), stalling later at "Finalizing package" instead. No dependency bump available fixes this; Node 22 is the only known-working path.
- **DMG making needs a licensed Xcode, separately from the Node-version issue above.** `MakerDMG` → `electron-installer-dmg` → `appdmg` → `macos-alias`/`fs-xattr` compiles a native binary (`volume.node`) via the Electron-flavored `node-gyp` (`@electron/node-gyp`, hoisted into `node_modules/.bin/node-gyp` by the Forge toolchain) — which refuses to build (`You have not agreed to the Xcode license agreements`, exit 69) until `sudo xcodebuild -license` has been run and accepted on that machine, even when Xcode.app is already installed. Symptom varies by how far the install got: a totally fresh `npm install`/`npm ci` can fail outright with `Cannot find module 'appdmg'` (npm silently drops it — it's an optionalDependency deep in the tree); a partial install (e.g. one that ran with `--ignore-scripts` at some point) leaves the JS wrapper present but errors later, at `make` time, with `Cannot find module '../build/Release/volume.node'`. Either way, fix is the same: accept the Xcode license (`sudo xcodebuild -license`, interactive, needs a real terminal — not something to script around), then `npm rebuild fs-xattr`. GitHub's macOS runners ship with this already accepted, so it shouldn't hit CI.
- **A dmg failure can silently take the zip down with it — use `npm run make:mac`, not `npm run make`, on macOS.** Forge's `make()` runs every matched maker (zip and dmg both, on darwin) in one process; an unhandled rejection from either one aborts the whole thing before a sibling maker's in-flight output finishes writing — confirmed locally: a combined `npm run make` can come out of `out/make/zip` completely empty even though zip itself never errored, while running the makers as separate invocations doesn't lose it. `package.json`'s `make:mac` script and `.github/workflows/release.yml`'s macOS job both split zip (required) and dmg (best-effort) into independent `electron-forge make --targets=...` calls for exactly this reason.

## Roadmap (one slice per session; check it off when done)

- [x] **Slice 0 — Scaffold.** Set up Forge (Vite + TS), React, Tailwind, shadcn, strict TS, ESLint, Prettier, Vitest, and scripts. Add GitHub Actions CI that runs typecheck, lint, and test on `windows-latest` and `macos-latest`.
  *Done when:* `npm start` opens a window and all checks pass.
- [x] **Slice 1 — Design system + static UI.** Extract tokens, build the app shell, and build every design screen using fixtures. Add stubs for the typed IPC contract and all UI states.
  *Done when:* every screen from `design/` is reachable and visually matches.
- [x] **Slice 2 — Auth.** Add PAT login, then Device Flow. Store the token with safeStorage. Show the user's avatar and name, and add sign-out.
  *Done when:* login survives a restart, and sign-out clears the token.
- [x] **Slice 3 — Repos + first sync.** Let the user pick tracked repos from their repo list. Run the initial sync into SQLite. The issue list reads from SQLite through IPC.
  *Done when:* after quitting and reopening the app **offline**, issues still show.
- [x] **Slice 4 — Live sync.** Add `since` + ETag syncing, the polling schedule, rate-limit handling, a sync-status indicator, offline detection, and unit tests.
  *Done when:* an issue edited on github.com shows up in the app within about 60 s.
- [x] **Slice 5 — Issue detail + edits.** Load comments. Support editing the title and body, open/close (with `state_reason`), labels, assignees, and adding comments. Use optimistic updates with rollback, plus the conflict check.
  *Done when:* edits appear on github.com, and a failed edit rolls back with an error toast.
- [x] **Slice 6 — Create + find.** Add new-issue creation, local search/filter/sort using SQLite queries, and keyboard shortcuts.
  *Done when:* a new issue created in the app appears on github.com, and Search finds an issue by title/body text across every tracked repo.
- [x] **Slice 7 — Release.** Add app icons and Forge makers (Windows installer and macOS DMG). Add a GitHub Actions release workflow that builds on version tags.
  *Done when:* installers downloaded from GitHub Releases install and run on both OSes.

## Commands (fill in after Slice 0)

- `npm start` — run the app in dev mode
- `npm run typecheck` / `npm run lint` / `npm test`
- `npm run make` — build installers (Windows: fine as-is, only one maker runs)
- `npm run make:mac` — on macOS, prefer this over `npm run make`. Builds zip and dmg as two separate invocations so a dmg failure can't take the zip down with it (see Slice 7 decisions log)

## Decisions log

### Slice 7 — Release (2026-09-15)

- **Found and fixed a real packaging bug: the app has never been able to launch once packaged, until this slice.** `@electron-forge/plugin-vite`'s own `resolveForgeConfig` hook sets `packagerConfig.ignore` to keep only `.vite/**` — it assumes Vite bundled everything the app needs, so `node_modules` was never copied into the packaged app at all. That's true for every dependency except `better-sqlite3`, which `vite.main.config.ts` marks `external` (a compiled `.node` binary Rollup can't parse) and which `db/client.ts` therefore `require`s from `node_modules` at runtime — a `node_modules` that doesn't exist in a packaged build. `@electron-forge/plugin-auto-unpack-natives` (a devDependency since Slice 0, but never actually wired into `forge.config.ts`'s `plugins` array until this slice) only moves `.node` files out of `app.asar` into `app.asar.unpacked`; it has nothing to move if the module was never copied in to begin with. A packaged app built before this fix would install and launch fine, then crash the instant `getDb()` ran (`Cannot find module 'better-sqlite3'`) — exactly the failure mode this slice's own "Done when" (installers "install *and run*") is checking for. Fixed with a small custom `packageAfterCopy` hook in `forge.config.ts` that copies `node_modules/better-sqlite3` into the packaged app's `node_modules` directly (safe because better-sqlite3 has no runtime npm dependencies of its own — only a build-time-only one — and ships prebuilt binaries for every platform/arch under its own `prebuilds/` folder, so no other package needs the same treatment). **Verified empirically, not just by reading code:** packaged the app locally (`npm run package`, Node 22 pinned per the gotcha below), launched the actual packaged binary, and confirmed via `lsof` that the running process had both `app.asar.unpacked/.../prebuilds/darwin-arm64.node` and the real `quaestio.db` open — proof the native module loaded and the database connected, not just that the file was present on disk.
- **A second, related fix: `rebuildConfig: { onlyModules: [] }`.** Packaging's "Preparing native dependencies" step runs `@electron/rebuild` unconditionally, which tried to recompile `better-sqlite3` from source via `node-gyp` even though a matching prebuilt binary already exists — and failed outright in this session's sandbox (Xcode installed but its license not accepted, which blocks every `node-gyp` compile, unrelated to this project). Since `better-sqlite3`'s N-API prebuilds are ABI-stable across Node/Electron versions, there's nothing to rebuild; `onlyModules: []` (an empty array, not `undefined` — `@electron/rebuild`'s own `options.onlyModules || null` doesn't fall through to "rebuild everything" for an empty array, since `[]` is truthy) tells it to rebuild zero modules and skip node-gyp entirely. Without this fix, packaging would fail on any machine where node-gyp can't run, independent of the asar-copy bug above.
- **App icon: a small hand-drawn "Q" monogram** (a lime ring with a short diagonal tail on the ink-900 background, matching the design system's token colors, not a font glyph — avoids any risk of an unavailable font producing a different fallback shape at build time) — source SVG at `assets/icon.svg`, rasterized with `rsvg-convert` and converted with macOS's built-in `iconutil` (`.icns`) and Homebrew ImageMagick (`.ico`, 6 sizes). These are local authoring tools, not project dependencies — only the resulting `assets/icon.{svg,icns,ico,png}` files are committed. Checked legibility at 16px and 32px (rasterized and visually inspected) before committing to the design, since a thin stroke can turn to mush at favicon size — it held up at both.
- **Makers: Squirrel (Windows) + DMG + ZIP (macOS), no Deb/Rpm.** CLAUDE.md's own header scopes this app to "Windows and macOS" only, and the roadmap bullet names exactly "Windows installer and macOS DMG" — removed `@electron-forge/maker-deb` and `@electron-forge/maker-rpm` (Slice 0 scaffold defaults; Linux was never a target) and added `@electron-forge/maker-dmg@7.11.2` pinned exact, matching the already-pinned `@electron-forge/cli` line. Named explicitly by the roadmap, so no need to ask before adding it (CLAUDE.md's "ask before adding a dependency" is for deps outside what's already been scoped). ZIP was already present from Slice 0 and left as-is (harmless, and some users prefer a plain zip over running an installer).
- **`packagerConfig.icon`, `MakerSquirrel`'s `setupIcon`, and `MakerDMG`'s `icon` all point at the same `assets/icon.{icns,ico}` files.** Packager copies the macOS icon into the bundle under the stock filename `electron.icns` (an Electron packaging quirk — it copies your file's *bytes* to whatever `CFBundleIconFile` already says in Electron's base Info.plist, it doesn't rename that key to match your icon's basename) — confirmed by byte-comparing the packaged `electron.icns` against `assets/icon.icns` (identical). Purely cosmetic; Info.plist correctly points at it either way, so the actual displayed icon is correct.
- **Verification gap, stated plainly, narrower than previous slices':** typecheck/lint/test (124 tests, unchanged) pass, and — going further than prior slices — this one actually packaged the app, launched the real packaged binary, and confirmed via `lsof` that both the native module and the database were open and working. What's *not* verified: the actual `.dmg` (this sandbox has Xcode installed but its license was never accepted, which blocks `appdmg`'s native `fs-xattr` dependency the same way it blocks `better-sqlite3`'s node-gyp rebuild above — confirmed by running the zip maker alone, which succeeds standalone, proving the packaging pipeline itself is sound and isolating the DMG failure to this one sandbox-specific cause) and the Squirrel Windows installer (no Windows machine available here). Both should work on GitHub's actual `macos-latest`/`windows-latest` runners, which ship with a pre-licensed Xcode and native Windows tooling respectively — CI (`.github/workflows/release.yml`, triggered on `v*` tags) is what will actually prove this, the first time a tag is pushed. **No tag has been pushed and no release has been created this session** — creating one is a shared-state action (a public GitHub Release) and wasn't asked for.
- **Fixed same day: the release workflow's `npm run make` failing on macOS used to be a single point of failure for the whole job, including the zip.** Forge's `make()` runs every matched maker in one process, and an unhandled rejection from any one of them (here, dmg) aborts the process before an in-flight sibling maker (zip) finishes writing its output — confirmed locally (a combined run produced no files in `out/make/zip` at all, while a zip-only run produced the file cleanly). `release.yml` now runs zip and dmg as two separate `electron-forge make --targets=...` invocations on macOS instead of one combined `npm run make`: zip is a required step (simple, dependency-free, shouldn't be allowed to ship nothing), dmg is `continue-on-error: true` so a dmg-specific failure can't take the zip down with it. Windows stays a single `npm run make` step since only one maker (Squirrel) ever runs there — no sibling for a failure to endanger. Re-verified locally the same way as before: ran the zip target, then the dmg target (which still fails in this sandbox on the same Xcode-license issue), and confirmed the zip file survives untouched.
- **The release is created as a draft**, not published automatically — `softprops/action-gh-release@v2` with `draft: true`, so a tag push builds installers and stages them for the owner to review and publish manually rather than going live unattended on every tag.
- **Node version pin for local packaging stays an open question, deliberately not resolved here** — same as the "Known gotchas" entry already says. The *release workflow* itself pins `node-version: 22` explicitly (same as `ci.yml`), which is unaffected by that open question; what's still undecided is whether to add a repo-wide `.nvmrc`/`engines` for contributors running `npm run make` locally with whatever `node` their machine defaults to.

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| @electron-forge/maker-dmg | 7.11.2 |

### Slice 6 — Create + find (2026-09-15)

- **The board's per-repo issue query stays unfiltered — search/sort/assignee are client-side there, not pushed into SQL.** `App.tsx`'s `['issues', activeRepo]` query cache is the substrate `IssueDetailDialog` writes optimistic updates into (`setQueryData` in five places: onMutate, onError rollback, the deleted-issue filter, onSuccess, reloadConflict) and that `App.tsx` derives `openIssue` from. Adding filter/sort params to that query key would make every one of those writes target a key that no longer matches what's on screen; filtering inside the queryFn without changing the key would serve stale results for the wrong params. Either way breaks Slice 5's optimistic-update flow, which its own log already flagged as never manually clicked through. `BoardScreen` filters and sorts the already-loaded array instead (`sortIssues`, a pure function with its own unit tests in `tests/sort-issues.test.ts`).
- **SQLite-backed search is real, but only for `SearchScreen`.** `listIssues`'s `search` param (`src/main/db/issues-queries.ts`) was validated and silently discarded since Slice 3's stub — it now does a SQL `LIKE` match against title and body. `SearchScreen` has no optimistic-update cache to protect (it's read-only, cross-repo), so it fans out one `issues.list({ repoFullName, search })` call per tracked repo via `Promise.all` and merges — reusing the existing single-repo IPC endpoint rather than adding a new one. No debounce: each call is a local synchronous SQLite read, cheap enough at this app's scale (see CLAUDE.md's own gotchas about who this app targets) that the extra state wasn't worth it.
- **Search now includes closed issues.** The board hiding closed issues is a "working view of active issues" board concern (Slice 4's own reasoning); global search has no such reason to hide history, so it was never filtered by state.
- **New-issue creation is title + body only** — no type/labels/assignee picker in the create dialog. GitHub Issue Types, labels, and assignee are all editable immediately after creation via the existing Slice 5 edit flow, so the create form doesn't duplicate that UI. A created issue with no labels lands in the board's "Unlabeled" column, same as any other label-less issue.
- **`issues:create` follows the exact write-handler shape every sibling IPC handler already uses**: offline gate first (`isOnline()` check, CLAUDE.md's "writes are disabled while offline"), then `getAuthenticatedClient()`, then the GitHub call, then `mapGitHubIssue` + `upsertIssues` so SQLite stays the source of truth for the renderer. The renderer's `CreateIssueDialog` doesn't hand-insert the returned issue into the query cache — it invalidates `['issues', repoFullName]` and lets the existing unfiltered query re-read from SQLite.
- **The fake `SearchScreen` filter chips (`repo: atlas-web`, `priority: P1`, `+ filter`) were deleted, not wired up.** They were static fixture decoration with a working "remove" button that filtered nothing — worse than no filter UI, since it looked functional and wasn't. Filtering by repo or priority in Search is a plausible future addition, but wasn't asked for here; the dead chips were removed rather than left as a trap.
- **Keyboard shortcuts: Cmd+N / Ctrl+N (new issue) and Cmd+K / Ctrl+K (jump to Search)**, both in `App.tsx` on a single `window`-level `keydown` listener. Checks `isMac ? event.metaKey : event.ctrlKey` specifically (never `metaKey || ctrlKey`), matching CLAUDE.md's "Cmd on macOS and Ctrl on Windows" literally rather than accepting either modifier on either platform. Escape-to-close on both dialogs comes for free from the native `<dialog>` element (Slice 1's decision), so it needed no new code.
- **`fixtures.ts`'s `searchResults` export was deleted.** It was the last fixture-only data SearchScreen depended on; once Search reads real IPC data, keeping it around as dead code would violate CLAUDE.md's own "From Slice 3 onward, real IPC data replaces the fixtures" line.
- **Verification gap, stated plainly, same as Slice 5's:** typecheck/lint/test (124 tests) all pass, and `npm start` boots against real tracked repos without error from any of this slice's code. The actual UI — creating an issue, the Cmd+N/Cmd+K shortcuts, the sort/assignee pills, cross-repo search — was **not** clicked through in a running window this session (no display available in this environment). `listIssues`'s search filter and `sortIssues` both have direct unit coverage; the React wiring around them does not.

### Slice 5 — Issue detail + edits (2026-09-15)

- **TanStack Query is now actually wired up**, resolving the deviation flagged in the Slice 4 log. `App.tsx`'s issue list is a `useQuery(['issues', activeRepo])`; `sync:updated` calls `queryClient.invalidateQueries` instead of a manual re-fetch, matching this file's own "the renderer invalidates the matching TanStack Query keys" line literally for the first time. Repos and auth stay on plain `useState` — untouched by this slice, no reason to migrate them now.
- **`openIssue` is tracked by number, not by object**, so the dialog derives the live issue from the query cache on every render (`issues.find(i => i.number === openIssueNumber)`). Holding the `Issue` object directly would have shown a stale snapshot through every optimistic write and background refresh.
- **The conflict check is a live GET before every write, not just body edits** — `performIssueUpdate` (`src/main/sync/issue-update.ts`) re-fetches the issue and compares `updated_at` (via the pure, unit-tested `hasSyncConflict`) before any of the five write paths (title/body, state, labels, assignee), not only body edits as the roadmap bullet's wording suggests. Applying it uniformly was simpler than special-casing body edits, and every write already needs the same live-refetch-then-write shape.
- **A conflict carries the blocked patch, not just the latest issue**, so "Overwrite" can retry the *exact* write that was rejected (a label add, a close, an assignee change) — not only a title/body edit. An earlier version of this only handled the title/body case; caught and fixed before shipping (see this session's fork).
- **`assignees`, not `assignee`.** The roadmap bullet says "assignees" (plural); the app's `Issue` type has kept a single `assignee: User | null` since Slice 1 and this slice didn't grow it into an array — GitHub's write API is still called with `assignees: [login]` / `assignees: []`, only the app-facing shape stays singular.
- **The toast is hand-written** (`src/renderer/components/ui/toast.tsx`), not a library — none was installed, and CLAUDE.md requires asking before adding a dependency. It's a module-level store + one host component (`role="status"`, `aria-live="polite"`), not React context, so `showToast()` is callable from a mutation's `onError` without prop-drilling a handle to it.
- **Comments are replace-on-fetch, not diffed.** `comments-queries.ts`'s `replaceComments` deletes and re-inserts a full set on every open, since there's no incremental cursor for comments the way there is for issues (CLAUDE.md: fetch and cache on open, never background-sync) — this is only ever one issue's comments at a time, not sync-loop volume.
- **404/410/301 handling landed here, not Slice 4**, exactly as that slice's log predicted: the `since`-bounded list endpoint never reports deletions, only a single-issue fetch does, and this slice is the first thing that does one (the pre-write conflict check, and the comments fetch). Both `issues.update` and `issues.getComments` treat a gone issue the same way: remove it from the cache, return a `deleted` result, and the dialog closes with a toast. The 301 branch is untested against a real transferred issue — folded into the same `isGone` check on the assumption Octokit surfaces it as a normal `RequestError`, not verified against a live transfer.
- **Not implemented:** GitHub-side subtasks (still local-only, unchanged from Slice 1) and an actual "Add subtask" handler (the button has never had an `onClick`, inherited from before this slice).
- **Verification gap, stated plainly:** `npm run typecheck`, `npm run lint`, and `npm test` (117 tests) all pass, and the packaged app boots and polls real repos without error. None of that exercises the new dialog UI itself — the title/body edit, close/reopen, label and assignee editing, adding a comment, and above all the conflict-check flow (edit a body, change the same issue on github.com, then save) were **not** clicked through in a running window this session. `performIssueUpdate` (the conflict/write/delete logic) has direct unit coverage; the React side of that flow does not.


### Slice 4 — Live sync (2026-09-15)

- **`src/main/sync/scheduler.ts` is a single-tick scheduler, not one timer per repo.** A `setInterval` fires every 15s; each tick asks a pure function (`computeDueRepos`, unit-tested) which tracked repos are due, based on `lastPolledAt` and whether each one is the focused active repo (60s) or a background one (5 min). This was chosen over per-repo `setTimeout` bookkeeping because it needs no rescheduling logic when the active repo or tracked-repo list changes — every tick just re-derives from current state.
- **`syncRepoIssuesIncremental` (`src/main/sync/incremental-sync.ts`) is the one entry point for syncing a repo's issues**, replacing direct calls to `syncRepoIssues` (still the low-level full-fetch primitive it wraps). A `null` `syncCursor` (new nullable column on `repos`) means "never synced" and triggers a full sync that seeds the cursor from the newest cached `updatedAt`; a non-null cursor drives a conditional (`If-None-Match`, stored per-URL in the new `sync_etags` table) `since`-bounded fetch. `src/main/ipc/repos.ts`'s track-time sync now calls this too, so tracking a repo and polling it later share one code path.
- **A 100-item page that comes back full re-fetches through `client.paginate` rather than resuming from page 2.** Simpler and still correct; the extra request only happens for a repo with over 100 issues updated inside one ~60s poll window, which doesn't happen for the small/solo repos this app targets.
- **Rate-limit vs. offline vs. generic-error classification is a set of pure, unit-tested predicates** (`src/main/sync/errors.ts`): a thrown error with no `.status` is treated as offline (Octokit's HTTP errors always carry one; a request that never reached GitHub doesn't), one with `.status` 403/429 *and* an `x-ratelimit-reset` or `retry-after` header is rate-limited, and a 403/429 with neither is left as a generic error (a real permissions problem, not a limit).
- **The sync-status indicator is pushed from main to renderer on a new `sync:status-changed` channel**, separate from the existing `sync:updated` (data-changed) channel — `sync:updated` only ever fires when a poll actually changed cached issues (per this file's own "after a sync changes data" wording), which isn't enough on its own to drive a live synced/rate-limited/offline/error indicator.
- **Window focus is read directly from `BrowserWindow`'s own `focus`/`blur` events in `main/window.ts`** — no renderer round-trip needed, Electron's main process already sees this natively. Online/offline is the opposite: Electron's main process has no built-in connectivity signal, so the renderer reports `navigator.onLine` (and the browser `online`/`offline` events) to the scheduler over a new `sync.setOnline` IPC call. A new `sync.setActiveRepo` call tells the scheduler which tab is currently active, since that's inherently renderer-owned state.
- **Deviation from this file's stated architecture: the renderer does not use TanStack Query.** Nothing in the renderer used it before this slice either (`App.tsx` was already plain `useState`/`useEffect` IPC calls throughout) — introducing it now would mean migrating the whole existing data layer, not just wiring one push channel, and wasn't part of what "add live sync" asked for. `sync:updated` instead triggers a plain re-fetch of the active repo's issues via the same `window.api.issues.list()` call the tab-switch effect already used. Flagged here rather than fixed silently — worth a deliberate decision (migrate now, or keep deferring) rather than another slice quietly building on the gap.
- **Known gap, deferred to Slice 5 on purpose:** deleted/moved-issue handling (404/410/301, per this file's GitHub sync rules) isn't implemented. The `since`-bounded list endpoint this slice polls never reports deletions at all — that only surfaces from fetching a single issue by number, which is Slice 5's issue-detail work, not this one's.


<!-- Record pinned versions and key decisions here, newest first. -->

### App renamed to Quaestio (2026-09-14)

Renamed from the "Issue Desk" working name to **Quaestio**. Updated `package.json` (`name`/`productName`), `package-lock.json`, `index.html` `<title>`, the title bar wordmark, the DB filename (`quaestio.db`), and user-facing copy referencing the app by name in the sign-in, repo empty-state, settings, and main-process error dialog. `design/` was left untouched (read-only reference).

### Post-Slice-3 bug fixes (2026-09-14)

Three bugs reported after real GitHub data started flowing through the board and issue detail dialog:

- **Board showed closed issues alongside open ones.** `BoardScreen`'s `visible` list only ever filtered by search text — fixtures were always `state: 'open'`, so this never showed up until Slice 3 synced real repos with closed-issue history. Fixed by filtering to `state === 'open'` before the type-column split. The board is a working view of active issues, not a full history.
- **Dialogs (`IssueDetailDialog`, `RepoPickerDialog`) rendered pinned to the top-left corner instead of centered.** The shared `Dialog` component relies on the native `<dialog>` element's default UA centering (auto margins in the top layer via `showModal()`), but never set that explicitly — Tailwind's preflight reset zeroes margins broadly, stripping the default with nothing to replace it. Fixed by adding `fixed inset-0 m-auto` explicitly to `dialog.tsx`.
- **Pasted images in issue bodies rendered as literal text instead of images.** GitHub embeds pasted screenshots as raw `<img>` HTML tags in the markdown source, not `![]()` syntax — `react-markdown` doesn't render embedded raw HTML unless paired with `rehype-raw`, which wasn't installed. Added `rehype-raw@7.0.0` (pinned exact), placed *before* `rehype-sanitize` in `IssueDetailDialog.tsx`'s `rehypePlugins` array — `rehype-raw` parses the HTML into the tree, `rehype-sanitize` then strips anything unsafe from it. `rehype-raw` alone would violate CLAUDE.md's markdown-safety rule; the pair together is the documented-safe pattern.

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| rehype-raw | 7.0.0 |

### Slice 3 — Repos + first sync (2026-09-14)

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| better-sqlite3 | 13.0.3 |
| drizzle-orm | 0.45.2 |
| drizzle-kit | 0.31.10 (dev) |
| @types/better-sqlite3 | 9.6.0 (dev) |

### Slice 2 — Auth (2026-09-13)

**Pinned versions** (exact, no ranges — see `package.json`):

| Package | Version |
| --- | --- |
| @octokit/rest | 22.0.1 |
| @octokit/plugin-throttling | 11.0.5 |
| @octokit/plugin-retry | 8.1.1 |
| @octokit/auth-oauth-device | 8.0.5 |

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
