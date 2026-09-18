---
name: tdd
category: engineering
order: 13
title: 测试驱动开发
summary: 红绿循环的参考手册：好测试长什么样、测试放哪些接缝、三种反模式、循环的三条铁律。
---
# tdd

**tdd 是红 → 绿循环的参考**，让这个循环产出值得留的测试。**好测试**通过公共接口验证行为而非实现细节——代码可以全换、测试不该碎；测试读起来像规格说明。**测试只放在预先商定的 seam 上**：写之前先列出 seam、与你确认，测试精力才落在关键路径上（接口形状本身有疑问就引 codebase-design 的词汇来谈）。

三大反模式：**实现耦合**（mock 内部协作方、测私有方法——一重构就红）；**同义反复**（断言按代码同样的方式重算期望值，永不可能不同意）；**水平切片**（先写全部测试再写全部实现——要竖切：一个测试 → 一份实现 → 循环）。循环铁律：**先红后绿**、一次一片、重构不属于这个循环（归 code-review 阶段）。

## 什么时候用

- 要测试先行地建功能或修 bug；

- 提到「红绿重构」或想要集成测试；

- implement 内部每张票都跑它。



## 原文描述



> Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
