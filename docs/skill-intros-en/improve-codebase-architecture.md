---
name: improve-codebase-architecture
category: engineering
order: 8
title: Architecture improvement scan
summary: Run it whenever you have slack: it scans for chances to turn shallow modules deep, produces a visual report, and grills out whichever candidate you pick.
---
# improve-codebase-architecture

**improve-codebase-architecture is the health patrol over your codebase**: a subagent walks the code carrying codebase-design's vocabulary (depth, seam, the deletion test…) — hot spots with recent churn first — and turns shallow modules, pure functions that lack locality, coupling leaking across a seam, and places that are hard to test into a list of **deepening opportunities**.

The output is a **self-contained HTML report** written to the system temp directory (nothing lands in the repo): each candidate card carries the file, the problem, the proposal, the gain (explained in locality and leverage terms) and a before/after diagram, with a recommendation-strength badge and a top pick; candidates that clash with an existing ADR are flagged explicitly rather than quietly skipped. Once you pick one, a grilling loop refines its design while domain-modeling updates the glossary as you talk.

## When to use

- You have slack and want the codebase easier for people and for AI to maintain.

- Reviewing what could have prevented a bug, after fixing a big one (diagnosing-bugs hands work over here).



## Original description



> Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
