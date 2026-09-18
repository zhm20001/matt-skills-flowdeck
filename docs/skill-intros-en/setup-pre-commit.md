---
name: setup-pre-commit
category: misc
order: 4
title: Pre-commit hook setup
summary: Sets up Husky + lint-staged in one pass: Prettier formats the staged files on commit, then type checking and tests run.
---
# setup-pre-commit

**setup-pre-commit puts a gate in front of commits in your repo**: Husky pre-commit hooks + lint-staged (Prettier over the staged files) + typecheck and test at commit time. The flow: detect the package manager (the lockfile decides) → install husky / lint-staged / prettier → `npx husky init` → write `.husky/pre-commit` (lint-staged → typecheck → test; where the repo has no matching script, it is skipped and you are told) → write `.lintstagedrc` → add a default Prettier config only if there is no existing one → walk the checklist → **smoke-test it with a real commit** (the hooks are freshly installed, so this is the moment to try them).

## When to use

- You want pre-commit formatting / type checking / tests added to the repo.

- You are setting up Husky or lint-staged.



## Original description



> Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.
