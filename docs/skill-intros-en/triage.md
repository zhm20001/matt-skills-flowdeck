---
name: triage
category: engineering
order: 16
title: Ticket triage
summary: Run incoming issues and PRs through a small state machine: categorize, verify, grill when necessary, and end by writing a ticket an agent can pick up as is.
---
# triage

**triage deals with work items you did not create** — incoming bug reports, feature requests, external PRs ("a PR is an issue that arrives with code attached"). Two category roles (bug / enhancement) plus five state roles (needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix), and each triaged item holds exactly one of each. The flow: report the three buckets of open work (unlabeled, under evaluation, needs-info awaiting the reporter's reply) → you name one → gather the full context, check for duplicates (search existing implementations by domain concept) and past rejections (the .out-of-scope/ knowledge base) → **verify the claim** (actually reproduce the bug, actually run the PR's tests) → if needed, grill it into shape with grilling + domain-modeling → land it on the matching state: an agent brief, a note for a human to do, a needs-info template (don't re-ask what is already confirmed), or a close-out per the rejection reason.

Every comment posted during triage carries an AI-generated disclaimer; a rejected enhancement request is written into .out-of-scope/ so it cannot keep coming back. You can overrule at any time and change a state directly ("move #42 to ready-for-agent") — it complies without arguing.

## When to use

- Incoming issues / PRs are piling up and need handling.

- You say "what needs my attention", "look at #42", or "what is agent-ready right now".



## Original description



> Move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, and write agent-ready briefs.
