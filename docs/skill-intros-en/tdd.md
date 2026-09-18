---
name: tdd
category: engineering
order: 13
title: Test-driven development
summary: The reference manual for the red-green loop: what a good test looks like, which seams tests go on, the three anti-patterns, and the loop's three iron rules.
---
# tdd

**tdd is the reference for the red → green loop**, one that makes the loop produce tests worth keeping. **Good tests** verify behavior through the public interface rather than implementation details — the code can be replaced entirely without the tests shattering; a test reads like a spec. **Tests go only on seams agreed in advance**: list the seams before writing and confirm them with you, so the testing effort lands on the critical paths (when the shape of an interface is itself in question, borrow codebase-design's vocabulary to talk about it).

The three anti-patterns: **implementation coupling** (mocking internal collaborators, testing private methods — red the moment you refactor); **tautology** (the assertion recomputes the expected value the same way the code does, so it can never disagree); **horizontal slicing** (all the tests first, then all the implementation — slice vertically instead: one test → one implementation → loop). The loop's iron rules: **red before green**, one slice at a time, and refactoring does not belong to this loop (that is the code-review stage's job).

## When to use

- Build a feature or fix a bug test-first.

- You mention *red-green-refactor* or want integration tests.

- Every ticket inside implement runs it.



## Original description



> Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
