# AGENTS.md

Guidance for AI coding agents working in this repo.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. That directory
is local-only (git-ignored, never uploaded); flowdeck visualizes it while you
work. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, with label strings equal to their names
(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
