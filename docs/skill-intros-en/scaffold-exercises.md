---
name: scaffold-exercises
category: misc
order: 3
title: Exercise scaffolding for a course
summary: Builds the exercise directories from a course plan in one move: section and exercise numbering, problem/solution/explainer variants, readme stubs, committed once lint passes.
---
# scaffold-exercises

**scaffold-exercises generates the exercise directory structure for a course repo** and makes sure it passes `ai-hero-cli internal lint`. Naming rules: sections `XX-section-name/`, exercises `XX.YY-exercise-name/` (dash-case); every exercise has at least one variant subdirectory — problem/ (the student's workspace, with TODOs), solution/ (the reference implementation), explainer/ (pure concept); explainer/ is the default when stubbing. Each subdirectory needs a **non-empty** readme (no broken links); to move or renumber, use `git mv` so history survives, and rerun lint once things have moved.

The flow: parse the plan → mkdir → write readme stubs → lint → fix until it passes → git commit.

## When to use

- You want the exercise directory skeleton built, or stubs for a new course section.



## Original description



> Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course section.
