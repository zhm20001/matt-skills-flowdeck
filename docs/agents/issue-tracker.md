# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Ticket sizing

Implementation tickets are batches, not atoms — the unit is "one verify cycle", not "one change":

- **One ticket per verification cycle.** A set of changes that naturally lands green in a single full-suite run is one ticket. The mental model is a PR, not an edit.
- **Merge fine-grained items that touch the same file cluster** into one ticket with an in-ticket checklist (house style: `.scratch/recent-roots/issues/01-recent-roots.md`). The "one question per ticket" convention is for wayfinder decision tickets (below), not implementation tickets.
- **Split only when an edge is real**: a genuine dependency (ticket B tests ticket A's behaviour), risk isolation (one ticket failing must not take others down), or size (the ticket won't fit in one fresh context window — to-tickets' own ceiling).

Storage is unchanged: still one file per ticket, never a combined file. Sizing changes what goes inside a ticket, not how tickets are filed.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
