---
name: setup-ts-deep-modules
category: in-progress
order: 3
title: TS 深模块约束
summary: 给 TypeScript 仓库装 dependency-cruiser 四条规则，把每个包锁成「入口在根、实现在子目录」的深模块。
inProgress: true
---
# setup-ts-deep-modules

> ⚠️ 开发中：此技能尚未定稿，行为可能变化。

**setup-ts-deep-modules 用 dependency-cruiser 把「深模块」变成机器强制的边界**。它强制的形状：每个包的**根文件**就是入口点（可以有好几个小的，不搞桶文件），**子文件夹一律私有**（lib/ 实现互调自由、tests/ 共存），外加四条 error 级规则：外部只能 import 入口点；包内互调自由；测试只能走入口点与自家 fixtures（跨包集成测试行、深 import 不行）；无循环依赖。分层留给各仓库自己填。

七步走，验收硬性：装依赖 → 写配置（已有配置就合并不覆盖）→ 接入 lint:boundaries → 造一个可拷贝的 example 包 → **证明规则咬人**（干净时过 → 塞一个深 import 必须红 → 撤掉再过，红不出来就不许收工）→ 写包目录 README 并从 CLAUDE.md/AGENTS.md 挂一行指针。

## 什么时候用

- TS 仓库想把「只能从公共入口 import」变成 lint 强制。



## 原文描述



> Wire dependency-cruiser into a TypeScript repo so each package is a deep module — implementation hidden in subfolders, reachable only through its entry-point files. User-invoked.
