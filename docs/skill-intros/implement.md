---
name: implement
category: engineering
order: 7
title: 按票实现
summary: 把规格或一组票变成代码：TDD 推进、勤跑类型检查、收尾全量测试加双轴评审、提交当前分支。
---
# implement

**implement 是主流程的执行端**：按规格或票实现工作。能用 TDD 就用 TDD，在**预先商定的 seam** 上红绿推进；类型检查常跑、单个测试文件常跑，收尾跑一次全量测试套件；完成后用 code-review 评审这批改动，最后提交到当前分支。

单独可用的场景：规格已经写好、票已经拆好（to-spec / to-tickets 的下游），或你直接描述了一段要实现的活。

## 什么时候用

- 依据一份规格或一组工单实现；

- 主流程走完拆票后的每张票（每张票建议开新会话跑）。



## 原文描述



> "Implement a piece of work based on a spec or set of tickets."
