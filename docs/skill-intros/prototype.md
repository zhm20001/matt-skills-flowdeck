---
name: prototype
category: engineering
order: 9
title: 一次性原型
summary: 用扔得掉的小程序回答一个设计问题：状态模型对不对、UI 该长什么样。答案留下，代码不背包袱。
---
# prototype

**prototype 是「扔得掉的代码回答一个确定的问题」**。先分清问的是哪类问题，两条分支产物完全不同：**逻辑分支**——「这个状态模型 / 业务逻辑手感对吗」——产出单个可双击的 HTML，自由把玩按钮加分步走查，专推纸面上难推演的用例；**UI 分支**——「这界面该长什么样」——在同一路由上生成几个 radically 不同的变体，URL 参数切换、底部悬浮条换页。问什么造错分支，整个原型就白做。

通用纪律：就近放置、命名明显是原型、一条命令就能跑、默认不持久化、跳过打磨、随时外显状态。做完把验证过的决策折进真代码，原型本身提交到 prototype/ 分支**保留为一手资料**，实现票上留指针。

## 什么时候用

- 一个设计问题纸上谈不清，要看到跑起来的东西才敢定；

- 主流程第 2 步的岔路（handoff 出去 → prototype → handoff 回来）。



## 原文描述



> Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
