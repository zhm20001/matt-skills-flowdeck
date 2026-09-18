---
name: domain-modeling
category: engineering
order: 5
title: 领域建模
summary: 边设计边打磨项目的领域模型：挑战术语、压测边界、敲定即写入 CONTEXT.md，重大取舍记 ADR。
---
# domain-modeling

**domain-modeling 是主动的建模纪律**，不是读完文档就算——它在你改模型的时候干活：挑战与既有词汇表冲突的说法（「你的『取消』在 CONTEXT.md 里是 X，你现在说的像 Y」）；给模糊词起规范名（「account」到底是客户还是用户？）；用具体场景压测概念边界；你陈述系统行为时与代码交叉核对，矛盾就摆上台面。

术语一敲定**当场**更新 CONTEXT.md（纯词汇表，不装实现细节）；只有「难逆转 + 没上下文会费解 + 真实取舍」三条全占的决策才值得立 ADR。文件结构懒创建：单上下文 = 根目录 CONTEXT.md + docs/adr/；有 CONTEXT-MAP.md 才是多上下文。grill-with-docs 内部跑的就是它。

## 什么时候用

- 想钉死领域术语或统一语言；

- 要记录一条架构决策（ADR）；

- 其他技能需要维护领域模型时。



## 原文描述



> Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
