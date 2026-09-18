---
name: wizard
category: engineering
order: 18
title: 人工步骤向导
summary: 只有人能做的那几步（开通服务、填密钥、点后台）生成一个交互式 bash 向导，照着走完就行。
---
# wizard

**wizard 生成一个交互式 bash 脚本，牵着人一步步走完只有人能做的手工流程**：开通基础设施、配凭据或 CI secrets、点一个陌生的第三方后台、跑一次性的迁移切换。脚本打开每个该开的 URL、说清每一步点什么拷什么、收下每个值写进该写的地方（.env、GitHub secrets）、关键处确认、随时显示还剩几步；隐藏输入密钥、幂等写 .env、收尾给摘要——这套 UX 由模板库保证，作者只负责圈定流程、编排每一步。

向导默认用完即弃（存临时或 scripts/，跑完删）；想留一条可复跑的安装路径才提交进仓库。判准：**代理自己能做的步骤不配用向导**——这正是「人真的在环里」的场景。

## 什么时候用

- 配 CI secrets、开第三方服务、走不熟的后台、一次性 cutover；

- 同一套手工步骤不想每次都重新向 AI 解释一遍。



## 原文描述



> Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.
