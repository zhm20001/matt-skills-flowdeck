---
name: prototype
category: engineering
order: 9
title: Throwaway prototype
summary: Answers one design question with code you can throw away: is this state model right, what should the UI look like. The answer stays, the code owes nothing.
---
# prototype

**prototype answers one definite question with throwaway code**. First sort out which kind of question you are asking, because the two branches produce completely different artifacts: the **logic branch** — "does this state model or business logic feel right" — yields a single double-clickable HTML file, buttons to play with freely plus a step-through walk, and pushes the cases that are hard to reason through on paper; the **UI branch** — "what should this screen look like" — generates several radically different variants on the same route, switched by a URL parameter with a floating bar at the bottom to page between them. Ask one thing and build the wrong branch and the whole prototype is wasted.

The general discipline: place it close by, name it obviously a prototype, one command to run it, no persistence by default, skip the polish, keep the state visible at all times. When it is done, fold the decisions it validated into the real code and commit the prototype itself to a prototype/ branch, **kept as first-hand evidence**, leaving a pointer on the implementation ticket.

## When to use

- A design question paper cannot settle — you need to see something running before you commit.

- The detour at step 2 of the mainline (handoff out → prototype → handoff back).



## Original description



> Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
