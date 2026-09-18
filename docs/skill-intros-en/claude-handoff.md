---
name: claude-handoff
category: in-progress
order: 1
title: Background agent handoff
summary: The fire-and-forget version of handoff — the conversation summary is fed straight to a background Claude agent, the command returns at once and the agent starts work at once.
inProgress: true
---
# claude-handoff

> ⚠️ In progress: this skill is not final and its behaviour may change.

**claude-handoff is the version of handoff that never touches disk**: it compresses the current conversation into a handoff summary just the same, but writes no file — the summary goes straight into a background agent's prompt instead (`claude --bg --name "<descriptive name>" "<handoff summary>"`). The agent starts working immediately in the current working directory, the command returns at once, and you manage it with `claude agents`. **Always pass a descriptive `--name`** — it is what the task list, the session picker, and the terminal title all display.

The rest of the discipline is handoff's: carry a *suggested skills* section; reference what has already been written down instead of restating it; redact sensitive information (the summary becomes the agent's prompt).

## When to use

- You want the agent taking over to **start working right now**, instead of waiting for someone to open a new session.



## Original description



> Hand the current conversation off to a fresh background agent that picks up the work immediately.
