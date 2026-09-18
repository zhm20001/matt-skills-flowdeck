---
name: claude-handoff
category: in-progress
order: 1
title: 后台代理交接
summary: handoff 的即发版：对话摘要直接喂给一个后台 Claude 代理，立即返回、立即开工。
inProgress: true
---
# claude-handoff

> ⚠️ 开发中：此技能尚未定稿，行为可能变化。

**claude-handoff 是 handoff 的「不落盘」版**：同样把当前对话压缩成交接摘要，但不写文件——直接作为提示词启动一个后台代理（`claude --bg --name "<描述性名字>" "<交接摘要>"`）。代理在当前工作目录立即开工、命令立即返回，你用 `claude agents` 管理它。**必须带描述性的 `--name`**——任务列表、会话选择器、终端标题显示的都是它。

其余纪律同 handoff：带「建议技能」节；已沉淀的内容引用不复述；敏感信息脱敏（摘要会变成代理的提示词）。

## 什么时候用

- 想让接手的代理**现在就开工**，而不是等人开新会话。



## 原文描述



> Hand the current conversation off to a fresh background agent that picks up the work immediately.
