# 文件清单

仓库里每个文件负责什么。本文是 README「更多文档」引用的详细版；入口与用法见 [README.zh-CN.md](../README.zh-CN.md)（英文版：[README.md](../README.md)，本文英文镜像：[file-map-en.md](file-map-en.md)）。

| 文件 | 职责 |
|---|---|
| `config.json` | 用户配置：追踪目录、常用目录、端口、监听地址、轮询间隔、访问令牌（含给人看的说明字段）。运行时被服务改写，git 忽略，本机路径不随 diff 外泄 |
| `config.example.json` | config.json 的入库模板：结构同款、值全是安全默认，无任何本机路径 |
| `flowchain.mjs` | 流程链推导（纯函数、零依赖；阶段定义旁硬编码各阶段的对应技能名，聚合导读篇 `flowchain.md` 的技能名单与它同源；可独立搬运，不改任何调用方） |
| `notify.mjs` | 盘点事件推导（纯函数，只引 flowchain.mjs 的阶段表）：前后两拍盘点的结构化 diff——票开关、迷雾数、链当前步、新 effort 各成人话事件，桌面通知的消费输入（index.html 有 ES5 镜像，两处注释互指钉住） |
| `lib/parse.mjs` | 自带解析器（零依赖单遍结构解析，行为由 verify 夹具断言钉住） |
| `scan.mjs` | 扫描追踪目录的 `.scratch/`，产出盘点数据（热路径并行盘点，标题与票同走自带解析器） |
| `server.mjs` | HTTP 服务 + 命令行入口（`/`、`/styles/*.css`、`/api/state`（含 `recentRoots` 与运行时 pollMs/host/port/tokenEnabled、指引词自定义段 `guides`（五面 `grill`/`spec`/`tickets`/`implement`/`ticket`，各 `{ zh, en }`）与平级的指引词前缀 `guidesPrefix`（同五面，各一个字符串，中英不分列）；两者都原值随载荷下发，服务端只搬不拼，票行那面的三个槽与前缀的贴附都由界面在复制那一刻做、随载荷下发的 `stageNames` 四阶段名表（中英两列，flowchain.mjs 单一表的直通车）、每 effort 一条 git 旁证字段——最近提交或 null，~15 秒 TTL、不随指纹走）、`/api/health`、`/api/roots-overview` 项目总览（常用目录逐个只读盘点，按需单拍不进轮询、GET 不触碰排序）、`/api/issue` 单张票 Markdown 原文（懒加载，1MB 护栏同款）、`/api/skills` 技能介绍清单、`/api/skills/<名字>` 单篇原文（两条都认 `?lang=en`，改读 `docs/skill-intros-en/` 的同名镜像；不带参数响应体逐字节不变，单篇以 `X-FlowDeck-Doc-Lang` 头自报所服务的语言）、`POST /api/config` 换目录与改 pollMs/host/port/token/guides/guidesPrefix（逐字段校验；`guides` 与 `guidesPrefix` 结构非法各自整体 400 且一个字不写盘，错误码独立；令牌改动即时生效）、`POST /api/recent-roots` 删常用目录；请求先过 Host 校验防 DNS rebinding，POST 端点另有 X-FlowDeck 头防跨站写、超限应答 413；token 非空时 `/api/*` 要求访问令牌；轮询路径全异步 IO） |
| `eslint.config.mjs` | 最小 lint 配置（ESLint flat config，只兜真 bug 类漂移；lib/parse.mjs 豁免——行为由 verify 夹具钉住） |
| `.github/workflows/ci.yml` | CI：push/PR 时 Node 18/22 跑 lint + verify |
| `.github/workflows/release.yml` | Release：推送 `v*.*.*` 标签时自动创建 GitHub Release |
| `styles/app.css` | 界面全部业务样式（原 index.html 内联 `<style>` 抽出）；开头的 `--fd-*` 别名块是 tokens 的唯一消费层，业务样式零裸值；流式缩放基座也住这里——`html { font-size: calc(var(--fluid-base) * var(--ui-scale)) }`（`--fluid-base: clamp(10px, 0.5vw + 4.6px, 11.5px)`），字号与 padding/margin/gap 全按 `1rem = 10px` 走 rem，组件固定宽度（菜单/弹窗）、圆角、边框留 px；主容器 `max-width: clamp(1080px, 92vw, 1600px)`——宽屏顶得满、行长有上限，各弹窗自定宽度不跟容器一起胀；界面缩放档的四档倍率同样只住这里（`:root[data-ui-scale="sm"|"md"|"lg"|"xl"] { --ui-scale: … }`，缺省即中档），JS 只设 `<html>` 上的标记属性；项目标签条的样式也在这里——卡面（状态点 + 图形标记 + 目录名 + 关闭件、挂起卡再带一枚离开时的最近刷新时刻）、折叠把手与空态全部只经 `--fd-*` 别名取色因而三主题同源，卡宽走流式（`max-width` 留 rem）随缩放基座伸缩 |
| `styles/tokens-cold.css` | 冷白主题 tokens（**默认主题**，`data-theme="cold"`）：取值拷自 paper-palette-lab 生成件，拷入时 re-scope、其后换掉外部生成器头注并本地补槽（如 `--warn`）——已是 flowdeck 自有拷贝；保留自身色值（朱红 `#b1413e` 有意不对齐暖纸的 `#b0413e`）；色值/字体栈只允许出现在 tokens 文件里 |
| `styles/tokens-paper.css` | 暖纸主题 tokens（`data-theme="paper"`）：与冷白/暗平级，flowdeck 自有可改拷贝（与外部生成原件已分叉） |
| `styles/tokens-github-dark.css` | GitHub 暗主题 tokens（`data-theme="dark"`）：同名 token 与两套亮色同序对齐、另带 GitHub 专属槽位；三套平级，`data-theme` 一换整体换肤，业务样式零改动 |
| `index.html` | 浏览器界面（单文件、无构建；轮询间隔读 config.json，数据签名没变就不重画主区、真重画时恢复滚动位置，长文档读得下去；规格卡片 Markdown 轻渲染，「展开阅读」进全宽弹窗，票表「查看」复用同一弹窗懒加载票原文、六档 triage chip 过滤、git 旁证行；切换条尾「全部」视图一屏纵览（进行中按最近活跃在前、完工默认折叠，偏好记本浏览器）、effort 切换条本身把四格全绿的完工 effort 收进「✓ 完工 (n)」折叠入口（展开态只存会话变量、刷新回落收起，零写、零新 localStorage 键，正选中的完工 effort 例外平铺）、顶栏「迷雾总数 + 前沿票数」徽标点开前沿票清单直达所属 effort；「项目」按钮开跨常用目录只读总览，每行带「开为标签页」一键开卡、点行同效；「导出快照」把最近一拍 /api/state 的原始响应体原样落下载文件（`flowdeck-snapshot-<项目名>-<本地时间>.json`，不重新序列化）；桌面通知（默认关，设置里开启即申请权限、被拒回落提示；回前台积压聚合一条、通知点击切到涉及 effort，偏好只存本浏览器）；空态页「工作约定」旁有「建骨架指令」一键复制；流程链标题行右上角常驻一个「？」，打开技能包弹窗定位到新造的聚合导读页（按四阶段串起各自挂的技能），顶栏「技能包」按钮与总览篇照旧；顶栏下方一条项目标签条（自动派生 emoji + 目录名 + 状态点，上限 8 张、去重落已有卡、关卡落右邻、可折成细线），点卡即用既有换根请求切到那个项目、每卡按目录分桶记住选中 effort / 票筛选 / 滚动位置与离开时的盘点快照，标签条本身（卡列表/顺序/活跃索引/折叠态）存 `flowdeck-tabs` 键不进 config.json，页面加载以服务端追踪目录为真相对齐；挂起的卡零定时器零请求零桌面通知（三档刷新模式皆然、不因设置破例），切回时先装回它离开时的旧内容与旧「最近刷新」并弹「已恢复刷新」轻提示、随即补上最新一拍，全关则连排表都不排、空态不被任何一拍自动摆回来；顶栏「＋ 开新标签」（路径框 + 常用目录）取代原来的单目录输入框与「换目录」按钮，界面上换目录的心智只此一套；右上角「设置」弹窗集中改 pollMs/host/port/令牌，其「指引词」区带面下拉、五面各存一段可整段改写的指引词与一行可整段贴在前面的前缀（四个阶段格各一面 + 票行，面下拉 → 前缀单行 → 中英各一个输入框 + 逐面明写有无槽的说明 + 含前缀的「保存后生效」只读预览 + 并排的「复制当前效果」与只清当前面正文的恢复默认，票行那面可填 `{key}`/`{path}`/`{title}`，写进 config.json 的 `guides` 与平级的 `guidesPrefix` 字段、跟着项目走），其「外观」区另调界面缩放档（小/中/大/特大，即时生效、只存本浏览器），顶栏三选下拉在冷白 / 暖纸 / GitHub 暗三套平级主题间切换（默认冷白、写死在 `<html>` 标记上，选择记忆在本浏览器，旧「亮色」偏好自动迁到冷白），「技能包」按钮弹出静态全景介绍；顶栏「中/英」按钮整页换界面语言（文案、指引词、通知、报错措辞与技能介绍一起翻，选择记在本浏览器）；业务样式只消费一层 `--fd-*` 别名） |
| `docs/skill-intros/` | Matt 技能包全景介绍：每技能一篇中文提炼（frontmatter 供 `/api/skills` 出清单），另有不属于任何技能的聚合篇——README 是全景总览，`flowchain.md` 是流程链四阶段导读；网页弹窗的静态素材，也是清单骨架（有哪些篇、分类、顺序）的唯一真相 |
| `docs/skill-intros-en/` | 上述介绍的英文镜像：篇名一一对应，只译标题/简介/正文，`/api/skills*` 带 `?lang=en` 时读它 |
| `docs/screenshots/` | 中文 README 用的界面截图（冷白主视图两张 + 暗色一张，1631×832） |
| `docs/screenshots-en/` | 英文 README 用的界面截图（同三张视角、同 1631×832） |
| `docs/file-map.md` / `docs/file-map-en.md` | 本文与英文镜像 |
| `docs/verify.md` / `docs/verify-en.md` | verify 全量覆盖清单（每组断言钉的是什么）与英文镜像 |
| `verify-standalone.mjs` | 独立验证脚本（`npm run verify`；覆盖面见 [verify.md](verify.md)） |
