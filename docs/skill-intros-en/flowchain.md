---
name: flowchain
title: A tour of the four flowchain stages
summary: The skills behind each of the four stages — grill / spec / tickets / implement — what that stage is for, which skills sit behind it, and why those ones.
---
# flowchain

The four-cell chain you see in the flowdeck UI is not decoration: every cell has **real skills running behind it**, and every cell maps to one artifact in `.scratch/`. This is the **tour** of that chain — one cell at a time, left to right: what each stage is trying to settle, which skills hang off it, and which part each one owns. For a full write-up, follow the link into that doc; what belongs here is the verdict on *why this skill and not another*.

The skill list comes from the same source as the stage definitions: the grill cell carries grilling and wayfinder, the spec cell carries to-spec, the tickets cell carries to-tickets, the implement cell carries implement.

## 1. grill: idea → map.md

This cell answers "**what am I building, and what counts as done**". Its artifact is `map.md` — the destination, the fog (decisions still open), what is settled and what is out of scope. The "inferred · no map" marker also shows up on this cell: when the interview never wrote a file, the downstream files are themselves the evidence that the stage ran.

- [grilling](grilling.md) — **the foundation of the interview**. Map the plan onto a design tree and work in rounds, each asking the whole frontier with a recommended answer attached; the session is over only when the frontier is empty. Looking up facts is the agent's job, making decisions is yours. For most ideas, this is the whole story.

- [wayfinder](wayfinder.md) — **the same interview, scaled to a big project**. When the engineering no longer fits in one session and the road ahead is still fogged, turn the interview into a decision map, one ticket at a time, until the road is clear. It shares a cell with grilling because they settle the same question: is this idea clear enough yet.

## 2. spec: understanding → spec.md

This cell answers "**what does the understanding settle into**". After grilling you are clear and the document may not be; this cell synthesises the conversation into a spec you can work from, written to `spec.md`. It does not interview — the answers you already gave are enough, what is missing is putting them in order.

- [to-spec](to-spec.md) — **fold a well-had conversation into one spec**. It does not ask you again; it arranges, deduplicates and prioritises what you have already said into something executable. Ticket-splitting depends entirely on it.

## 3. tickets: spec → issues/

This cell answers "**who does what first**". Even a clear spec is too big for one session. Its artifact is a stack of tickets under `issues/`, each one a vertical slice that stands on its own, each declaring its own blocking edges.

- [to-tickets](to-tickets.md) — **split the plan into tracer-bullet slices**. Every ticket declares which tickets it depends on, so "what can I do right now" has a definite answer: a ticket whose dependencies are all closed and which nobody has claimed is a frontier ticket. The UI's blocked count and frontier list both read these edges.

## 4. implement: ticket by ticket → all closed

This cell answers "**how does this become code**". Its artifact is not a file but a state: this stage is done when every ticket is closed. Clicking a chain cell copies that stage's implementation guidance — paste it into any agent and it picks up the thread.

- [implement](implement.md) — **implement the tickets**. Turn a spec or a set of tickets into code: TDD as you go, typechecking often, and at the end a full test run plus a two-axis review, then commit to the current branch.

## After all four

Four green cells means the effort is **finished**. The flowdeck UI folds it into the "✓ Done (n)" entry in the switch strip (collapsing is display-only — not a byte of `.scratch/` moves), but every artifact is still sitting in `.scratch/` whenever you want it. For the full map of all 35 skills and how the pack divides up, start from the [overview](README.md).
