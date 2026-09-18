---
name: to-tickets
category: engineering
order: 15
title: 计划拆工单
summary: 把计划拆成一张张「曳光弹」竖切票，票票声明阻塞边，发布到配置好的工单库。
---
# to-tickets

**to-tickets 把计划 / 规格 / 对话拆成工单**。每张票是一条**曳光弹**：窄但完整地纵切所有层（schema → API → UI → 测试），单独完成即可演示或验证，尺寸塞得进一个新鲜上下文窗口。每张票声明**阻塞边**——哪些票必须先完成；无阻塞的立即能开工。**宽改是竖切的例外**：改一个共享符号波及全库的机械改动，硬塞竖切永远绿不了，改走 expand–contract（先加新形、分批迁移、最后删旧形），每批一张票。

发布前先向你过一遍：粒度对不对、阻塞边是否真实、要不要合并拆分。发布形态随工单库而变：本地 markdown 是 `.scratch/<特性>/issues/<NN>-<短名>.md` 一票一文件（flowdeck 追踪的正是这个），真实追踪器用原生阻塞关系；一律打 ready-for-agent。同样不写具体文件路径与代码片段（原型决策片段例外）。

## 什么时候用

- 规格已定，要拆成可并行、可分配的实施单元；

- 拆完每张票丢给 implement（每票一个新会话）。



## 原文描述



> Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
