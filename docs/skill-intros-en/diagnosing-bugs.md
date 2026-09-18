---
name: diagnosing-bugs
category: engineering
order: 4
title: Hard-bug diagnosis
summary: How to take on stubborn bugs and performance regressions: first build a tight feedback loop that goes red for this bug; everything else comes after.
---
# diagnosing-bugs

**diagnosing-bugs is the diagnosis discipline for hard bugs**, in six stages. The core creed: **the first stage — build the feedback loop — is the skill itself**. What you want is one command that goes red for this bug: a failing test, a curl script, a snapshot comparison, a headless browser, a replay of a captured request, a fuzz loop, a bisect hook… If you cannot build it, say so plainly and ask for the environment, a capture, or permission to instrument — **never assume first**. Then tighten the loop: faster, sharper signal, more deterministic.

Only after that comes the rest: reproduce and minimize (every element left in must be load-bearing) → list 3-5 falsifiable hypotheses at once, ranked for your review → instrument one variable at a time (debug logs tagged uniformly so they clear in one pass; for performance, measure before touching anything) → **write the regression test before the fix** (the absence of a suitable seam is itself a finding, handed off to architecture work) → clean up and review. Throughout, output is redacted before it is shown.

## When to use

- You say "diagnose" or "debug this".

- Something is reported broken, throwing, failing, or slow, and it is not obvious at first glance.



## Original description



> Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
