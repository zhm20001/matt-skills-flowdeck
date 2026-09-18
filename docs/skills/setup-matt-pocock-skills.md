---
name: setup-matt-pocock-skills
category: engineering
order: 12
title: 技能包初始化
summary: 工程技能的前置一次性配置：工单库放哪、triage 标签叫什么、领域文档什么布局。
---
# setup-matt-pocock-skills

**setup-matt-pocock-skills 给仓库铺好其他工程技能依赖的地基**，三块：**工单追踪器**——issue 放哪（默认 GitHub，也支持 GitLab、本地 markdown（.scratch/ 下每票一文件）或你描述的任何流程），写进 docs/agents/issue-tracker.md；**triage 标签**——五个 canonical 角色（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）用默认名还是沿用你现有的叫法；**领域文档**——默认单上下文（根目录 CONTEXT.md + docs/adr/），monorepo 才谈多上下文。

它是提示驱动的：先探查仓库现状（remote、CLAUDE.md/AGENTS.md、已有约定），汇报发现、逐节确认（每节先给推荐答案），草稿可改再落盘。CLAUDE.md 与 AGENTS.md 只改已存在的那一个，绝不两边都建。**首次使用其他工程技能前跑一次即可**，之后想换工单库再重跑。

## 什么时候用

- 第一次在这个仓库使用工程技能之前（必须）。



## 原文描述



> Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
