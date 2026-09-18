---
name: ask-matt
category: engineering
order: 1
title: 技能问路台
summary: 记不住 35 个技能没关系：说出你的处境，它告诉你该用哪个、走哪条路。
---
# ask-matt

**ask-matt 是整个技能包的路由器**：它把全部技能组织成一张流程地图——一条「想法 → 上线」的主流程、几条汇入匝道、一批独立技能和两份底层词汇——然后按你现在的处境推荐入口。

## 它知道哪些路

- **主流程**：grill-with-docs →（需要时岔 prototype，handoff 双向桥接）→ to-spec → to-tickets → implement（内部 tdd + code-review）。

- **匝道**：外来问题堆积 → triage；东西坏了 → diagnosing-bugs；工程大到装不进一个会话 → wayfinder。

- **独立技能**：grill-me、resolving-merge-conflicts、prototype、research、to-questionnaire、wizard、wait-what、teach、writing-for-agents。

- **底层词汇**：domain-modeling（领域语言）与 codebase-design（深模块词汇）。

- **阶段边界**：Continue / clear / handoff / 子代理 / compact 五个选项怎么挑。

## 什么时候用

- 不确定该从哪个技能进场；

- 想知道当前这摊活该并入哪条流程；

- 想在阶段边界上做个明确决定（继续、清空、交接还是压缩）。

## 原文描述

> Ask which skill or flow fits your situation. A router over the skills in this repo.
