---
name: wayfinder
category: engineering
order: 17
title: 大工程寻路
summary: 工程大到装不进一个会话、前路还裹着雾时：在工单库画一张决策地图，一次解一票，解到路清为止。
---
# wayfinder

**wayfinder 是技能包里认知负荷最重的流程**，只留给真正的大活：一个松散的想法，一个会话装不下，且从这儿到**终点**（destination）的路还看不见。它在工单库上把这条路画成一张**共享地图**——一个带 `wayfinder:map` 标签的地图 issue 加一串**决策票**子 issue（票是「要拍板的问题」，不是要执行的活），票间用原生阻塞关系连边，开源未阻塞未认领的就是**前沿**。地图刻意不画全：还说不清的写进「迷雾」（Not yet specified），前面每解一票就放晴一片。

两种用法：**画图**（命名终点 → 广度优先拷问 → 建图建票接边 → research 票全放后台 → 收工，一张不解）；**走图**（读地图 → 认领前沿第一票 → 解掉 → 落决议评论、关票、回写地图索引 → 放晴新票）。铁律：**产出决策而非交付物**、一票一会话（research 除外）、HITL 票必须真人在场（代理不得自问自答）、全程用票名不用编号指代。路清了它**只交接不施工**——交给 to-spec 收敛成计划。

## 什么时候用

- 绿地项目或超大特性，一个大会话装不下、前路未知；

- 明确定义良好的小特性**不要**用它（又慢又密）。



## 原文描述



> Plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
