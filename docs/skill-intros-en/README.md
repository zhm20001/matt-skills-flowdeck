---
name: README
category: overview
order: 0
title: The full map
summary: A map of the 35 skills: how the four categories divide the work, how the main path strings together, where to enter.
---

# README

**The Matt skills pack** is a set of skills for AI-assisted coding: each skill is a SKILL.md instruction document that an Agent loads on demand, putting discipline and scaffolding behind the whole stretch from "an idea" to "shipped". This directory collects an overview intro for each of the 35 skills; every one of them is distilled from its own SKILL.md and ends with the original description.

## Four categories

- **Engineering (18)**: the main path and code health — the full chain from grilling an idea through splitting tickets, implementing, reviewing, diagnosing and improving architecture.

- **Productivity (7)**: interviewing, handoff, teaching, questionnaires and the rest of the general skills built around *people*, not limited to writing code.

- **Specialised tools (4)**: one-off environment setup and migration tools — git guardrails, commit hooks, the shoehorn migration, exercise scaffolding.

- **In progress (6)**: skills that are not final yet (background handoff, workflow grilling, TS deep-module constraints, the writing trilogy); their behaviour may change.

## The main path: idea → shipped

Most work runs along one main path: **grill-with-docs** (grill the idea, leave documents behind) → branch off to **prototype** when something needs a hands-on answer (bridged both ways with **handoff**) → **to-spec** (collapse the conversation into a spec) → **to-tickets** (split it into vertical slices, each ticket declaring what it blocks) → run every ticket through **implement** (**tdd** inside it, **code-review** at the end). Three ramps feed the main path: when foreign issues pile up, go through **triage**; when production is broken, go through **diagnosing-bugs**; when the work is too large for a single session, go through **wayfinder**. Code health is walked by **improve-codebase-architecture**, and the underlying vocabulary comes from two references, **domain-modeling** and **codebase-design**. On a first run, do **setup-matt-pocock-skills** before anything else to configure the ticket store and the document layout.

The list on the left is grouped by category — click any skill to read its intro; the skill-name links inside an intro jump between intros.

## Engineering

- [ask-matt](ask-matt.md) — Skill router desk: can't remember 35 skills? No problem: describe your situation and it tells you which skill to use and which road to take.
- [code-review](code-review.md) — Two-axis code review: changes since some fixed point, reviewed and reported separately along two axes — "does it hold the standard" and "does it do the right thing".
- [codebase-design](codebase-design.md) — Deep-module design vocabulary: a reference, not a process: module, interface, depth, seam, adapter — one shared language for "a lot of behaviour behind a small interface".
- [diagnosing-bugs](diagnosing-bugs.md) — Hard-bug diagnosis: how to chew on stubborn bugs and performance regressions: first build a tight feedback loop that can go red for it — everything else comes after.
- [domain-modeling](domain-modeling.md) — Domain modeling: sharpen the project's domain model while you design: challenge terms, stress-test boundaries, write it into CONTEXT.md once settled, record big trade-offs as ADRs.
- [grill-with-docs](grill-with-docs.md) — Grilling that leaves docs behind: the main entry point: one unsparing round of interview sharpens the plan while terms and decisions land in CONTEXT.md and ADRs along the way.
- [implement](implement.md) — Implement by ticket: turn a spec or a set of tickets into code: drive with TDD, run typechecking often, finish with the full test suite plus a two-axis review, commit to the current branch.
- [improve-codebase-architecture](improve-codebase-architecture.md) — Architecture improvement scan: run it whenever you have slack: surface chances to turn shallow modules deep in a visual report, and grill whichever one you pick.
- [prototype](prototype.md) — Throwaway prototype: answer one design question with a program you are willing to throw away: is the state model right, what should the UI look like. The answer stays; the code carries no obligation.
- [research](research.md) — Background research: hand the legwork to a background agent: it investigates against primary sources, drops a cited note into the repository, and you keep working.
- [resolving-merge-conflicts](resolving-merge-conflicts.md) — Resolving merge conflicts: work through the conflicts of an in-progress merge/rebase hunk by hunk: trace both sides' intent, keep both when you can, never abort, run the checks before you finish.
- [setup-matt-pocock-skills](setup-matt-pocock-skills.md) — Skill pack initialization: the one-off prerequisite for the engineering skills: where the ticket store lives, what the triage labels are called, what layout the domain docs use.
- [tdd](tdd.md) — Test-driven development: the reference card for the red-green loop: what a good test looks like, which seams tests go on, the three anti-patterns, the three iron rules of the loop.
- [to-spec](to-spec.md) — Conversation into a spec: no interviewing, only synthesis: collapse a conversation you already had out into one spec, published straight to the ticket store.
- [to-tickets](to-tickets.md) — Plan into tickets: split a plan into tracer-bullet vertical slices, each declaring its blocking edges, published to the configured ticket store.
- [triage](triage.md) — Ticket triage: run foreign issues and PRs through a small state machine: classify, verify, grill when necessary, and write them up as tickets an agent can pick up directly.
- [wayfinder](wayfinder.md) — Wayfinding for big work: when the work is too big for one session and the road ahead is still wrapped in fog: draw a decision map in the ticket store, resolve one ticket at a time, until the road is clear.
- [wizard](wizard.md) — Wizard for human-only steps: the few steps only a human can do (opening a service, filling in a key, clicking through a console) become an interactive bash wizard you just follow.

