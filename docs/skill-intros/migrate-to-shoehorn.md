---
name: migrate-to-shoehorn
category: misc
order: 2
title: shoehorn 迁移
summary: 测试里的 as 断言换成 shoehorn 的类型安全写法：fromPartial 接缺字段，fromAny 接故意给错的数据。
---
# migrate-to-shoehorn

**migrate-to-shoehorn 把测试文件里的 `as` 类型断言迁到 @total-typescript/shoehorn**——让你在测试里递部分数据还过得了类型检查。两组迁移：`x as Type` → `fromPartial(x)`（大对象只关心两三个字段时不必伪造其余二十个属性）；`x as unknown as Type` → `fromAny(x)`（故意给错数据测错误路径，还不丢自动补全）。另有 fromExact 强制全量。**只许测试代码用，生产代码 never**。

流程：先问清哪些测试文件受 `as` 之苦、是不是「大对象少字段」、要不要故意错数据；然后安装、grep 定位（`grep -r " as [A-Z]" --include="*.test.ts"`）、逐一替换、补 import、跑类型检查收尾。

## 什么时候用

- 提到 shoehorn；

- 测试里的 `as` 断言碍事、想要类型安全的部分测试数据。



## 原文描述



> Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.
