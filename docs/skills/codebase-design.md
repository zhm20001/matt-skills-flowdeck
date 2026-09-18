---
name: codebase-design
category: engineering
order: 3
title: 深模块设计词汇
summary: 一份参考而非流程：模块、接口、深度、接缝、适配器——把「小接口装大量行为」的语言统一起来。
---
# codebase-design

**codebase-design 是设计深模块（deep module）的共享词汇表**：**模块**是有接口有实现的东西（刻意不分大小）；**接口**是调用方必须知道的一切（不止类型签名）；**深度**是接口上的杠杆率——少量接口背后藏着大量行为；**接缝（seam）**是接口所在的位置；**适配器**是接缝处满足接口的具体角色。深度给调用方**杠杆**、给维护者**局部性**（修一处即修处处）。

内置几条判准：**删除测试**（删掉它复杂度是消失还是四散？）、**接口即测试面**（想绕过接口去测，说明模块形状不对）、**一个适配器=假想接缝，两个才是真接缝**。tdd 与 improve-codebase-architecture 都说这门语言。

## 什么时候用

- 设计或改进一个模块的接口、决定接缝放哪；

- 找「深化」机会、想让代码更好测、更好让 AI 导航；

- 其他技能（tdd、improve-codebase-architecture）需要这套词汇时。



## 原文描述



> Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
