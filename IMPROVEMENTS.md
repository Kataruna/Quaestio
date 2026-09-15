# Improvements backlog

Captured from owner feedback, not yet triaged or estimated. Check items off as they're implemented — see CLAUDE.md's Decisions log for the reasoning behind each fix once done.

## Missing feature

- [x] Can't change a card's type (Bug -> Feature, Unlabeled -> Bug, etc.) — a select on the issue detail dialog's type badge now writes GitHub's native Issue Type
- [x] Priority still doesn't update — real bug: the optimistic label-edit update never recomputed priority, so it looked stale until the write round-tripped
- [x] Sync button looks like it doesn't actually sync — real bug: the status text was hardcoded to the literal string "Synced 2 min ago", regardless of when sync actually last ran

## QoL — Issue detail dialog (card expanded)

- [ ] Owner should be pickable from GitHub contributors on the repo (or typed, if they don't show up in the list)
- [ ] Priority should be changeable
- [ ] Due date should be pickable
- [ ] Labels should have a dropdown showing the project's existing labels
