# Kickoff prompt — paste this into Claude Code with the Claude Design handoff

---

I'm starting a new project: a desktop GitHub Issues manager for Windows and macOS. I vibe code, so I rely on you to verify your own work.

**Step 1 — Read everything first.**
Read `CLAUDE.md` in full. Then read the Claude Design handoff bundle that came with this session (the design files and its README). If the bundle isn't in `./design/` yet, copy it there. Treat `./design/` as read-only from then on.

**Step 2 — Plan before coding. Wait for my OK.**
Give me a short plan that covers:
1. every screen and major component you found in the design;
2. the design tokens you will extract (colors, font, radius, spacing, shadows, light/dark);
3. any screens or states the app needs that are missing from the design, for example the device-flow login code screen, empty/loading/error/offline/rate-limited states, and settings;
4. anything in the design that conflicts with `CLAUDE.md` or would be hard to build in Electron;
5. questions for me, if any.

**Step 3 — Build Slice 0 and Slice 1 only**, as defined in the Roadmap in `CLAUDE.md`:
- Slice 0: scaffold the project, set up tooling and CI, and pin the versions in the Decisions log.
- Slice 1: build the design system and the static UI for every screen, using typed fixtures instead of real data.

**Step 4 — Verify, then stop.**
Run `npm run typecheck`, `npm run lint`, and `npm test`, and fix everything until they pass. Start the app once to confirm it launches without console errors. Commit after each slice. Then stop and give me:
- a plain-language summary of what you built;
- how to run it;
- a click-through checklist so I can compare the app against the design;
- known issues and what Slice 2 will need from me (the GitHub OAuth App Client ID).

Do not start Slice 2 until I say so.

---

## Prompts for later sessions

For each new slice, start a fresh session and paste:

> Read `CLAUDE.md`. Continue with **Slice N** from the Roadmap. Plan first and wait for my OK, then build it, verify it (typecheck, lint, test, launch), commit, check it off in the Roadmap, and give me the summary and manual test steps.

When something breaks:

> Something is broken: [describe what you clicked, what you expected, and what happened, plus any error text]. Find the root cause before changing code. Explain the cause in plain language, fix it, add a test that would have caught it if possible, and re-run all checks.