## Productivity

- [grill-me](grill-me.md) — Stateless grilling: the same unsparing interview, but nothing lands on disk — the stand-in for grill-with-docs when you have no repository in hand.
- [grilling](grilling.md) — The grilling primitive: the ground under the interview: a design tree advanced in rounds, each round asking every frontier question with a recommended answer attached, consensus only once the frontier is empty.
- [handoff](handoff.md) — Conversation handoff: compress the current conversation into a handoff document in a temporary directory, so a fresh Agent can pick it up seamlessly.
- [teach](teach.md) — Teaching workbench: teaching across sessions with the current directory as the classroom: mission first, lessons in sets, retrieval practice that pushes back — and it looks for a community for you.
- [to-questionnaire](to-questionnaire.md) — Decisions into questionnaires: answers stuck inside someone else's head? It grills you on how you want to *send* it, then writes a questionnaire aimed squarely at the knowledge gap.
- [wait-what](wait-what.md) — Say that again: you did not follow the last message: have the Agent take it back and explain it again — with the context filled in, in plain words, using the project's own vocabulary.
- [writing-for-agents](writing-for-agents.md) — Writing documents for agents: the reference you reach for when writing SKILL.md, AGENTS.md or a document pointed at from one: pointers, payload, hierarchy, completion criteria, the leading word and pruning.

## Specialised tools

- [git-guardrails-claude-code](git-guardrails-claude-code.md) — Guardrails for dangerous git commands: fit Claude Code with a PreToolUse hook: dangerous git commands such as push, reset --hard and clean are stopped before they run.
- [migrate-to-shoehorn](migrate-to-shoehorn.md) — Migrating to shoehorn: replace the `as` assertions in tests with shoehorn's type-safe spelling: fromPartial takes missing fields, fromAny takes data you fed in on purpose as wrong.
- [scaffold-exercises](scaffold-exercises.md) — Exercise scaffolding for a course: build the exercise directories straight from a lesson plan: chapter and exercise numbers, problem/solution/explainer variants, readme stubs, committed once lint passes.
- [setup-pre-commit](setup-pre-commit.md) — Pre-commit hook setup: Husky + lint-staged in one pass: format staged files with Prettier before the commit, then run typechecking and tests.

## In progress

- [claude-handoff](claude-handoff.md) — Background agent handoff: the fire-and-forget version of handoff: the conversation summary goes straight to a background Claude agent, returning at once and starting at once. (In progress)
- [loop-me](loop-me.md) — Workflow grilling: a stateful grilling session whose only output is workflow specs: it examines your life through the loop lens and writes the loops worth delegating as specs. (In progress)
- [setup-ts-deep-modules](setup-ts-deep-modules.md) — TypeScript deep-module constraints: fit a TypeScript repository with four dependency-cruiser rules that lock every package into a deep module — entry at the root, implementation in subdirectories. (In progress)
- [writing-beats](writing-beats.md) — Writing · Beats: the journey form for writing's *exploit* phase: the raw pile arranged into a string of beats, each one landing the concept before citing it, advanced beat by beat. (In progress)
- [writing-fragments](writing-fragments.md) — Writing · Fragments: writing's *exploration* phase: dig, don't build — a grilling interview accumulates fragments into one raw pile, and structure is the next skill's business. (In progress)
- [writing-shape](writing-shape.md) — Writing · Shaping: the shaping form of writing's *exploit* phase: the raw pile is read-only and the article grows paragraph by paragraph — the opening sets the key, concepts land before they are cited, format trade-offs are argued out in the open. (In progress)
