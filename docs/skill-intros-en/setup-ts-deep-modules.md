---
name: setup-ts-deep-modules
category: in-progress
order: 3
title: TypeScript deep-module constraints
summary: Wires four dependency-cruiser rules into a TypeScript repo, locking every package into a deep module — entry points at the root, implementation in subfolders.
inProgress: true
---
# setup-ts-deep-modules

> ⚠️ In progress: this skill is not final and its behaviour may change.

**setup-ts-deep-modules turns deep modules into a machine-enforced boundary with dependency-cruiser**. The shape it enforces: a package's **root files** are its entry points (several small ones are fine, no barrel files) and **subfolders are private, all of them** (the lib/ implementations may call each other freely, tests/ live alongside), plus four error-severity rules: outside code may only import entry points; calls within a package are free; tests may only go through entry points and their own fixtures (cross-package integration tests qualify, deep imports do not); no dependency cycles. The layering is left for each repo to fill in.

Seven steps, with hard acceptance: install the dependency → write the config (merge into an existing one rather than overwriting it) → hook it up to lint:boundaries → build a copyable example package → **prove the rules bite** (passes when clean → add one deep import and it must go red → remove it and it passes again; no red, no sign-off) → write the package directory README and hang a one-line pointer from CLAUDE.md/AGENTS.md.

## When to use

- A TypeScript repo wants "import only through the public entry points" turned into a lint-enforced rule.



## Original description



> Wire dependency-cruiser into a TypeScript repo so each package is a deep module — implementation hidden in subfolders, reachable only through its entry-point files. User-invoked.
