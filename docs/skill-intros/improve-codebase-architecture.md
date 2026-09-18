---
name: improve-codebase-architecture
category: engineering
order: 8
title: 架构改进扫描
summary: 有空闲就跑一遍：扫出「浅模块变深」的机会，出一份可视化报告，挑中哪个就拷问细化哪个。
---
# improve-codebase-architecture

**improve-codebase-architecture 是代码健康的巡检技能**：让子代理带着 codebase-design 的词汇（深度、接缝、删除测试……）走查代码库——优先看近期改动密集的热点——找出浅模块、缺局部性的纯函数、接缝处泄漏的耦合、难测试的地方，整理成**深化机会**。

产出是一份写到系统临时目录的**自包含 HTML 报告**（不落仓库）：每张候选卡带文件、问题、方案、收益（用局部性/杠杆解释）与 before/after 图，附推荐强度徽章和首推项；与既有 ADR 冲突的候选会显式标注而非默默回避。你挑中一个后进入 grilling 循环细化设计，边谈边用 domain-modeling 更新词汇表。

## 什么时候用

- 有空闲时间想让代码库对人和 AI 都更好维护；

- 修完大 bug 复盘「什么能预防它」时（diagnosing-bugs 会移交过来）。



## 原文描述



> Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
