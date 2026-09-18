---
name: wizard
category: engineering
order: 18
title: Wizard for human-only steps
summary: For the steps only a human can do (provision a service, paste a key, click through a dashboard): generate an interactive bash wizard and just follow it to the end.
---
# wizard

**wizard generates an interactive bash script that leads a human step by step through a manual process only they can perform**: provisioning infrastructure, configuring credentials or CI secrets, clicking through an unfamiliar third-party dashboard, running a one-off migration or cutover. The script opens every URL that should be opened, says what to click and what to copy at each step, takes each value in and writes it where it belongs (.env, GitHub secrets), confirms at the critical points, and always shows how many steps are left; hidden input for secrets, idempotent writes to .env, a summary at the end — this UX is guaranteed by the template library, and the author only has to scope the flow and sequence each step.

A wizard is disposable by default (kept in a temp directory or scripts/, deleted after the run); commit it into the repo only when you want one repeatable install path. The criteria: **a step the agent can perform itself does not earn a wizard** — this is precisely the case where *the human really is in the loop*.

## When to use

- Configuring CI secrets, provisioning a third-party service, walking an unfamiliar dashboard, a one-off cutover.

- The same manual steps, and you do not want to re-explain them to an AI every time.



## Original description



> Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.
