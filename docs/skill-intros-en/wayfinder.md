---
name: wayfinder
category: engineering
order: 17
title: Wayfinding for big work
summary: When the work is too large for one session and the road ahead is still wrapped in fog: draw a decision map on the issue tracker, resolve one ticket at a time, and keep going until the way is clear.
---
# wayfinder

**wayfinder is the workflow with the heaviest cognitive load in the skill pack**, reserved for genuinely large work: one loosely formed idea that a single session cannot hold, with the route to the **destination** still invisible. It draws that route on the issue tracker as a **shared map** — a map issue carrying the `wayfinder:map` label plus a chain of **decision ticket** sub-issues (a ticket is a question to settle, not work to execute), joined by native blocking edges between tickets, and whatever is open, unblocked and unclaimed is the **frontier**. The map stays deliberately unfinished: what cannot be put into words yet goes into the *fog* (Not yet specified), and each ticket resolved clears another patch of sky ahead.

Two ways to use it: **drawing the map** (name the destination → breadth-first grilling → build the map, the tickets and the edges → put every research ticket in the background → done, without resolving a single ticket); **walking the map** (read the map → claim the first ticket on the frontier → resolve it → land the decision as a comment, close the ticket, write the map index back → clear the newly visible tickets). Iron rules: **produce decisions, not deliverables**, one ticket per session (research excepted), a HITL ticket requires a human actually present (the agent must not interrogate itself), and refer to tickets by name throughout, never by number. When the way is clear it **only hands off, never builds** — it passes to to-spec to collapse into a plan.

## When to use

- A greenfield project or a very large feature: one long session cannot hold it and the road ahead is unknown.

- For a small, clearly defined feature, do **not** use it (it is slow and dense).



## Original description



> Plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
