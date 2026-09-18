---
name: resolving-merge-conflicts
category: engineering
order: 11
title: Resolving merge conflicts
summary: Resolve an in-progress merge/rebase conflict hunk by hunk: trace both sides' intent, keep both when you can, never abort, and finish only after the checks run.
---
# resolving-merge-conflicts

**resolving-merge-conflicts handles in-progress merge/rebase conflicts** in five steps: read the current state (git history + the conflicted files); for every conflict find the **primary source** — read the commit messages, check the PR, dig up the original issue — to work out why each side changed what it did; resolve hunk by hunk — keep both sides whenever both intents survive, and when they are genuinely incompatible trade them off against the goal of this merge and record the cost, **never invent new behavior, never `--abort`**; run the project's own automated checks (type check → tests → formatting) and repair whatever the merge broke; complete the whole merge/rebase operation (for a rebase, continue all the way through).

## When to use

- You are already inside the conflict (it stands apart from every workflow).



## Original description



> "Use when you need to resolve an in-progress git merge/rebase conflict."
