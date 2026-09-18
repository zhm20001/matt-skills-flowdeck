---
name: README
category: overview
order: 0
title: 全景总览
summary: 35 个技能的地图：四类分工、主流程怎么串、从哪进。
---

# README

**Matt 技能包**是一套面向 AI 编程的技能（skill）集合：每个技能是一份 SKILL.md 指令文档，Agent 按需加载，用来把「一个想法 → 上线」的全程装上纪律与脚手架。本目录收录其中 35 个技能的中文全景介绍，每篇从对应的 SKILL.md 提炼，末尾附原文描述。

## 四类分工

- **工程流程（engineering · 18 个）**：主流程与代码健康。从拷问想法到拆票实现、评审、诊断、架构改进的全链路。

- **效率与协作（productivity · 7 个）**：访谈、交接、教学、问卷等围绕「人」的通用技能，不限于写代码。

- **专项工具（misc · 4 个）**：一次性环境配置与迁移工具——git 护栏、提交钩子、shoehorn 迁移、课程骨架。

- **开发中（in-progress · 6 个）**：尚未定稿的技能（后台交接、工作流拷贝、TS 深模块约束、写作三部曲），行为可能变化。

## 主流程：想法 → 上线

大多数工作沿一条主流程走：**grill-with-docs**（拷问想法、沉淀文档）→ 需要动手验证时岔到 **prototype**（用 **handoff** 双向桥接）→ **to-spec**（对话收敛成规格）→ **to-tickets**（拆成带阻塞边的竖切工单）→ 每张票用 **implement**（内部跑 **tdd**，收尾跑 **code-review**）。三条匝道汇入主流程：外来问题堆多了走 **triage**；线上坏了走 **diagnosing-bugs**；工程大到单会话装不下走 **wayfinder**。代码健康由 **improve-codebase-architecture** 巡检，底层词汇由 **domain-modeling** 与 **codebase-design** 两份参考支撑。初次使用先跑 **setup-matt-pocock-skills** 配置工单库与文档布局。

左侧列表按类分组，点任意技能看详细介绍；文中的技能名链接可在介绍之间跳转。

## 工程流程（engineering）

- [ask-matt](ask-matt.md) — 技能问路台：记不住 35 个技能没关系：说出你的处境，它告诉你该用哪个、走哪条路。
- [code-review](code-review.md) — 双轴代码评审：从某个固定点以来的改动，按「守规范吗」与「做对了吗」两根轴分开评审、分开报告。
- [codebase-design](codebase-design.md) — 深模块设计词汇：一份参考而非流程：模块、接口、深度、接缝、适配器——把「小接口装大量行为」的语言统一起来。
- [diagnosing-bugs](diagnosing-bugs.md) — 疑难 bug 诊断：硬骨头的 bug 与性能回归怎么啃：先造一条能对它变红的紧凑反馈回路，别的都在这之后。
- [domain-modeling](domain-modeling.md) — 领域建模：边设计边打磨项目的领域模型：挑战术语、压测边界、敲定即写入 CONTEXT.md，重大取舍记 ADR。
- [grill-with-docs](grill-with-docs.md) — 拷问并沉淀文档：主力入口：一轮不留情面的访谈把方案磨利，同时随手把术语与决策沉淀成 CONTEXT.md 和 ADR。
- [implement](implement.md) — 按票实现：把规格或一组票变成代码：TDD 推进、勤跑类型检查、收尾全量测试加双轴评审、提交当前分支。
- [improve-codebase-architecture](improve-codebase-architecture.md) — 架构改进扫描：有空闲就跑一遍：扫出「浅模块变深」的机会，出一份可视化报告，挑中哪个就拷问细化哪个。
- [prototype](prototype.md) — 一次性原型：用扔得掉的小程序回答一个设计问题：状态模型对不对、UI 该长什么样。答案留下，代码不背包袱。
- [research](research.md) — 后台调研：把查资料的腿活派给后台代理：对着一手来源调查，带引用的笔记落进仓库，你继续干你的活。
- [resolving-merge-conflicts](resolving-merge-conflicts.md) — 解合并冲突：正在进行的 merge/rebase 冲突逐块解：追溯两侧意图、能保则双保、绝不 abort、跑完检查再收尾。
- [setup-matt-pocock-skills](setup-matt-pocock-skills.md) — 技能包初始化：工程技能的前置一次性配置：工单库放哪、triage 标签叫什么、领域文档什么布局。
- [tdd](tdd.md) — 测试驱动开发：红绿循环的参考手册：好测试长什么样、测试放哪些接缝、三种反模式、循环的三条铁律。
- [to-spec](to-spec.md) — 对话转规格：不访谈、只综合：把已经聊透的对话收敛成一份规格，直接发布到工单库。
- [to-tickets](to-tickets.md) — 计划拆工单：把计划拆成一张张「曳光弹」竖切票，票票声明阻塞边，发布到配置好的工单库。
- [triage](triage.md) — 工单分诊：让外来 issue 和 PR 流过一台小状态机：分类、验证、必要时拷问，最后写成 agent 能直接接手的工单。
- [wayfinder](wayfinder.md) — 大工程寻路：工程大到装不进一个会话、前路还裹着雾时：在工单库画一张决策地图，一次解一票，解到路清为止。
- [wizard](wizard.md) — 人工步骤向导：只有人能做的那几步（开通服务、填密钥、点后台）生成一个交互式 bash 向导，照着走完就行。

