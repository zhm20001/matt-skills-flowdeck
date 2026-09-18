---
name: diagnosing-bugs
category: engineering
order: 4
title: 疑难 bug 诊断
summary: 硬骨头的 bug 与性能回归怎么啃：先造一条能对它变红的紧凑反馈回路，别的都在这之后。
---
# diagnosing-bugs

**diagnosing-bugs 是疑难 bug 的诊断纪律**，六个阶段。核心信条：**第一阶段——建反馈回路——就是这个技能本身**。要的是「一条命令，对这个 bug 变红」：失败测试、curl 脚本、快照比对、无头浏览器、重放捕获的请求、fuzz 循环、二分挂钩……造不出来就明说并索要环境/抓包/插桩许可，**绝不先假设**。回路还要拧紧：更快、信号更准、更确定。

之后才轮到：复现并最小化（每个留下来的要素都得是承重的）→ 一次列 3–5 条可证伪假设并排序给你过目 → 单变量插桩（调试日志统一打标便于一键清理；性能问题先测量再动手）→ **先写回归测试再修**（没有合适 seam 本身就是发现，移交给架构改进）→ 清理与复盘。全程先脱敏再展示输出。

## 什么时候用

- 说「诊断 / debug 这个」；

- 报告了坏掉 / 抛错 / 失败 / 变慢的东西，且第一眼看不出来。



## 原文描述



> Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
