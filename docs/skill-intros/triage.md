---
name: triage
category: engineering
order: 16
title: 工单分诊
summary: 让外来 issue 和 PR 流过一台小状态机：分类、验证、必要时拷问，最后写成 agent 能直接接手的工单。
---
# triage

**triage 管的是「不是你建的」工作项**——外来 bug 报告、功能请求、外部 PR（「PR 就是带着代码的 issue」）。两个分类角色（bug / enhancement）加五个状态角色（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix），每个被分诊的条目恰各占一个。流程：汇报三桶待办（未打标、评估中、报者回音的 needs-info）→ 你点名一条 → 摸全上下文、查重（按领域概念搜已有实现）查既往拒绝记录（.out-of-scope/ 知识库）→ **验证声明**（bug 真复现、PR 真跑测）→ 需要就 grilling + domain-modeling 拷问成型 → 落到对应状态：agent brief、人做说明、needs-info 模板（已确认的别再问）、或按拒绝原因收尾。

分诊期间发的每条评论都带「AI 生成」免责声明；被拒的增强请求写进 .out-of-scope/ 防止反复重提。你随时可以越权直改状态（「把 #42 挪到 ready-for-agent」），它照办不啰嗦。

## 什么时候用

- 外来 issue / PR 堆积需要处理；

- 说「有什么需要我注意的」「看看 #42」「现在有什么 agent 能接的」。



## 原文描述



> Move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, and write agent-ready briefs.
