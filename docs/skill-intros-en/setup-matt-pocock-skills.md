---
name: setup-matt-pocock-skills
category: engineering
order: 12
title: Skill pack initialization
summary: The one-time prerequisite setup for the engineering skills: where the ticket tracker lives, what the triage labels are called, and which layout the domain docs use.
---
# setup-matt-pocock-skills

**setup-matt-pocock-skills lays the groundwork the other engineering skills depend on**, in three pieces: **the issue tracker** — where issues live (GitHub by default, but also GitLab, local markdown with one file per ticket under .scratch/, or any process you describe), written into docs/agents/issue-tracker.md; **the triage labels** — whether the five canonical roles (needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix) keep their default names or adopt the vocabulary you already use; **the domain docs** — a single context by default (CONTEXT.md plus docs/adr/ at the root), with multiple contexts only worth discussing in a monorepo.

It is prompt-driven: it first probes the repo's current state (remotes, CLAUDE.md/AGENTS.md, existing conventions), reports what it finds, and confirms section by section (each section opens with a recommended answer), so drafts can be edited before they land. Of CLAUDE.md and AGENTS.md it edits only the one that already exists and never creates both. **Running it once before your first use of the other engineering skills is enough**; rerun it later only if you want to switch trackers.

## When to use

- Before using the engineering skills in this repo for the first time (mandatory).



## Original description



> Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
