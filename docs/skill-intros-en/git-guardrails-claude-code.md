---
name: git-guardrails-claude-code
category: misc
order: 1
title: Guardrails for dangerous git commands
summary: Fits Claude Code with a PreToolUse hook: dangerous git commands such as push, reset --hard and clean are stopped before they execute.
---
# git-guardrails-claude-code

**git-guardrails-claude-code fits guardrails onto Claude Code**: it installs a PreToolUse hook that intercepts Bash tool calls and blocks dangerous git commands **before they execute**, so Claude receives a "you do not have permission to run these commands" notice instead. The blocked set: git push (including --force), git reset --hard, git clean -f / -fd, git branch -D, git checkout . / git restore .

How it is installed: choose project scope (.claude/settings.json) or global (~/.claude/settings.json), copy the hook script, merge it into the existing hooks config (other settings are left alone), add or drop blocklist entries as you like, and finish with a smoke test on a fake input (it should exit with code 2 and print BLOCKED).

## When to use

- You want destructive git operations prevented (a stray push, a stray hard reset).

- You want git safety hooks added to Claude Code.



## Original description



> Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Claude Code.
