---
name: resolving-merge-conflicts
category: engineering
order: 11
title: 解合并冲突
summary: 正在进行的 merge/rebase 冲突逐块解：追溯两侧意图、能保则双保、绝不 abort、跑完检查再收尾。
---
# resolving-merge-conflicts

**resolving-merge-conflicts 处理进行中的合并/变基冲突**，五步：看清当前状态（git 历史 + 冲突文件）；为每处冲突找**一手来源**——读提交信息、查 PR、翻原始 issue，弄懂每边当初为什么改；逐 hunk 解决——能保两侧意图就都保，实在不相容就按本次合并的目标取舍并记下代价，**不发明新行为，绝不 `--abort`**；跑项目自己的自动化检查（类型检查 → 测试 → 格式化），修好合并弄坏的东西；完成整个 merge/rebase 操作（变基就 continue 到底）。

## 什么时候用

- 你已经身处冲突之中（它独立于所有流程之外）。



## 原文描述



> "Use when you need to resolve an in-progress git merge/rebase conflict."
