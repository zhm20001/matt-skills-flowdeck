---
name: scaffold-exercises
category: misc
order: 3
title: 课程练习骨架
summary: 按课程计划一键搭出练习目录：章节/练习编号、problem/solution/explainer 变体、readme 存根，过 lint 后提交。
---
# scaffold-exercises

**scaffold-exercises 为课程仓库生成练习目录结构**，并保证通过 `ai-hero-cli internal lint`。命名规则：章节 `XX-section-name/`、练习 `XX.YY-exercise-name/`（dash-case）；每个练习至少一个变体子目录——problem/（学生工作区带 TODO）、solution/（参考实现）、explainer/（纯概念）；存根时默认 explainer/。每个子目录要有**非空** readme（无坏链）；挪动 / 重编号用 `git mv` 保历史，挪完重跑 lint。

流程：解析计划 → mkdir → 写 readme 存根 → lint → 修到达标 → git commit。

## 什么时候用

- 想搭练习目录骨架、建课程新章节的存根。



## 原文描述



> Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course section.
