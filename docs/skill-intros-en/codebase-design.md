---
name: codebase-design
category: engineering
order: 3
title: Deep-module design vocabulary
summary: A reference rather than a flow: module, interface, depth, seam, adapter — one shared language for putting a lot of behavior behind a small interface.
---
# codebase-design

**codebase-design is the shared vocabulary for designing deep modules**: a **module** is something with an interface and an implementation (deliberately size-agnostic); an **interface** is everything a caller must know (not just the type signature); **depth** is the leverage at the interface — a lot of behavior hidden behind a small interface; a **seam** is where the interface sits; an **adapter** is the concrete role at a seam that satisfies the interface. Depth gives callers **leverage** and maintainers **locality** (fix it in one place and it is fixed everywhere).

It ships a few criteria: the **deletion test** (delete it — does the complexity disappear or scatter?), the **interface as test surface** (wanting to bypass the interface to test means the module is the wrong shape), and **one adapter is a hypothetical seam, two make a real seam**. tdd and improve-codebase-architecture both speak this language.

## When to use

- Designing or improving a module's interface, or deciding where a seam goes.

- Looking for deepening opportunities, or wanting code that is easier to test and easier for an AI to navigate.

- When another skill (tdd, improve-codebase-architecture) needs this vocabulary.



## Original description



> Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
