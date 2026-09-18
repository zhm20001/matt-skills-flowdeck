---
name: handoff
category: productivity
order: 3
title: 对话交接
summary: 把当前对话压成一份交接文档存到临时目录，让一个全新的 Agent 拎着它无缝接手。
---
# handoff

**handoff 把当前对话压缩成交接文档**，写到**系统临时目录**（不是当前工作区——它就是为「带去别处」设计的），让一个全新会话能接着干。文档里带一节「建议技能」，提示接手的 Agent 该调用哪些技能；已经沉淀在其他产物（规格、计划、ADR、票、提交、diff）里的内容**只引用不复述**；敏感信息（密钥、口令、个人隐私）一律脱敏。传了参数就按「下一程要干什么」裁剪重点。

它的窄口径：只在**换新工具、换新目录、交给同事、会话中途分出支线**这四种时候用——买的是可携带性。同会话内的阶段边界该考虑的是 continue / clear / 子代理 / compact。

## 什么时候用

- 把活交给一个新会话 / 新机器 / 新工具继续；

- 主流程里进出 prototype 岔路的两端。



## 原文描述



> Compact the current conversation into a handoff document for another agent to pick up.
