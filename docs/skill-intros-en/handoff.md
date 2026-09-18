---
name: handoff
category: productivity
order: 3
title: Conversation handoff
summary: Compresses the current conversation into a handoff document in the temp directory so a brand-new agent can pick it up and carry on without a seam.
---
# handoff

**handoff compresses the current conversation into a handoff document**, written to the **system temp directory** (not the current workspace — it is built to be carried elsewhere), so a fresh session can keep going from there. The document includes a "suggested skills" section telling the receiving agent which skills to invoke; anything already settled in another artifact (spec, plan, ADR, tickets, commits, diffs) is **referenced, never restated**; secrets, passwords and personal data are redacted without exception. Pass an argument and the emphasis is trimmed to "what the next leg has to do".

Its narrow scope: use it in exactly four situations — **a new tool, a new directory, handing work to a colleague, a side branch splitting off mid-session** — what you are buying is portability. For stage boundaries inside the same session, what to consider is continue / clear / a subagent / compact.

## When to use

- Work moves to a new session / a new machine / a new tool to continue.

- Either end of stepping into and out of the prototype detour on the main path.



## Original description



> Compact the current conversation into a handoff document for another agent to pick up.
