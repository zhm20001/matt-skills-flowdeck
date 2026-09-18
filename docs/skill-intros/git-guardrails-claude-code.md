---
name: git-guardrails-claude-code
category: misc
order: 1
title: git 危险命令护栏
summary: 给 Claude Code 装一道 PreToolUse 钩子：push、reset --hard、clean 这些危险 git 命令在执行前被拦下。
---
# git-guardrails-claude-code

**git-guardrails-claude-code 给 Claude Code 加护栏**：装一个 PreToolUse hook 拦截 Bash 工具调用，在危险 git 命令**执行之前**挡下——git push（含 --force）、git reset --hard、git clean -f / -fd、git branch -D、git checkout . / git restore .。被拦时 Claude 会收到「你无权执行这些命令」的提示。

装法：选项目级（.claude/settings.json）或全局（~/.claude/settings.json），拷钩子脚本、合并进既有 hooks 配置（不覆盖其他设置）、黑名单可按需增删，最后用一条假输入做冒烟（应退出码 2 并打印 BLOCKED）。

## 什么时候用

- 想防止破坏性 git 操作（误 push、误 hard reset）；

- 给 Claude Code 加 git 安全钩子。



## 原文描述



> Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Claude Code.
