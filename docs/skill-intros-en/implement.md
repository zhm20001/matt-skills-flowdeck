---
name: implement
category: engineering
order: 7
title: Implement by ticket
summary: Turns a spec or a set of tickets into code: driven by TDD, type checks run often, a full test suite plus a two-axis review at the end, committed to the current branch.
---
# implement

**implement is the execution end of the mainline**: it builds the work from a spec or from tickets. Wherever TDD applies it uses TDD, going red-green at a **seam agreed in advance**; the type check runs often and single test files run often, with one full suite run at the end; once the work is done, code-review reviews this batch of changes, and it finishes by committing to the current branch.

Cases where it stands alone: the spec is already written and the tickets already cut (downstream of to-spec / to-tickets), or you describe a piece of work directly.

## When to use

- Implementing from a spec or a set of tickets.

- Each ticket once the mainline has split the plan (running every ticket in a fresh session is advisable).



## Original description



> "Implement a piece of work based on a spec or set of tickets."
