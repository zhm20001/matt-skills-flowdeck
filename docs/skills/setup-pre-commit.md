---
name: setup-pre-commit
category: misc
order: 4
title: 提交前钩子配置
summary: 一条龙配好 Husky + lint-staged：提交前先 Prettier 格式化暂存文件，再跑类型检查与测试。
---
# setup-pre-commit

**setup-pre-commit 给仓库装提交前关卡**：Husky 预提交钩子 + lint-staged（对暂存文件跑 Prettier）+ 提交时的 typecheck 与 test。流程：探测包管理器（锁文件说了算）→ 装 husky / lint-staged / prettier → `npx husky init` → 写 `.husky/pre-commit`（lint-staged → typecheck → test；仓库没有对应脚本就省去并告知）→ 写 `.lintstagedrc` → 没有现成 Prettier 配置才补一份默认 → 核对清单 → **用一次真实提交做冒烟**（钩子刚装好，正好试试）。

## 什么时候用

- 想给仓库加提交前格式化 / 类型检查 / 测试；

- 配 Husky 或 lint-staged。



## 原文描述



> Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.
