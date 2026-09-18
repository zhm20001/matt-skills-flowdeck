---
name: domain-modeling
category: engineering
order: 5
title: Domain modeling
summary: Builds and sharpens the project's domain model while you design: challenges terms, stress-tests boundaries, writes settled names into CONTEXT.md, and records major trade-offs as ADRs.
---
# domain-modeling

**domain-modeling is an active modeling discipline**, not something you do by reading the docs — it works while you change the model: it challenges wording that conflicts with the existing glossary ("your 'cancel' is X in CONTEXT.md, what you are saying sounds like Y"); it gives vague terms a canonical name (is "account" the customer or the user?); it stress-tests concept boundaries with concrete scenarios; and when you state how the system behaves, it cross-checks against the code and puts the contradiction on the table.

The moment a term settles, CONTEXT.md is updated **then and there** (a glossary only, no implementation details); only decisions that check all three boxes — hard to reverse, confusing without context, a real trade-off — are worth an ADR. File layout is created lazily: single context = CONTEXT.md at the repo root plus docs/adr/; multiple contexts only once a CONTEXT-MAP.md exists. grill-with-docs runs this internally.

## When to use

- You want to pin down domain terminology or a ubiquitous language.

- You want to record an architectural decision (an ADR).

- Another skill needs the domain model maintained.



## Original description



> Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