## 效率与协作（productivity）

- [grill-me](grill-me.md) — 无状态拷问：同一套不留情面的访谈，但什么都不落盘——手里没有仓库时的 grill-with-docs 替身。
- [grilling](grilling.md) — 拷问原语：访谈的地基：设计树按轮推进，每轮问全前沿问题、附推荐答案，前沿清空才算达成共识。
- [handoff](handoff.md) — 对话交接：把当前对话压成一份交接文档存到临时目录，让一个全新的 Agent 拎着它无缝接手。
- [teach](teach.md) — 教学工作台：以当前目录为教室的跨会话教学：使命先行、课程成套、检索练习硬碰硬，还替你找社群。
- [to-questionnaire](to-questionnaire.md) — 决策转问卷：答案卡在别人脑子里？它拷问你怎么「寄」，然后替你写一份瞄准认知缺口的问卷。
- [wait-what](wait-what.md) — 重讲一遍：刚才那条消息没听懂：让 Agent 收回重讲——补上下文、说人话、用项目的词汇表。
- [writing-for-agents](writing-for-agents.md) — 给 Agent 写文档：写 SKILL.md、AGENTS.md、被指到的文档时翻的参考：指针、负载、层级、完成标准、leading word 与修剪。

## 专项工具（misc）

- [git-guardrails-claude-code](git-guardrails-claude-code.md) — git 危险命令护栏：给 Claude Code 装一道 PreToolUse 钩子：push、reset --hard、clean 这些危险 git 命令在执行前被拦下。
- [migrate-to-shoehorn](migrate-to-shoehorn.md) — shoehorn 迁移：测试里的 as 断言换成 shoehorn 的类型安全写法：fromPartial 接缺字段，fromAny 接故意给错的数据。
- [scaffold-exercises](scaffold-exercises.md) — 课程练习骨架：按课程计划一键搭出练习目录：章节/练习编号、problem/solution/explainer 变体、readme 存根，过 lint 后提交。
- [setup-pre-commit](setup-pre-commit.md) — 提交前钩子配置：一条龙配好 Husky + lint-staged：提交前先 Prettier 格式化暂存文件，再跑类型检查与测试。

## 开发中（in-progress）

- [claude-handoff](claude-handoff.md) — 后台代理交接：handoff 的即发版：对话摘要直接喂给一个后台 Claude 代理，立即返回、立即开工。（开发中）
- [loop-me](loop-me.md) — 工作流拷问：一场只产出「工作流规格」的有状态拷问：用循环镜头审视你的生活，把值得委派的循环写成规格。（开发中）
- [setup-ts-deep-modules](setup-ts-deep-modules.md) — TS 深模块约束：给 TypeScript 仓库装 dependency-cruiser 四条规则，把每个包锁成「入口在根、实现在子目录」的深模块。（开发中）
- [writing-beats](writing-beats.md) — 写作·节拍：写作「利用」期的旅程式写法：原料堆排成一串节拍，每拍先落地概念再引用概念，一拍一拍推进。（开发中）
- [writing-fragments](writing-fragments.md) — 写作·片段：写作「探索」期：只挖不立——拷问式访谈把片段攒进一个原料堆，结构是下一个技能的事。（开发中）
- [writing-shape](writing-shape.md) — 写作·塑形：写作「利用」期的塑形版：原料堆只读，逐段生长文章——开头定调、概念先落地、格式权衡摆上台面争。（开发中）
