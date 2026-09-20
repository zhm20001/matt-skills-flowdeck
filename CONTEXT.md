# flowdeck

本地零依赖 Web 服务 + 单页界面，被动追踪任意项目 `.scratch/` 里的流程产物（grill → to-spec → to-tickets → implement），不绑定任何编辑器或 Agent。

## Language

**追踪目录（root）**:
流程板正在盘点的那个项目目录（里面应有 `.scratch/`）。同一时刻只有一个。
_Avoid_: 地址、项目路径、workspace

**常用目录（recent root）**:
在网页上成功切换过的追踪目录，按最近使用排序自动收录的列表条目；存在 config.json 里，仅用于快速取用。
_Avoid_: 收藏、书签、地址簿、地址

**访问令牌（token）**:
服务端 config.json 里可选的共享口令；非空时 `/api/*` 的每个请求都要携带（`X-FlowDeck-Token` 头或 URL 查询串）。界面从 URL 收下后记忆在浏览器并自动随请求携带。
_Avoid_: 密码、口令、鉴权码、密钥

**字段行（field line）**:
工单顶部机器可读的行——Status、Blocked by、Type、Labels。判准是「标签 + 冒号 + 值」的行纪律；加粗与裸写皆为合法形态、语义相同（两类历史模板的写法并存）。
_Avoid_: 正册格式、元数据块、状态头

**格式警告（format warning）**:
票文件里形似字段行但解析器读不懂的行，或 Status 行多行冲突（以第一行为准）。界面在票旁标 "!" 并给出原文；只提示写法漂移，不代表票无效。
_Avoid_: 错误、非法票、坏票

**技能介绍文档（skill doc）**:
`docs/skill-intros/` 下每个技能一篇的中文提炼介绍（含全景总览 README），frontmatter 供服务端出清单、正文末尾附原文描述。是静态展示素材：网页「技能包」弹窗与该目录本身都直接读它。
_Avoid_: 使用手册、教程、技能包源码

**英文镜像篇（English mirror doc）**:
`docs/skill-intros-en/` 下与中文篇同名的一比一译文。只译 `title`/`summary` 两格与正文，分类、顺序、开发中标一律以中文目录为准——镜像不是第二套元数据。缺篇时清单打 `noEnglish`、正文回退中文原文并挂标注。
_Avoid_: 英文版清单、第二套 frontmatter

**技能包（skill pack）**:
本仓库收录其全景介绍的 Matt 技能包——一组 AI 编程技能（每技能一份 SKILL.md）的集合。源头在本仓库之外；仓库里只有介绍文档（`docs/skill-intros/`），没有技能实现本身。
_Avoid_: 技能库、插件、本仓库的功能清单

**规格阅读弹窗（spec reading modal）**:
从规格卡片「展开阅读」按钮打开的全宽 Markdown 渲染窗；内容取打开时刻的盘点快照，轮询刷新不打扰阅读。
_Avoid_: 文档弹窗、预览窗、大窗

**设置弹窗（settings modal）**:
网页里集中修改 config.json 可改字段的入口：pollMs 保存即生效，host/port 写入后重启生效，访问令牌只写不读。追踪目录与常用目录不入内（顶栏已有专门交互）。
_Avoid_: 设置页、配置面板、首选项

**推定完成（inferred done）**:
流程链上因更晚阶段已有产物而被判完成的阶段——链是序贯的，下游文件是上游走过的推定证据；未留本阶段标准产物时界面标注（如「推定 · 无 map」）。拷问不落 map.md 的 grill-with-docs 路线靠它补齐 Grill 格。
_Avoid_: 跳过、免除、假完成

**旁证（corroborating signal）**:
只作展示、不参与任何完成判据的只读信息（如 effort 目录的 git 最近提交）。判据只认 `.scratch` 的文件事实；旁证缺席或陈旧不影响链推导。
_Avoid_: 判据、证据、git 状态

**项目总览（projects overview）**:
跨常用目录（recent root）逐个只读盘点的一屏，每个项目一行链状态。本身只读；从它发起的切换就是既有的换目录操作，不新增写面。
_Avoid_: 全部视图、多项目模式、仪表盘

**全部视图（all-efforts view）**:
单个追踪目录（root）内跨 effort 的汇总视图：每 effort 一行链状态，进行中在前、完工默认折叠收纳。
_Avoid_: 项目总览、汇总页、仪表盘

**完工 effort（completed effort）**:
四格全绿的 effort。是由文件事实推导的状态，不存在「标记归档」动作；界面折叠只是显示偏好，不写任何文件。
_Avoid_: 归档、已完成项目

**前沿票（frontier ticket）**:
「当前该干什么」的答案：open、Blocked by 所列票全部 resolved、未被认领的票。阻塞计数与此同口径——依赖未全结才算阻塞。
_Avoid_: 就绪票、可干票、未阻塞票

**快照（snapshot）**:
某一时刻盘点数据的完整副本，取后不追新。弹窗阅读取打开时刻的盘点（轮询刷新不打扰）、导出快照把当时盘点落成文件，是同一语义的两个消费面。
_Avoid_: 备份、缓存、报告

**主题（theme）**:
一套完整的「光源」设计 token（`tokens-<名>.css`），挂在 `<html>` 的 `data-theme` 上整体换肤；业务样式只消费一层 `--fd-*` 别名，换主题零改动。现有三套：冷白（默认）、暖纸、GitHub 暗。
_Avoid_: 皮肤、配色方案、样式

**界面缩放档（UI scale）**:
用户选的离散档位（小/中/大/特大，默认中），乘在一条随视口流式的基准根字号上，驱动**整个 rem 根**——字号与间距/留白同比一起缩放，本质是「界面整体缩放」而非单纯改字。存浏览器、与主题同机制；入口在设置弹窗「外观」区。
_Avoid_: 字号、字体大小、zoom（它不是浏览器缩放，是页面内 rem 根）
