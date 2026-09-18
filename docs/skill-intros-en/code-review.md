---
name: code-review
category: engineering
order: 2
title: Two-axis code review
summary: The changes since a fixed point, reviewed and reported separately on two axes: does it follow the standard, and does it do the right thing.
---
# code-review

**code-review runs a two-axis review over `git diff <fixed point>...HEAD`**: the **Standards axis** checks whether the code follows the repo's written coding standards (plus a fixed baseline of Fowler's code smells, with the repo's own rules outranking the baseline); the **Spec axis** checks whether the code faithfully implements the originating issue or spec — what is missing, what is extra (scope creep), and what looks implemented but is not right.

Each axis gets its own parallel subagent, so neither context contaminates the other, and the reports appear side by side, **never merged into one ranking** — a piece of code can be perfectly standard and the wrong thing entirely, or exactly the right thing and off-standard, and reporting them apart keeps either from covering for the other. A bad revision reference or an empty diff fails before the subagents run.

## When to use

- Reviewing a branch, a PR, or work in progress.

- You say "review since X" (the changes since some commit, branch, or tag).

- At the end of implement, which runs this step internally.



## Original description



> Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side.
