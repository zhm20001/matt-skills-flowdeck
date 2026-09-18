---
name: to-spec
category: engineering
order: 14
title: 对话转规格
summary: 不访谈、只综合：把已经聊透的对话收敛成一份规格，直接发布到工单库。
---
# to-spec

**to-spec 是主流程里「谈完了」到「能拆票」之间的一步**：它**不做访谈**——只把当前对话的上下文与对代码库的理解综合成规格。过程：摸一遍仓库现状；勾出测试要打的 seam（优先既有 seam、尽量取最高处、全库越少越好——先跟你确认）；按模板成文并发布到工单库，直接打 ready-for-agent 标签（免分诊）。

规格模板：问题陈述、方案、**超长的编号用户故事列表**、实现决策（建/改哪些模块、接口、架构与 API 契约……）、测试决策、范围外、备注。**不写具体文件路径与代码片段**（很快过时）；唯一例外是原型产出的、比散文更精确的决策片段（状态机、schema）可以内联并注明出处。

## 什么时候用

- grilling 已把问题问穿，要把共识落成纸面规格；

- wayfinder 的地图收尾处：把一串决策票塌缩成可建的计划。



## 原文描述



> Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
