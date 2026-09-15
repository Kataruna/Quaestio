# Improvements backlog

Captured from owner feedback, not yet triaged or estimated. Check items off as they're implemented — see CLAUDE.md's Decisions log for the reasoning behind each fix once done.

## Missing feature

- [x] Can't change a card's type (Bug -> Feature, Unlabeled -> Bug, etc.) — a select on the issue detail dialog's type badge now writes GitHub's native Issue Type
- [x] Priority still doesn't update — real bug: the optimistic label-edit update never recomputed priority, so it looked stale until the write round-tripped
- [x] Sync button looks like it doesn't actually sync — real bug: the status text was hardcoded to the literal string "Synced 2 min ago", regardless of when sync actually last ran

## QoL — Issue detail dialog (card expanded)

- [x] Owner should be pickable from GitHub contributors on the repo (or typed, if they don't show up in the list) — native `<datalist>` typeahead against the repo's collaborators, free text still works
- [x] Priority should be changeable — a select that adds/removes the p1/p2/p3 label under the hood
- [x] Due date should be pickable — local-only field (like subtasks), a native date input; not derived from the milestone since that's shared across every issue in it
- [x] Labels should have a dropdown showing the project's existing labels — `<datalist>` typeahead on the existing add-label input
