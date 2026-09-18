---
name: to-tickets
category: engineering
order: 15
title: Plan into tickets
summary: Break a plan into tracer-bullet vertical-slice tickets, every one declaring its blocking edges, and publish them to the configured issue tracker.
---
# to-tickets

**to-tickets breaks a plan / spec / conversation into tickets**. Each ticket is a **tracer bullet**: narrow but complete, cutting vertically through every layer (schema → API → UI → tests), demonstrable or verifiable on its own once done, sized to fit a fresh context window. Every ticket declares its **blocking edges** — which tickets must finish first; the unblocked ones can start right away. **Broad changes are the exception to vertical slicing**: a mechanical change to a shared symbol that ripples across the repo can never stay green when forced into vertical slices, so it goes expand–contract instead (add the new shape, migrate in batches, delete the old shape last), one ticket per batch.

Before publishing, it reviews the set with you: is the granularity right, are the blocking edges real, should anything be merged or split. The publishing shape follows the tracker — local markdown is `.scratch/<feature>/issues/<NN>-<short-name>.md`, one file per ticket (this is exactly what flowdeck tracks), a real tracker uses native blocking links; everything gets the ready-for-agent label. Same rule as the spec: no concrete file paths or code snippets (prototype decision fragments are the exception).

## When to use

- The spec is settled and you need implementation units that can run in parallel and be assigned.

- Once split, each ticket goes to implement (one fresh session per ticket).



## Original description



> Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
