---
name: to-spec
category: engineering
order: 14
title: Conversation into a spec
summary: No interview, only synthesis: converge a conversation you have already exhausted into one spec and publish it straight to the issue tracker.
---
# to-spec

**to-spec is the step in the main workflow between “we have talked it through” and “we can split tickets”**: it **runs no interview** — it only synthesizes the current conversation's context and its understanding of the codebase into a spec. The process: walk the repo's current state; mark out the seams the tests will hit (prefer existing seams, take the highest one available, as few as possible across the repo — confirmed with you first); write it up from the template and publish it to the issue tracker with the ready-for-agent label applied directly (no triage).

The spec template: problem statement, solution, **a very long numbered list of user stories**, implementation decisions (which modules to build or change, interfaces, architecture and API contracts…), testing decisions, out of scope, notes. **No concrete file paths or code snippets** (they go stale fast); the single exception is a decision fragment from a prototype that is more precise than prose (a state machine, a schema), which may be inlined with its source noted.

## When to use

- Once grilling has interrogated the question to the bottom, put the consensus on paper as a spec.

- At the far end of a wayfinder map: collapse a chain of decision tickets into a plan you can build.



## Original description



> Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
