---
name: code-review
category: engineering
order: 2
title: 双轴代码评审
summary: 从某个固定点以来的改动，按「守规范吗」与「做对了吗」两根轴分开评审、分开报告。
---
# code-review

**code-review 对 `git diff <固定点>...HEAD` 做双轴评审**：**Standards 轴**看代码是否遵守仓库成文的编码规范（外加一组固定的 Fowler 坏味道基线，仓库明文规范优先于基线）；**Spec 轴**看代码是否忠实实现了来源 issue/规格——缺了什么、多了什么（scope creep）、看似实现实则不对的地方。

两根轴各开一个并行子代理，互不污染上下文，报告并排呈现、**绝不合并排序**——一份代码完全可能「规范全对但做错了事」或「做对了事但违反规范」，分开报才不会互相掩护。坏引用或空 diff 在进子代理前就失败。

## 什么时候用

- 要评审一个分支、一个 PR 或进行中的改动；

- 说「review since X」（某提交 / 分支 / 标签以来的改动）；

- implement 收尾时（它内部自动跑这一步）。



## 原文描述



> Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side.
