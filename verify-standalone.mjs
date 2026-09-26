#!/usr/bin/env node
/**
 * flowdeck/verify-standalone.mjs — 流程板独立验证（不依赖 npm 包；
 * jsdom 是可选的：仓库里装了就真跑界面，拷出去没装就自动跳过那一组）。
 *
 * 覆盖场景：
 *   1. 只有地图且带迷雾        → grill 是当前步，其余待命；
 *   2. 地图+规格+两张票（一开一关）→ implement 是当前步，进度 75%；
 *   3. 票全部关闭              → 四阶段完成，进度 100%；
 *   4. 只有 spec.md            → effort 仍被识别，当前步回落到 grill；
 *   5. .scratch 根目录的 map.md → 识别为 '__root' effort 且排第一；
 *   6. 无产物的目录/普通文件     → 不算 effort；
 *   7. 票字段解析               → Status / Type / Blocked by / 进度 全部读对；
 *   8. 流程链是纯函数           → 同一输入两次推导结果一致；
 *   9. HTTP 基础               → /api/state、/、styles/ 的 CSS 白名单可服务、404、端口被占自动 +1；
 *  10. 配置                    → 缺文件用默认；config.json 的 root/pollMs 生效；
 *  11. 换目录 API              → POST /api/config 热切换并写盘；非法输入被拒且不碰配置；
 *  12. resolveRoot             → 空=当前目录、~=主目录、相对=按本目录解析；
 *  13. 界面运行时              → jsdom 真跑 index.html 无报错，链渲染/换页签/票表都对；
 *  14. 常用目录（服务端）       → MRU 纯函数幂等；state 附带列表与存在性；收录/移顶/上限淘汰；
 *                                --root 启动不收录；删除端点防护同款、写回、幂等；
 *  15. 常用目录（界面）         → 聚焦展开、当前置顶、过滤、键盘导航、点选切换、✕ 删除、
 *                                失效置灰、空态文案、轮询刷新不关闭下拉不抢焦点。
 *  16. 防护强化（HTTP 黑盒）    → 伪造 Host 的读写请求 403、本机写法放行；非回环绑定放宽校验；
 *                                >10KB POST 拿 413 应答；客户端半途中断不崩进程。
 *  17. 坏配置告警               → 非法 JSON 首读告警一次（含路径原因），回退默认、不随轮询刷屏。
 *  18. CLI 参数                 → 缺值/吞值报错退出 1；正常传参可启动（--config 支持相对路径）。
 *  19. 工单 key 排序             → 三位数编号按数字序（98 < 99 < 100 < 101），两位编号顺序不变。
 *  20. 标题规则单一真相           → map/spec 标题与票同走自带解析器的取标题规则。
 *  21. 访问令牌（token）         → 配置 token 后 /api/* 无/错令牌 401，头或查询串携带皆可；
 *                                界面静态资源不设防；界面从 URL 收令牌、记忆并随请求携带。
 *  22. 字段行格式               → 加粗与裸写等价合法（双声部判准）；"!" 只标读不懂的疑似
 *                                字段行与多行 Status（以第一行为准）；界面亮徽标带原文。
 *  23. 技能介绍文档             → /api/skills 清单（frontmatter、分类排序、开发中标）与
 *                                /api/skills/<名字> 单篇原文；未知/穿越/畸形转义 404、令牌闸门覆盖；
 *                                界面「技能包」弹窗：打开、分组清单、内链切换、Markdown 渲染、Esc 关闭。
 *  24. a11y 三层（票 07）        → 键盘层：票行/链格/下拉项 focus 后 Enter/Space 与 click 同一处理
 *                                （复制实现指引 / 复制阶段指引词 / 切换目录）；兜底层：aria-label 同载
 *                                推定含义、"!" 警告原文、指引全文；播报层：toast aria-live=polite、
 *                                错误横幅 role=alert；焦点圈禁：弹窗内 Tab 循环不外逃。
 *  25. 测试补盲（票 08）          → Comments 夹具本地断言常驻；
 *                                幽灵夹具直测（目录伪装票文件走「打不开→丢弃」兜底、map.md 目录不算 effort）。
 *  26. 界面语言（english-ui 01） → 初始语言按浏览器语言判定（en-* 英文、判不中默认中文）；顶栏按钮即时
 *                                中英互换且零请求；偏好存 localStorage 并优先于浏览器语言；链格阶段名的
 *                                中文列与服务端 flowchain 下发原文逐字钉死（词表不长第二套中文真相）。
 *  27. 界面外壳英文化（票 02）   → 英文态整页扫不到中文（jsdom 逐视图，含 title/aria-label/placeholder）；
 *                                指引词、桌面通知、报错措辞三处人话都随语言，未知 code 回退服务端原文；
 *                                中文态逐字节零回归（词表 zh 列与改动前拼装结果全等）。
 *  28. 技能介绍英文（票 03）     → /api/skills 与单篇认 ?lang（不带参数逐字节不变、英文只换 title/summary
 *                                与正文，骨架仍以中文目录为单一真相）；37 篇同名镜像逐篇对齐；
 *                                弹窗按语言取篇、缺镜像回退中文并挂标注。
 *  29. 静态壳取词通道（票 04）   → markup 的 data-i18n* 键都在词表里、三条属性通道的中文默认态与词表
 *                                逐字一致；英文态四条通道都取得到词且取的是英文列（空白页面骗得过
 *                                「零中文残留」，骗不过这一组）。
 *  30. 三主题并列（ui-appearance 02）→ 冷白默认住在标记上；顶栏三选下拉切换落对 data-theme 并写
 *                                flowdeck-theme；重开尊重记忆；legacy 'light' 迁移到冷白；三套 token
 *                                字面平级（无 :root 基底）、语义槽位对齐；冷白经白名单可服务。
 *  31. 流式缩放基座（ui-appearance 03）→ 根字号 = --fluid-base × --ui-scale 的接线在案、主容器
 *                                clamp(1080px, 92vw, 1600px)、字号与间距声明零 px（rem 化）、
 *                                组件定宽/圆角留 px、业务样式零裸色值与零裸字体栈（token 纪律规则 1）；
 *                                像素尺寸不断言（jsdom 无布局能力）。
 *  32. 界面缩放档（ui-appearance 04）→ 四档倍率只住在 CSS（sm/md/lg/xl = 0.9/1/1.125/1.25），与设置
 *                                「外观」区的 <option> 值域同集；head 防闪读数排在样式表之前；jsdom 里
 *                                切档落对 data-ui-scale 并写 flowdeck-ui-scale、缺省不写属性即中档、
 *                                重开尊重记忆、野值回落中档。
 *  33. 指引词零工程习惯（custom-guides 01）→ 默认指引词不预设任何工程习惯（ADR-0004）。查两条**规则**、
 *                                不查逐字原文：① 零 git 指令——出厂固定文案（四个阶段格的全部状态分支 ×
 *                                中英两列 = 五面里的四面，加票行复制词，再加同样出厂固定的起步工作
 *                                约定）里 git 零出现；② 不点名 Matt 技能包以外的技能——包内技能名取自
 *                                docs/skill-intros/ 的 frontmatter，扫明写的「X 技能 / X skill」两种写法
 *                                （直说的「to-spec 技能」与带括号备选的「grilling（或 wayfinder）技能」，
 *                                局限与 ADR 并列承认）。票行与收尾（implementDone）的「不提合并」负向钉
 *                                降级保留为回归防护；两份 README 的起步约定第 4 步已缩成指针，钉它不再
 *                                逐字复制权威原文。
 *  34. 指引词可整段改写 · 五面铺开（custom-guides 02 + 03）→ config.json 的 guides 字段：逐形状校验
 *  35. 项目标签纯函数（project-tabs 01）→ 从 index.html 的 TAG_FN 区直接求值（不复制第二份）：
 *                                emoji 派生（同目录恒同图、池内无重复、不同名散开）、开卡（去重/上限 8）、
 *                                关卡（右邻优先、无右邻落左邻、全关落 -1）、读回清洗、补位（含满额换位）。
 *  36. 项目标签条（project-tabs 01）→ HTTP：切标签即换根写盘，root 恒等于活跃卡目录、
 *                                「说明」「字段说明」与 pollMs 一次不丢；jsdom：卡面渲染与生命周期
 *                                （开/切/关、去重落已有卡、上限拦截、空态）、折叠与折叠态持久化、
 *                                重开页面原样恢复、页面加载以服务端追踪目录补位、每卡界面状态按目录分桶。
 *                                （非法整体 400 且一个字不写盘、错误码稳定）、applied.immediate、手改下一拍
 *                                生效、写盘保留「说明」与「字段说明」、服务端只搬原值不参与拼装（面名不写死，
 *                                面上额外键剔除，缺面/空串/清空皆合法）；界面上五面（四个阶段格 + 票行）各设自定义
 *                                段各复制一次都走该面自己的段，面下拉带空态（不默认落在某一面）、切面即换内容与
 *                                预览、下拉里四个阶段名读载荷 stageNames、只填中文时英文界面仍复制内置英文段、
 *                                只敲全白等同没填（有内容的边缘空白原样带出）、预览与复制同步回落、预填来自载荷、
 *                                保存只提交变更字段（改动中英成对发、五面并存时只换当前面）、恢复默认只清当前面；
 *                                票行那面 {key}/{path}/{title} 实填、其余四面无槽；config.example.json 与两份
 *                                README 的 config 段同步了 guides 字段。
 *                                必改的既有缺陷：设置弹窗焦点圈禁那条测试的选择器补上 textarea。
 *  37. 切换条减负（ui-declutter 01）→ 顶部 effort 切换条按 chain.complete 分组：进行中平铺在前、
 *                                「✓ 完工 (n)」折叠入口、展开时的完工 tab、「全部」垫底；计数中英双语、
 *                                入口可 Tab 到达且 aria-expanded 如实；选中项例外（选中的完工 effort 照常
 *                                平铺、切走才收）；展开态只存会话变量（进渲染签名，刷新回落收起、零新
 *                                localStorage 键）、折叠展开全程零写请求。
 *  38. 流程链技能入口（ui-declutter 02）→ 链格内的大按钮行退役（stage.skill.* 词条与 .skillrow 样式
 *                                零残留）、标题行改弹性布局（标题 flex:1 + min-width:0、「？」flex:none）
 *                                并钉住这两个关键声明、「？」可 Tab 到达、开弹窗即定位聚合页 flowchain
 *                                且阻断冒泡、聚合页在导航里是总览分类下的普通条目；聚合页与英文镜像
 *                                文件级钉（overview 归类、次序紧跟总览篇、slug 过名字白名单、按四阶段
 *                                分节并内链各阶段技能、镜像只译 title/summary 与正文不带分类与次序）。
 *  39. 挂起与恢复的刷新语义（project-tabs 02）→ jsdom：挂起卡零请求（fetch 桩按发出时的追踪目录
 *                                记账，挂起期间每一个 /api/state 都属于活跃卡，展示档亦不破例）、
 *                                卡面摆出离开那一刻的最近刷新时间且挂起期间原样不动；切回挂起卡逐段
 *                                断言中间态——先呈现旧内容与旧「最近刷新」→ toast「已恢复刷新」→
 *                                立即补上一拍最新内容；挂着两张卡时刷新模式三档行为不受扰；全关即
 *                                全挂起（三档下零定时器零请求零桌面通知；「全关」是使用者明说
 *                                「我不想它在动了」，连手动「立即刷新」一并停用、强行触发也零请求，
 *                                空态把这个决定说出口，开一张标签即收回；空态也不被任何一拍——含
 *                                主动刷新与迟到的那一拍——自动摆回来）；失效目录不主动探测磁盘、
 *                                切回失败沿用既有失败提示并停留原卡且不谎报恢复；换根落定前发出、
 *                                落定后回来的那一拍整拍丢弃；追踪目录被别处换掉而留在挂起的那张，
 *                                同样按离开时原样存下内容与时刻。
 *
 * 跑法：node verify-standalone.mjs（全绿输出 OK，任何失败退出码非 0）
 */

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import http from 'node:http'
import { spawn } from 'node:child_process'
import os from 'node:os'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanWorkspace } from './scan.mjs'
import { startServer, loadConfig, resolveRoot, normalizeRecentRoots, touchRecentRoot, RECENT_ROOTS_LIMIT, normalizeGuides } from './server.mjs'

const HERE = nodePath.dirname(fileURLToPath(import.meta.url))

let passed = 0
function ok(name) {
  passed++
  console.log('  ✓ ' + name)
}

async function writeFile(full, text) {
  await fs.mkdir(nodePath.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
}

/** 带防跨站写防护头发 POST（成功路径用；拒绝路径要手工构造坏头，见各分组）。 */
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

/** 用 node:http 直发请求、允许伪造任意头（fetch 不让改 Host，而 Host 校验用例恰恰要伪造它）。 */
function rawHttp({ method, url, headers = {}, body = '' }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method, headers }, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => resolve({ status: res.statusCode, data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

/** 起一个真实 CLI 子进程（server.mjs 的命令行入口只有直接运行时才走，进程内测不到）。 */
function runCli(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nodePath.join(HERE, 'server.mjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { err += d })
    p.on('error', reject)
    p.on('close', (code) => resolve({ code, out, err }))
  })
}

async function runScenarios(tmp) {
  // ── 搭一个临时工作区（idea-a 只带迷雾地图；idea-b 全链走一半；idea-c 全完成）──
  await writeFile(nodePath.join(tmp, '.scratch/idea-a/map.md'), [
    '# 想法 A', '',
    '## Destination', '让部署一键完成', '',
    '## Not yet specified', '- 回滚策略未定', '- 通知渠道未定', '',
  ].join('\n'))

  const MAP_B = ['# 想法 B', '', '## Destination', '全站搜索', '', '## Notes', '- 无', ''].join('\n')
  const SPEC_B = ['# 想法 B 规格', '', '目标：全站搜索，先做索引核心，再做分词器。', ''].join('\n')
  const T1_B = ['# 索引核心', 'Status: ready-for-agent', 'Type: task', 'Blocked by: #02', '', '## 进度：50%', ''].join('\n')
  const T2_B = ['# 分词器', 'Status: resolved', 'Type: task', ''].join('\n')
  await writeFile(nodePath.join(tmp, '.scratch/idea-b/map.md'), MAP_B)
  await writeFile(nodePath.join(tmp, '.scratch/idea-b/spec.md'), SPEC_B)
  await writeFile(nodePath.join(tmp, '.scratch/idea-b/issues/01-index-core.md'), T1_B)
  await writeFile(nodePath.join(tmp, '.scratch/idea-b/issues/02-tokenizer.md'), T2_B)

  await writeFile(nodePath.join(tmp, '.scratch/idea-c/map.md'), '# 想法 C\n\n## Destination\n导出 PDF\n')
  await writeFile(nodePath.join(tmp, '.scratch/idea-c/spec.md'), '# 想法 C 规格\n\n导出 PDF。')
  await writeFile(nodePath.join(tmp, '.scratch/idea-c/issues/01-export.md'), '# 导出\nStatus: done\n')

  await writeFile(nodePath.join(tmp, '.scratch/only-spec/spec.md'), '# 只有规格\n\n先写了规格再说。')
  await writeFile(nodePath.join(tmp, '.scratch/map.md'), '# 根地图\n\n## Destination\n仓库级路线\n')
  await writeFile(nodePath.join(tmp, '.scratch/junk-note.md'), '不是 effort 的普通文件')
  await fs.mkdir(nodePath.join(tmp, '.scratch/empty-dir'), { recursive: true })

  // ── 扫描与流程链 ──
  const ws = await scanWorkspace(tmp)
  assert.equal(ws.scratchExists, true)
  const slugs = ws.efforts.map((e) => e.slug)
  assert.deepEqual(slugs, ['__root', 'idea-a', 'idea-b', 'idea-c', 'only-spec'])
  ok('effort 识别：5 个 effort，根 .scratch 排第一，空目录与普通文件被忽略')

  const a = ws.efforts.find((e) => e.slug === 'idea-a')
  assert.equal(a.chain.currentId, 'grill')
  assert.equal(a.chain.progress, 0)
  assert.equal(a.chain.stages[0].status, 'current')
  assert.equal(a.map.fogCount, 2)
  assert.match(a.chain.stages[0].evidence, /迷雾还有 2 条/)
  ok('场景 1：只有带迷雾的地图 → grill 是当前步，证据里点明迷雾条数')

  const b = ws.efforts.find((e) => e.slug === 'idea-b')
  assert.deepEqual(b.chain.stages.map((s) => s.status), ['done', 'done', 'done', 'current'])
  assert.equal(b.chain.currentId, 'implement')
  assert.equal(b.chain.progress, 75)
  assert.equal(b.chain.counts.closed, 1)
  assert.equal(b.chain.counts.open, 1)
  // 前沿口径（票 02 有意变更）：01 阻塞于 02，02 已关 → 依赖全结，不再计阻塞
  assert.equal(b.chain.counts.blocked, 0)
  ok('场景 2：地图+规格+一开一关两张票 → implement 是当前步，进度 75%，阻塞计数 0（依赖已全结，前沿口径）')

  const t1 = b.tickets.find((t) => t.key === '01')
  assert.equal(t1.state, 'open')
  assert.equal(t1.type, 'task')
  assert.deepEqual(t1.blockedBy, ['02'])
  assert.equal(t1.progress, 50)
  assert.equal(t1.title, '索引核心')
  const t2 = b.tickets.find((t) => t.key === '02')
  assert.equal(t2.state, 'closed')
  ok('场景 7：票字段解析 — Status / Type / Blocked by / 进度 / 标题 全部读对')

  const c = ws.efforts.find((e) => e.slug === 'idea-c')
  assert.equal(c.chain.complete, true)
  assert.equal(c.chain.currentId, null)
  assert.equal(c.chain.progress, 100)
  assert.equal(c.tickets[0].state, 'closed')
  ok('场景 3：票全部关闭 → 四阶段完成，进度 100%')

  const s = ws.efforts.find((e) => e.slug === 'only-spec')
  assert.equal(s.chain.currentId, 'tickets', 'spec 已在，当前步应越过 grill 与 spec')
  assert.equal(s.chain.stages[0].status, 'done')
  assert.equal(s.chain.stages[0].inferred, true)
  assert.equal(s.chain.stages[0].inferLabel, '推定 · 无 map')
  assert.equal(s.chain.progress, 50)
  ok('场景 4：只有 spec.md → grill 由 spec 推定完成并标「推定 · 无 map」，当前步 to-tickets')

  const rootEffort = ws.efforts[0]
  assert.equal(rootEffort.slug, '__root')
  assert.equal(rootEffort.map.exists, true)
  ok('场景 5：.scratch 根目录的 map.md → __root effort')

  // ── 工单 key 排序：编号到三位数后仍按数字序（字符串比较会让 '100' 排到 '99' 前面）──
  const sortTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-sort-'))
  try {
    await writeFile(nodePath.join(sortTmp, '.scratch/sorting/map.md'), '# 排序\n\n## Destination\n验证编号排序\n')
    for (const n of ['98', '99', '100', '101', '07', '12']) {
      await writeFile(nodePath.join(sortTmp, '.scratch/sorting/issues/' + n + '-t.md'), '# 票 ' + n + '\nStatus: ready-for-agent\n')
    }
    const sorted = await scanWorkspace(sortTmp)
    assert.deepEqual(
      sorted.efforts[0].tickets.map((t) => t.key),
      ['07', '12', '98', '99', '100', '101']
    )
  } finally {
    await fs.rm(sortTmp, { recursive: true, force: true })
  }
  ok('工单 key 排序：98/99/100/101 按数字序盘点，两位编号（07/12）顺序不变')

  // ── 标题规则单一真相（票 02 改写）：唯一实现 = parseDocStructure 单遍导出，map/spec 与票同源 ──
  const titleTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-title-'))
  try {
    await writeFile(nodePath.join(titleTmp, '.scratch/no-heading/spec.md'), '先有第一行说明\n\n没有 # 标题行。\n')
    await writeFile(nodePath.join(titleTmp, '.scratch/heading-after-text/map.md'), '导语在标题前\n\n# 真标题\n\n## Destination\n目标\n')
    const titled = await scanWorkspace(titleTmp)
    const noHeading = titled.efforts.find((e) => e.slug === 'no-heading')
    assert.equal(noHeading.spec.title, '先有第一行说明')
    assert.equal(noHeading.title, '先有第一行说明', 'effort 标题回落到 spec 标题（不再退回 slug）')
    const headingAfter = titled.efforts.find((e) => e.slug === 'heading-after-text')
    assert.equal(headingAfter.map.title, '真标题', '取第一个任意级别的标题行，而非第一行文字')
    assert.equal(headingAfter.title, '真标题')

    // 唯一实现的等价断言：parseMd 的标题 = parseDocStructure 的标题（对任意输入逐字一致）；
    // parseMapBody 的区块 = parseDocStructure(normalizeBody) 的区块（输出形状不变是硬约束）。
    const parseMod = await import('./lib/parse.mjs')
    for (const text of [T1_B, T2_B, SPEC_B, MAP_B, '', '   \n\n  ', '# 只有正文没有区块\n\n段落一。\n', '导语在前\n\n# 后出现的标题\n', '#x 无空格井号\n']) {
      assert.deepEqual(parseMod.parseDocStructure(text).title, parseMod.parseMd(text, { key: '01', parentKey: '00' }).title, 'parseMd 标题必须出自 parseDocStructure：' + JSON.stringify(String(text).slice(0, 20)))
    }
    for (const text of [MAP_B, '# A\n## Destination\nx\n## Not yet specified\n- y\n', '', '# 无区块\n\n正文', '## Destination\n有区块无标题\n']) {
      const doc = parseMod.parseDocStructure(parseMod.normalizeBody(text))
      assert.deepEqual(
        { destination: doc.destination, notes: doc.notes, decisions: doc.decisions, fog: doc.fog, outOfScope: doc.outOfScope },
        parseMod.parseMapBody(text),
        'parseMapBody 区块必须出自 parseDocStructure：' + JSON.stringify(String(text).slice(0, 20))
      )
    }
  } finally {
    await fs.rm(titleTmp, { recursive: true, force: true })
  }
  ok('标题规则单一真相：唯一实现 = parseDocStructure 单遍导出；parseMd 标题与 parseMapBody 区块逐字等价，map/spec 与票同源消费')

  // ── 字段行格式：加粗与裸写等价合法；"!" 只标读不懂的疑似字段行与多行 Status ──
  const fmtTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-fmt-'))
  try {
    await writeFile(nodePath.join(fmtTmp, '.scratch/fmt/map.md'), '# 格式\n\n## Destination\n双形式判准\n')
    // 加粗 = to-tickets 模板形式；What to build 是散文块，不在字段判准内
    await writeFile(nodePath.join(fmtTmp, '.scratch/fmt/issues/01-bold.md'), [
      '# 加粗票', '',
      '**What to build:** 端到端行为', '',
      '**Blocked by:** None — can start immediately.', '',
      '**Status:** done', '',
      '- [x] 验收项', '',
    ].join('\n'))
    // 裸写 = issue-tracker.md 约定形式
    await writeFile(nodePath.join(fmtTmp, '.scratch/fmt/issues/02-plain.md'), '# 裸票\nStatus: resolved\nType: task\n')
    // 斜体 Status：形似字段行但读不懂 → unrecognizedField；生效的是后面那行裸 claimed
    await writeFile(nodePath.join(fmtTmp, '.scratch/fmt/issues/03-drift.md'), '# 漂移票\n*Status:* done\nStatus: claimed\n')
    // 多行 Status：重复 Status 行 → multiStatus，以第一行为准
    await writeFile(nodePath.join(fmtTmp, '.scratch/fmt/issues/04-dup.md'), '# 重复票\n**Status:** done\nStatus: claimed\n')
    const fmt = await scanWorkspace(fmtTmp)
    const eff = fmt.efforts.find((e) => e.slug === 'fmt')
    const bold = eff.tickets.find((t) => t.key === '01')
    assert.equal(bold.state, 'closed', '加粗 Status（to-tickets 模板形式）应判已关闭')
    assert.deepEqual(bold.blockedBy, [], '加粗 Blocked by 无编号 → 空阻塞')
    assert.deepEqual(bold.formatWarnings, [], '合法形态（加粗、裸写、散文加粗块）一律不标')
    const plain = eff.tickets.find((t) => t.key === '02')
    assert.equal(plain.state, 'closed')
    assert.equal(plain.type, 'task')
    assert.deepEqual(plain.formatWarnings, [])
    const drift = eff.tickets.find((t) => t.key === '03')
    assert.equal(drift.state, 'open', '读不懂的斜体 Status 不生效，落到后面那行裸 claimed')
    assert.equal(drift.formatWarnings.length, 1)
    assert.equal(drift.formatWarnings[0].kind, 'unrecognizedField')
    assert.equal(drift.formatWarnings[0].line, '*Status:* done')
    const dup = eff.tickets.find((t) => t.key === '04')
    assert.equal(dup.state, 'closed', '多行 Status 以第一行为准')
    assert.equal(dup.formatWarnings.length, 1)
    assert.equal(dup.formatWarnings[0].kind, 'multiStatus')
    assert.match(dup.formatWarnings[0].message, /done \/ claimed/)
  } finally {
    await fs.rm(fmtTmp, { recursive: true, force: true })
  }
  ok('字段行格式：加粗与裸写等价合法；"!" 只标读不懂的疑似字段行与多行 Status（以第一行为准）')

  // ── IO 护栏（读侧，票 03）：单文件 1MB 上限——先 stat 超限限长读；截断照常尽力推导 + "!" 警告 ──
  const guardTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-guard-'))
  try {
    await writeFile(nodePath.join(guardTmp, '.scratch/g/map.md'), '# G\n\n## Destination\n正常地图\n')
    await writeFile(nodePath.join(guardTmp, '.scratch/g/spec.md'), 'x'.repeat(1024 * 1024 + 4096))
    await writeFile(nodePath.join(guardTmp, '.scratch/g/issues/02-big.md'), '# 大票\nStatus: ready-for-agent\n\n' + 'y'.repeat(1024 * 1024 + 2048))
    await writeFile(nodePath.join(guardTmp, '.scratch/g/issues/01-small.md'), '# 小票\nStatus: ready-for-agent\n')
    // 超大 map：终点写在 1MB 内、后面全是填充 → 链从截断内容尽力推导
    await writeFile(
      nodePath.join(guardTmp, '.scratch/bigmap/map.md'),
      '# BM\n\n## Destination\n尽力推导\n\n## Notes\n\n' + 'z'.repeat(1024 * 1024 + 1024)
    )
    const guarded = await scanWorkspace(guardTmp)
    const g = guarded.efforts.find((e) => e.slug === 'g')
    assert.equal(g.spec.contentLength, 1024 * 1024, '超大 spec 截到恰好 1MB（限长读，不是读完再切）')
    assert.equal(g.spec.formatWarnings.length, 1)
    assert.equal(g.spec.formatWarnings[0].kind, 'oversized')
    assert.match(g.spec.formatWarnings[0].message, /文件过大/)
    assert.ok(g.spec.formatWarnings[0].message.includes(String(1024 * 1024 + 4096)), '警告里给实际大小')
    const bigTicket = g.tickets.find((t) => t.key === '02')
    assert.ok(bigTicket.formatWarnings.some((w) => w.kind === 'oversized'), '超大票经 "!" 通道透出警告')
    assert.equal(bigTicket.title, '大票', '标题在截断区内照常解析')
    assert.deepEqual(g.tickets.find((t) => t.key === '01').formatWarnings, [], '未超限的文件零警告')
    assert.deepEqual(g.map.formatWarnings, [], '正常 map 零警告')
    const bm = guarded.efforts.find((e) => e.slug === 'bigmap')
    assert.equal(bm.map.formatWarnings[0].kind, 'oversized')
    assert.equal(bm.map.destination, '尽力推导', '链从截断内容尽力推导（Destination 在 1MB 内照常入链）')
  } finally {
    await fs.rm(guardTmp, { recursive: true, force: true })
  }
  ok('读侧护栏：单文件 1MB 截断（先 stat 后限长读），截断内容尽力推导，「文件过大」警告经 "!" 通道透出')

  // ── 幽灵夹具（票 08）：扫描竞态兜底的确定性直测——issues/ 放名字像票文件的目录，
  //    readdir 过正则、readFile 必抛 EISDIR，走的正是「打不开 → null → filter(Boolean) 丢弃」
  //    的兜底路径（ENOENT 与 EISDIR 在 readIfExists 的 catch 里一视同仁）。──
  const ghostTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-ghost-'))
  try {
    await writeFile(nodePath.join(ghostTmp, '.scratch/ghosted/map.md'), '# 幽灵间\n\n## Destination\n竞态兜底验证\n')
    await writeFile(nodePath.join(ghostTmp, '.scratch/ghosted/issues/01-real.md'), '# 真票\nStatus: ready-for-agent\n')
    await fs.mkdir(nodePath.join(ghostTmp, '.scratch/ghosted/issues/02-幽灵.md'), { recursive: true })
    await fs.mkdir(nodePath.join(ghostTmp, '.scratch/ghosted/issues/03-phantom.md/里面还有一层'), { recursive: true })
    // 变体：某 effort 唯一「产物」是名为 map.md 的目录 → mapText 为 null，三样皆无 → 不计数
    await fs.mkdir(nodePath.join(ghostTmp, '.scratch/mapdir/map.md'), { recursive: true })
    const ghosted = await scanWorkspace(ghostTmp)
    const gEff = ghosted.efforts.find((e) => e.slug === 'ghosted')
    assert.ok(gEff, '正常 effort 照常盘点（进程没崩）')
    assert.deepEqual(gEff.tickets.map((t) => t.key), ['01'], '幽灵票（目录伪装）被兜底丢弃，真票完好')
    assert.ok(!ghosted.efforts.some((e) => e.slug === 'mapdir'), '唯一「产物」是 map.md 目录的 effort 不计数')
    assert.deepEqual(ghosted.efforts.map((e) => e.slug), ['ghosted'], '盘点结果里没有任何幽灵')
  } finally {
    await fs.rm(ghostTmp, { recursive: true, force: true })
  }
  ok('幽灵夹具：目录伪装票文件走「打不开→丢弃」竞态同款兜底——不崩、不出现、真票完好；map.md 目录不算 effort')

  // ── Comments 夹具（票 08）：解析器的 Comments 分支从零测试保护变钉死，独立运行也常驻的本地断言。──
  const COMMENTS_FIXTURES = [
    {
      name: '作者—日期头（全角破折号 + ISO 时间 + 正文）',
      text: ['# 评论票 A', 'Status: ready-for-agent', '', '## Comments', '', '### alice—2026-09-16T10:30:00Z', '', '第一条正文。'].join('\n'),
      comments: [{ author: { login: 'alice' }, authorAssociation: '', body: '第一条正文。', createdAt: '2026-09-16T10:30:00Z', updatedAt: '2026-09-16T10:30:00Z' }],
    },
    {
      name: '中文作者名 + 全角破折号',
      text: ['# 评论票 B', 'Status: ready-for-agent', '', '## Comments', '', '### 张三—2026-09-17T01:02:03Z', '', '中文正文。'].join('\n'),
      comments: [{ author: { login: '张三' }, authorAssociation: '', body: '中文正文。', createdAt: '2026-09-17T01:02:03Z', updatedAt: '2026-09-17T01:02:03Z' }],
    },
    {
      name: '半角连字符头（全角/半角分支的另一半）',
      text: ['# 评论票 C', 'Status: ready-for-agent', '', '## Comments', '', '### bob - 2026-09-16T08:00:00Z', '', '半角分支。'].join('\n'),
      comments: [{ author: { login: 'bob' }, authorAssociation: '', body: '半角分支。', createdAt: '2026-09-16T08:00:00Z', updatedAt: '2026-09-16T08:00:00Z' }],
    },
    {
      name: '无日期裸名头（首词当作者）',
      text: ['# 评论票 D', 'Status: ready-for-agent', '', '## Comments', '', '### carol', '', '没有日期。'].join('\n'),
      comments: [{ author: { login: 'carol' }, authorAssociation: '', body: '没有日期。', createdAt: '', updatedAt: '' }],
    },
    {
      name: '日期在但不识（作者认出、时间留空）',
      text: ['# 评论票 E', 'Status: ready-for-agent', '', '## Comments', '', '### henry—September 16', '', '老式日期。'].join('\n'),
      comments: [{ author: { login: 'henry' }, authorAssociation: '', body: '老式日期。', createdAt: '', updatedAt: '' }],
    },
    {
      name: '多条 + 收在下一个二级标题（段外内容不漏进评论）',
      text: ['# 评论票 F', 'Status: ready-for-agent', '', '## Comments', '', '### frank—2026-09-13T09:00:00Z', '', '第一条。', '', '### grace - 2026-09-13T10:00:00Z', '', '第二条。', '', '## 进度：10%', '', '评论区之外。'].join('\n'),
      comments: [
        { author: { login: 'frank' }, authorAssociation: '', body: '第一条。', createdAt: '2026-09-13T09:00:00Z', updatedAt: '2026-09-13T09:00:00Z' },
        { author: { login: 'grace' }, authorAssociation: '', body: '第二条。', createdAt: '2026-09-13T10:00:00Z', updatedAt: '2026-09-13T10:00:00Z' },
      ],
    },
    {
      name: '正文 --- 截断（签名丢弃）',
      text: ['# 评论票 G', 'Status: ready-for-agent', '', '## Comments', '', '### dave—2026-09-15T00:00:00Z', '', '保留正文。', '', '---', '', '丢弃签名。'].join('\n'),
      comments: [{ author: { login: 'dave' }, authorAssociation: '', body: '保留正文。', createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' }],
    },
    {
      name: '空正文（光杆头的评论）',
      text: ['# 评论票 H', 'Status: ready-for-agent', '', '## Comments', '', '### eve—2026-09-14T12:00:00Z'].join('\n'),
      comments: [{ author: { login: 'eve' }, authorAssociation: '', body: '', createdAt: '2026-09-14T12:00:00Z', updatedAt: '2026-09-14T12:00:00Z' }],
    },
  ]
  const cmParse = await import('./lib/parse.mjs')
  for (const f of COMMENTS_FIXTURES) {
    assert.deepEqual(cmParse.parseMd(f.text, { key: '01', parentKey: '00' }).comments, f.comments, 'Comments 夹具「' + f.name + '」应解析出期望输出')
  }
  ok('Comments 夹具（本地断言）：作者—日期 / 中文作者全角破折号 / 半角连字符 / 无日期裸名 / 非ISO日期 / 多条收段 / --- 截断 / 空正文——八分支钉死')

  // ── 流程链是纯函数：同一输入两次推导结果一致（无隐藏状态）──
  const { deriveChain, FLOW_STAGES } = await import('./flowchain.mjs')
  const r1 = deriveChain({ slug: 'x', map: { exists: true, destination: 'd', fogCount: 0 }, spec: { exists: true, contentLength: 10 }, tickets: [{ state: 'open', blockedBy: [] }] })
  const r2 = deriveChain({ slug: 'x', map: { exists: true, destination: 'd', fogCount: 0 }, spec: { exists: true, contentLength: 10 }, tickets: [{ state: 'open', blockedBy: [] }] })
  assert.deepEqual(r1, r2)
  assert.equal(r1.currentId, 'implement')
  ok('流程链纯函数：同输入同输出，推进只来自重新盘点')

  // ── 后向推定：下游产物推定上游完成；未留本阶段产物时以 inferLabel 标注 ──
  const infSpec = deriveChain({ slug: 'x', map: { exists: false, destination: '', fogCount: 0 }, spec: { exists: true, contentLength: 42 } })
  assert.deepEqual(infSpec.stages.map((st) => st.status), ['done', 'done', 'current', 'pending'])
  assert.equal(infSpec.stages[0].inferred, true)
  assert.equal(infSpec.stages[0].inferLabel, '推定 · 无 map')
  assert.equal(infSpec.stages[1].inferred, false, 'spec 有自己的产物，实证完成不标推定')
  assert.equal(infSpec.stages[1].inferLabel, '')
  assert.match(infSpec.stages[0].evidence, /推定拷问已完成/)
  assert.equal(infSpec.progress, 50)

  const infTickets = deriveChain({ slug: 'x', map: { exists: false, destination: '', fogCount: 0 }, spec: { exists: false, contentLength: 0 }, tickets: [{ state: 'closed', blockedBy: [] }] })
  assert.equal(infTickets.complete, true, '无 map 无 spec 有票 → 全部推定完成')
  assert.equal(infTickets.progress, 100)
  assert.equal(infTickets.stages[0].inferLabel, '推定 · 无 map')
  assert.equal(infTickets.stages[1].inferLabel, '推定 · 无 spec')
  assert.equal(infTickets.stages[2].inferred, false, '有票本身即是 tickets 的实证')

  const infFog = deriveChain({ slug: 'x', map: { exists: true, destination: '终点', fogCount: 2 }, spec: { exists: true, contentLength: 9 } })
  assert.equal(infFog.stages[0].status, 'done', 'map 未走完但 spec 已在 → 推定压过迷雾')
  assert.equal(infFog.stages[0].inferred, true)
  assert.equal(infFog.stages[0].inferLabel, '推定')
  assert.match(infFog.stages[0].evidence, /迷雾还有 2 条/)
  assert.match(infFog.stages[0].hint, /推定拷问已完成/)

  const infEarly = deriveChain({ slug: 'x', map: { exists: true, destination: '终点', fogCount: 3 }, spec: { exists: false, contentLength: 0 } })
  assert.equal(infEarly.currentId, 'grill', '纯早期（无下游产物）行为不变')
  assert.equal(infEarly.stages[0].status, 'current')
  assert.equal(infEarly.stages[0].inferred, false)
  assert.equal(infEarly.stages[0].inferLabel, '')
  assert.match(infEarly.stages[0].hint, /继续 grilling/)
  ok('链后向推定：spec/票推定 grill 与 spec 完成，无产物标「推定 · 无 map」「推定 · 无 spec」，早期 effort 零变化')

  // ── 前沿口径（票 02）：阻塞计数与前沿判定同口径——依赖未全结才算阻塞 ──
  const { isFrontierTicket, closedKeySet } = await import('./flowchain.mjs')
  // 依赖全结不计阻塞（旧口径「有 Blocked by 行就算」在此仍计 1，属有意修正）
  assert.equal(deriveChain({ slug: 'x', tickets: [
    { key: '01', state: 'open', blockedBy: ['02'] },
    { key: '02', state: 'closed', blockedBy: [] },
  ] }).counts.blocked, 0, '依赖全结 → 不阻塞')
  // 闭环依赖：互相依赖的两张 open 票都算阻塞，谁也不被误判为可干
  assert.equal(deriveChain({ slug: 'x', tickets: [
    { key: '01', state: 'open', blockedBy: ['02'] },
    { key: '02', state: 'open', blockedBy: ['01'] },
  ] }).counts.blocked, 2, '闭环依赖双双阻塞')
  // 依赖票号不存在 → 文件事实上不是 resolved，按未结计（不静默放行）
  assert.equal(deriveChain({ slug: 'x', tickets: [{ key: '01', state: 'open', blockedBy: ['99'] }] }).counts.blocked, 1, '幽灵依赖计阻塞')
  // 前沿判定纯函数：open、未认领、依赖全结
  const fSet = closedKeySet([{ key: '02', state: 'closed' }, { key: '03', state: 'open' }])
  assert.equal(isFrontierTicket({ state: 'open', claimedBy: '', blockedBy: [] }, fSet), true, '空依赖 open 未认领即前沿')
  assert.equal(isFrontierTicket({ state: 'open', claimedBy: '', blockedBy: ['02'] }, fSet), true, '依赖已全结即前沿')
  assert.equal(isFrontierTicket({ state: 'open', claimedBy: '', blockedBy: ['03'] }, fSet), false, '依赖未结非前沿')
  assert.equal(isFrontierTicket({ state: 'open', claimedBy: '', blockedBy: ['99'] }, fSet), false, '幽灵依赖非前沿（不误判为可干）')
  assert.equal(isFrontierTicket({ state: 'open', claimedBy: '@me', blockedBy: [] }, fSet), false, '已认领非前沿')
  assert.equal(isFrontierTicket({ state: 'open', status: 'claimed', blockedBy: [] }, fSet), false, 'claimed（status 形态）非前沿')
  assert.equal(isFrontierTicket({ state: 'closed', blockedBy: [] }, fSet), false, '已关闭非前沿')
  ok('前沿口径：依赖全结不计阻塞、闭环/幽灵依赖双双阻塞不误判、open 未认领即前沿、claimed 两形态都不算')

  // ── 指引词英文列（english-ui 票 02）：单一派生表加一列，判据分支只走一遍、两列同支 ──
  const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/
  const enCols = (chain) => {
    for (const s of chain.stages) {
      assert.ok(s.en, '每个阶段都该带英文列：' + s.id)
      for (const k of ['evidence', 'hint', 'copyText', 'inferLabel']) {
        assert.equal(typeof s.en[k], 'string', s.id + '.en.' + k + ' 应为字符串')
        assert.ok(!CJK_RE.test(s.en[k]), s.id + '.en.' + k + ' 不得含中文：' + s.en[k])
      }
      assert.notEqual(s.en.evidence, '', s.id + '：证据要有英文')
      assert.notEqual(s.en.hint, '', s.id + '：指引要有英文')
      // 英文 copyText 与 hint 同源，正如中文 copyText = hint（一键复制的是指引全文）
      assert.equal(s.en.copyText, s.en.hint, s.id + '：英文 copyText 与 hint 同源')
      // 推定标注两列同进出：同一分支的产物，不许一列有一列没
      assert.equal(s.en.inferLabel !== '', s.inferLabel !== '', s.id + '：推定标注两列同进出')
    }
  }
  // 分支对应：中文走「还没有 map.md」那支时，英文必须走同一支（不是随手一句英文）
  const enNoMap = deriveChain({ slug: 'deck', map: { exists: false, destination: '', fogCount: 0 } })
  enCols(enNoMap)
  assert.equal(enNoMap.stages[0].evidence, '还没有 map.md', '中文列逐字不变（英文列是加列，不是改写）')
  assert.match(enNoMap.stages[0].en.evidence, /^No map\.md/)
  assert.match(enNoMap.stages[0].en.hint, /grilling/, '英文指引点名下一步用的技能名')
  assert.match(enNoMap.stages[0].en.hint, /\.scratch\/deck\/map\.md/, '英文指引给出落盘路径（路径与判据字段不进词表）')
  const enFog = deriveChain({ slug: 'deck', map: { exists: true, destination: 'ship it', fogCount: 2 }, spec: { exists: false, contentLength: 0 } })
  enCols(enFog)
  assert.equal(enFog.stages[0].evidence, 'map.md 已有，但迷雾还有 2 条（Not yet specified）', '中文列逐字不变')
  assert.match(enFog.stages[0].en.evidence, /\b2\b/, '英文证据带同一个计数')
  assert.match(enFog.stages[0].en.hint, /Not yet specified/, '英文指引沿用文件的英文小节名（判据不受语言影响）')
  const enInferred = deriveChain({ slug: 'deck', map: { exists: false, destination: '', fogCount: 0 }, spec: { exists: true, contentLength: 42 } })
  enCols(enInferred)
  assert.equal(enInferred.stages[0].inferLabel, '推定 · 无 map')
  assert.match(enInferred.stages[0].en.inferLabel, /no map/i, '推定标注随语言（无 map 的英文说法）')
  assert.match(enInferred.stages[0].en.evidence, /infer/i, '推定完成的证据英文列说清是推定')
  const enTickets = deriveChain({ slug: 'deck', map: { exists: true, destination: 'd', fogCount: 0 }, spec: { exists: true, contentLength: 9 }, tickets: [
    { key: '01', state: 'open', blockedBy: [] },
    { key: '02', state: 'open', blockedBy: ['01'] },
  ] })
  enCols(enTickets)
  assert.match(enTickets.stages[2].en.evidence, /2 tickets/i, '拆票证据英文列带票数')
  assert.match(enTickets.stages[3].en.hint, /Blocked by/, '英文指引仍点名判据字段名')
  assert.match(enTickets.stages[3].en.hint, /Status[^\n]*resolved/, '英文指引仍要求 Status 行改 resolved')
  assert.match(enTickets.stages[3].en.evidence, /blocked/i, '有阻塞时英文证据跟着说阻塞')
  const enClosed = deriveChain({ slug: 'deck', map: { exists: true, destination: 'd', fogCount: 0 }, spec: { exists: true, contentLength: 9 }, tickets: [
    { key: '01', state: 'closed', blockedBy: [] },
  ] })
  enCols(enClosed)
  assert.match(enClosed.stages[3].en.hint, /all .*closed|全部关闭/i)
  assert.match(enClosed.stages[3].en.evidence, /1 ticket|all/i, '全关时的证据英文列')
  // 阶段名/副题同在派生载荷里下发（双轴评审收口）：zh 列 = FLOW_STAGES 单一表，en 列 = titleEn/subtitleEn
  assert.deepEqual(
    enTickets.stages.map((s) => [s.title, s.subtitle]),
    FLOW_STAGES.map((f) => [f.title, f.subtitle]),
    '载荷里的阶段名/副题 zh 列 = FLOW_STAGES 单一表（界面不再自抄第二份）')
  assert.deepEqual(
    enTickets.stages.map((s) => [s.en.title, s.en.subtitle]),
    FLOW_STAGES.map((f) => [f.titleEn, f.subtitleEn]),
    '载荷里的阶段名/副题 en 列 = FLOW_STAGES 英文列')
  ok('指引词英文列：四阶段证据/指引/复制词/推定标注两列同支、阶段名/副题也随载荷按语言下发、英文列零中文、判据字段名（Status/Blocked by/Destination/Not yet specified）与路径不随语言')

  // ── 指引词零工程习惯（custom-guides 票 01，ADR-0004）：默认指引词不写死任何工程纪律。这组查两条
  //    **规则**、不再查逐字原文——逐字钉每次改措辞都要全文对照，而 README 里那份逐字复制品已经这样漂过
  //    一次（英文「起步约定第 4 步」与 index.html 权威源对不上，直到本次一并收敛成指针）。
  //
  //    ① 零 git 指令：五面内置段的中英两列里 git 零出现。阶段格指引词随状态分支而变（完工 / 推定 /
  //       迷雾未清 / 无票可实现 / 带阻塞尾巴……），所以穷举场景把每个分支的文案都收齐再扫——只扫一个
  //       场景等于给没扫到的分支留后门，规则会退化成「主干那一句零 git」。这里刻意比票面写的「零 `git `」
  //       更宽一档（整个 git 字样都算），因为 ADR 的口径是「默认指引词一个字 git 都不提」。
  //    ② 不点名 Matt 技能包以外的技能：包内技能名取自 docs/skill-intros/ 的 frontmatter，逐段扫明写的
  //       「X 技能」与英文同形的「X skill」两种形式。局限与 ADR 并列承认：只认这两种明写形式、不做全文
  //       语义判断——换个说法绕过去它看不见，这是自愿接下的代价。
  //
  //    票行与收尾（implementDone）的「不提合并」负向钉**保留**但降级：回退后它们本就不含 git，而
  //    「合回 main / merge back」不经过 git 字样、规则①盖不住，留着防的就是「以后又织回来」。──
  const gwHtml = await fs.readFile(nodePath.join(HERE, 'index.html'), 'utf8')

  // 扫的面：四阶段格（copyText 即 hint 逐字）× 场景全集，再加票行复制词与起步工作约定。
  // 场景刻意挑满：每格至少覆盖「已完工」与其未完工的各个分支，否则扫到的只是同一句话。
  const gwMapDone = { exists: true, destination: 'd', fogCount: 0 }
  const gwSpecDone = { exists: true, contentLength: 9 }
  const gwScenarios = [
    ['空 effort', {}],
    ['有 map 未写 Destination', { map: { exists: true, destination: '', fogCount: 0 } }],
    ['有 map 迷雾未清', { map: { exists: true, destination: 'd', fogCount: 2 } }],
    ['map 就绪 · 无 spec', { map: gwMapDone }],
    ['map 就绪 · spec 在盘', { map: gwMapDone, spec: gwSpecDone }],
    ['无 map 但有票（推定分支）', { tickets: [{ key: '01', state: 'open', blockedBy: [] }] }],
    ['票目录在但没票', { map: gwMapDone, spec: gwSpecDone, tickets: [] }],
    ['有票未关', { map: gwMapDone, spec: gwSpecDone, tickets: [{ key: '01', state: 'open', blockedBy: [] }] }],
    ['有票被依赖阻塞（阻塞尾巴分支）', { map: gwMapDone, spec: gwSpecDone, tickets: [{ key: '01', state: 'open', blockedBy: ['00'] }, { key: '00', state: 'open', blockedBy: [] }] }],
    ['票全关（收尾分支）', { map: gwMapDone, spec: gwSpecDone, tickets: [{ key: '01', state: 'closed', blockedBy: [] }] }],
  ]
  const gwSegments = []
  for (const [label, extra] of gwScenarios) {
    const chain = deriveChain(Object.assign({ slug: 'deck' }, extra))
    for (const st of chain.stages) {
      gwSegments.push({ face: `${st.id}·${label}·中文`, faceId: st.id, lang: '中文', text: st.copyText })
      gwSegments.push({ face: `${st.id}·${label}·英文`, faceId: st.id, lang: '英文', text: st.en.copyText })
    }
  }
  const gwTicketM = /'copy\.ticket': \{ zh: '([\s\S]*?)', en: '([\s\S]*?)' \},/.exec(gwHtml)
  assert.ok(gwTicketM, '词表含 copy.ticket 词条（zh/en 两列都切得出来）')
  gwSegments.push({ face: '票行复制词·中文', faceId: 'ticket', lang: '中文', text: gwTicketM[1] })
  gwSegments.push({ face: '票行复制词·英文', faceId: 'ticket', lang: '英文', text: gwTicketM[2] })
  // 起步工作约定（空态页那段两栏并列的步骤）不是五面之一，但它同样是出厂固定文案、同样发给使用者，
  // 且正是本次回退的第三处——一并纳入，免得规则只守住两个面。
  const gwAgreeFrom = gwHtml.indexOf("'empty.agreement': {")
  const gwAgreeEn = gwHtml.indexOf('en: [', gwAgreeFrom)
  const gwAgreeTo = gwHtml.indexOf('\n  },', gwAgreeFrom)
  assert.ok(gwAgreeFrom > 0 && gwAgreeEn > gwAgreeFrom && gwAgreeTo > gwAgreeEn, '词表含 empty.agreement 段（两栏都切得出来）')
  gwSegments.push({ face: '起步工作约定·中文', text: gwHtml.slice(gwAgreeFrom, gwAgreeEn) })
  gwSegments.push({ face: '起步工作约定·英文', text: gwHtml.slice(gwAgreeEn, gwAgreeTo) })

  // 空扫等于白扫：先钉「确实扫到了一批面、且去重后确实是多段不同文案」，后面的零断言才有意义。
  // 用下限而不是 assert.equal 是有意的：往后加一个场景是常事，等值会让这条护栏在正当增补时误炸；
  // 它要挡的是「某个面整个没被扫到」这种塌方，真塌了数量一定掉到下限以下。
  assert.ok(gwSegments.length >= 80, `扫的面数够（${gwSegments.length} 段 = 四阶段格 × 场景 × 中英 + 票行 + 工作约定）`)
  // 面覆盖钉（票 03）：两条规则要盖的是**五面中英两列**，不是「扫到了一批文案」就算数。
  // 逐面逐列清点——漏掉整整一面的话，上面的条数下限照样过得去（别的面多扫几遍就补回来了），
  // 只有按面点名才挡得住这种塌方。
  for (const faceId of ['grill', 'spec', 'tickets', 'implement', 'ticket']) {
    for (const col of ['中文', '英文']) {
      assert.ok(gwSegments.some((s) => s.faceId === faceId && s.lang === col), `五面中英两列都扫到了：${faceId}·${col}`)
    }
  }
  const gwDistinct = new Set(gwSegments.map((s) => s.text))
  assert.ok(gwDistinct.size >= 12, `状态分支确实被扫到（去重后 ${gwDistinct.size} 段不同文案）`)

  // ① 零 git 指令
  for (const seg of gwSegments) {
    assert.doesNotMatch(seg.text, /\bgit\b/, `默认指引词零 git 措辞：${seg.face} 里出现了 git`)
  }
  // ② 不点名 Matt 技能包以外的技能
  const gwSkillNames = new Set()
  for (const f of await fs.readdir(nodePath.join(HERE, 'docs', 'skill-intros'))) {
    if (!f.endsWith('.md') || f === 'README.md') continue
    const head = (await fs.readFile(nodePath.join(HERE, 'docs', 'skill-intros', f), 'utf8')).split('\n').slice(0, 12).join('\n')
    const nm = /^name:\s*(\S+)/m.exec(head)
    if (nm) gwSkillNames.add(nm[1])
  }
  assert.ok(gwSkillNames.size > 10, `包内技能名集合取自 frontmatter（取到 ${gwSkillNames.size} 个）`)
  // 「X 技能」有两种写法，两种都得认：直说的「to-spec 技能」，以及带括号备选的
  // 「grilling（或 wayfinder）技能」/「grilling (or wayfinder) skill」。只认直说那一支的话，
  // 恰恰是 grill 那面的两个技能名（内置文案里唯一点名两个技能的地方）会整个漏检——
  // 括号挡在名字和「技能」之间，不给它留位置，正则就一路滑过去、这条规则空转。
  const gwSkillRe = /([A-Za-z][\w-]*)(?:\s*[（(]\s*(?:或|or)\s*([A-Za-z][\w-]*)\s*[）)])?\s*(?:技能|skill)/g
  let gwSkillHits = 0
  for (const seg of gwSegments) {
    for (const hit of seg.text.matchAll(gwSkillRe)) {
      gwSkillHits++
      for (const name of [hit[1], hit[2]].filter(Boolean)) {
        assert.ok(gwSkillNames.has(name), `默认指引词只点名包内技能：「${name} 技能」（${seg.face}）不在 docs/skill-intros/ 的 frontmatter 名单里`)
      }
    }
  }
  // 规则自己也得证明自己咬得着：内置文案里 grill 那面明写两个技能名，扫不到就是正则退化了。
  assert.ok(gwSkillHits >= 8, `技能名规则确实咬得着（扫到 ${gwSkillHits} 处点名；括号备选那一支也认）`)
  // 降级保留的负向钉：合回措辞不经过 git 字样，规则①盖不住，单留两条钉防重新织入。
  assert.doesNotMatch(gwTicketM[1] + gwTicketM[2], /合回|merge back/, '票行指引不提合并（回归防护：回退后本就没有，防的是重新织入）')
  const gwDoneChain = deriveChain({ slug: 'deck', map: gwMapDone, spec: gwSpecDone, tickets: [{ key: '01', state: 'closed', blockedBy: [] }] })
  const gwDoneImpl = gwDoneChain.stages.find((s) => s.id === 'implement')
  assert.doesNotMatch(gwDoneImpl.hint + gwDoneImpl.en.hint, /合回|merge back/, '收尾（implementDone）文案不提合并（回归防护：回退后本就没有，防的是重新织入）')
  // 两份 README 的起步约定第 4 步缩成指向产品内「工作约定」的指针：它们曾与 index.html 的权威源
  // 逐字重复，而英文那份已经漂过一次（"4. Implementation:" 少了 (implement)、"as each ticket finishes"
  // 与中文那句也对不上），没人发现。钉两件事——不带 git 字样、不再逐字复制权威原文。
  for (const readme of ['README.zh-CN.md', 'README.md']) {
    const txt = await fs.readFile(nodePath.join(HERE, readme), 'utf8')
    assert.doesNotMatch(txt, /git switch/, `${readme} 不含 \`git switch\` 字样（第 4 步已缩成指针）`)
    assert.doesNotMatch(txt, /逐票实现；每完成一张票|change its Status line to resolved/, `${readme} 不再逐字复制第 4 步原文（权威源只有产品内那份）`)
    assert.doesNotMatch(txt, /合回 main|merge back to main/, `${readme} 不含合回 main 措辞`)
  }
  ok(`指引词零工程习惯（custom-guides 01 / ADR-0004）：${gwSegments.length} 段内置文案（去重 ${gwDistinct.size} 段）零 git 措辞；点名的技能全在 Matt 包内（frontmatter 名单 ${gwSkillNames.size} 个）；票行与收尾文案不提合并；两份 README 第 4 步已缩成指针`)

  // ── 静态壳取词绑定（english-ui 票 02，票 04 实拍补的洞）：markup 的 data-i18n* 键不许悬空，
  //    写死的中文默认态不许与词表漂移。悬空键把标签擦成空白，而「零中文残留」照样通过——所以这一组
  //    在文件级钉：键都在词表里 + title/placeholder/aria 三条通道的 markup 默认值逐字等于中文列。──
  const deckHtml = await fs.readFile(nodePath.join(HERE, 'index.html'), 'utf8')
  const wlFrom = deckHtml.indexOf('var UI_TEXT = {')
  const wlTo = deckHtml.indexOf('\n}\n', wlFrom)
  assert.ok(wlFrom > 0 && wlTo > wlFrom, '词表要能从 index.html 定位（界面人话的单一来源）')
  // 词表是 HTML 里的对象字面量，没有导出可 import——按原样求值，绝不在测试里复制第二份词表。
  const SHELL_TEXT = new Function('return ' + deckHtml.slice(wlFrom + 'var UI_TEXT = '.length, wlTo + 2))()
  const SHELL_CHANNELS = { 'data-i18n': null, 'data-i18n-title': 'title', 'data-i18n-placeholder': 'placeholder', 'data-i18n-aria': 'aria-label' }
  const dangling = []
  const drifted = []
  let bound = 0
  for (const tag of (deckHtml.slice(deckHtml.indexOf('<body')).match(/<[a-zA-Z][^>]*data-i18n[^>]*>/g) || [])) {
    const attrs = [...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])
    for (const m of tag.matchAll(/\s(data-i18n(?:-[a-z]+)?)="([^"]+)"/g)) {
      const [, attr, key] = m
      bound++
      if (!SHELL_TEXT[key]) { dangling.push(attr + '=' + key); continue }
      const dom = SHELL_CHANNELS[attr]
      if (dom === null) continue // 正文通道由 jsdom 那组按当前语言逐字钉，这里不比 innerHTML
      const literal = (attrs.find((a) => a[0] === dom) || [])[1]
      if (literal !== SHELL_TEXT[key].zh) drifted.push(key + '：markup ' + JSON.stringify(literal) + ' ≠ 词表 ' + JSON.stringify(SHELL_TEXT[key].zh))
    }
  }
  assert.ok(Object.keys(SHELL_TEXT).length > 200, '词表整块求值成功（' + Object.keys(SHELL_TEXT).length + ' 条）')
  assert.ok(bound >= 40, '静态壳的取词绑定全部进入扫描面（' + bound + ' 条）')
  assert.deepEqual(dangling, [], 'markup 每个 data-i18n* 键都在词表里（悬空即空白，零残留扫不出来）')
  assert.deepEqual(drifted, [], '写死的中文默认态与词表中文列逐字一致（中文态字节不变这条硬约束的静态壳侧）')
  ok('静态壳取词绑定（文件级）：data-i18n* 键不悬空，title/placeholder/aria 三通道的 markup 中文默认态与词表中文列逐字一致')

  // ── 流式缩放基座（ui-appearance 票 03）：jsdom 无布局能力，本组只钉「接线存在」，不断言像素尺寸 ──
  const appCss = await fs.readFile(nodePath.join(HERE, 'styles', 'app.css'), 'utf8')
  assert.match(appCss, /--fluid-base:\s*clamp\(10px, 0\.5vw \+ 4\.6px, 11\.5px\)/, '流式基值声明在案（≤1080 视口落 10px 下限）')
  assert.match(appCss, /--ui-scale:\s*1;/, '缩放档倍率缺省 1（中档 = 与改造前一致）')
  assert.match(appCss, /html\s*\{\s*font-size:\s*calc\(var\(--fluid-base\) \* var\(--ui-scale\)\)/, '根字号 = 流式基值 × 缩放档（一个乘法管整个界面）')
  assert.match(appCss, /\.wrap\s*\{[^}]*max-width:\s*clamp\(1080px, 92vw, 1600px\)/, '主容器流式变宽、1600px 封顶守行长')
  // rem 纪律（缩放生效的机制面）：字号与间距声明里不许留 px，留了就脱离缩放档
  const scaledDecls = []
  for (const line of appCss.split('\n')) {
    for (const decl of line.split(/[{};]/)) {
      const m = decl.match(/^\s*(font-size|font-family|font|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|row-gap|column-gap)\s*:\s*(.*)$/)
      if (m) scaledDecls.push([m[1], m[2]])
    }
  }
  const pxInScaled = scaledDecls.filter(([, v]) => /\d+(?:\.\d+)?px/.test(v)).map(([k, v]) => k + ': ' + v)
  assert.ok(scaledDecls.length >= 120, '缩放属性声明全部进入扫描面（' + scaledDecls.length + ' 条）')
  assert.deepEqual(pxInScaled, [], '字号与间距声明零 px（px 即脱离流式缩放）')
  // 边界另一侧：组件定宽与圆角/边框刻意留 px，不随缩放档变化
  assert.match(appCss, /\.menu\s*\{[^}]*width: 400px/, '菜单定宽保持 px')
  assert.match(appCss, /\.modal \.box\.settings-box\s*\{[^}]*width: 560px/, '设置盒定宽保持 px')
  assert.match(appCss, /\.chip\s*\{[^}]*border-radius: 999px/, '圆角保持 px')
  // 标签卡是流式组件（跟着视口与缩放档伸缩），只有「封顶宽度」留 px 防长路径名撑爆一行
  assert.match(appCss, /\.tabcard\s*\{[^}]*max-width: 24rem/, '项目标签卡走流式宽度 + rem 封顶，不钉死 px')
  // 旧地址栏组合框退役（project-tabs 票 01：换目录心智由标签条接管，界面上不留第二套）
  assert.ok(!/rootInput|rootMenuBtn|switchBtn/.test(appCss), '旧单目录输入框与「换目录」按钮的样式已随控件退役')
  // token 纪律规则 1 的机器面（双轴评审收口）：裸值一旦溜进业务样式，两份 README 的「零裸值」即成空话，
  // 而换肤就会漏这一处——暗色主题下那个琥珀点就是三套里唯一不随肤走的颜色。
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(appCss), '业务样式零裸十六进制色值（裸值只准住 styles/tokens-*.css）')
  // 字体同理：shorthand 的族名部分只准引别名或 inherit（scaledDecls 已把 font/font-family 收进扫描面）
  const fontDecls = scaledDecls.filter(([k]) => k === 'font' || k === 'font-family')
  assert.deepEqual(fontDecls.filter(([, v]) => !/var\(--fd-font|inherit/.test(v)).map(([k, v]) => k + ': ' + v), [],
    '业务样式零裸字体栈（只写 var(--fd-font-*) 或 inherit）')
  ok('流式缩放基座（文件级）：--fluid-base/--ui-scale/根字号乘法与主容器 clamp 接线在案、字号与间距声明零 px（缩放靠 rem 生效）、组件定宽与圆角刻意留 px、业务样式零裸色值与零裸字体栈（token 纪律规则 1 的机器面）；不断言像素尺寸（jsdom 无布局）')

  // ── 项目标签纯函数（project-tabs 票 01）：从 index.html 的 TAG_FN 区直接求值 ──
  //    零构建单文件没法让测试 import 界面的纯函数；这里按标记切出来原样求值（同 UI_TEXT 的做法），
  //    测的就是界面真正在跑的那份实现，而不是测试里抄的第二份。
  const tabFnFrom = deckHtml.indexOf('/* TAG_FN_BEGIN')
  const tabFnTo = deckHtml.indexOf('/* TAG_FN_END')
  assert.ok(tabFnFrom > 0 && tabFnTo > tabFnFrom, '项目标签纯函数区要能从 index.html 定位（TAG_FN_BEGIN/END 标记）')
  const TABFN = new Function(deckHtml.slice(tabFnFrom, tabFnTo) +
    '\nreturn { tabName, tabHash, tabEmoji, tabOpen, tabClose, tabNormalize, tabAlign, TAB_LIMIT, TAB_EMOJI }')()
  const { tabName, tabEmoji, tabOpen, tabClose, tabNormalize, tabAlign } = TABFN

  // emoji 派生：固定池、同目录恒同图、不同名尽量散开（判准是外部可观察的取词，不是内部哈希值）
  assert.equal(TABFN.TAB_LIMIT, 8, '标签上限 8 张')
  assert.equal(TABFN.TAB_EMOJI.length, 16, '固定 emoji 池 16 个')
  assert.equal(new Set(TABFN.TAB_EMOJI).size, TABFN.TAB_EMOJI.length, '池内无重复项')
  assert.deepEqual([tabName('/a/b/c'), tabName('c'), tabName('/a/b/'), tabName('')], ['c', 'c', '/a/b/', ''], '展示名取 basename')
  assert.equal(tabEmoji('/a/flowdeck'), tabEmoji('/z/flowdeck'), '同目录名恒同图（与父目录无关）')
  assert.equal(tabEmoji('/a/flowdeck'), tabEmoji('/a/flowdeck'), '同一输入两次同图（纯函数）')
  assert.ok(TABFN.TAB_EMOJI.includes(tabEmoji('/tmp/x')), '取到的图必在池内')
  const spread = new Set(Array.from({ length: 40 }, (_, i) => tabEmoji('/w/proj-' + i)))
  assert.ok(spread.size >= 10, '不同目录名尽量散开（40 个名字落到 ' + spread.size + ' 个图）')

  // 开卡：同目录去重落到已有卡；超上限拒绝且不改原表
  let open = tabOpen([], '/p/a')
  assert.deepEqual([open.added, open.index, open.limited, open.list], [true, 0, false, ['/p/a']])
  open = tabOpen(['/p/a', '/p/b'], '/p/a')
  assert.deepEqual([open.added, open.index, open.limited, open.list], [false, 0, false, ['/p/a', '/p/b']], '同目录去重落到已有卡，不出第二张')
  const eight = Array.from({ length: 8 }, (_, i) => '/p/' + i)
  const over = tabOpen(eight, '/p/new')
  assert.deepEqual([over.added, over.index, over.limited, over.list], [false, -1, true, eight], '满 8 张时开新卡被拒，原表不动')
  assert.deepEqual([tabOpen(eight, '/p/3').added, tabOpen(eight, '/p/3').limited], [false, false], '满额时开已存在的目录仍走去重（不是拒绝）')

  // 关卡：关活跃卡落右邻、无右邻落左邻；关挂起卡只让活跃卡下标随位移；全关落 -1
  assert.deepEqual(tabClose(['a', 'b', 'c'], 1, 1), { list: ['a', 'c'], active: 1, removed: true }, '关活跃卡落右邻')
  assert.deepEqual(tabClose(['a', 'b', 'c'], 2, 2), { list: ['a', 'b'], active: 1, removed: true }, '关末位（无右邻）落左邻')
  assert.deepEqual(tabClose(['a', 'b', 'c'], 2, 0), { list: ['b', 'c'], active: 1, removed: true }, '关挂起卡：活跃卡跟着前移一位')
  assert.deepEqual(tabClose(['a'], 0, 0), { list: [], active: -1, removed: true }, '关掉最后一张落空态（-1）')
  assert.deepEqual(tabClose(['a', 'b'], 0, 9), { list: ['a', 'b'], active: 0, removed: false }, '越界下标原样返回（不误伤）')

  // 读回清洗：坏形状的存储值不能让标签条崩，值域夹回
  assert.deepEqual(tabNormalize({ list: ['/a', '/a', '', null, 3, '/b'], active: 9, collapsed: true }),
    { list: ['/a', '/b'], active: 1, collapsed: true }, '去重、剔非字符串、活跃下标夹回值域')
  assert.deepEqual(tabNormalize(null), { list: [], active: -1, collapsed: false }, '空值落空态')
  assert.deepEqual(tabNormalize({ list: 12 }), { list: [], active: -1, collapsed: false }, 'list 不是数组也落空态（不抛）')
  const many = Array.from({ length: 20 }, (_, i) => '/p/' + i)
  assert.deepEqual([tabNormalize({ list: many, active: -3 }).list.length, tabNormalize({ list: many, active: -3 }).active],
    [8, 0], '读回也守上限 8，负下标夹回 0')

  // 补位：以服务端追踪目录为真相对齐；缺卡补开置活跃；满额时占掉活跃那张（上限不破、不变式不破）
  assert.deepEqual(tabAlign('/a', ['/a', '/b'], 1), { list: ['/a', '/b'], active: 0, added: false }, '已有对应卡 → 活跃卡对齐过去')
  assert.deepEqual(tabAlign('/c', ['/a', '/b'], 0), { list: ['/a', '/b', '/c'], active: 2, added: true }, '无对应卡 → 补开一张置为活跃')
  const alignedFull = tabAlign('/z', eight, 3)
  assert.deepEqual([alignedFull.list.length, alignedFull.list[3], alignedFull.active], [8, '/z', 3], '满额且无对应卡：服务端目录占掉活跃那张')
  ok('项目标签纯函数（文件级）：emoji 派生同目录恒同图/池内无重复/不同名散开；开卡去重与上限 8；关卡右邻优先、无右邻落左邻、全关落空态；读回清洗与补位（满额换位）')

  // ── 通知事件推导（票 04）：前后两拍盘点的结构化 diff，纯函数 ──
  const { deriveEvents } = await import('./notify.mjs')
  const mkEffort = (slug, tickets, fogCount, currentId) => ({
    slug, title: slug,
    map: { fogCount },
    tickets,
    chain: { currentId },
    latestAt: '',
  })
  const ROOT = '/tmp/fd-notify'
  const snap = (efforts, extra = {}) => ({ root: ROOT, generatedAt: '2026-09-18T00:00:00Z', efforts, ...extra })
  const ev = (prev, next) => deriveEvents(snap(prev), snap(next)).map((e) => e.text)
  // 各事件类：票关闭 / 票重开 / 迷雾增减 / 阶段推进 / 新 effort
  assert.deepEqual(
    ev([mkEffort('feat', [{ key: '03', state: 'open' }], 13, 'spec')], [mkEffort('feat', [{ key: '03', state: 'closed' }], 13, 'spec')]),
    ['feat：票 #03 已关闭'], '票关闭出一条人话事件'
  )
  assert.deepEqual(
    ev([mkEffort('feat', [{ key: '03', state: 'closed' }], 0, 'implement')], [mkEffort('feat', [{ key: '03', state: 'open' }], 0, 'implement')]),
    ['feat：票 #03 重新打开'], '重开也有事件（开关态变化的双向）'
  )
  assert.deepEqual(
    ev([mkEffort('feat', [], 13, 'grill')], [mkEffort('feat', [], 12, 'grill')]),
    ['feat：迷雾 13→12'], '迷雾数变化出「旧→新」事件'
  )
  assert.deepEqual(
    ev([mkEffort('feat', [], 0, 'spec')], [mkEffort('feat', [], 0, 'tickets')]),
    ['feat：阶段推进 To-Spec 规格 → To-Tickets 拆票'], '当前步推进带阶段人话标签'
  )
  assert.deepEqual(
    ev([mkEffort('feat', [], 0, 'implement')], [mkEffort('feat', [], 0, null)]),
    ['feat：阶段推进 Implement 实现 → 四阶段完成'], '推进到完成（currentId → null）也是事件'
  )
  assert.deepEqual(
    ev([mkEffort('feat', [], 0, null)], [mkEffort('feat', [], 0, 'implement')]),
    ['feat：阶段回落 四阶段完成 → Implement 实现'], '回退如实说「回落」不误称推进'
  )
  assert.deepEqual(
    ev([mkEffort('old', [], 0, 'grill')], [mkEffort('old', [], 0, 'grill'), mkEffort('new', [], 1, 'grill')]),
    ['新 effort：new'], '新 effort 出现一条事件'
  )
  // 无变化 / mtime-only / effort 消失 / 换目录 / 新票出现：零事件或不误报
  const sameEffort = mkEffort('feat', [{ key: '01', state: 'open', updatedAt: '2026-09-17T00:00:00Z' }], 5, 'implement')
  assert.deepEqual(ev([sameEffort], [sameEffort]), [], '无变化零事件')
  const touchedEffort = JSON.parse(JSON.stringify(sameEffort))
  touchedEffort.tickets[0].updatedAt = '2026-09-18T09:00:00Z' // 仅 mtime 变
  touchedEffort.latestAt = '2026-09-18T09:00:00Z'
  touchedEffort.git = { hash: 'abc1234', date: '2026-09-18T09:00:00Z', subject: '提交了但没动票' }
  assert.deepEqual(ev([sameEffort], [touchedEffort]), [], '仅 mtime / git 旁证变化零事件')
  assert.deepEqual(ev([mkEffort('a', [], 0, 'grill'), mkEffort('gone', [], 0, 'grill')], [mkEffort('a', [], 0, 'grill')]),
    [], 'effort 消失零事件零误报（不反着报「新 effort」）')
  assert.equal(deriveEvents(snap([mkEffort('a', [], 0, 'grill')], { root: '/tmp/one' }), snap([mkEffort('a', [], 0, 'grill')], { root: '/tmp/two' })).length,
    0, '换目录两拍不可比：root 不同零事件（防跨项目误报）')
  assert.deepEqual(
    ev([mkEffort('feat', [], 0, 'implement')], [mkEffort('feat', [{ key: '09', state: 'open' }], 0, 'implement')]),
    [], '已有 effort 里新票出现不是事件（四类之外）'
  )
  // 组合事件的确定性次序：票开关 → 迷雾 → 当前步；__root 用根目录名
  assert.deepEqual(
    ev(
      [mkEffort('__root', [{ key: '01', state: 'open' }], 2, 'spec')],
      [mkEffort('__root', [{ key: '01', state: 'closed' }], 1, 'tickets')]
    ),
    ['.scratch 根目录：票 #01 已关闭', '.scratch 根目录：迷雾 2→1', '.scratch 根目录：阶段推进 To-Spec 规格 → To-Tickets 拆票'],
    '一个 effort 多类事件按固定次序输出，__root 用根目录名'
  )
  assert.equal(deriveEvents(null, snap([])).length, 0, '缺拍（首次加载）零事件')
  ok('通知事件推导：四类事件各自成话（含回落与完成的边界）、mtime-only / effort 消失 / 换目录 / 新票零误报、次序确定')

  // ── resolveRoot：配置里目录写法的解析规则 ──
  assert.equal(resolveRoot(''), process.cwd())
  assert.ok(resolveRoot('~/笔记').startsWith(os.homedir()))
  assert.equal(resolveRoot('./sub'), nodePath.resolve(HERE, 'sub'))
  assert.equal(resolveRoot('/tmp/abc'), nodePath.resolve('/tmp/abc'))
  ok('resolveRoot：空=当前目录，~=主目录，相对=按本目录解析，绝对=原样')

  // ── 常用目录（recentRoots）：MRU 变换是导出的小纯函数 ──
  const homeRec = resolveRoot('~/flowdeck-verify-recent')
  assert.deepEqual(
    normalizeRecentRoots(['/tmp/fd-a', '/tmp/fd-a', '~/flowdeck-verify-recent', './neighbor', 42, '', null]),
    ['/tmp/fd-a', homeRec, nodePath.resolve(HERE, 'neighbor')]
  )
  assert.deepEqual(normalizeRecentRoots(undefined), [])
  assert.deepEqual(normalizeRecentRoots('不是数组'), [])
  ok('normalizeRecentRoots：手写条目按 resolveRoot 归一，去重，非法条目丢弃，非数组回落空列表')

  assert.deepEqual(touchRecentRoot(['/tmp/fd-a', '/tmp/fd-b'], '/tmp/fd-c'), ['/tmp/fd-c', '/tmp/fd-a', '/tmp/fd-b'])
  assert.deepEqual(touchRecentRoot(['/tmp/fd-a', '/tmp/fd-b'], '/tmp/fd-b'), ['/tmp/fd-b', '/tmp/fd-a'])
  assert.deepEqual(touchRecentRoot(['/tmp/fd-a', '/tmp/fd-b'], '~/flowdeck-verify-recent/'), [homeRec, '/tmp/fd-a', '/tmp/fd-b'])
  const touched = touchRecentRoot(['/tmp/fd-a', '/tmp/fd-b'], '/tmp/fd-b')
  assert.deepEqual(touchRecentRoot(touched, '/tmp/fd-b'), touched)
  assert.deepEqual(touchRecentRoot(touchRecentRoot(['/tmp/fd-a'], '/tmp/fd-c'), '/tmp/fd-c'), ['/tmp/fd-c', '/tmp/fd-a'])
  ok('touchRecentRoot：新使用进头部；重复与 ~/ 写法归一移顶不重复；同输入同输出（幂等）')

  // ── 指引词自定义段（custom-guides 票 02）：归一是导出的小纯函数，走单测而不是只从 HTTP 面验 ──
  assert.deepEqual(normalizeGuides({ implement: { zh: '甲', en: '乙' } }), { implement: { zh: '甲', en: '乙' } })
  assert.deepEqual(normalizeGuides({ implement: { zh: '' } }), { implement: { zh: '' } }, '空串留着——它就是「回落内置段」这一事实')
  assert.deepEqual(normalizeGuides({ implement: {} }), { implement: {} }, '缺面合法')
  assert.deepEqual(normalizeGuides({}), {})
  // 面名原样透传（下一票扩到五面时服务端零改动）；面内只认 zh/en —— 多出来的键没有第二个消费者，
  // 悄悄丢掉等于静默吞掉一个笔误，所以它是 400（与「结构非法整体拒」同一处置）
  assert.deepEqual(normalizeGuides({ implement: { zh: '甲' }, ticket: { en: '丙' } }), { implement: { zh: '甲' }, ticket: { en: '丙' } })
  for (const bad of [undefined, null, 'x', 7, [], { implement: 'x' }, { implement: [] }, { implement: { zh: 1 } }, { implement: { en: {} } }, { implement: { en: null } }, { implement: { zh: '甲', bogus: 1 } }, { implement: { bogus: 1 } }]) {
    assert.equal(normalizeGuides(bad), undefined, '结构非法应回落 undefined（POST 据此 400）：' + JSON.stringify(bad))
  }
  // __proto__ 早拒的判据见 server.mjs normalizeGuides 的注释（读得到、又会被赋值走原型 setter，两头都不是「面」）
  assert.equal(normalizeGuides(JSON.parse('{"__proto__":{"zh":"x"}}')), undefined, '__proto__ 不是面名，归一早拒')
  assert.equal(Object.getPrototypeOf(normalizeGuides({ implement: { zh: '甲' } })), Object.prototype, '归一结果仍是普通对象（原型没被动过）')
  ok('normalizeGuides：每面只取 {zh,en} 两列、面名原样透传、缺面/空串合法；非对象/面非对象/语言列非字符串/面内多余键与 __proto__ 一律回 undefined')

  const crowd = []
  for (let i = 0; i < RECENT_ROOTS_LIMIT + 10; i++) crowd.push('/tmp/fd-r' + i)
  const capped = touchRecentRoot(crowd, '/tmp/fd-new')
  assert.equal(capped.length, RECENT_ROOTS_LIMIT)
  assert.equal(capped[0], '/tmp/fd-new')
  assert.equal(capped[capped.length - 1], '/tmp/fd-r' + (RECENT_ROOTS_LIMIT - 2))
  ok('touchRecentRoot：超过上限淘汰最久未用的尾部（上限 ' + RECENT_ROOTS_LIMIT + '）')


  // ── HTTP 基础 ──
  const first = await startServer({ root: tmp, port: 0 })
  try {
    assert.equal(first.root, nodePath.resolve(tmp))
    const res = await fetch(first.url + '/api/state')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.root, nodePath.resolve(tmp))
    assert.equal(data.efforts.length, 5)
    assert.equal(data.efforts.find((e) => e.slug === 'idea-b').chain.progress, 75)

    const page = await fetch(first.url + '/')
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.match(html, /AI 编程流程板/)

    // 运行时 CSS 集中在 styles/（ADR-0003）：白名单里点名的每个文件都能被 HTTP 服务出来
    for (const css of ['/styles/app.css', '/styles/tokens-paper.css', '/styles/tokens-github-dark.css']) {
      const asset = await fetch(first.url + css)
      assert.equal(asset.status, 200, css + ' 经白名单可服务')
      assert.match(asset.headers.get('content-type') || '', /^text\/css/, css + ' 以 text/css 服务')
      assert.ok((await asset.text()).length > 0, css + ' 非空')
    }
    const offList = await fetch(first.url + '/styles/nope.css')
    assert.equal(offList.status, 404, 'styles/ 里没点名的文件不放行（白名单而非目录服务）')

    const missing = await fetch(first.url + '/nope')
    assert.equal(missing.status, 404)
    ok('HTTP：/api/state 返回完整盘点，/ 返回界面，styles/ 的 CSS 经白名单可服务（未点名 404），未知路径 404')

    // 端口被占 → 自动 +1
    const base = first.port
    const second = await startServer({ root: tmp, port: base })
    try {
      assert.equal(second.port, base + 1)
      const health = await fetch(second.url + '/api/health')
      assert.equal(health.status, 200)
      ok('HTTP：端口被占自动换下一个（' + base + ' → ' + second.port + '）')
    } finally {
      await new Promise((r) => second.server.close(r))
    }
  } finally {
    await new Promise((r) => first.server.close(r))
  }

  // ── 双层短路（票 01）：指纹缓存——磁盘没变不重扫；ETag/304——If-None-Match 命中空身 ──
  // 「复用上一拍」的黑盒可观测面 = generatedAt（只有真重盘才会换时间戳）。
  const etagTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-etag-'))
  const etagOther = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-etag2-'))
  try {
    await writeFile(nodePath.join(etagTmp, '.scratch/e1/map.md'), '# E1\n\n## Destination\n短路验证\n')
    await writeFile(nodePath.join(etagTmp, '.scratch/e1/issues/01-a.md'), '# 票A\nStatus: ready-for-agent\n')
    await writeFile(nodePath.join(etagOther, '.scratch/other/map.md'), '# 另一目录\n\n## Destination\n换过去\n')
    const etagCfg = nodePath.join(etagTmp, 'config-etag.json')
    await writeFile(etagCfg, JSON.stringify({ root: etagTmp, pollMs: 4000 }))
    const etagServer = await startServer({ port: 0, configPath: etagCfg })
    try {
      const r1 = await fetch(etagServer.url + '/api/state')
      assert.equal(r1.status, 200)
      const etag1 = r1.headers.get('etag')
      assert.ok(etag1, '200 应带 ETag（内容编号）')
      assert.match(r1.headers.get('cache-control') || '', /no-cache/, '必须同发 no-cache（防浏览器不问直接用旧副本）')
      const d1 = await r1.json()

      const r2 = await fetch(etagServer.url + '/api/state')
      const d2 = await r2.json()
      assert.equal(d2.generatedAt, d1.generatedAt, '指纹不变必复用：generatedAt 不换（没重盘）')
      assert.equal(r2.headers.get('etag'), etag1, '复用拍的内容编号稳定')

      const r304 = await fetch(etagServer.url + '/api/state', { headers: { 'If-None-Match': etag1 } })
      assert.equal(r304.status, 304, 'If-None-Match 命中应 304')
      assert.equal(await r304.text(), '', '304 空身')
      assert.equal(r304.headers.get('etag'), etag1)
      assert.match(r304.headers.get('cache-control') || '', /no-cache/, '304 也带 no-cache，复验链不断')

      // 改文件 → 指纹失效 → 必重盘，变化下一拍可见，ETag 换新
      await writeFile(nodePath.join(etagTmp, '.scratch/e1/issues/01-a.md'), '# 票A\nStatus: resolved\n')
      const r3 = await fetch(etagServer.url + '/api/state', { headers: { 'If-None-Match': etag1 } })
      assert.equal(r3.status, 200, '改文件后指纹失效：旧 If-None-Match 不再命中')
      const d3 = await r3.json()
      assert.notEqual(d3.generatedAt, d1.generatedAt, '真变化拍必重盘')
      assert.equal(d3.efforts.find((e) => e.slug === 'e1').tickets[0].state, 'closed', '改动内容下一拍可见')
      assert.notEqual(r3.headers.get('etag'), etag1)

      // 手改 config.json 下一拍可见（指纹含 config.json 的 mtime+大小——覆盖条款不回退）
      await writeFile(etagCfg, JSON.stringify({ root: etagTmp, pollMs: 2500 }))
      const d4 = await (await fetch(etagServer.url + '/api/state')).json()
      assert.equal(d4.pollMs, 2500, '手改 config.json 的 pollMs 下一拍生效')
      assert.notEqual(d4.generatedAt, d3.generatedAt)

      // 换目录后缓存作废：state 立刻反映新目录，不吐旧目录的复用体
      const sw = await postJson(etagServer.url + '/api/config', { root: etagOther })
      assert.equal(sw.status, 200)
      const d5 = await (await fetch(etagServer.url + '/api/state')).json()
      assert.equal(d5.root, nodePath.resolve(etagOther))
      assert.equal(d5.efforts.find((e) => e.slug === 'other').map.destination, '换过去')
    } finally {
      await new Promise((r) => etagServer.server.close(r))
    }
    ok('双层短路：指纹命中复用上一拍（generatedAt 不动）、改文件必重盘；ETag/304 + no-cache 往返；手改 config 与换目录语义不回退')

    // ── 大目录退化基准：文件量上去后短路仍成立（指纹命中不随规模退化）──
    const bigTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-big-'))
    try {
      for (let i = 0; i < 120; i++) {
        const dir = nodePath.join(bigTmp, '.scratch/effort-' + String(i).padStart(3, '0'))
        await writeFile(nodePath.join(dir, 'map.md'), '# 大树 ' + i + '\n\n## Destination\n压指纹\n')
        await writeFile(nodePath.join(dir, 'spec.md'), '# 大树 ' + i + ' 规格\n\n正文。')
        await writeFile(nodePath.join(dir, 'issues/01-t.md'), '# 票\nStatus: ready-for-agent\n')
      }
      const bigServer = await startServer({ root: bigTmp, port: 0 })
      try {
        const b1 = await (await fetch(bigServer.url + '/api/state')).json()
        assert.equal(b1.efforts.length, 120)
        const b2 = await (await fetch(bigServer.url + '/api/state')).json()
        assert.equal(b2.generatedAt, b1.generatedAt, '大树下的没变拍照样命中指纹缓存')
        await fs.rm(nodePath.join(bigTmp, '.scratch/effort-000/issues/01-t.md'))
        const b3 = await (await fetch(bigServer.url + '/api/state')).json()
        assert.notEqual(b3.generatedAt, b1.generatedAt, '删文件必重盘')
        assert.equal(b3.efforts.find((e) => e.slug === 'effort-000').tickets.length, 0)
      } finally {
        await new Promise((r) => bigServer.server.close(r))
      }
    } finally {
      await fs.rm(bigTmp, { recursive: true, force: true })
    }
    ok('大目录基准：120 个 effort 的树下指纹命中照常复用、删票即失效重盘')
  } finally {
    await fs.rm(etagTmp, { recursive: true, force: true })
    await fs.rm(etagOther, { recursive: true, force: true })
  }

  // ── 配置：config.json 的 root/pollMs 生效；缺文件用默认 ──
  assert.deepEqual(loadConfig(nodePath.join(tmp, '不存在的配置.json')), { root: '', port: 3210, host: '127.0.0.1', pollMs: 5000, pollMode: 'observe', recentRoots: [], token: '', guides: {}, configPath: nodePath.resolve(nodePath.join(tmp, '不存在的配置.json')) })
  ok('配置缺省：config.json 不存在时不报错，全部字段回落默认（含 token 空 = 不启用、pollMode 观测、guides 空 = 复制内置段）')

  const cfgHandPath = nodePath.join(tmp, 'config-handwritten.json')
  await writeFile(cfgHandPath, JSON.stringify({
    root: tmp,
    recentRoots: ['/tmp/fd-hand-b', '~/flowdeck-verify-recent', '/tmp/fd-hand-b', './neighbor', 7],
  }))
  const cfgHand = loadConfig(cfgHandPath)
  assert.deepEqual(cfgHand.recentRoots, ['/tmp/fd-hand-b', resolveRoot('~/flowdeck-verify-recent'), nodePath.resolve(HERE, 'neighbor')])
  ok('配置读入：config.json 里手写的 recentRoots 按 resolveRoot 归一去重后进入配置对象')

  const anotherProject = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-other-'))
  await writeFile(nodePath.join(anotherProject, '.scratch/m/map.md'), '# M\n\n## Destination\n另一个项目\n')
  const cfgPath = nodePath.join(tmp, 'config-test.json')
  await writeFile(cfgPath, JSON.stringify({
    root: anotherProject,
    pollMs: 2000,
    recentRoots: [anotherProject, '/tmp/fd-没有这个目录'],
    说明: '这是给人看的说明。',
    字段说明: { root: '要追踪的目录' },
  }))
  const withCfg = await startServer({ port: 0, configPath: cfgPath })
  try {
    assert.equal(withCfg.root, nodePath.resolve(anotherProject))
    const st = await (await fetch(withCfg.url + '/api/state')).json()
    assert.equal(st.root, nodePath.resolve(anotherProject))
    assert.equal(st.pollMs, 2000)
    assert.equal(st.efforts.length, 1)
    ok('配置生效：config.json 的 root 决定追踪目录，pollMs 透传给界面')

    assert.deepEqual(st.recentRoots, [
      { path: nodePath.resolve(anotherProject), exists: true },
      { path: '/tmp/fd-没有这个目录', exists: false },
    ])
    ok('盘点接口：recentRoots 以对象数组透出（归一路径 + 该目录当前是否存在），按最近使用在前')

    // ── 换目录 API：合法 → 热切换 + 写盘；非法 → 拒绝且不碰配置 ──
    const cfgBefore = await fs.readFile(cfgPath, 'utf8')
    const bad1 = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: tmp }),
    })
    assert.equal(bad1.status, 403)
    const bad2 = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: JSON.stringify({ root: nodePath.join(tmp, '没有这个目录') }),
    })
    assert.equal(bad2.status, 400)
    const bad3 = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: JSON.stringify({ root: '  ' }),
    })
    assert.equal(bad3.status, 400)
    assert.equal(await fs.readFile(cfgPath, 'utf8'), cfgBefore)
    ok('换目录防护：缺自定义头 403，目录不存在 400，空白 400；三种失败都不碰 config.json')

    const good = await postJson(withCfg.url + '/api/config', { root: tmp })
    assert.equal(good.status, 200)
    assert.equal(good.data.root, nodePath.resolve(tmp))
    const saved = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
    assert.equal(saved.root, nodePath.resolve(tmp))
    assert.equal(saved.pollMs, 2000)
    assert.equal(saved.说明, '这是给人看的说明。')
    assert.deepEqual(saved.字段说明, { root: '要追踪的目录' })
    assert.deepEqual(saved.recentRoots, [
      nodePath.resolve(tmp),
      nodePath.resolve(anotherProject),
      '/tmp/fd-没有这个目录',
    ])
    const after = await (await fetch(withCfg.url + '/api/state')).json()
    assert.equal(after.root, nodePath.resolve(tmp))
    assert.equal(after.efforts.length, 5)
    ok('换目录生效：POST 之后服务热切换、config.json 写回，且保留文件里其他字段')
    ok('换目录收录：成功切换的目录进 recentRoots 头部，与换目录合并为一次写盘')

    await postJson(withCfg.url + '/api/config', { root: anotherProject })
    let saved2 = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
    assert.deepEqual(saved2.recentRoots, [nodePath.resolve(anotherProject), nodePath.resolve(tmp), '/tmp/fd-没有这个目录'])
    await postJson(withCfg.url + '/api/config', { root: anotherProject })
    saved2 = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
    assert.deepEqual(saved2.recentRoots, [nodePath.resolve(anotherProject), nodePath.resolve(tmp), '/tmp/fd-没有这个目录'])
    ok('收录去重：重复切换同一目录只移顶不重复；切到当前已是追踪目录的目录也算一次使用')

    // ── 切标签 = 同一个换根请求（project-tabs 票 01）：服务端零新端点，来回切只改 root ──
    // 最后一轮落在 anotherProject，好让下面删除端点那几行的 recentRoots 顺序接着上一组（末尾兜底重排断言已覆盖）。
    for (const dir of [tmp, anotherProject, tmp, anotherProject]) {
      const hop = await postJson(withCfg.url + '/api/config', { root: dir })
      assert.equal(hop.status, 200, '切到 ' + dir + ' 成功')
      assert.equal(hop.data.root, nodePath.resolve(dir), '应答回的 root 是归一后的那个')
      const onDisk = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
      assert.equal(onDisk.root, nodePath.resolve(dir), 'config.json 的 root 恒等于最后切过去的（活跃）那张卡的目录')
      assert.equal(onDisk.pollMs, 2000, '切标签不碰轮询间隔')
      assert.equal(onDisk.说明, '这是给人看的说明。', '切标签保留人看的「说明」')
      assert.deepEqual(onDisk.字段说明, { root: '要追踪的目录' }, '切标签保留「字段说明」')
    }
    const servedNow = await (await fetch(withCfg.url + '/api/state')).json()
    assert.equal(servedNow.root, nodePath.resolve(anotherProject), '换完 /api/state 报的就是那个目录（补位规则的真相来源）')
    ok('切标签即换根（HTTP 黑盒）：多次来回切后 config.json 的 root 恒等于活跃卡目录，pollMs 与「说明」「字段说明」一次不丢，/api/state 跟着报新目录')

    // ── 删除端点：防护与换目录同款；写回并返回最新列表；删未知条目幂等 ──
    const delGuard1 = await fetch(withCfg.url + '/api/recent-roots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove: '/tmp/fd-没有这个目录' }),
    })
    assert.equal(delGuard1.status, 403)
    const delGuard2 = await fetch(withCfg.url + '/api/recent-roots', {
      method: 'POST',
      headers: { 'X-FlowDeck': '1' },
      body: JSON.stringify({ remove: '/tmp/fd-没有这个目录' }),
    })
    assert.equal(delGuard2.status, 403)
    assert.equal((await fs.readFile(cfgPath, 'utf8')).includes('/tmp/fd-没有这个目录'), true)
    ok('删除防护：缺 X-FlowDeck 头 403、Content-Type 不对 403，两种失败都不碰 config.json')

    const delEmpty = await postJson(withCfg.url + '/api/recent-roots', { remove: '  ' })
    assert.equal(delEmpty.status, 400)

    const del = await postJson(withCfg.url + '/api/recent-roots', { remove: '/tmp/fd-没有这个目录' })
    assert.equal(del.status, 200)
    assert.deepEqual(del.data.recentRoots, [
      { path: nodePath.resolve(anotherProject), exists: true },
      { path: nodePath.resolve(tmp), exists: true },
    ])
    assert.deepEqual(JSON.parse(await fs.readFile(cfgPath, 'utf8')).recentRoots, [nodePath.resolve(anotherProject), nodePath.resolve(tmp)])
    const delAgain = await postJson(withCfg.url + '/api/recent-roots', { remove: '/tmp/fd-没有这个目录' })
    assert.equal(delAgain.status, 200)
    assert.deepEqual(delAgain.data.recentRoots, del.data.recentRoots)
    ok('删除端点：空白 remove 400；成功后写回并返回最新列表（含存在性）；删未知条目幂等返回成功')

    // ── Host 校验：回环绑定下伪造 Host 的读写请求 403（封 DNS rebinding），本机写法全放行 ──
    const cfgBeforeHost = await fs.readFile(cfgPath, 'utf8')
    const forgedPost = await rawHttp({
      method: 'POST', url: withCfg.url + '/api/config',
      headers: { Host: 'evil.example.com', 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: JSON.stringify({ root: tmp }),
    })
    assert.equal(forgedPost.status, 403)
    const forgedGet = await rawHttp({
      method: 'GET', url: withCfg.url + '/api/state',
      headers: { Host: 'evil.example.com:1234' },
    })
    assert.equal(forgedGet.status, 403)
    assert.equal(await fs.readFile(cfgPath, 'utf8'), cfgBeforeHost, '伪造 Host 的请求不该碰 config.json')
    const hostUpper = await rawHttp({ method: 'GET', url: withCfg.url + '/api/health', headers: { Host: 'LOCALHOST:' + withCfg.port } })
    assert.equal(hostUpper.status, 200)
    const hostV6 = await rawHttp({ method: 'GET', url: withCfg.url + '/api/health', headers: { Host: '[::1]:' + withCfg.port } })
    assert.equal(hostV6.status, 200)
    ok('Host 校验：伪造 Host 的读写请求 403 且不碰 config.json；localhost 大小写、[::1]、带端口写法放行')

    // ── 超限 POST：应答真实 413 JSON，而不是掐断连接让浏览器只看到网络错误（票 03 起按字节、上限 30KB）──
    const tooBigRes = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: 'x'.repeat(30721),
    })
    assert.equal(tooBigRes.status, 413)
    const tooBigData = await tooBigRes.json()
    assert.match(String(tooBigData.error || ''), /30KB/)
    ok('超限 POST：超过 30KB（30720 字节）的合法防护请求拿到 413 JSON 应答（fetch 收到响应而非网络错误）')

    // ── 字节语义（票 03）：全中文按字节放行（旧字符上限下的合法载荷零收紧）；30720 边界两侧 ──
    // 夹带一个未知字段当填充（服务端忽略未知字段），pollMs 保证请求本身合法保存。
    const zhRes = await postJson(withCfg.url + '/api/config', { pollMs: 3000, filler: '令'.repeat(6000) }) // ≈18KB 字节的中文
    assert.equal(zhRes.status, 200, '全中文 18KB 字节（6000 字 < 旧 10240 字符上限）照常放行')
    const padBody = (n) => {
      // 壳 {"filler":"","pollMs":3000} 固定 27 个 ASCII 字节；填 a 到恰好 n 字节
      const body = '{"filler":"' + 'a'.repeat(n - 27) + '","pollMs":3000}'
      assert.equal(Buffer.byteLength(body), n, '夹具自检：字节数要正好是 ' + n)
      return body
    }
    const exact = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: padBody(30720),
    })
    assert.equal(exact.status, 200, '正好 30720 字节 = 上限内，放行')
    const over = await fetch(withCfg.url + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: padBody(30721),
    })
    assert.equal(over.status, 413, '30721 字节即超限')
    ok('POST 字节语义：按字节计上限 30720——全中文 18KB 放行、边界值 30720 放行、30721 拿 413')

    // ── 客户端中断：POST 发一半断开，进程不崩、服务继续应答 ──
    await new Promise((resolve) => {
      const u = new URL(withCfg.url + '/api/config')
      const req = http.request({
        host: u.hostname, port: u.port, path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'Content-Length': String(50 * 1024) },
      }, () => resolve())
      req.on('error', () => {}) // 我们主动断开，客户端侧报错是预期的
      req.write('{"root":"/tmp/so')
      setTimeout(() => { req.destroy(); resolve() }, 50)
    })
    const aliveAfterAbort = await fetch(withCfg.url + '/api/health')
    assert.equal(aliveAfterAbort.status, 200)
    ok('客户端中断：POST 半途断开不崩进程，服务照常应答')
  } finally {
    await new Promise((r) => withCfg.server.close(r))
    await fs.rm(anotherProject, { recursive: true, force: true })
  }

  // ── 坏配置：非法 JSON 告警恰好一次（含路径与原因），回退默认语义不变、不随轮询刷屏 ──
  const badCfgPath = nodePath.join(tmp, 'config-broken.json')
  await writeFile(badCfgPath, '{ 这不是合法 JSON')
  const warns = []
  const origWarn = console.warn
  console.warn = (...args) => { warns.push(args.join(' ')) }
  let badCfgServer
  try {
    badCfgServer = await startServer({ port: 0, configPath: badCfgPath })
    const stBad1 = await (await fetch(badCfgServer.url + '/api/state')).json()
    await fetch(badCfgServer.url + '/api/state')
    assert.equal(stBad1.root, resolveRoot(''), '坏配置回退：root 回落到启动时当前目录')
    assert.equal(stBad1.pollMs, 5000, '坏配置回退：pollMs 用内置默认')
    assert.equal(warns.length, 1, '启动 + 两次轮询共读了 config 三次以上，告警只能有一次')
    assert.ok(warns[0].indexOf(nodePath.resolve(badCfgPath)) >= 0, '告警里要点名是哪个文件')
    assert.match(warns[0], /JSON/)
  } finally {
    console.warn = origWarn
    if (badCfgServer) await new Promise((r) => badCfgServer.server.close(r))
  }
  ok('坏配置告警：非法 JSON 首次读取告警一次（含路径与原因），回退默认值，不随轮询重复')

  // ── 非回环绑定：Host 校验放宽，不破坏局域网用法（README 记录的残留风险正来自这里）──
  const lanServer = await startServer({ root: tmp, port: 0, host: '0.0.0.0' })
  try {
    const lanForged = await rawHttp({ method: 'GET', url: 'http://127.0.0.1:' + lanServer.port + '/api/health', headers: { Host: 'evil.example.com' } })
    assert.equal(lanForged.status, 200)
  } finally {
    await new Promise((r) => lanServer.server.close(r))
  }
  ok('非回环绑定：0.0.0.0 下 Host 校验放宽，任意 Host 照常服务（局域网用法不破坏）')

  // ── 技能文档接口：/api/skills 清单 + /api/skills/<名字> 单篇；未知名字与路径穿越 404 ──
  const skillsServer = await startServer({ root: tmp, port: 0 })
  try {
    const listRes = await fetch(skillsServer.url + '/api/skills')
    assert.equal(listRes.status, 200)
    const skills = (await listRes.json()).skills
    assert.ok(Array.isArray(skills) && skills.length >= 35, '清单应收录全部技能介绍文档（>=35 篇）')
    assert.equal(skills[0].name, 'README', '总览（README）排第一')
    assert.equal(skills[0].category, 'overview')
    const names = skills.map((s) => s.name)
    for (const must of ['ask-matt', 'grill-with-docs', 'tdd', 'wayfinder', 'wizard', 'grilling', 'teach', 'git-guardrails-claude-code', 'writing-shape']) {
      assert.ok(names.includes(must), '清单应包含 ' + must)
    }
    const tddEntry = skills.find((s) => s.name === 'tdd')
    assert.equal(tddEntry.category, 'engineering')
    assert.ok(tddEntry.title && tddEntry.summary, '清单条目带标题与一句话简介')
    assert.equal(tddEntry.inProgress, false)
    assert.equal(skills.find((s) => s.name === 'writing-beats').inProgress, true, 'in-progress 文档带开发中标')
    const catSeq = skills.map((s) => s.category).filter((c, i, arr) => i === 0 || arr[i - 1] !== c)
    assert.deepEqual(catSeq, ['overview', 'engineering', 'productivity', 'misc', 'in-progress'], '清单按分类聚合且次序固定')

    const docRes = await fetch(skillsServer.url + '/api/skills/tdd')
    assert.equal(docRes.status, 200)
    assert.match(docRes.headers.get('content-type') || '', /text\/markdown/)
    const docText = await docRes.text()
    assert.match(docText, /^---\nname: tdd\n/)
    assert.match(docText, /红 → 绿循环/)

    assert.equal((await fetch(skillsServer.url + '/api/skills/没有这个技能')).status, 404)
    assert.equal((await fetch(skillsServer.url + '/api/skills/server')).status, 404, '同名非 md 文件不存在的 404')
    assert.equal((await fetch(skillsServer.url + '/api/skills/..%2F..%2Fserver.mjs')).status, 404, '路径穿越 404')
    assert.equal((await fetch(skillsServer.url + '/api/skills/%ZZ')).status, 404, '畸形百分号转义 404 不炸进程')
  } finally {
    await new Promise((r) => skillsServer.server.close(r))
  }
  ok('技能文档接口：清单完整有序（总览最前、分类聚合）、单篇取原文 Markdown；未知/穿越/畸形转义一律 404')

  // ── 技能介绍英文（english-ui 票 03）：两条只读端点认 ?lang；不带参数的响应逐字节不变 ──
  const ZH_DOCS = nodePath.join(HERE, 'docs', 'skill-intros')
  const EN_DOCS = nodePath.join(HERE, 'docs', 'skill-intros-en')
  /** 取中文篇 frontmatter 的某一格（测试自己读盘，与镜像对账用，不复用服务端解析器）。 */
  function fmField(raw, key) {
    const m = new RegExp('^' + key + ':[ \\t]*(.+)$', 'm').exec(raw.slice(4, raw.indexOf('\n---', 3)))
    return m ? m[1].trim() : ''
  }
  const langServer = await startServer({ root: tmp, port: 0 })
  try {
    const body = async (u) => (await fetch(langServer.url + u)).text()
    const zhListRaw = await body('/api/skills')
    const zhDocRaw = await body('/api/skills/tdd')
    // 缺省路径红线：只有 'en' 分叉，空值与不认识的语言都必须回到与不带参数同一串字节。
    for (const u of ['/api/skills?lang=', '/api/skills?lang=zh', '/api/skills?lang=fr', '/api/skills?lang=ENGLISH']) {
      assert.equal(await body(u), zhListRaw, '清单：不带参数与非法 lang 的响应逐字节一致（' + u + '）')
    }
    assert.equal(await body('/api/skills/tdd?lang=zh'), zhDocRaw, '单篇：lang=zh 与不带参数同字节')
    assert.equal(await body('/api/skills/tdd?lang=fr'), zhDocRaw, '单篇：非法 lang 同字节')
    assert.equal(zhDocRaw, await fs.readFile(nodePath.join(ZH_DOCS, 'tdd.md'), 'utf8'), '单篇中文态 = 磁盘中文原文逐字节')
    const zhList = JSON.parse(zhListRaw).skills
    assert.equal(zhList.some((s) => 'noEnglish' in s), false, '不带参数的清单一条 noEnglish 都不打')
    for (const s of zhList) {
      const raw = await fs.readFile(nodePath.join(ZH_DOCS, s.name + '.md'), 'utf8')
      assert.equal(s.title, fmField(raw, 'title'), s.name + '：中文清单的标题仍出自中文篇')
    }
    // 英文态：大小写与首尾空格宽容；骨架（篇目/次序/分类/顺序/开发中标）一格不动，只换 title/summary。
    const enList = (await (await fetch(langServer.url + '/api/skills?lang=%20EN ')).json()).skills
    assert.deepEqual(enList.map((s) => s.name), zhList.map((s) => s.name), '英文清单的篇目与次序不变（总览仍排第一）')
    assert.deepEqual(
      enList.map((s) => [s.category, s.order, s.inProgress]),
      zhList.map((s) => [s.category, s.order, s.inProgress]),
      '分类/顺序/开发中标以中文目录为单一真相，英文只作镜像')
    for (const s of enList) {
      const raw = await fs.readFile(nodePath.join(EN_DOCS, s.name + '.md'), 'utf8')
      assert.equal(s.title, fmField(raw, 'title'), s.name + '：英文清单的标题出自同名镜像篇')
      assert.equal(s.noEnglish, undefined, s.name + '：镜像在位就不打 noEnglish')
      assert.notEqual(s.title, (zhList.find((z) => z.name === s.name) || {}).title, s.name + '：英文标题与中文标题不同文')
    }
    const enDocRaw = await body('/api/skills/tdd?lang=en')
    assert.equal(enDocRaw, await fs.readFile(nodePath.join(EN_DOCS, 'tdd.md'), 'utf8'), '英文单篇 = 同名镜像篇逐字节')
    assert.match(enDocRaw, /^---\nname: tdd\n/, '英文篇同样带 frontmatter（清单与单篇共用一套结构）')
    // 语言自报头（双轴评审收口）：界面挂「暂无英文」标注以实际响应为准——英文请求撞缺镜像时头是
    // zh，标注跟着每一次响应走，不再依赖清单快照里会过期的 noEnglish。真回退没法在整仓 37/37
    // 全译的现状下从磁盘触发，回退路径的可见性钉在上方 jsdom 缝（stub 按 SK_SERVED 回 zh 头）。
    assert.equal((await fetch(langServer.url + '/api/skills/tdd?lang=en')).headers.get('x-flowdeck-doc-lang'), 'en', '英文镜像命中：X-FlowDeck-Doc-Lang 自报 en')
    assert.equal((await fetch(langServer.url + '/api/skills/tdd')).headers.get('x-flowdeck-doc-lang'), 'zh', '中文缺省：X-FlowDeck-Doc-Lang 自报 zh')
    // 语言参数不越名字白名单：未知名字与穿越在英文态一样是 404，不会悄悄回落到某篇中文。
    const en404 = await fetch(langServer.url + '/api/skills/no-such-skill-doc?lang=en')
    assert.equal(en404.status, 404, '不存在的篇 ?lang=en 仍 404')
    assert.equal((await (await fetch(langServer.url + '/api/skills/..%2F..%2Fserver.mjs?lang=en')).text()).indexOf('root:'), -1, '穿越加 lang 也读不到仓库文件')
    assert.equal((await fetch(langServer.url + '/api/skills/%ZZ?lang=en')).status, 404, '畸形转义加 lang 仍 404')
    // 缺篇回退的口径与磁盘同真相：今天 37/37 全译（票 03 要求），所以 noEnglish 一条都不该有；
    // 谁日后加了中文篇没跟英文篇，这条就把他指回这里（回退本身的可见性钉在界面缝，见下方 jsdom 组）。
    const missingEn = zhList.filter((s) => !existsSync(nodePath.join(EN_DOCS, s.name + '.md')))
    assert.equal(enList.filter((s) => s.noEnglish).length, missingEn.length, 'noEnglish 条数 = 磁盘缺镜像条数')
    assert.deepEqual(missingEn.map((s) => s.name), [], '每一篇中文介绍都有同名英文镜像')
    assert.deepEqual(
      (await fs.readdir(EN_DOCS)).filter((f) => f.endsWith('.md')).sort(),
      (await fs.readdir(ZH_DOCS)).filter((f) => f.endsWith('.md')).sort(),
      '英文目录不多不少正好那 37 篇（镜像不是第二套清单）')
  } finally {
    await new Promise((r) => langServer.server.close(r))
  }
  ok('技能介绍英文接口：?lang=en 换标题简介与单篇正文而骨架不动、大小写空格宽容；不带参数/非法 lang 的响应与磁盘中文原文逐字节一致；lang 不越名字白名单；中英目录同名一一对应')

  // ── 英文镜像完整性（票 03）：同名镜像逐篇与中文原篇对齐，只翻该翻的、不夹带机器事实 ──
  {
    const pairs = (await fs.readdir(ZH_DOCS)).filter((f) => f.endsWith('.md')).sort()
    assert.equal(pairs.length, 37, '中英各 37 篇（35 技能 + 总览 + 流程链聚合导读）')
    const drift = []
    for (const f of pairs) {
      const zhRaw = await fs.readFile(nodePath.join(ZH_DOCS, f), 'utf8')
      const enRaw = await fs.readFile(nodePath.join(EN_DOCS, f), 'utf8')
      const cut = (t) => { const e = t.indexOf('\n---', 3); return { fm: t.slice(3, e), body: t.slice(e + 4) } }
      const zh = cut(zhRaw)
      const en = cut(enRaw)
      // 两种篇型：总览分类下是不属于任何技能的聚合页（总览、流程链导读），其余四类才是
      // 「每技能一篇」。判准取自中文篇的 category——英文列的骨架照中文来。
      const isAggregate = fmField(zhRaw, 'category') === 'overview'
      // 键集按数组比（cut() 切出的 frontmatter 带一个前导空行，join 成串会多出首段空串）
      const keys = (s) => s.split('\n').map((l) => l.slice(0, l.indexOf(':'))).filter((k) => k)
      const zhKeyList = keys(zh.fm)
      const enKeyList = keys(en.fm)
      const zhKeys = new Set(zhKeyList)
      // 总规矩：镜像的 frontmatter 键不得超出中文篇（镜像不引入新元数据）
      for (const k of enKeyList) {
        if (!zhKeys.has(k)) drift.push(f + '：镜像多出键 ' + k)
      }
      // 聚合导读篇的镜像只可能两种形态：照抄中文篇的全套键（既有页，如总览篇），或者只留
      // name/title/summary（新页，分类与次序不带——中文目录才是唯一真相）。半抄不算数：
      // 键集一旦被允许随意收缩，逐字段对齐这条就没了着落，这里把口子堵死而不是放过。
      const sameShape = enKeyList.join(',') === zhKeyList.join(',')
      const isSubsetShape = enKeyList.join(',') === 'name,title,summary'
      if (isAggregate && !sameShape && !isSubsetShape) {
        drift.push(f + '：聚合篇镜像的键集只能是中文篇的全套或 name/title/summary，实为 ' + enKeyList.join(','))
      }
      // 键序一致时逐字段对账：只有 title/summary 是译文，其余（name/category/order/inProgress）
      // 原样照抄。键集不同的聚合篇没有可对账的非译文字段，上一条已经把形态钉死了。
      if (sameShape) {
        const zhFm = zh.fm.split('\n')
        const enFm = en.fm.split('\n')
        zhFm.forEach((line, i) => {
          const key = line.slice(0, line.indexOf(':'))
          if (key !== 'title' && key !== 'summary' && line !== enFm[i]) drift.push(f + '：' + key + ' 被改动')
        })
      } else if (!isAggregate) {
        drift.push(f + '：frontmatter 键序不同')
      }
      if (!fmField(enRaw, 'title') || CJK_RE.test(fmField(enRaw, 'title'))) drift.push(f + '：title 空或含中文')
      if (!fmField(enRaw, 'summary') || CJK_RE.test(fmField(enRaw, 'summary'))) drift.push(f + '：summary 空或含中文')
      const h1 = (t) => (t.match(/^# .*$/m) || [''])[0]
      if (h1(zh.body) !== h1(en.body)) drift.push(f + '：H1（技能名行）被改动')
      if (CJK_RE.test(enRaw)) drift.push(f + '：正文残留中文')
      const count = (s, re) => (s.match(re) || []).length
      if (count(zh.body, /^## /gm) !== count(en.body, /^## /gm)) drift.push(f + '：二级标题数不同')
      if (count(zh.body, /\[[^\]]+\]\([^)]+\)/g) !== count(en.body, /\[[^\]]+\]\([^)]+\)/g)) drift.push(f + '：链接数不同')
      const targets = (t) => (t.match(/\]\([^)]+\)/g) || []).sort().join('|')
      if (targets(zh.body) !== targets(en.body)) drift.push(f + '：链接目标被改动（内链要靠同名篇回退）')
      if (!isAggregate) {
        // 「什么时候用」的条数与正文段落数、加粗数一并钉住：译文不增删不合并
        const sec = (t, head) => { const i = t.indexOf(head); return i < 0 ? '' : t.slice(i + head.length).split(/^\s*## /m)[0] }
        const zhBullets = count(sec(zh.body, '## 什么时候用'), /^- /gm)
        const enBullets = count(sec(en.body, '## When to use'), /^- /gm)
        if (zhBullets !== enBullets || zhBullets === 0) drift.push(f + '：When to use 条数不等或取不到（' + zhBullets + ' vs ' + enBullets + '）')
        const pre = (t) => t.slice(0, t.indexOf('\n## '))
        if (count(pre(zh.body), /^\n/gm) !== count(pre(en.body), /^\n/gm)) drift.push(f + '：正文段落数不同')
        if (count(pre(zh.body), /\*\*[^*]+\*\*/g) !== count(pre(en.body), /\*\*[^*]+\*\*/g)) drift.push(f + '：加粗小标题数不同')
        // 「原文描述」是上游技能的英文原话：逐字节照抄，谁都不许顺手改一个引号
        const quote = (t, head) => { const i = t.indexOf(head); return i < 0 ? null : t.slice(i).split('\n').filter((l) => l.startsWith('>')).join('\n') }
        if (quote(zh.body, '## 原文描述') !== quote(en.body, '## Original description')) drift.push(f + '：原文描述引用不逐字节一致')
      }
    }
    assert.deepEqual(drift, [], '37 篇镜像逐篇对齐（键序、原样字段、结构计数、内链目标、原文描述逐字节）')
  }
  ok('英文镜像完整性（文件级）：37 篇同名镜像的 frontmatter 键不超出中文篇、每技能篇键序与非译文字段原样（聚合导读篇不带分类与次序，键序对齐对它不适用）、H1 与段落/条数/加粗/内链目标对齐、原文描述逐字节照抄、零中文残留')

  // ── 流程链聚合导读（ui-declutter 票 02）：文件级钉住它能进弹窗、正文按四阶段串技能 ──
  {
    // 名字白名单是正则不是固定清单：slug 过不了这条正则就 404，整篇等于不存在
    assert.ok(/^[A-Za-z0-9][A-Za-z0-9-]*$/.test('flowchain'), '聚合页 slug 过服务端名字白名单正则（合法可服务）')
    const fcRaw = await fs.readFile(nodePath.join(ZH_DOCS, 'flowchain.md'), 'utf8')
    assert.equal(fmField(fcRaw, 'name'), 'flowchain', 'frontmatter 的 name 与文件名一致')
    assert.equal(fmField(fcRaw, 'category'), 'overview', '归入总览分类（与总览篇同一分类，弹窗里相邻）')
    const overviewDocs = []
    for (const f of (await fs.readdir(ZH_DOCS)).filter((x) => x.endsWith('.md')).sort()) {
      const raw = await fs.readFile(nodePath.join(ZH_DOCS, f), 'utf8')
      if (fmField(raw, 'category') === 'overview') overviewDocs.push([f, Number(fmField(raw, 'order'))])
    }
    assert.deepEqual(overviewDocs, [['README.md', 0], ['flowchain.md', 1]], '总览分类下次序紧跟总览篇（README 0 → flowchain 1）')
    // 正文按四阶段分节，每节串起该阶段挂的技能——技能名单与 flowchain.mjs 的阶段定义同源
    const fcBody = fcRaw.slice(fcRaw.indexOf('\n---', 3) + 4)
    assert.deepEqual(
      FLOW_STAGES.map((st) => [st.id, st.skills]),
      [['grill', ['grilling', 'wayfinder']], ['spec', ['to-spec']], ['tickets', ['to-tickets']], ['implement', ['implement']]],
      '阶段定义里的技能名单是四格各自的挂载（grill 两枚、其余各一）',
    )
    for (const st of FLOW_STAGES) {
      for (const skill of st.skills) {
        assert.match(fcBody, new RegExp('\\[' + skill + '\\]\\(' + skill + '\\.md\\)'), '聚合页内链到该阶段的 ' + skill + ' 介绍')
        assert.ok(existsSync(nodePath.join(ZH_DOCS, skill + '.md')), '内链目标存在：' + skill + '.md')
      }
    }
    // 四节标题各就各位（导读的骨架：一格一节）
    assert.equal((fcBody.match(/^## /gm) || []).length, 5, '四阶段各一节 + 末尾一节「跑完之后」')
    // 镜像纪律：分类与次序以中文目录为唯一元数据源，聚合篇的镜像连它们都不带（服务端也从不读）
    const fcEnRaw = await fs.readFile(nodePath.join(EN_DOCS, 'flowchain.md'), 'utf8')
    assert.equal(fmField(fcEnRaw, 'category'), '', '英文镜像不带 category（分类以中文目录为唯一真相）')
    assert.equal(fmField(fcEnRaw, 'order'), '', '英文镜像不带 order（次序以中文目录为唯一真相）')
    assert.notEqual(fmField(fcEnRaw, 'title'), '', '英文镜像有 title（否则清单会打 noEnglish、正文回退中文）')
    assert.equal(fmField(fcEnRaw, 'title'), 'A tour of the four flowchain stages', '英文标题照译')
    assert.notEqual(fmField(fcEnRaw, 'summary'), fmField(fcRaw, 'summary'), '英文 summary 是译文不是照抄')
    ok('流程链聚合导读（文件级）：docs/skill-intros/flowchain.md 归入 overview、次序紧跟总览篇、slug 过名字白名单、正文按四阶段分节并内链各阶段技能（与 FLOW_STAGES 的 skills 同源）；英文镜像同名在位，只译 title/summary 与正文，分类与次序不自带')
  }

  // ── 访问令牌：config.json 的 token 非空时，/api/* 无/错令牌 401，头与查询串携带皆可；静态壳不设防 ──
  const tokenCfgPath = nodePath.join(tmp, 'config-token.json')
  await writeFile(tokenCfgPath, JSON.stringify({ root: tmp, token: 'sekrit-1' }))
  const tokenServer = await startServer({ port: 0, configPath: tokenCfgPath })
  try {
    const noToken = await fetch(tokenServer.url + '/api/state')
    assert.equal(noToken.status, 401)
    const noTokenHealth = await fetch(tokenServer.url + '/api/health')
    assert.equal(noTokenHealth.status, 401)
    const noTokenSkills = await fetch(tokenServer.url + '/api/skills')
    assert.equal(noTokenSkills.status, 401, '技能文档接口也在 /api/* 令牌闸门之内')
    const wrongToken = await rawHttp({ method: 'GET', url: tokenServer.url + '/api/state', headers: { 'X-FlowDeck-Token': 'wrong-token' } })
    assert.equal(wrongToken.status, 401)
    const shell = await fetch(tokenServer.url + '/')
    assert.equal(shell.status, 200, '界面静态壳不设防：数据与写操作都在 /api/*，令牌只守那里')
    const byHeader = await fetch(tokenServer.url + '/api/state', { headers: { 'X-FlowDeck-Token': 'sekrit-1' } })
    assert.equal(byHeader.status, 200)
    const byQuery = await fetch(tokenServer.url + '/api/state?token=sekrit-1')
    assert.equal(byQuery.status, 200)
    // 票原文端点也在令牌闸门之内（读面扩展与既有防护同款）
    const noTokenIssue = await fetch(tokenServer.url + '/api/issue?effort=idea-b&ticket=01')
    assert.equal(noTokenIssue.status, 401, '/api/issue 无令牌 401')
    const okTokenIssue = await fetch(tokenServer.url + '/api/issue?effort=idea-b&ticket=01', { headers: { 'X-FlowDeck-Token': 'sekrit-1' } })
    assert.equal(okTokenIssue.status, 200, '/api/issue 带令牌放行')
    assert.equal((await fetch(tokenServer.url + '/api/roots-overview')).status, 401, '/api/roots-overview 无令牌 401（读面扩展同款闸门）')

    // 写操作：令牌闸门在防跨站写校验之前——没有令牌，带头也进不来；令牌 + 防护头齐全才放行。
    const postNoToken = await rawHttp({
      method: 'POST', url: tokenServer.url + '/api/config',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1' },
      body: JSON.stringify({ root: tmp }),
    })
    assert.equal(postNoToken.status, 401)
    const cfgBeforeTokenPost = await fs.readFile(tokenCfgPath, 'utf8')
    const postWithToken = await rawHttp({
      method: 'POST', url: tokenServer.url + '/api/config',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'X-FlowDeck-Token': 'sekrit-1' },
      body: JSON.stringify({ root: tmp }),
    })
    assert.equal(postWithToken.status, 200)
    const savedAfterTokenPost = JSON.parse(await fs.readFile(tokenCfgPath, 'utf8'))
    assert.equal(savedAfterTokenPost.token, 'sekrit-1', '换目录写回保留 token 字段')
    assert.equal(savedAfterTokenPost.root, nodePath.resolve(tmp))
    assert.notEqual(await fs.readFile(tokenCfgPath, 'utf8'), cfgBeforeTokenPost)
  } finally {
    await new Promise((r) => tokenServer.server.close(r))
  }
  ok('访问令牌：token 非空时 /api/* 无/错令牌 401，X-FlowDeck-Token 头与 ?token= 皆可；静态壳不设防；写操作同样设防且写回不丢 token')

  // ── 票查证三件（票 01）：/api/issue 端点 + 盘点新字段（status 原值、git 旁证、Labels 仍不投影）──
  const forensicsServer = await startServer({ root: tmp, port: 0 })
  try {
    const issueRes = await fetch(forensicsServer.url + '/api/issue?effort=idea-b&ticket=01')
    assert.equal(issueRes.status, 200)
    assert.match(issueRes.headers.get('content-type') || '', /text\/markdown/)
    assert.equal(await issueRes.text(), T1_B, '票原文端点返回磁盘现状的 Markdown 原文')
    // 编号补零：ticket=1 命中 01（与 Blocked by 的口径一致）
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=idea-b&ticket=1')).status, 200, '个位票号补零命中')
    // 404 家族：无 issues/ 的 effort、不存在的 effort、不存在的票号、穿越样式 effort、非数字票号
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=__root&ticket=01')).status, 404, '根 effort 无 issues/ → 404')
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=没有这个effort&ticket=01')).status, 404)
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=idea-b&ticket=99')).status, 404)
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=..%2F..&ticket=01')).status, 404, '路径穿越样式的 effort 404')
    assert.equal((await fetch(forensicsServer.url + '/api/issue?effort=idea-b&ticket=1%3Brm')).status, 404, '非数字票号 404')
    const forgedIssue = await rawHttp({ method: 'GET', url: forensicsServer.url + '/api/issue?effort=idea-b&ticket=01', headers: { Host: 'evil.example.com' } })
    assert.equal(forgedIssue.status, 403, '伪造 Host 的票原文请求 403（Host 校验先于路由）')

    const stF = await (await fetch(forensicsServer.url + '/api/state')).json()
    const bF = stF.efforts.find((e) => e.slug === 'idea-b')
    assert.equal(bF.tickets.find((t) => t.key === '01').status, 'ready-for-agent', '票载荷带 Status 行原值')
    assert.equal(bF.tickets.find((t) => t.key === '02').status, 'resolved')
    for (const e of stF.efforts) {
      assert.equal(e.git, null, '无 .git 的目录 git 旁证一律 null（确定性降级，恒测）：' + e.slug)
      for (const t of e.tickets || []) {
        assert.ok(!('labels' in t), 'Labels 仍不投影进票载荷（过滤轴是 Status 行）')
      }
    }
  } finally {
    await new Promise((r) => forensicsServer.server.close(r))
  }
  ok('票原文端点：正常取原文、票号补零、404 家族（无 effort/无票/穿越/非数字）、Host 与令牌防护同款；盘点新字段 status 原值进载荷、无 .git 恒 null、Labels 仍不投影')

  // ── git 旁证正路径：临时 git 仓库夹具；git 二进制缺席自动跳过（同 jsdom 未装即跳过先例）──
  const gitBinaryOk = await new Promise((resolve) => {
    const p = spawn('git', ['--version'], { stdio: 'ignore' })
    p.on('error', () => resolve(false))
    p.on('close', (code) => resolve(code === 0))
  })
  if (!gitBinaryOk) {
    console.log('  ⊘ 跳过 git 旁证正路径（环境里没有 git 二进制）；无 .git 的降级路径已在上方恒测')
  } else {
    const gitRun = (args, cwd) => new Promise((resolve, reject) => {
      const p = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
      let out = ''
      p.stdout.on('data', (d) => { out += d })
      p.on('error', reject)
      p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error('git ' + args.join(' ') + ' 退出码 ' + code))))
    })
    const gitTmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-git-'))
    const prevTtl = process.env.FLOWDECK_GIT_TTL
    process.env.FLOWDECK_GIT_TTL = '40' // 测试专用的 TTL 缩短缝（非配置面）：验证「不随指纹走」不用等 15 秒
    try {
      await writeFile(nodePath.join(gitTmp, '.scratch/giteff/map.md'), '# Git 旁证\n\n## Destination\n最近提交展示\n')
      await writeFile(nodePath.join(gitTmp, '.scratch/giteff/issues/01-a.md'), '# 票A\nStatus: ready-for-agent\n')
      await writeFile(nodePath.join(gitTmp, 'notes.md'), '# 笔记\n')
      await gitRun(['init'], gitTmp)
      await gitRun(['config', 'user.email', 'verify@flowdeck.local'], gitTmp)
      await gitRun(['config', 'user.name', 'flowdeck-verify'], gitTmp)
      await gitRun(['add', '.'], gitTmp)
      await gitRun(['commit', '-m', '第一提交：建骨架'], gitTmp)
      const hash1 = await gitRun(['log', '-1', '--pretty=format:%h'], gitTmp)
      const gitServer = await startServer({ root: gitTmp, port: 0 })
      try {
        const s1 = await (await fetch(gitServer.url + '/api/state')).json()
        const g1 = s1.efforts.find((e) => e.slug === 'giteff').git
        assert.ok(g1, 'git 仓库内的 effort 应带旁证字段')
        assert.equal(g1.hash, hash1, '短哈希与 git 自己报的一致')
        assert.match(g1.date, /^\d{4}-\d{2}-\d{2}T/, 'ISO 时间')
        assert.equal(g1.subject, '第一提交：建骨架', '提交标题')

        // 陈旧陷阱回归（旁证不随指纹走）：amend 改写提交——工作树一个字节没动（指纹必然不变），
        // 但该目录的最近提交变了。若旁证随指纹走，这一拍的 body 会永远复用旧值；TTL（40ms）过后必须追上。
        await gitRun(['commit', '--amend', '-m', '第二提交：改写历史'], gitTmp)
        const hash2 = await gitRun(['log', '-1', '--pretty=format:%h'], gitTmp)
        await new Promise((r) => setTimeout(r, 90)) // 过 TTL
        const s2 = await (await fetch(gitServer.url + '/api/state')).json()
        const g2 = s2.efforts.find((e) => e.slug === 'giteff').git
        assert.equal(g2.hash, hash2, '.scratch 未动（指纹命中拍）也要在 TTL 后追上 amend 的新提交')
        assert.equal(g2.subject, '第二提交：改写历史')
        // 判据红线：git 旁证在场时链推导输入不含它——四格与进度照常由文件事实决定
        assert.equal(s2.efforts.find((e) => e.slug === 'giteff').chain.currentId, 'implement', '旁证不参与链推导（map+一开票 → 当前步 implement）')
      } finally {
        await new Promise((r) => gitServer.server.close(r))
      }
    } finally {
      if (prevTtl === undefined) delete process.env.FLOWDECK_GIT_TTL
      else process.env.FLOWDECK_GIT_TTL = prevTtl
      await fs.rm(gitTmp, { recursive: true, force: true })
    }
    ok('git 旁证正路径：临时仓夹具出短哈希/ISO 时间/标题；提交不动 .scratch 也能在 TTL 后追上（不随指纹走）；链推导不含 git 字段')
  }

  // ── 项目总览（票 03）：/api/roots-overview 混合夹具（正常 + 无 .scratch + 不可读），单坏不拖垮整窗 ──
  const ovRootA = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-ov-a-'))
  const ovNoScratch = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-ov-noscratch-'))
  try {
    await writeFile(nodePath.join(ovRootA, '.scratch/proj/map.md'), '# 完工项\n\n## Destination\n总览 A\n')
    await writeFile(nodePath.join(ovRootA, '.scratch/proj/issues/01-t.md'), '# 票\nStatus: resolved\n')
    await writeFile(nodePath.join(ovRootA, 'pretend-dir.md'), '路径其实是文件的常用目录条目')
    // wip 最后写（mtime 最新）：未完工 effort 里最近活跃的那个决定「链阶段」
    await writeFile(nodePath.join(ovRootA, '.scratch/wip/map.md'), '# 进行中\n\n## Destination\n总览 A 的活票\n\n## Not yet specified\n- 一条迷雾\n')
    await writeFile(nodePath.join(ovRootA, '.scratch/wip/spec.md'), '# 规格\n\n正文。')
    await writeFile(nodePath.join(ovRootA, '.scratch/wip/issues/01-w.md'), '# 活票\nStatus: ready-for-agent\n')
    const ovCfg = nodePath.join(tmp, 'config-ov.json')
    await writeFile(ovCfg, JSON.stringify({ root: ovRootA, pollMs: 5000, recentRoots: [ovRootA, ovNoScratch, nodePath.join(ovRootA, 'pretend-dir.md')] }))
    const ovServer = await startServer({ port: 0, configPath: ovCfg })
    try {
      const ov = await (await fetch(ovServer.url + '/api/roots-overview')).json()
      assert.equal(ov.roots.length, 3, '当前目录与 recentRoots 去重后三行')
      const rowA = ov.roots[0]
      assert.equal(rowA.path, nodePath.resolve(ovRootA))
      assert.equal(rowA.current, true, '当前追踪目录置顶')
      assert.equal(rowA.status, 'ok')
      assert.equal(rowA.stage, 'implement', '链阶段取最近活跃的未完工 effort 的当前步（wip 有一张开票）')
      assert.equal(rowA.efforts, 2)
      assert.equal(rowA.tickets, 2)
      assert.equal(rowA.closed, 1)
      assert.equal(rowA.fog, 1)
      const rowB = ov.roots[1]
      assert.equal(rowB.status, 'no-scratch', '目录在但没有 .scratch/ → 无产物行')
      assert.equal(rowB.current, false)
      assert.equal(rowB.stage, undefined, '无产物行不带链阶段')
      const rowC = ov.roots[2]
      assert.equal(rowC.status, 'unreadable', '路径其实是文件 → 不可读行（单坏不拖垮整窗）')
      // GET 不触碰常用目录排序：配置一个字节都不动
      assert.deepEqual(JSON.parse(await fs.readFile(ovCfg, 'utf8')).recentRoots, [ovRootA, ovNoScratch, nodePath.join(ovRootA, 'pretend-dir.md')])
      const ovForged = await rawHttp({ method: 'GET', url: ovServer.url + '/api/roots-overview', headers: { Host: 'evil.example.com' } })
      assert.equal(ovForged.status, 403, '伪造 Host 的总览请求 403')
    } finally {
      await new Promise((r) => ovServer.server.close(r))
    }
  } finally {
    await fs.rm(ovRootA, { recursive: true, force: true })
    await fs.rm(ovNoScratch, { recursive: true, force: true })
  }
  ok('项目总览端点：当前置顶、行字段（阶段/票计数/迷雾）齐；无 .scratch 与不可读分行标注不拖垮整窗；GET 不碰 recentRoots；Host 校验罩住')

  // 空常用目录清单：只有置顶的当前行
  const ovEmptyCfg = nodePath.join(tmp, 'config-ov-empty.json')
  const ovEmptyServer = await startServer({ root: tmp, port: 0, configPath: ovEmptyCfg })
  try {
    const ovE = await (await fetch(ovEmptyServer.url + '/api/roots-overview')).json()
    assert.deepEqual(ovE.roots.map((r) => [r.path, r.current, r.status]), [[nodePath.resolve(tmp), true, 'ok']])
  } finally {
    await new Promise((r) => ovEmptyServer.server.close(r))
  }
  ok('项目总览空清单：没有常用目录时只有置顶的当前目录一行')

  // opts.token（CLI --token 同路径）：令牌优先级高于 config.json 的空值
  const tokenOptServer = await startServer({ root: tmp, port: 0, configPath: tokenCfgPath, token: 'opt-2' })
  try {
    const optDenied = await fetch(tokenOptServer.url + '/api/state?token=sekrit-1')
    assert.equal(optDenied.status, 401, '命令行令牌覆盖配置里的令牌')
    const optOk = await fetch(tokenOptServer.url + '/api/state?token=opt-2')
    assert.equal(optOk.status, 200)
  } finally {
    await new Promise((r) => tokenOptServer.server.close(r))
  }
  ok('令牌参数：--token / opts.token 生效并覆盖 config.json 的令牌')

  // ── 设置服务端（settings-modal）：POST /api/config 扩字段逐字段校验；pollMs 手改即跟随；令牌热切换 ──
  const setCfgPath = nodePath.join(tmp, 'config-settings.json')
  await writeFile(setCfgPath, JSON.stringify({ root: tmp, pollMs: 5000, 说明: '整段保留' }))
  const setServer = await startServer({ port: 0, configPath: setCfgPath })
  try {
    // pollMs 跟随 config.json：手改文件，下一拍 /api/state 就换，不用重启
    await fs.writeFile(setCfgPath, JSON.stringify({ root: tmp, pollMs: 2500, 说明: '整段保留' }))
    let setState = await (await fetch(setServer.url + '/api/state')).json()
    assert.equal(setState.pollMs, 2500, '手改 config.json 的 pollMs 下一拍生效')
    await fs.writeFile(setCfgPath, JSON.stringify({ root: tmp, pollMs: 'abc', 说明: '整段保留' }))
    setState = await (await fetch(setServer.url + '/api/state')).json()
    assert.equal(setState.pollMs, 5000, '非法 pollMs 归一回默认')
    assert.equal(setState.pollMode, 'observe', 'pollMode 缺省 observe、随 /api/state 下发')
    assert.equal(setState.tokenEnabled, false, 'state 携带非机密的 tokenEnabled')
    assert.equal(setState.host, '127.0.0.1', 'state 携带运行值 host/port（设置表单初值）')
    assert.equal(typeof setState.port, 'number')

    // 逐字段 400：钳位下限、端口越界/非整数、host 空/非法字符、token 非字符串、pollMode 非法档位、全未知字段；一个都不写盘
    for (const bad of [{ pollMs: 999 }, { pollMs: 'x' }, { pollMode: 'sometimes' }, { port: 70000 }, { port: 1.5 }, { host: '   ' }, { host: 'bad host!' }, { token: 123 }, { 没这字段: 1 }]) {
      const r = await postJson(setServer.url + '/api/config', bad)
      assert.equal(r.status, 400, '非法字段应 400：' + JSON.stringify(bad))
    }
    assert.equal(JSON.parse(await fs.readFile(setCfgPath, 'utf8')).pollMs, 'abc', '全非法请求一个字都不写盘')

    // 合法保存：pollMs 即时、host/port 重启；写盘保留「说明」；响应 applied 给生效语义
    const savedOk = await postJson(setServer.url + '/api/config', { pollMs: 3000, host: '0.0.0.0', port: 4000 })
    assert.equal(savedOk.status, 200)
    assert.deepEqual(savedOk.data.applied, { pollMs: 'immediate', host: 'restart', port: 'restart' })
    const savedSet = JSON.parse(await fs.readFile(setCfgPath, 'utf8'))
    assert.equal(savedSet.pollMs, 3000)
    assert.equal(savedSet.host, '0.0.0.0')
    assert.equal(savedSet.port, 4000)
    assert.equal(savedSet['说明'], '整段保留')
    setState = await (await fetch(setServer.url + '/api/state')).json()
    assert.equal(setState.pollMs, 3000, 'pollMs 写盘后下一拍即生效')
    assert.equal(setState.host, '127.0.0.1', 'host 上报运行值：新值重启才接管')

    // ── pollMode 三档（票 06）：保存即时生效、随状态下发；display/manual 档同样可切 ──
    for (const mode of ['manual', 'display', 'observe']) {
      const ms = await postJson(setServer.url + '/api/config', { pollMode: mode })
      assert.equal(ms.status, 200, 'pollMode=' + mode + ' 保存成功')
      assert.deepEqual(ms.data.applied, { pollMode: 'immediate' }, 'pollMode 生效语义 immediate')
      const stMode = await (await fetch(setServer.url + '/api/state')).json()
      assert.equal(stMode.pollMode, mode, 'pollMode=' + mode + ' 下一拍即生效并随状态下发')
    }
    assert.equal(JSON.parse(await fs.readFile(setCfgPath, 'utf8')).pollMode, 'observe', 'pollMode 写进 config.json')

    // 令牌热切换：写盘即接管——无/旧令牌即刻 401、新令牌即刻可用；响应不含令牌值
    const tokSet = await postJson(setServer.url + '/api/config', { token: 'tok-beta' })
    assert.equal(tokSet.status, 200)
    assert.ok(!JSON.stringify(tokSet.data).includes('tok-beta'), '响应不含令牌值')
    assert.equal((await fetch(setServer.url + '/api/state')).status, 401)
    assert.equal((await fetch(setServer.url + '/api/state', { headers: { 'X-FlowDeck-Token': 'wrong' } })).status, 401)
    setState = await (await fetch(setServer.url + '/api/state', { headers: { 'X-FlowDeck-Token': 'tok-beta' } })).json()
    assert.equal(setState.tokenEnabled, true)
    // 清除令牌：空串恢复无鉴权（改令牌的请求本身带当令牌）
    const tokClear = await rawHttp({
      method: 'POST', url: setServer.url + '/api/config',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'X-FlowDeck-Token': 'tok-beta' },
      body: JSON.stringify({ token: '' }),
    })
    assert.equal(tokClear.status, 200)
    assert.equal((await fetch(setServer.url + '/api/state')).status, 200, '清除令牌后恢复无鉴权')
    assert.equal(JSON.parse(await fs.readFile(setCfgPath, 'utf8')).token, '')
  } finally {
    await new Promise((r) => setServer.server.close(r))
  }
  ok('设置服务端：POST /api/config 收 pollMs/host/port/token（逐字段校验、applied 生效语义、非法不写盘）；pollMs/令牌即时生效，host/port 重启生效')

  // ── 指引词服务端（custom-guides 票 02，ADR-0004）：guides 字段逐形状校验、immediate 生效、
  //    手改下一拍跟上、写盘保留旁注，且服务端只搬原值不参与拼装（「服务端不造字」的纪律）。──
  // 自建一个干净根目录：这一组要在真链格上验证「内置段没被拼进自定义段」，不能借别的用例的 tmp。
  const gdRoot = nodePath.join(tmp, 'guides-root')
  await fs.mkdir(nodePath.join(gdRoot, '.scratch', 'demo', 'issues'), { recursive: true })
  await writeFile(nodePath.join(gdRoot, '.scratch', 'demo', 'spec.md'), '# 规格\n\n一段内容。\n')
  const gdCfg = nodePath.join(tmp, 'config-guides.json')
  const gdBase = { 说明: '整段保留', 字段说明: { root: '要追踪的项目目录' }, root: gdRoot, guides: { implement: { zh: '手写的自定义中文段' } } }
  await writeFile(gdCfg, JSON.stringify(gdBase))
  const gdServer = await startServer({ root: gdRoot, port: 0, configPath: gdCfg })
  const gdRead = async () => (await fetch(gdServer.url + '/api/state')).json()
  try {
    let gdState = await gdRead()
    assert.deepEqual(gdState.guides, { implement: { zh: '手写的自定义中文段' } }, 'guides 随 /api/state 原值下发（服务端不拼装）')
    // 手改 config.json 下一拍生效：config 的 mtime+size 本就在指纹里，这条不靠新机制
    await fs.writeFile(gdCfg, JSON.stringify(Object.assign({}, gdBase, { guides: { implement: { zh: '手改之后的段' } } })))
    gdState = await gdRead()
    assert.equal(gdState.guides.implement.zh, '手改之后的段', '手改 config.json 的 guides 下一拍即生效')
    await fs.writeFile(gdCfg, JSON.stringify(Object.assign({}, gdBase, { guides: { implement: { zh: 42 } } })))
    gdState = await gdRead()
    assert.deepEqual(gdState.guides, {}, '手改写成坏形状回落空对象（读侧不抛也不整份丢弃）')

    // 逐形状 400：非对象、面不是对象、zh/en 不是字符串、面内多余键。结构非法整体拒，一个字都不写盘。
    await fs.writeFile(gdCfg, JSON.stringify(gdBase))
    const gdBefore = await fs.readFile(gdCfg, 'utf8')
    for (const bad of ['x', 123, null, [], { implement: 'x' }, { implement: [] }, { implement: { zh: 1 } }, { implement: { en: {} } }, { implement: { zh: 'ok', en: null } }, { implement: { zh: 'ok', bogus: 1 } }]) {
      const r = await postJson(gdServer.url + '/api/config', { guides: bad })
      assert.equal(r.status, 400, 'guides 结构非法应 400：' + JSON.stringify(bad))
      assert.equal(r.data.code, 'config.guides', '错误码稳定（界面按 code 措辞）')
    }
    assert.equal(await fs.readFile(gdCfg, 'utf8'), gdBefore, '全非法请求一个字都不写盘（连格式都不动）')

    // 合法保存：applied.immediate、写盘保留「说明」与「字段说明」、下一拍带上新值
    const gdOk = await postJson(gdServer.url + '/api/config', { guides: { implement: { zh: '新中文段', en: '' } } })
    assert.equal(gdOk.status, 200)
    assert.deepEqual(gdOk.data.applied, { guides: 'immediate' }, 'guides 生效语义 immediate（写盘即生效）')
    const gdSaved = JSON.parse(await fs.readFile(gdCfg, 'utf8'))
    assert.deepEqual(gdSaved.guides, { implement: { zh: '新中文段', en: '' } }, 'guides 写进 config.json')
    assert.equal(gdSaved['说明'], '整段保留', '写盘保留「说明」')
    assert.deepEqual(gdSaved['字段说明'], { root: '要追踪的项目目录' }, '写盘保留「字段说明」')
    gdState = await gdRead()
    assert.deepEqual(gdState.guides, { implement: { zh: '新中文段', en: '' } }, '写盘后下一拍 /api/state 就带上新值')

    // 「服务端不造字」：自定义段绝不进内置段。真链格上钉——内置段仍是服务端的原样推导结果。
    const gdImpl = gdState.efforts.find((e) => e.slug === 'demo').chain.stages.find((s) => s.id === 'implement')
    assert.doesNotMatch(gdImpl.copyText + gdImpl.en.copyText, /新中文段/, '自定义段不参与服务端拼装（内置段原样）')

    // 面名不写死：归一原样透传每一面（下一票把面数从一扩到五时服务端零改动）
    await postJson(gdServer.url + '/api/config', { guides: { implement: { zh: '甲' }, ticket: { zh: '乙' } } })
    assert.deepEqual((await gdRead()).guides, { implement: { zh: '甲' }, ticket: { zh: '乙' } }, '面名不写死原样透传（票行那面随票 03 接上，先存着不丢）')

    // 缺面与空串都合法——那正是「回落内置段」这一事实本身
    const gdEmpty = await postJson(gdServer.url + '/api/config', { guides: { implement: { zh: '' } } })
    assert.equal(gdEmpty.status, 200, '空串合法（= 回落内置段）')
    assert.deepEqual((await gdRead()).guides, { implement: { zh: '' } }, '空串原样下发，由界面按非空判定')
    assert.equal((await postJson(gdServer.url + '/api/config', { guides: { implement: {} } })).status, 200, '缺面合法')
    assert.equal((await postJson(gdServer.url + '/api/config', { guides: {} })).status, 200, '整份清空合法')
    assert.deepEqual((await gdRead()).guides, {}, '清空后载荷为空对象（出厂：五面全走内置段）')
  } finally {
    await new Promise((r) => gdServer.server.close(r))
  }
  ok('指引词服务端（custom-guides 02）：guides 逐形状校验（非法含面内多余键一律整体 400 且一个字不写盘、错误码稳定）、applied.immediate、手改 config 下一拍生效、写盘保留「说明」与「字段说明」、服务端只搬原值不参与拼装；面名不写死原样透传、缺面/空串/清空皆合法')

  // ── 错误码（english-ui 票 02）：JSON 错误响应带稳定 code，原人话照旧留着供日志 ──
  const codeCfg = nodePath.join(tmp, 'config-codes.json')
  await writeFile(codeCfg, JSON.stringify({ root: tmp, token: 'tok-code' }))
  const codeServer = await startServer({ port: 0, configPath: codeCfg })
  try {
    const CU = codeServer.url
    const cAuth = { 'X-FlowDeck-Token': 'tok-code' }
    /** 带令牌的 POST（postJson 不带令牌，而本夹具特意开着令牌走完整防护链）。 */
    const cPost = async (body) => {
      const r = await rawHttp({
        method: 'POST', url: CU + '/api/config',
        headers: Object.assign({ 'Content-Type': 'application/json', 'X-FlowDeck': '1' }, cAuth),
        body: JSON.stringify(body),
      })
      return JSON.parse(r.data)
    }
    const cGet = async (path) => JSON.parse(await (await fetch(CU + path, { headers: cAuth })).text())
    /** code 是稳定契约形状，error 仍是原人话（界面按 code 措辞、日志读 error）。
     *  逐字节红线的豁免面（双轴评审收口写明）：技能端点「不带 lang 响应逐字节不变」钉的是成功体；
     *  JSON 错误应答自票 02 起有意带 code——本组整组钉住这个形状，豁免不是漂移。 */
    const coded = (label, body, code) => {
      assert.equal(body.code, code, label + ' 应带稳定 code：' + JSON.stringify(body))
      assert.match(String(body.code), /^[a-z]+\.[a-z-]+$/, 'code 命名法：域.名字')
      assert.ok(/[\u4e00-\u9fff]/.test(String(body.error)), label + ' 原文人话保留供日志：' + body.error)
    }
    coded('无令牌 401', JSON.parse(await (await fetch(CU + '/api/state')).text()), 'auth.token-required')
    coded('pollMs 非法', await cPost({ pollMs: 10 }), 'config.poll-ms')
    coded('pollMode 非法', await cPost({ pollMode: 'often' }), 'config.poll-mode')
    coded('host 非法', await cPost({ host: 'bad host' }), 'config.host')
    coded('port 非法', await cPost({ port: 70000 }), 'config.port')
    coded('token 非字符串', await cPost({ token: 7 }), 'config.token')
    coded('root 空', await cPost({ root: '   ' }), 'config.root-empty')
    coded('root 不存在', await cPost({ root: '/tmp/fd-根本没这个目录-codes' }), 'config.root-missing')
    coded('没有可保存字段', await cPost({ 没这字段: 1 }), 'config.no-fields')
    coded('删除空路径', JSON.parse((await rawHttp({
      method: 'POST', url: CU + '/api/recent-roots',
      headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'X-FlowDeck-Token': 'tok-code' },
      body: JSON.stringify({ remove: '' }),
    })).data), 'roots.remove-empty')
    coded('伪造 Host', JSON.parse((await rawHttp({ method: 'GET', url: CU + '/api/state', headers: { Host: 'evil.example' } })).data), 'host.forbidden')
    coded('票参数畸形', await cGet('/api/issue?effort=..%2F..&ticket=abc'), 'issue.bad-params')
    coded('无此 effort', await cGet('/api/issue?effort=no-such-effort&ticket=01'), 'issue.no-effort')
    coded('无此票', await cGet('/api/issue?effort=idea-b&ticket=99'), 'issue.no-ticket')
    coded('技能名不合法', await cGet('/api/skills/bad%zz-name'), 'skills.no-doc')
    // 文件名合法但篇目不存在：走 sendFile 的纯文本 404，不在 JSON 错误通道里（界面按 HTTP 状态措辞）
    const missDoc = await fetch(CU + '/api/skills/no-such-skill-doc', { headers: cAuth })
    assert.equal(missDoc.status, 404)
    assert.match(missDoc.headers.get('content-type') || '', /text\/plain/, '缺篇目仍是纯文本 404（sendFile 通道）')
    // 成功应答不带 code（code 是错误通道的字段，不污染正常载荷）
    assert.equal((await cGet('/api/state')).code, undefined, '成功响应不带 code')
    // 阶段名表随载荷下发（双轴评审收口）：zh 列 = FLOW_STAGES title/subtitle，en 列 = titleEn/subtitleEn
    const stNames = (await cGet('/api/state')).stageNames
    assert.deepEqual(stNames.map((s) => s.id), ['grill', 'spec', 'tickets', 'implement'], 'stageNames 四阶段齐、次序即链序')
    assert.deepEqual(stNames.map((s) => s.title), FLOW_STAGES.map((f) => f.title), 'stageNames zh 列 = FLOW_STAGES 单一表')
    assert.deepEqual(stNames.map((s) => s.subtitle), FLOW_STAGES.map((f) => f.subtitle), 'stageNames 副题 zh 列同源')
    assert.deepEqual(stNames.map((s) => s.en.title), FLOW_STAGES.map((f) => f.titleEn), 'stageNames en 列 = FLOW_STAGES 英文列')
    assert.deepEqual(stNames.map((s) => s.en.subtitle), FLOW_STAGES.map((f) => f.subtitleEn), 'stageNames 副题 en 列同源')
    // 未知路径走纯文本通道，不参与 code 契约（界面不消费，见 server.mjs 分发层）
    const plain404 = await fetch(CU + '/api/nope-unknown', { headers: cAuth })
    assert.match(plain404.headers.get('content-type') || '', /text\/plain/, '未知路径仍是纯文本')
    // 坏 JSON 与超大体：防护层先应答，两道都有自己的 code
    const noHeader = await fetch(CU + '/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FlowDeck-Token': 'tok-code' }, body: '{}',
    })
    coded('缺防跨站写头', await noHeader.json(), 'write.header')
    const badJson = await fetch(CU + '/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'X-FlowDeck-Token': 'tok-code' }, body: '{',
    })
    coded('坏 JSON', await badJson.json(), 'write.bad-json')
    const tooBig = await fetch(CU + '/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FlowDeck': '1', 'X-FlowDeck-Token': 'tok-code' }, body: 'x'.repeat(30721),
    })
    coded('超大请求体', await tooBig.json(), 'write.too-large')
  } finally {
    await new Promise((r) => codeServer.server.close(r))
  }
  ok('错误码：/api/* 的 JSON 错误应答一律带稳定 code（写头/超大/坏 JSON/伪造 Host/令牌/配置逐字段/票与技能 404），error 原文照旧供日志，成功应答不带 code')


  // ── 收录边界：上限淘汰最久未用；CLI --root 启动是临时覆盖，不收录 ──
  const crowdCfgPath = nodePath.join(tmp, 'config-crowd.json')
  const crowdList = []
  for (let i = 0; i < RECENT_ROOTS_LIMIT; i++) crowdList.push('/tmp/fd-crowd-' + String(i).padStart(2, '0'))
  await writeFile(crowdCfgPath, JSON.stringify({ root: '/tmp/fd-没有这个目录', recentRoots: crowdList }))
  const crowdServer = await startServer({ port: 0, configPath: crowdCfgPath })
  try {
    const sw = await postJson(crowdServer.url + '/api/config', { root: tmp })
    assert.equal(sw.status, 200)
    const savedCrowd = JSON.parse(await fs.readFile(crowdCfgPath, 'utf8'))
    assert.equal(savedCrowd.recentRoots.length, RECENT_ROOTS_LIMIT)
    assert.equal(savedCrowd.recentRoots[0], nodePath.resolve(tmp))
    assert.equal(savedCrowd.recentRoots[RECENT_ROOTS_LIMIT - 1], '/tmp/fd-crowd-' + String(RECENT_ROOTS_LIMIT - 2).padStart(2, '0'))
    ok('收录上限：手写满 ' + RECENT_ROOTS_LIMIT + ' 条后切换，新目录进头部、最久未用的尾部被淘汰')
  } finally {
    await new Promise((r) => crowdServer.server.close(r))
  }

  const cliCfgPath = nodePath.join(tmp, 'config-根本没建.json')
  const cliServer = await startServer({ root: tmp, port: 0, configPath: cliCfgPath })
  try {
    const stCli = await (await fetch(cliServer.url + '/api/state')).json()
    assert.deepEqual(stCli.recentRoots, [])
    assert.equal(existsSync(cliCfgPath), false)
    ok('--root 启动不收录：CLI 临时覆盖不写 recentRoots，也不凭空建配置文件')
  } finally {
    await new Promise((r) => cliServer.server.close(r))
  }

  // ── CLI 参数防护：吞值/缺值清晰报错退出；正常传参（含相对 --config）不受影响 ──
  const cliSwallow = await runCli(['--root', '--port', '4321'])
  assert.equal(cliSwallow.code, 1)
  assert.match(cliSwallow.err, /--root/, '报错要点名是哪个参数缺值')
  const cliMissing = await runCli(['--root'])
  assert.equal(cliMissing.code, 1)
  assert.match(cliMissing.err, /--root/)
  const cliTail = await runCli(['--port', '3999', '--host'])
  assert.equal(cliTail.code, 1)
  assert.match(cliTail.err, /--host/)

  const cliOk = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nodePath.join(HERE, 'server.mjs'), '--config', 'cli-ok.json', '--port', '0'], { cwd: tmp, stdio: ['ignore', 'pipe', 'inherit'] })
    const timer = setTimeout(() => { p.kill(); reject(new Error('CLI 子进程 15 秒内没启动完')) }, 15000)
    let buf = ''
    p.stdout.on('data', (d) => {
      buf += d
      const m = /流程板已启动：(http:\/\/\S+)/.exec(buf)
      if (m) { clearTimeout(timer); resolve({ url: m[1], proc: p }) }
    })
    p.on('close', (code) => { clearTimeout(timer); reject(new Error('CLI 子进程提前退出，code=' + code)) })
  })
  try {
    const cliHealth = await (await fetch(cliOk.url + '/api/health')).json()
    // macOS 上 os.tmpdir() 是 /var/... 符号链接，子进程的 cwd 是物理路径，得按 realpath 对
    assert.equal(cliHealth.root, await fs.realpath(tmp), '--config 相对路径按 cwd 解析，root 默认回落 cwd')
  } finally {
    cliOk.proc.kill()
  }
  ok('CLI 参数防护：--root --port 4321、末尾缺值、--host 吞值都报错退出 1；正常传参照常启动（--config 支持相对路径）')

  // ── 界面运行时烟雾验证：用 jsdom 把 index.html 真正跑起来 ──
  let JSDOM = null
  try { JSDOM = (await import('jsdom')).JSDOM } catch {}
  if (!JSDOM) {
    console.log('  ⊘ 跳过界面运行时验证（未安装 jsdom）')
  } else {
    const { VirtualConsole } = await import('jsdom')
    const html = await fs.readFile(nodePath.join(HERE, 'index.html'), 'utf8')
    const tick = () => new Promise((r) => setTimeout(r, 40))
    /* 界面夹具工厂：界面初始语言按浏览器语言判定，而 jsdom 的 navigator.languages 默认就是
       ['en-US','en']——既有中文态用例经此钉成中文浏览器，否则它们悄悄测的就不再是中文界面。
       要英文态（或别的浏览器语言）的用例在自家 beforeParse 里覆写 languages，后跑者胜。 */
    function uiDom(opts) {
      const inner = opts.beforeParse
      return new JSDOM(html, Object.assign({}, opts, {
        beforeParse(window) {
          Object.defineProperty(window.navigator, 'languages', { value: ['zh-CN', 'zh'], configurable: true })
          if (inner) inner(window)
        },
      }))
    }
    /** fetch 桩的路由器（双轴评审收口：语言/壳/内容几处夹具的同形手写桩收成一处）：
        routes = 有序 [ [匹配串, 应答器(url, opts)] ]，String(url).indexOf(匹配串) 命中即交应答器——
        更具体的路由放前面（'/api/skills/' 要在 '/api/skills' 之前）；全不中即 reject，
        界面不该请求别的接口。onCall 想记请求就传。 */
    function fetchRouter(routes, label, onCall) {
      return (u, opts) => {
        const url = String(u)
        if (onCall) onCall(url, opts)
        for (const [match, reply] of routes) {
          if (url.indexOf(match) >= 0) return reply(url, opts)
        }
        return Promise.reject(new Error(label + '：' + u))
      }
    }
    /** 桩应答的响应头：apiFetch 读 X-FlowDeck-Doc-Lang 决定「暂无英文」标注、读 ETag 复验。 */
    const docHeaders = (docLang) => ({ get: (k) => (String(k).toLowerCase() === 'x-flowdeck-doc-lang' ? docLang : '') })
    /** 服务端阶段名表的夹具镜像（server.mjs STAGE_NAMES 同构）：随 /api/state 下发，
        界面的通知与项目总览阶段名从这里取——测试自己用 FLOW_STAGES 拼，不抄字面量。 */
    const STAGE_TABLE = FLOW_STAGES.map((f) => ({ id: f.id, title: f.title, subtitle: f.subtitle, en: { title: f.titleEn, subtitle: f.subtitleEn } }))
    const absTmp = nodePath.resolve(tmp)
    // 盘点载荷：真实扫描数据 + 常用目录（当前目录在列表里，另有一条存在的、两条失效的）
    let statePayload = {
      ...ws, pollMs: 5000, configPath: '/tmp/config.json', root: absTmp, stageNames: STAGE_TABLE,
      recentRoots: [
        { path: absTmp, exists: true },
        { path: '/tmp/fd-proj-alpha', exists: true },
        { path: '/tmp/fd-gone-1', exists: false },
        { path: '/tmp/fd-gone-2', exists: false },
      ],
    }
    // 给 idea-b 的 01 票注上格式警告：真扫描的票没有警告，"!" 徽标走注数据验证
    statePayload.efforts.find((e) => e.slug === 'idea-b').tickets[0].formatWarnings = [
      { kind: 'unrecognizedField', line: '*Status:* done', message: '有一行像是字段行但没读懂（原文：*Status:* done）' },
    ]
    const jsErrors = []
    const vc = new VirtualConsole()
    vc.on('jsdomError', (e) => jsErrors.push(String((e && e.message) || e)))
    const calls = []
    const dom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39311/',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(window) {
        window.fetch = (u, opts) => {
          const url = String(u)
          calls.push({ url, opts })
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(statePayload)) })
          }
          // 切换与删除按服务端语义回应：切换即收录移顶，删除即返回剩余列表
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            const root = JSON.parse(opts.body).root
            statePayload = { ...statePayload, root, recentRoots: [{ path: root, exists: true }].concat(statePayload.recentRoots.filter((r) => r.path !== root)) }
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, root }) })
          }
          if (url.indexOf('/api/recent-roots') >= 0 && opts && opts.method === 'POST') {
            const removed = JSON.parse(opts.body).remove
            statePayload = { ...statePayload, recentRoots: statePayload.recentRoots.filter((r) => r.path !== removed) }
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, recentRoots: statePayload.recentRoots }) })
          }
          return Promise.reject(new Error('界面不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const doc = dom.window.document
    const win = dom.window
    const input = doc.getElementById('newTabPath')
    const newTabBtn = doc.getElementById('newTabBtn')
    const menu = doc.getElementById('rootMenu')
    const opts = () => Array.from(doc.querySelectorAll('#rootMenu .opt'))
    const postCalls = () => calls.filter((c) => c.opts && c.opts.method === 'POST')
    const key = (k) => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    const openNewTab = () => newTabBtn.dispatchEvent(new win.Event('click', { bubbles: true }))

  // 默认选中第一个 effort（__root）：地图干净 → grill 完成，当前步是 spec
  assert.equal(doc.querySelectorAll('#tabs button').length, 6, '5 个 effort + 尾部「全部」伪条目')
    const stageEls = doc.querySelectorAll('.stage')
    assert.equal(stageEls.length, 4)
    assert.match(stageEls[0].className, /done/)
    assert.match(stageEls[1].className, /current/)
    assert.match(doc.querySelector('.next .txt').textContent, /to-spec/)
    // 切到 idea-b：两张票、implement 是当前步
    const tabs = Array.from(doc.querySelectorAll('#tabs button'))
    tabs.find((btn) => btn.textContent.indexOf('idea-b') === 0).dispatchEvent(new win.Event('click'))
    assert.match(doc.querySelector('.next .txt').textContent, /Blocked by 为空的票/)
    assert.equal(doc.querySelectorAll('tr.ticket').length, 2)
    assert.match(doc.querySelectorAll('.stage')[3].className, /current/)
    assert.ok(doc.querySelector('tr.ticket .warn'), '带 formatWarnings 的票应在标题旁亮 "!" 徽标')
    assert.match(doc.querySelector('tr.ticket .warn').title, /\*Status:\* done/, '徽标 tooltip 应给出原文行')

    // ── 「更新于」按本地时区显示：服务端出 UTC ISO 串，旧实现直接切片会差出一个时区（如 UTC+8 慢 8 小时）──
    const bTicket = ws.efforts.find((e) => e.slug === 'idea-b').tickets[0]
    const bd = new Date(bTicket.updatedAt)
    const pad2 = (n) => String(n).padStart(2, '0')
    const expectLocal = bd.getFullYear() + '-' + pad2(bd.getMonth() + 1) + '-' + pad2(bd.getDate()) + ' ' + pad2(bd.getHours()) + ':' + pad2(bd.getMinutes())
    assert.equal(doc.querySelectorAll('tr.ticket')[0].children[6].textContent, expectLocal, '「更新于」应为本地时区格式化的时间')
    if (bd.getTimezoneOffset() !== 0) {
      assert.notEqual(doc.querySelectorAll('tr.ticket')[0].children[6].textContent, bTicket.updatedAt.slice(0, 16).replace('T', ' '), '非 UTC 时区下不得直接展示 UTC 串切片')
    }

    // ── 后向推定标注：切到 only-spec（无 map 有 spec），Grill 格推定完成并亮「推定 · 无 map」──
    // 标签页按钮在 render() 里整体重建，点击后旧引用脱挂，必须现查现用
    const tabBtn = (name) => Array.from(doc.querySelectorAll('#tabs button')).find((btn) => btn.textContent.indexOf(name) === 0)
    tabBtn('only-spec').dispatchEvent(new win.Event('click'))
    const infStages = doc.querySelectorAll('.stage')
    assert.match(infStages[0].className, /done/)
    assert.equal(infStages[0].querySelector('.chip.infer').textContent, '推定 · 无 map')
    assert.equal(infStages[1].querySelectorAll('.chip.infer').length, 0, 'spec 实证完成不标推定')
    assert.match(doc.querySelector('.next .txt').textContent, /to-tickets/)
    tabBtn('idea-b').dispatchEvent(new win.Event('click'))
    assert.equal(doc.querySelectorAll('.stage .chip.infer').length, 0, '全实证 effort 无任何推定标注')

    // ── 开新标签菜单：顶栏按钮点开；当前追踪目录置顶标示（主行目录名、次行全路径），纯展示不写回 ──
    assert.equal(postCalls().length, 0, '没动下拉之前不该有任何写请求')
    openNewTab()
    await tick()
    assert.equal(menu.hasAttribute('hidden'), false, '点「＋ 开新标签」应展开常用目录下拉')
    assert.equal(opts().length, 4)
    assert.equal(opts()[0].querySelector('.main').textContent.indexOf(nodePath.basename(absTmp)), 0)
    assert.equal(opts()[0].querySelector('.sub').textContent, absTmp)
    assert.ok(opts()[0].querySelector('.chip.cur'), '当前追踪目录应有「当前」标示')
    assert.equal(opts().filter((o) => o.className.indexOf('missing') >= 0).length, 2)
    assert.ok(opts()[2].textContent.indexOf('目录不存在') >= 0, '失效条目应标注「目录不存在」')
    const cfgPostsBeforeMissingClick = postCalls().filter((c) => c.url.indexOf('/api/config') >= 0).length
    opts().find((o) => o.querySelector('.sub').textContent === '/tmp/fd-gone-2').dispatchEvent(new win.Event('click', { bubbles: true }))
    await tick()
    assert.equal(postCalls().filter((c) => c.url.indexOf('/api/config') >= 0).length, cfgPostsBeforeMissingClick, '置灰条目点了不该发起切换')
    assert.equal(menu.hasAttribute('hidden'), false, '点置灰条目也不该关下拉')
    ok('开新标签菜单：顶栏按钮点开；当前目录置顶标示；主行目录名、次行全路径；失效条目置灰标注且不可点选')

    // ── ✕ 即删即生效：删掉失效条目，菜单原地更新、不关闭 ──
    const gone1 = opts().find((o) => o.querySelector('.sub').textContent === '/tmp/fd-gone-1')
    gone1.querySelector('.del').dispatchEvent(new win.Event('click', { bubbles: true }))
    await tick()
    assert.equal(postCalls().filter((c) => c.url.indexOf('/api/recent-roots') >= 0).length, 1)
    assert.equal(JSON.parse(postCalls().find((c) => c.url.indexOf('/api/recent-roots') >= 0).opts.body).remove, '/tmp/fd-gone-1')
    assert.equal(menu.hasAttribute('hidden'), false)
    assert.equal(opts().length, 3)
    assert.ok(!opts().some((o) => o.querySelector('.sub').textContent === '/tmp/fd-gone-1'))
    ok('常用目录删除：点 ✕ 立即 POST 删除并按返回列表原地刷新，无确认弹窗')

    // ── 输入过滤：全路径子串、不区分大小写；无匹配有自己的空态 ──
    input.value = 'ALPHA'
    input.dispatchEvent(new win.Event('input', { bubbles: true }))
    assert.equal(opts().length, 1)
    assert.equal(opts()[0].querySelector('.sub').textContent, '/tmp/fd-proj-alpha')
    input.value = 'zzz-没有这种目录'
    input.dispatchEvent(new win.Event('input', { bubbles: true }))
    assert.equal(opts().length, 0)
    assert.ok(menu.textContent.indexOf('没有匹配') >= 0)
    input.value = ''
    input.dispatchEvent(new win.Event('input', { bubbles: true }))
    assert.equal(opts().length, 3)
    ok('常用目录过滤：输入按全路径子串过滤（不区分大小写），无匹配时给出空态文案')

    // ── 键盘：↑↓ 移动高亮；Enter 选中即开卡；高亮在失效条目上时回落为按路径框内容开新标签 ──
    assert.ok(opts()[0].className.indexOf('hl') >= 0)
    key('ArrowDown')
    key('ArrowDown')
    assert.ok(opts()[2].className.indexOf('hl') >= 0)
    const postsBeforeEnter = postCalls().length
    key('Enter')
    assert.equal(postCalls().length, postsBeforeEnter, '路径框为空时 Enter 不发起开卡')
    // 输入的新路径没有匹配条目：Enter 仍按路径框内容开新标签（老行为不回归）
    input.value = '/tmp/fd-typed-new'
    input.dispatchEvent(new win.Event('input', { bubbles: true }))
    assert.equal(opts().length, 0)
    key('Enter')
    await tick()
    assert.equal(JSON.parse(postCalls().filter((c) => c.url.indexOf('/api/config') >= 0).pop().opts.body).root, '/tmp/fd-typed-new')
    openNewTab()
    await tick()
    input.value = '/tmp/fd-proj-alpha'
    input.dispatchEvent(new win.Event('input', { bubbles: true }))
    key('Enter')
    await tick()
    const cfgPosts = postCalls().filter((c) => c.url.indexOf('/api/config') >= 0)
    assert.equal(JSON.parse(cfgPosts.pop().opts.body).root, '/tmp/fd-proj-alpha')
    assert.equal(menu.hasAttribute('hidden'), true, '选中即开卡后收起菜单')
    assert.match(doc.getElementById('meta').textContent, /fd-proj-alpha/)
    ok('开新标签菜单键盘操作：↑↓ 移动高亮，Enter 选中立即开卡并切过去；高亮失效或无匹配时回落为按路径框开新标签')

    // ── 点选即开卡：重开菜单（路径框已持有焦点，focus 不会再派发事件，用点击展开），直接点一条 ──
    input.dispatchEvent(new win.Event('click', { bubbles: true }))
    await tick()
    assert.equal(opts().length, 4, '切换后当前目录仍在置顶，被删的条目不再回来')
    assert.ok(opts()[0].querySelector('.chip.cur'))
    const alphaOpt = opts().find((o) => o.querySelector('.sub').textContent === '/tmp/fd-proj-alpha')
    alphaOpt.dispatchEvent(new win.Event('click', { bubbles: true }))
    await tick()
    assert.equal(JSON.parse(postCalls().filter((c) => c.url.indexOf('/api/config') >= 0).pop().opts.body).root, '/tmp/fd-proj-alpha')
    ok('常用目录点选：点一条立即为它开卡（复用同一条换根请求）')

    // ── 轮询刷新不打扰：菜单开着、焦点在路径框，后台刷新（无用户点击）后两者都保住，数据还更新了 ──
    input.focus()
    input.dispatchEvent(new win.Event('click', { bubbles: true }))
    await tick()
    assert.equal(menu.hasAttribute('hidden'), false)
    statePayload.recentRoots.push({ path: '/tmp/fd-proj-beta', exists: true })
    doc.dispatchEvent(new win.Event('visibilitychange'))
    await tick()
    assert.equal(menu.hasAttribute('hidden'), false, '后台刷新不应关闭展开的菜单')
    assert.equal(doc.activeElement, input, '后台刷新不应抢走路径框焦点')
    assert.ok(opts().some((o) => o.querySelector('.sub').textContent === '/tmp/fd-proj-beta'), '刷新后的新数据应进入下拉')

    key('Escape')
    assert.equal(menu.hasAttribute('hidden'), true, 'Esc 应关闭菜单')
    assert.deepEqual(jsErrors, [])
    dom.window.close()
    ok('开新标签菜单轮询共存：刷新不关闭菜单、不抢焦点，新数据照常进来；Esc 关闭')

    // ── 空列表场景：只有置顶的当前目录 + 引导文案，纯展示不写回 ──
    const jsErrors2 = []
    const vc2 = new VirtualConsole()
    vc2.on('jsdomError', (e) => jsErrors2.push(String((e && e.message) || e)))
    const unexpectedWrites = []
    const emptyDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39312/',
      pretendToBeVisual: true,
      virtualConsole: vc2,
      beforeParse(window) {
        window.fetch = (u) => {
          if (String(u).indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify({ ...ws, root: '/tmp/fd-手改配置的目录', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          unexpectedWrites.push(String(u))
          return Promise.reject(new Error('空列表场景不该有写请求：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const eDoc = emptyDom.window.document
    eDoc.getElementById('newTabBtn').dispatchEvent(new emptyDom.window.Event('click', { bubbles: true }))
    await tick()
    assert.equal(eDoc.querySelectorAll('#rootMenu .opt').length, 1, '空列表时只有置顶的当前目录')
    assert.ok(eDoc.getElementById('rootMenu').textContent.indexOf('切换过的目录会出现在这里') >= 0)
    assert.deepEqual(unexpectedWrites, [])
    assert.deepEqual(jsErrors2, [])
    emptyDom.window.close()
    ok('常用目录空态：当前目录置顶展示但不写回，空列表显示「切换过的目录会出现在这里」')

    // ── 界面令牌：URL 带 ?token= 打开 → 记忆到 localStorage、抹掉地址栏令牌、请求自动带头 ──
    const jsErrors3 = []
    const vc3 = new VirtualConsole()
    vc3.on('jsdomError', (e) => jsErrors3.push(String((e && e.message) || e)))
    const tokenCalls = []
    const tokenDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39313/?token=t-123',
      pretendToBeVisual: true,
      virtualConsole: vc3,
      beforeParse(window) {
        window.fetch = (u, opts) => {
          const url = String(u)
          tokenCalls.push({ url, opts })
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify({ ...ws, root: '/tmp/fd-token', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          return Promise.reject(new Error('令牌场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const stateCall = tokenCalls.find((c) => c.url.indexOf('/api/state') >= 0)
    assert.ok(stateCall, '令牌场景下 /api/state 应被请求')
    assert.equal(stateCall.opts.headers['X-FlowDeck-Token'], 't-123', '请求应自动携带 URL 里收到的令牌')
    assert.equal(tokenDom.window.localStorage.getItem('flowdeck-token'), 't-123', '令牌应记忆到 localStorage')
    assert.equal(tokenDom.window.location.search, '', '地址栏里的令牌应被抹掉')
    assert.deepEqual(jsErrors3, [])
    tokenDom.window.close()
    ok('界面令牌：URL ?token= 打开即记忆并随请求携带，地址栏抹净')

    // ── 双层短路（前端半边）：首拍收 ETag，后续拍带 If-None-Match；304 空身不重解析、不报错 ──
    const jsErrors304 = []
    const vc304 = new VirtualConsole()
    vc304.on('jsdomError', (e) => jsErrors304.push(String((e && e.message) || e)))
    let etagCalls304 = 0
    const etagHeaderBox = { get: (k) => (k === 'ETag' ? '"etag-304-test"' : null) }
    const etagDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39316/',
      pretendToBeVisual: true,
      virtualConsole: vc304,
      beforeParse(window) {
        window.fetch = (u, opts) => {
          const url = String(u)
          if (url.indexOf('/api/state') < 0) return Promise.reject(new Error('304 场景不该请求别的接口：' + u))
          etagCalls304++
          if (etagCalls304 === 1) {
            return Promise.resolve({ ok: true, status: 200, headers: etagHeaderBox, json: async () => JSON.parse(JSON.stringify({ ...ws, root: '/tmp/fd-etag', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          assert.equal((opts && opts.headers && opts.headers['If-None-Match']) || '', '"etag-304-test"', '第二拍起应带 If-None-Match（首拍收到的 ETag）')
          return Promise.resolve({ ok: false, status: 304, headers: etagHeaderBox, text: async () => '' })
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const e3Doc = etagDom.window.document
    const tabsBefore = e3Doc.querySelectorAll('#tabs button').length
    e3Doc.dispatchEvent(new etagDom.window.Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 60))
    assert.equal(etagCalls304, 2, '回前台即刷触发第二拍')
    assert.equal(e3Doc.querySelectorAll('#tabs button').length, tabsBefore, '304 拍界面数据保持（本地 state 即最新）')
    assert.match(e3Doc.getElementById('meta').textContent, /已刷新/, '304 拍照常更新「已刷新」时间')
    assert.deepEqual(jsErrors304, [])
    etagDom.window.close()
    ok('前端 304：首拍收 ETag 记忆，后续拍带 If-None-Match；304 空身不重解析、无报错、界面照常')

    // ── apiFetch 归一（票 05）：POST 遇 401 由服务端泛文案升级为定向提示（含 ?token= 补救指引）──
    const jsErrors401 = []
    const vc401 = new VirtualConsole()
    vc401.on('jsdomError', (e) => jsErrors401.push(String((e && e.message) || e)))
    const unauthDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39317/',
      pretendToBeVisual: true,
      virtualConsole: vc401,
      beforeParse(window) {
        window.fetch = (u, opts) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify({ ...ws, root: '/tmp/fd-unauth', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            return Promise.resolve({ ok: false, status: 401, json: async () => ({ error: '需要有效的访问令牌：URL 加 ?token=… 或请求头 X-FlowDeck-Token。' }) })
          }
          return Promise.reject(new Error('401 场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const uDoc = unauthDom.window.document
    const uWin = unauthDom.window
    const uNewTab = uDoc.getElementById('newTabBtn')
    uNewTab.dispatchEvent(new uWin.Event('click', { bubbles: true }))
    await tick()
    const uField = uDoc.getElementById('newTabPath')
    uField.value = '/tmp/fd-switch-target' // 不匹配任何常用目录 → Enter 走「按路径框内容开新标签」
    uField.dispatchEvent(new uWin.Event('input', { bubbles: true }))
    uField.dispatchEvent(new uWin.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 60))
    assert.match(uDoc.getElementById('err').textContent, /换目录失败：需要访问令牌/, 'POST 401 显示定向文案（不走服务端泛文案）')
    assert.match(uDoc.getElementById('err').textContent, /\?token=/, '定向文案带 ?token= 补救指引')
    assert.equal(uNewTab.disabled, false, '失败后按钮恢复可用')
    assert.deepEqual(jsErrors401, [])
    unauthDom.window.close()
    ok('apiFetch 归一：POST 错令牌拿到定向 401 提示（含 ?token= 补救指引），按钮状态恢复')

    // ── 轮询模式三档（票 06）：惰性档常驻徽标 + 零自动请求 + 操作后自动一拍；切档随状态下发 ──
    const jsErrorsMode = []
    const vcMode = new VirtualConsole()
    vcMode.on('jsdomError', (e) => jsErrorsMode.push(String((e && e.message) || e)))
    let modePayload = { ...ws, root: '/tmp/fd-mode', pollMs: 1000, pollMode: 'manual', configPath: '/tmp/config.json', recentRoots: [] }
    const modeCalls = { state: 0, post: 0 }
    const modeDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39318/',
      pretendToBeVisual: true,
      virtualConsole: vcMode,
      beforeParse(window) {
        window.fetch = (u, opts) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            modeCalls.state++
            return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(modePayload)) })
          }
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            modeCalls.post++
            return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, root: '/tmp/fd-mode-b' }) })
          }
          return Promise.reject(new Error('模式场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const mDoc = modeDom.window.document
    const mWin = modeDom.window
    const badge = mDoc.getElementById('manualBadge')
    assert.equal(badge.hidden, false, '惰性档常驻徽标可见')
    assert.match(badge.textContent, /^手动模式 · \d\d:\d\d:\d\d 盘点$/, '徽标给「手动模式 · HH:MM:SS 盘点」')
    assert.equal(modeCalls.state, 1, '首载一拍')
    await new Promise((r) => setTimeout(r, 1300)) // pollMs=1000：若仍有自动轮询，这里早该多出请求
    assert.equal(modeCalls.state, 1, '惰性档零自动请求（过了 pollMs 周期也没有新请求）')
    // 状态变更操作（开新标签）完成后自动刷一拍
    mDoc.getElementById('newTabBtn').dispatchEvent(new mWin.Event('click', { bubbles: true }))
    const mField = mDoc.getElementById('newTabPath')
    mField.value = '/tmp/fd-mode-b'
    mField.dispatchEvent(new mWin.Event('input', { bubbles: true }))
    mField.dispatchEvent(new mWin.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 120))
    assert.equal(modeCalls.state, 2, '开新标签成功后自动补一拍')
    assert.match(badge.textContent, /盘点$/, '补拍后徽标盘点时间更新')
    // 别处改成观测档 → 本浏览器手动刷新一拍即跟随（无轮询所致的已知边角，记档）
    modePayload = { ...modePayload, pollMode: 'observe' }
    mDoc.getElementById('refreshBtn').dispatchEvent(new mWin.Event('click', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 120))
    assert.equal(modeCalls.state, 3)
    assert.equal(badge.hidden, true, '切回观测档徽标隐藏')
    assert.deepEqual(jsErrorsMode, [])
    modeDom.window.close()
    ok('轮询模式（惰性档）：常驻「手动模式 · 盘点」徽标、零自动请求、状态变更操作后自动一拍；手动刷新即跟随服务端档位')

    // ── 观测档停表与回台即刷：不可见期间零请求；回前台立即一拍 ──
    const jsErrorsObs = []
    const vcObs = new VirtualConsole()
    vcObs.on('jsdomError', (e) => jsErrorsObs.push(String((e && e.message) || e)))
    let obsPayload = { ...ws, root: '/tmp/fd-obs', pollMs: 1000, pollMode: 'observe', configPath: '/tmp/config.json', recentRoots: [] }
    const obsCalls = { state: 0 }
    const obsDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39319/',
      pretendToBeVisual: true,
      virtualConsole: vcObs,
      beforeParse(window) {
        window.fetch = (u) => {
          if (String(u).indexOf('/api/state') >= 0) {
            obsCalls.state++
            return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(obsPayload)) })
          }
          return Promise.reject(new Error('观测档场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const oDoc = obsDom.window.document
    const oWin = obsDom.window
    assert.equal(obsCalls.state, 1, '首载一拍')
    Object.defineProperty(oDoc, 'hidden', { value: true, configurable: true })
    oDoc.dispatchEvent(new oWin.Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 1300)) // pollMs=1000：观测档不可见期间不该有任何请求
    assert.equal(obsCalls.state, 1, '不可见期间零请求（观测档停表）')
    Object.defineProperty(oDoc, 'hidden', { value: false, configurable: true })
    oDoc.dispatchEvent(new oWin.Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 120))
    assert.equal(obsCalls.state, 2, '回前台立即补一拍')
    assert.deepEqual(jsErrorsObs, [])
    obsDom.window.close()
    ok('轮询模式（观测档）：页面不可见零请求（停表），回前台立即一拍')

    // ── a11y 三层（票 07）：键盘层、兜底层、播报层、弹窗焦点圈禁 ──
    const jsErrorsA = []
    const vcA = new VirtualConsole()
    vcA.on('jsdomError', (e) => jsErrorsA.push(String((e && e.message) || e)))
    const copiesA = []
    const postsA = []
    let a11yPayload = JSON.parse(JSON.stringify({
      ...ws, pollMs: 5000, configPath: '/tmp/config.json', root: '/tmp/fd-a11y',
      recentRoots: [{ path: '/tmp/fd-a11y', exists: true }, { path: '/tmp/fd-a11y-old', exists: true }, { path: '/tmp/fd-gone-a', exists: false }],
    }))
    a11yPayload.efforts.find((e) => e.slug === 'idea-b').tickets[0].formatWarnings = [
      { kind: 'unrecognizedField', line: '*Status:* done', message: '有一行像是字段行但没读懂（原文：*Status:* done）' },
    ]
    const a11yDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39320/',
      pretendToBeVisual: true,
      virtualConsole: vcA,
      beforeParse(window) {
        // 剪贴板打桩：copyText 的成功路径走 navigator.clipboard（jsdom 没有，注入）
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { copiesA.push(t); return Promise.resolve() } } })
        window.fetch = (u, opts) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(a11yPayload)) })
          }
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            postsA.push(JSON.parse(opts.body))
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: JSON.parse(opts.body).root }) })
          }
          return Promise.reject(new Error('a11y 场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const aDoc = a11yDom.window.document
    const aWin = a11yDom.window
    const aKey = (target, k, shift) => target.dispatchEvent(new aWin.KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true, cancelable: true }))
    const aTab = (name) => Array.from(aDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf(name) === 0)

    // 切到 idea-b：有一张带格式警告的进行中票
    aTab('idea-b').dispatchEvent(new aWin.Event('click'))

    // 播报层：toast 是礼貌播报区、错误横幅是 alert——属性在位，改文即出声
    assert.equal(aDoc.getElementById('toast').getAttribute('aria-live'), 'polite', 'toast 应为 aria-live=polite')
    assert.equal(aDoc.getElementById('err').getAttribute('role'), 'alert', '错误横幅应为 role=alert')

    // 键盘层：票行 focus 后 Enter 触发复制（与 click 同一处理）；Space 同款
    const aRow = aDoc.querySelectorAll('tr.ticket')[0]
    assert.equal(aRow.getAttribute('tabindex'), '0', '进行中的票行应可 Tab 停留')
    assert.equal(aRow.getAttribute('role'), 'button')
    aRow.focus()
    assert.equal(aDoc.activeElement, aRow, '票行可聚焦')
    aKey(aRow, 'Enter')
    await tick()
    assert.equal(copiesA.length, 1, 'focus 后 Enter 触发复制')
    assert.match(copiesA[0], /请实现票 01/)
    assert.match(copiesA[0], /01-index-core/)
    // 逐字钉 `git switch -c` 已随 branch-discipline 撤销（custom-guides 01 / ADR-0004），
    // 这里改钉规则：使用者真正复制到的那串字里不得有 git 措辞。文件级规则管的是词表字面量，
    // 这一条管拼装后的结果——模板里再拼进去也能兜住。
    assert.doesNotMatch(copiesA[0], /\bgit\b/, '票行复制词零 git 措辞（custom-guides 01）')
    assert.doesNotMatch(copiesA[0], /合回|merge back/, '票行复制词不提合并（回归防护：合并是 effort 级动作，防重新织入）')
    aKey(aRow, ' ')
    await tick()
    assert.equal(copiesA.length, 2, 'Space 与 Enter 同一处理')
    assert.match(aDoc.getElementById('toast').textContent, /已复制/, '复制成功经 aria-live 区播报')

    // 兜底层：票行与 "!" 徽标的 aria-label 同载警告原文（title 仍是鼠标福利）
    assert.match(aRow.getAttribute('aria-label'), /警告：.*\*Status:\* done/, '票行 aria-label 载警告原文')
    assert.equal(aRow.querySelector('.warn').getAttribute('role'), 'img')
    assert.match(aRow.querySelector('.warn').getAttribute('aria-label'), /警告：.*\*Status:\* done/, '徽标 aria-label 载警告原文')

    // 键盘层 + 兜底层：链格可 Tab 停留、Enter 复制本格指引词；aria-label 同载状态与指引全文
    const aStages = aDoc.querySelectorAll('.stage')
    assert.equal(aStages[3].getAttribute('tabindex'), '0', '链格应可 Tab 停留')
    assert.equal(aStages[3].getAttribute('role'), 'button')
    assert.match(aStages[3].getAttribute('aria-label'), /Blocked by 为空的票/, '链格 aria-label 载指引全文')
    assert.equal(aStages[3].querySelector('.dot').getAttribute('aria-hidden'), 'true', '指引点是装饰（状态已进链格 aria-label）')
    aStages[3].focus()
    aKey(aStages[3], 'Enter')
    await tick()
    assert.match(copiesA[copiesA.length - 1], /Blocked by 为空的票/, '链格 Enter 复制本格指引词')
    assert.doesNotMatch(copiesA[copiesA.length - 1], /\bgit\b/, '链格复制词零 git 措辞（custom-guides 01）')

    // 推定含义不再只藏悬停：推定链格的 aria-label 与推定徽标都载说明
    aTab('only-spec').dispatchEvent(new aWin.Event('click'))
    const inferStage = aDoc.querySelectorAll('.stage')[0]
    assert.match(inferStage.getAttribute('aria-label'), /推定 · 无 map：此格不是由本阶段产物证成/, '链格 aria-label 载推定含义')
    assert.match(inferStage.querySelector('.chip.infer').getAttribute('aria-label'), /推定 · 无 map：/, '推定徽标 aria-label 载推定含义')

    // 键盘层：下拉项可 Tab 停留、Enter 触发开卡；失效条目不可点也不进 Tab 序
    aDoc.getElementById('newTabBtn').dispatchEvent(new aWin.Event('click', { bubbles: true }))
    await tick()
    const aOpts = Array.from(aDoc.querySelectorAll('#rootMenu .opt'))
    assert.equal(aOpts[0].getAttribute('tabindex'), '0', '可点下拉项可 Tab 停留')
    assert.equal(aOpts[0].getAttribute('role'), 'button')
    assert.equal(aOpts[2].getAttribute('tabindex'), null, '失效条目不进 Tab 序')
    aOpts[1].focus()
    aKey(aOpts[1], 'Enter')
    await tick()
    assert.equal(postsA.length, 1, '下拉项 focus 后 Enter 发起开卡')
    assert.equal(postsA[0].root, '/tmp/fd-a11y-old')
    assert.equal(aDoc.getElementById('rootMenu').hasAttribute('hidden'), true, 'Enter 开卡后收起菜单')

    // 焦点圈禁（makeModal 第六件）：弹窗内 Tab 循环不外逃。
    // 选择器必须与 makeModal 里的那份同集（button/[href]/input/select/textarea/[tabindex]）——
    // 少写一个元素类型，新控件就静默逃出覆盖：加指引词的 textarea 时正是漏在这里（票 02 必改项）。
    //
    // 「同集」与「圈内」分两步钉：面下拉一开窗是空态、未选面时两个 textarea 是 disabled 的，
    // 拿「此刻可聚焦的那些」去断言覆盖面会被空态骗过去（控件明明在，只是暂时不可点），
    // 于是覆盖面用未过滤的 querySelectorAll 断言，圈内只对 enabled 的做圈禁往返。
    aDoc.getElementById('settingsBtn').dispatchEvent(new aWin.Event('click', { bubbles: true }))
    await tick()
    const setBox = aDoc.getElementById('settingsModal')
    assert.ok(setBox.contains(aDoc.activeElement), '开窗即把焦点放进弹窗')
    const focusables = Array.from(setBox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    const focusIn = () => focusables.filter((n) => !n.disabled && !n.closest('[hidden]'))
    assert.deepEqual(
      Array.from(setBox.querySelectorAll('button, input, select, textarea')),
      focusables, '选择器与 makeModal 的那份同集（票 03：面下拉与两个 textarea 都得落在圈禁覆盖内）')
    assert.ok(focusables.some((n) => n.id === 'setGuidesZh') && focusables.some((n) => n.id === 'setGuidesEn'), '指引词两个 textarea 在焦点序里（选择器没漏 textarea）')
    assert.ok(focusables.some((n) => n.id === 'setGuidesFace'), '面下拉也在焦点序里')
    const firstF = focusIn()[0]
    const lastF = focusIn()[focusIn().length - 1]
    aKey(lastF, 'Tab')
    assert.equal(aDoc.activeElement, firstF, '最后一个元素上 Tab 圈回第一个（不外逃）')
    aKey(firstF, 'Tab', true)
    assert.equal(aDoc.activeElement, lastF, '第一个元素上 Shift+Tab 圈回最后一个（不外逃）')
    aKey(aDoc.activeElement, 'Escape')
    assert.equal(setBox.hasAttribute('hidden'), true, 'Esc 关闭弹窗')
    assert.deepEqual(jsErrorsA, [])
    a11yDom.window.close()
    ok('a11y 三层：票行/链格/下拉项 focus 后 Enter（Space）触发同 click 的复制与切换；aria-label 同载推定含义、警告原文、指引全文；toast aria-live 与 err role=alert 在位；弹窗内 Tab 圈禁不外逃')

    // ── 票查证三件（票 01）：票正文弹窗（懒加载/快照/字段行剥除）、档位 chip 过滤、git 旁证行 ──
    const jsErrorsFx = []
    const vcFx = new VirtualConsole()
    vcFx.on('jsdomError', (e) => jsErrorsFx.push(String((e && e.message) || e)))
    const fxTickets = [
      { key: '01', fileName: '01-a.md', title: '查证票', state: 'open', status: 'needs-triage', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
      { key: '02', fileName: '02-b.md', title: '认领中的票', state: 'open', status: 'claimed', claimedBy: '@me', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
      { key: '03', fileName: '03-c.md', title: '可开工票', state: 'open', status: 'ready-for-agent', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
      { key: '04', fileName: '04-d.md', title: '已关票', state: 'closed', status: 'resolved', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
    ]
    let fxPayload = {
      root: '/tmp/fd-forensics', rootName: 'fd-forensics', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 5000, pollMode: 'observe', configPath: '/tmp/config.json', recentRoots: [],
      efforts: [
        {
          slug: 'tiers', title: '档位过滤',
          map: { exists: true, title: '', destination: '终点', fog: [], decisions: [], outOfScope: [], fogCount: 0, progress: null, formatWarnings: [] },
          spec: { exists: true, title: '', contentLength: 10, content: '# 规格', formatWarnings: [] },
          git: { hash: 'abc1234', date: new Date(Date.now() - 3600 * 1000).toISOString(), subject: '修了一刀' },
          tickets: fxTickets,
          chain: deriveChain({ slug: 'tiers', map: { exists: true, destination: '终点', fogCount: 0 }, spec: { exists: true, contentLength: 10 }, tickets: fxTickets }),
        },
        {
          slug: 'nogit', title: '无旁证',
          map: { exists: true, title: '', destination: '终点2', fog: [], decisions: [], outOfScope: [], fogCount: 0, progress: null, formatWarnings: [] },
          spec: { exists: false, title: '', contentLength: 0, content: '', formatWarnings: [] },
          git: null,
          tickets: [],
          chain: deriveChain({ slug: 'nogit', map: { exists: true, destination: '终点2', fogCount: 0 } }),
        },
      ],
    }
    let issueStubText = ['# 查证票', 'Status: ready-for-agent', 'Type: task', '', '正文第一段。', '', '## Comments', '', '### alice—2026-09-16T10:30:00Z', '', '评论正文。'].join('\n')
    const fxCopies = []
    const fxDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39321/',
      pretendToBeVisual: true,
      virtualConsole: vcFx,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { fxCopies.push(t); return Promise.resolve() } } })
        window.fetch = (u) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(fxPayload)) })
          }
          if (url.indexOf('/api/issue') >= 0) {
            return Promise.resolve({ ok: true, status: 200, text: async () => issueStubText })
          }
          return Promise.reject(new Error('票查证场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const fDoc = fxDom.window.document
    const fWin = fxDom.window

    // git 旁证行：有值渲染（短哈希 + 相对时间 + 标题），null 整块消失
    assert.ok(fDoc.querySelector('.gitline'), '带 git 旁证的 effort 卡片有一行')
    assert.match(fDoc.querySelector('.gitline').textContent, /abc1234/, '短哈希入行')
    assert.match(fDoc.querySelector('.gitline').textContent, /1 小时前/, '相对时间入行')
    assert.match(fDoc.querySelector('.gitline').textContent, /修了一刀/, '标题入行')
    Array.from(fDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf('nogit') === 0).dispatchEvent(new fWin.Event('click'))
    assert.equal(fDoc.querySelectorAll('.gitline').length, 0, 'git 为 null 时整块不渲染（零占位零报错）')
    Array.from(fDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf('tiers') === 0).dispatchEvent(new fWin.Event('click'))

    // 档位 chip 过滤：六档在位；点亮=只看该档（已关闭不参与）、再点回全量；过滤态经轮询重画保持
    assert.equal(fDoc.querySelectorAll('.tierchip').length, 6, '六档 chip 在位')
    const chipOf = (id) => Array.from(fDoc.querySelectorAll('.tierchip')).find((c) => c.textContent.indexOf(id) === 0)
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 4, '默认全量四行')
    chipOf('claimed').dispatchEvent(new fWin.Event('click'))
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 1, '点亮 claimed 只看该档')
    assert.equal(fDoc.querySelector('tr.ticket .key').textContent, '02')
    assert.match(chipOf('claimed').className, /on/, '点亮态有 on 类')
    assert.equal(chipOf('claimed').getAttribute('aria-pressed'), 'true', 'chip 用 aria-pressed 表达开关态')
    // 轮询重画（同数据）不丢过滤态：手动一拍走 refresh 的签名跳过路径
    fDoc.getElementById('refreshBtn').dispatchEvent(new fWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 1, '刷新后过滤态保持')
    chipOf('claimed').dispatchEvent(new fWin.Event('click'))
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 4, '再点同档回全量')
    chipOf('needs-triage').dispatchEvent(new fWin.Event('click'))
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 1, 'needs-triage 档只有 01')
    assert.equal(fDoc.querySelector('tr.ticket .key').textContent, '01')
    chipOf('needs-triage').dispatchEvent(new fWin.Event('click'))
    assert.equal(fDoc.querySelectorAll('tr.ticket').length, 4)

    // 票正文弹窗：查看按钮打开（拦住行点击的复制）、懒加载原文、字段行剥除、Comments 成节、快照语义。
    // 查看按钮是原生 <button>：Enter/Space → click 是浏览器默认键盘行为（jsdom 的合成 keydown
    // 不模拟该默认，故此处验证「可聚焦 + 点击路径」，键盘层由原生语义保证）。
    const viewBtn = fDoc.querySelector('tr.ticket button')
    viewBtn.focus()
    assert.equal(fDoc.activeElement, viewBtn, '查看按钮可聚焦（键盘可达）')
    viewBtn.dispatchEvent(new fWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(fDoc.getElementById('readModal').hasAttribute('hidden'), false, '点查看打开弹窗')
    assert.deepEqual(fxCopies, [], '点查看不得触发票行的复制指引')
    assert.equal(fDoc.getElementById('readTitle').textContent, '查证票', '弹窗标题 = 票标题')
    assert.match(fDoc.getElementById('readMeta').textContent, /issues\/01-a\.md/, '元信息带票文件路径')
    assert.match(fDoc.getElementById('readMeta').textContent, /更新于/, '元信息带更新时间')
    const fxDoc1 = fDoc.getElementById('readDoc')
    assert.ok(fxDoc1.textContent.indexOf('正文第一段') >= 0, '正文渲染')
    assert.ok(fxDoc1.textContent.indexOf('评论正文') >= 0, 'Comments 正文渲染')
    assert.ok(fxDoc1.textContent.indexOf('Status:') < 0, '机器字段行不裸露（裸写剥除）')
    assert.ok(fxDoc1.textContent.indexOf('Type:') < 0, 'Type 字段行剥除')
    assert.ok(fxDoc1.textContent.indexOf('alice') >= 0, '评论作者成节')
    // 快照语义：stub 换新原文 + 手动刷新，弹窗内容不动
    issueStubText = issueStubText.replace('正文第一段', '正文被改了')
    fDoc.getElementById('refreshBtn').dispatchEvent(new fWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.ok(fDoc.getElementById('readDoc').textContent.indexOf('正文第一段') >= 0, '打开时刻快照：后台刷新不改弹窗内容')
    fDoc.dispatchEvent(new fWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(fDoc.getElementById('readModal').hasAttribute('hidden'), true, 'Esc 关闭票正文弹窗')
    assert.equal(fDoc.activeElement, viewBtn, '关闭后焦点归还查看按钮')
    assert.deepEqual(jsErrorsFx, [])
    fxDom.window.close()
    ok('票查证（jsdom）：档位 chip 过滤/取消/轮询保持/aria-pressed；查看按钮键盘可达且不误触行复制；票正文弹窗懒加载、字段行剥除、Comments 成节、快照语义')

    // ── 纵览一屏（票 02）：全部视图两组制与折叠记忆、行点击切换、徽标计数、面板跳转 ──
    const mkEffort = (slug, title, latestAt, fog, tickets, extraMap) => ({
      slug, title, latestAt,
      map: { exists: true, title: '', destination: '终点-' + slug, fog: [], decisions: [], outOfScope: [], fogCount: fog, progress: null, formatWarnings: [], ...(extraMap || {}) },
      spec: { exists: true, title: '', contentLength: 10, content: '# 规格', formatWarnings: [] },
      git: null,
      tickets,
      chain: deriveChain({ slug, map: { exists: true, destination: '终点-' + slug, fogCount: fog }, spec: { exists: true, contentLength: 10 }, tickets }),
    })
    const tk = (key, over) => Object.assign({ key, fileName: key + '-x.md', title: '票' + key, state: 'open', status: 'ready-for-agent', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' }, over)
    const allPayload = {
      root: '/tmp/fd-all', rootName: 'fd-all', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 5000, pollMode: 'observe', configPath: '/tmp/config.json', recentRoots: [],
      efforts: [
        mkEffort('alpha', '热的', new Date(Date.now() - 7200e3).toISOString(), 2, [
          tk('01'),                       // 前沿：空依赖未认领
          tk('02', { blockedBy: ['01'] }), // 依赖未结 → 非前沿
          tk('03', { blockedBy: ['99'] }), // 幽灵依赖 → 非前沿（不误判为可干）
        ]),
        mkEffort('beta', '温的', new Date(Date.now() - 2 * 86400e3).toISOString(), 0, [
          tk('01', { status: 'claimed', claimedBy: '@me' }), // 已认领 → 非前沿
        ]),
        mkEffort('gamma', '完了', '2026-09-10T00:00:00Z', 0, [tk('01', { state: 'closed', status: 'resolved' })]),
        mkEffort('delta', '也完了', '2026-09-09T00:00:00Z', 0, [tk('01', { state: 'closed', status: 'resolved' })]),
      ],
    }
    // gamma/delta 要真「完工」：四格全绿（票全关），mkEffort 的通用链重算一遍即可（closed 票在 tickets 里）
    const jsErrorsAll = []
    const vcAll = new VirtualConsole()
    vcAll.on('jsdomError', (e) => jsErrorsAll.push(String((e && e.message) || e)))
    const allDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39322/',
      pretendToBeVisual: true,
      virtualConsole: vcAll,
      beforeParse(window) {
        window.fetch = () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(allPayload)) })
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const ovDoc = allDom.window.document
    const ovWin = allDom.window
    const tabBtn2 = (name) => Array.from(ovDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf(name) === 0)

    // 徽标：全局迷雾总数 + 前沿票总数（跨 effort 聚合；前沿只有 alpha#01）
    const badge2 = ovDoc.getElementById('frontierBadge')
    assert.equal(badge2.hidden, false, '有 effort 时徽标常驻')
    assert.equal(badge2.textContent, '迷雾 2 · 前沿 1', '迷雾 2（alpha）+ 前沿 1（alpha#01；认领/依赖/幽灵都不算）')

    // 面板：按 effort 分组列前沿票；票行点击切到所属 effort、面板收起
    badge2.dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.equal(ovDoc.getElementById('frontierPanel').hasAttribute('hidden'), false, '点徽标开面板')
    assert.equal(ovDoc.querySelectorAll('#frontierPanel .fgroup').length, 1, '只有 alpha 有前沿票（一个分组）')
    assert.equal(ovDoc.querySelectorAll('#frontierPanel .fticket').length, 1)
    assert.match(ovDoc.querySelector('#frontierPanel .fticket').textContent, /#01/)
    assert.equal(ovDoc.querySelector('#frontierPanel .fticket').getAttribute('tabindex'), '0', '面板票行可 Tab 停留')
    ovDoc.querySelector('#frontierPanel .fticket').dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.equal(ovDoc.getElementById('frontierPanel').hasAttribute('hidden'), true, '点票行收起面板')
    assert.match(tabBtn2('alpha').className, /on/, '票行点击切到所属 effort')
    assert.match(ovDoc.querySelector('#main .card h2').textContent, /热的/, '主区渲染该 effort 的链卡（alpha 的标题）')

    // 全部视图：两组制——进行中按最近活跃倒序在前、完工折叠成一行计数
    tabBtn2('全部').dispatchEvent(new ovWin.Event('click'))
    const rows2 = () => Array.from(ovDoc.querySelectorAll('#main tr.effortrow'))
    assert.equal(rows2().length, 2, '完工默认折叠：只有两张进行中行')
    assert.equal(rows2()[0].querySelector('.name').textContent, 'alpha', '最新活跃（2 小时前）排第一')
    assert.equal(rows2()[1].querySelector('.name').textContent, 'beta', '两天前的 beta 随后')
    assert.match(rows2()[0].children[5].textContent, /小时前/, '最近活跃列给相对时间')
    const doneRow = ovDoc.querySelector('#main tr.donegroup')
    assert.ok(doneRow, '完工折叠行在位')
    assert.match(doneRow.textContent, /2 个/, '折叠行给计数')
    assert.equal(doneRow.getAttribute('aria-expanded'), 'false', '折叠态用 aria-expanded 表达')

    // 展开：完工明细行出现（完工组内也按最近活跃倒序：gamma 在 delta 前），偏好落 localStorage
    doneRow.dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.equal(rows2().length, 4, '展开后四张 effort 行')
    assert.equal(rows2()[2].querySelector('.name').textContent, 'gamma', '完工组按最近活跃倒序（gamma 09-10 > delta 09-09）')
    assert.equal(allDom.window.localStorage.getItem('flowdeck-all-done-collapsed'), '0', '展开偏好写入 localStorage')

    // 行点击 = 既有 effort 切换（零新机制）
    rows2()[1].dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.match(tabBtn2('beta').className, /on/, '全部视图行点击切到 beta')

    // 「显示完工」开关：关掉后完工组整块消失；再开回（上次的展开偏好仍记得）
    tabBtn2('全部').dispatchEvent(new ovWin.Event('click'))
    Array.from(ovDoc.querySelectorAll('#main .cardhead button')).find((b) => b.textContent === '隐藏完工').dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.equal(ovDoc.querySelectorAll('#main tr.donegroup').length, 0, '关掉后完工组整块不渲染')
    assert.equal(rows2().length, 2)
    assert.equal(allDom.window.localStorage.getItem('flowdeck-all-show-done'), '0', '开关偏好写入 localStorage')
    Array.from(ovDoc.querySelectorAll('#main .cardhead button')).find((b) => b.textContent === '显示完工').dispatchEvent(new ovWin.Event('click', { bubbles: true }))
    assert.equal(ovDoc.querySelectorAll('#main tr.donegroup').length, 1, '再开回完工组（上次的展开偏好生效，明细行直接在）')
    assert.equal(rows2().length, 4)
    assert.deepEqual(jsErrorsAll, [])
    allDom.window.close()
    ok('全部视图（jsdom）：两组排序（最近活跃倒序）、完工折叠一行计数/展开、显示完工开关、两偏好落 localStorage、行点击=既有切换；徽标计数跨 effort 聚合、面板分组列前沿票、票行点击直达所属 effort')

    // 偏好读取路径：新开的浏览器带着「不显示完工」的记忆，首渲染即无完工组
    const jsErrorsAll2 = []
    const vcAll2 = new VirtualConsole()
    vcAll2.on('jsdomError', (e) => jsErrorsAll2.push(String((e && e.message) || e)))
    const allDom2 = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39323/',
      pretendToBeVisual: true,
      virtualConsole: vcAll2,
      beforeParse(window) {
        window.localStorage.setItem('flowdeck-all-show-done', '0')
        window.localStorage.setItem('flowdeck-all-done-collapsed', '0')
        window.fetch = () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(allPayload)) })
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const aDoc2 = allDom2.window.document
    const aWin2 = allDom2.window
    Array.from(aDoc2.querySelectorAll('#tabs button')).find((b) => b.textContent === '全部').dispatchEvent(new aWin2.Event('click'))
    assert.equal(aDoc2.querySelectorAll('tr.donegroup').length, 0, '记忆「不显示完工」：完工组不渲染')
    assert.equal(aDoc2.querySelectorAll('tr.effortrow').length, 2)
    assert.deepEqual(jsErrorsAll2, [])
    allDom2.window.close()
    ok('全部视图偏好读取：localStorage 记忆跨会话生效（不显示完工 + 展开态）')

    // ── 切换条减负（票 01）：完工 effort 收进「✓ 完工 (n)」折叠入口，零写、纯显示偏好 ──
    // 夹具形态照抄「全部视图」那一组：同载荷（alpha/beta 进行中，gamma/delta 四格全绿）、
    // 同一个 uiDom + fetch 桩，不同的是这里盯 #tabs 本身。零写一并钉在桩上：折叠点来点去
    // 一个写请求都不许发（.scratch/ 与 config.json 都得一个字节不动）。
    const jsErrorsFold = []
    const vcFold = new VirtualConsole()
    vcFold.on('jsdomError', (e) => jsErrorsFold.push(String((e && e.message) || e)))
    const foldFetches = []
    const foldDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39324/',
      pretendToBeVisual: true,
      virtualConsole: vcFold,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } })
        window.fetch = (u, opts) => {
          foldFetches.push({ url: String(u), method: (opts && opts.method) || 'GET' })
          return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(allPayload)) })
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const foDoc = foldDom.window.document
    const foWin = foldDom.window
    // 折叠入口按 aria-expanded 认（展开态是它对外的契约，不靠内部类名认门）
    const foldToggle = () => foDoc.querySelector('#tabs button[aria-expanded]')
    const foldTabs = () => Array.from(foDoc.querySelectorAll('#tabs button')).map((b) => b.textContent)

    // 默认收起：进行中平铺在前，折叠入口垫在「全部」之前，完工 effort 一个 tab 都不露
    assert.deepEqual(foldTabs(), ['alpha', 'beta', '✓ 完工 (2)', '全部'], '收起态：进行中在前、折叠入口、纵览垫底')
    assert.ok(!foldTabs().some((x) => x.indexOf('gamma') === 0 || x.indexOf('delta') === 0), '收起态不渲染任何完工 tab')
    assert.equal(foldToggle().getAttribute('aria-expanded'), 'false', '折叠态如实用 aria-expanded=false')
    assert.ok(foldToggle().getAttribute('aria-label'), '折叠入口带 aria-label（目标与展开态都读得到）')
    // 词条里带 {n} 槽的一律走填槽取词：t() 原样吐占位符，真浏览器实拍撞出来的洞（标题挂着一句
    // 「展开这 {n} 个完工 effort」）。两态的 title 都得是填好的整句。
    for (const attr of ['title', 'aria-label']) {
      assert.doesNotMatch(foldToggle().getAttribute(attr), /\{/, '折叠入口的 ' + attr + ' 不残留未填的占位符')
    }
    assert.match(foldToggle().getAttribute('title'), /2/, '折叠态 title 带折叠内的计数')
    assert.equal(foldToggle().tagName, 'BUTTON', '折叠入口是原生 button（可 Tab 到达、Enter/Space 有默认键盘行为）')
    foldToggle().focus()
    assert.equal(foDoc.activeElement, foldToggle(), '折叠入口可聚焦（键盘可达）')

    // 展开：两个完工 tab 落在折叠入口之后、「全部」之前；切换即时重画；零写
    const beforeFetches = foldFetches.length
    foldToggle().dispatchEvent(new foWin.Event('click', { bubbles: true }))
    assert.deepEqual(foldTabs(), ['alpha', 'beta', '✓ 完工 (2)', 'gamma ✓', 'delta ✓', '全部'], '展开态：完工 tab 排在折叠入口之后、纵览之前')
    assert.equal(foldToggle().getAttribute('aria-expanded'), 'true', '展开后 aria-expanded 翻成 true')
    assert.doesNotMatch(foldToggle().getAttribute('title'), /\{/, '展开态 title 同样不残留未填的占位符')
    assert.equal(foldFetches.length, beforeFetches, '折叠/展开是纯显示偏好：一个写请求都不发')
    assert.deepEqual(foldFetches.filter((f) => f.method !== 'GET'), [], '全程零写请求')

    // 展开态是会话内变量：数据没变的轮询不得把它悄悄收回去
    foDoc.getElementById('refreshBtn').dispatchEvent(new foWin.Event('click', { bubbles: true }))
    await tick(); await tick()
    assert.deepEqual(foldTabs(), ['alpha', 'beta', '✓ 完工 (2)', 'gamma ✓', 'delta ✓', '全部'], '数据不变的刷新后展开态仍在（态进渲染签名）')

    // 收起：再点一次即回默认形态
    foldToggle().dispatchEvent(new foWin.Event('click', { bubbles: true }))
    assert.deepEqual(foldTabs(), ['alpha', 'beta', '✓ 完工 (2)', '全部'], '再点一次收起')

    // 选中项例外：选中的恰是完工 effort 时它的 tab 照常显示、不被折叠波及；计数只数折叠里那几个。
    // 入口取自「全部」视图——从那里点进一个已完工 effort，正是这条路径。
    Array.from(foDoc.querySelectorAll('#tabs button')).find((b) => b.textContent === '全部').dispatchEvent(new foWin.Event('click', { bubbles: true }))
    foDoc.querySelector('#main tr.donegroup').dispatchEvent(new foWin.Event('click', { bubbles: true })) // 先展开纵览的完工组，才点得到 gamma 那行
    Array.from(foDoc.querySelectorAll('#main tr.effortrow')).find((tr) => tr.querySelector('.name').textContent === 'gamma')
      .dispatchEvent(new foWin.Event('click', { bubbles: true }))
    // 计数报的是全部完工 effort，不是折叠里那几个：那个数回答「一共完工了几个」，不随
    // 「正看着哪一个」跳动（故事 2 要的是这份安心）。折叠里还有一个 delta，gamma 平铺在旁。
    assert.deepEqual(foldTabs(), ['alpha', 'beta', 'gamma ✓', '✓ 完工 (2)', '全部'], '选中的完工 effort 照常平铺，计数仍是全部完工数（2，不因平铺一个而变 1）')
    assert.match(foldToggle().getAttribute('title'), /^展开这 1 个完工 effort$/, 'title 数的是折叠里实际会展开的那几个')
    assert.match(foDoc.querySelector('#main .card h2').textContent, /完了/, '主区与 tab 一致（gamma 的链卡）')
    // 切走才收：换一个进行中的 effort，gamma 回到折叠里
    Array.from(foDoc.querySelectorAll('#tabs button')).find((b) => b.textContent === 'beta').dispatchEvent(new foWin.Event('click', { bubbles: true }))
    assert.deepEqual(foldTabs(), ['alpha', 'beta', '✓ 完工 (2)', '全部'], '切走后 gamma 收回折叠入口，计数回到 2')

    // 双语：英文态折叠入口换词（切换本身零请求）
    foDoc.getElementById('langBtn').dispatchEvent(new foWin.Event('click', { bubbles: true }))
    assert.ok(foldTabs().some((x) => x.indexOf('✓ Done (2)') === 0), '英文态折叠入口换文案（✓ Done (2)）')
    assert.ok(foldToggle().getAttribute('aria-label').indexOf('中文') < 0, '英文态 aria-label 随语言翻')
    assert.ok(foldToggle().getAttribute('aria-label').length > 0, '英文态 aria-label 非空')
    foDoc.getElementById('langBtn').dispatchEvent(new foWin.Event('click', { bubbles: true }))
    assert.deepEqual(jsErrorsFold, [])
    const foldKeys = Object.keys(foldDom.window.localStorage)
    assert.ok(!foldKeys.some((k) => k.indexOf('done') >= 0 && k.indexOf('all') < 0), '切换条折叠不新增 localStorage 键（刷新回落收起），现有键：' + foldKeys.join(','))

    // 刷新回落：另开一个浏览器（无记忆），折叠态回到收起——收起是常态、展开是偶发
    const jsErrorsFold2 = []
    const vcFold2 = new VirtualConsole()
    vcFold2.on('jsdomError', (e) => jsErrorsFold2.push(String((e && e.message) || e)))
    const foldDom2 = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39325/',
      pretendToBeVisual: true,
      virtualConsole: vcFold2,
      beforeParse(window) {
        window.fetch = () => Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(allPayload)) })
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const foDoc2 = foldDom2.window.document
    assert.deepEqual(Array.from(foDoc2.querySelectorAll('#tabs button')).map((b) => b.textContent), ['alpha', 'beta', '✓ 完工 (2)', '全部'], '新会话首渲染即收起（展开态不落盘）')
    assert.deepEqual(jsErrorsFold2, [])
    // 只剩一个完工 effort 时没有可折叠的东西：不渲染折叠入口（那枚「✓ 完工 (0)」按钮
    // 是噪音——选中项例外已经把那一个平铺出来了）
    const onlyDone = JSON.parse(JSON.stringify(allPayload))
    onlyDone.efforts = [allPayload.efforts[2]]
    const jsErrorsFold3 = []
    const vcFold3 = new VirtualConsole()
    vcFold3.on('jsdomError', (e) => jsErrorsFold3.push(String((e && e.message) || e)))
    const foldDom3 = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39326/',
      pretendToBeVisual: true,
      virtualConsole: vcFold3,
      beforeParse(window) {
        window.fetch = () => Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(onlyDone)) })
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const foDoc3 = foldDom3.window.document
    assert.deepEqual(Array.from(foDoc3.querySelectorAll('#tabs button')).map((b) => b.textContent), ['gamma ✓', '全部'], '只有选中项一个完工 effort：没有折叠入口，平铺出来')
    assert.equal(foDoc3.querySelector('#tabs button[aria-expanded]'), null, '折叠内空无一物时不渲染入口')
    assert.deepEqual(jsErrorsFold3, [])
    // 文件级：展开态是主区渲染的一个输入，得进签名——否则某条别的路重画主区时会按收起的
    // 形态重建切换条，把用户刚展开的列表又吞回去（jsdom 钉不到这条：点按走的是直接 render()）
    const sigBody = deckHtml.slice(deckHtml.indexOf('function mainRenderSignature'), deckHtml.indexOf('function snapshotScrolls'))
    assert.match(sigBody, /doneFoldOpen/, '展开态进了主区渲染签名')
    foldDom.window.close()
    foldDom2.window.close()
    foldDom3.window.close()
    ok('切换条完工折叠（jsdom + 文件级）：按 chain.complete 分组（进行中平铺在前、完工收进折叠入口、纵览垫底）、计数文案中英双语、折叠入口可 Tab 到达且 aria-expanded 如实、展开/收起即时重画、选中项例外（选中的完工 effort 照常平铺、切走才收）、无可折叠者时不渲染入口、展开态进渲染签名且刷新回落收起、零写请求')

    // ── 项目总览弹窗（票 03 + 票 01 收编）：打开才单拍、坏行标注、行与行内按钮都开为标签页 ──
    const jsErrorsOv = []
    const vcOv = new VirtualConsole()
    vcOv.on('jsdomError', (e) => jsErrorsOv.push(String((e && e.message) || e)))
    const ovCalls = { overview: 0 }
    const ovPosts = []
    const ovRowsPayload = {
      roots: [
        { path: '/tmp/fd-ov-cur', name: 'fd-ov-cur', current: true, status: 'ok', stage: 'implement', efforts: 2, tickets: 3, closed: 1, fog: 2 },
        { path: '/tmp/fd-ov-next', name: 'fd-ov-next', current: false, status: 'ok', stage: 'grill', tickets: 2, closed: 0, fog: 1 },
        { path: '/tmp/fd-ov-nos', name: 'fd-ov-nos', current: false, status: 'no-scratch' },
        { path: '/tmp/fd-ov-bad', name: 'fd-ov-bad', current: false, status: 'unreadable' },
      ],
    }
    const ovDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39324/',
      pretendToBeVisual: true,
      virtualConsole: vcOv,
      beforeParse(window) {
        let served = '/tmp/fd-ov-cur' // 桩服务端真的记住换根：否则补位规则会把活跃卡拉回旧目录
        window.fetch = (u, opts) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify({ ...ws, root: served, pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          if (url.indexOf('/api/roots-overview') >= 0) {
            ovCalls.overview++
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(ovRowsPayload)) })
          }
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            ovPosts.push(JSON.parse(opts.body))
            served = JSON.parse(opts.body).root
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: served }) })
          }
          return Promise.reject(new Error('项目总览场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const rvDoc = ovDom.window.document
    const rvWin = ovDom.window
    assert.equal(ovCalls.overview, 0, '按需单拍：没打开弹窗之前零总览请求（不进轮询）')
    rvDoc.getElementById('rootsBtn').dispatchEvent(new rvWin.Event('click', { bubbles: true }))
    assert.equal(rvDoc.getElementById('rootsModal').hasAttribute('hidden'), false, '点「项目」打开总览弹窗')
    await tick()
    await tick()
    assert.equal(ovCalls.overview, 1, '打开才请求一次')
    const rvRows = Array.from(rvDoc.querySelectorAll('#rootsBody tr.rootrow'))
    assert.equal(rvRows.length, 4)
    assert.ok(rvRows[0].querySelector('.chip.cur'), '当前追踪目录带「当前」标示')
    assert.equal(rvRows[0].querySelectorAll('td')[1].textContent, 'Implement 实现', '链阶段给中文标签')
    assert.equal(rvRows[0].querySelectorAll('td')[2].textContent, '1/3', '票计数 closed/total')
    assert.equal(rvRows[0].querySelectorAll('td')[3].textContent, '2', '迷雾数')
    assert.match(rvRows[2].querySelector('.chip').textContent, /无产物/, '无 .scratch 行标注「无产物」')
    assert.ok(rvRows[2].className.indexOf('bad') >= 0, '坏行置灰')
    assert.match(rvRows[3].querySelector('.chip').textContent, /不可读/, '不可读行标注')
    // 收编（票 01）：好行多一枚「开为标签页」按钮，坏行没有（不可点的东西不摆按钮）
    assert.equal(rvRows[0].querySelectorAll('button.opentab').length, 1)
    assert.equal(rvRows[1].querySelectorAll('button.opentab').length, 1)
    assert.equal(rvRows[2].querySelectorAll('button.opentab').length, 0, '无产物行不给开卡入口')
    assert.equal(rvRows[3].querySelectorAll('button.opentab').length, 0, '不可读行不给开卡入口')
    // 行内按钮 = 同一个开卡流（既有换根请求），且不误触整行的点击
    rvRows[1].querySelector('button.opentab').dispatchEvent(new rvWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(rvDoc.getElementById('rootsModal').hasAttribute('hidden'), true, '开卡后弹窗关闭')
    assert.equal(ovPosts.length, 1)
    assert.equal(ovPosts[0].root, '/tmp/fd-ov-next', '走既有 POST /api/config 换根（服务端零新端点）')
    assert.equal(rvDoc.querySelectorAll('#tabStrip .tabcard').length, 2, '开卡后标签条上是两张卡')
    assert.equal(rvDoc.querySelectorAll('#tabStrip .tabcard.on .tname')[0].textContent, 'fd-ov-next', '新卡被激活')
    // 点行 = 同一个开卡流；点当前追踪目录那行只对齐卡面、不重复写盘
    rvDoc.getElementById('rootsBtn').dispatchEvent(new rvWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    const rvRows2 = Array.from(rvDoc.querySelectorAll('#rootsBody tr.rootrow'))
    rvRows2[0].dispatchEvent(new rvWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(ovPosts.length, 2, '点行同样发起开卡')
    assert.equal(ovPosts[1].root, '/tmp/fd-ov-cur')
    assert.deepEqual(jsErrorsOv, [])
    ovDom.window.close()
    ok('项目总览（jsdom）：打开才单拍、当前置顶标示、无产物/不可读分行标注置灰；行内「开为标签页」与点行都走既有换根流开卡并关窗，当前目录那行只对齐卡面不重复写盘')

    // ── 项目标签条（project-tabs 票 01）：渲染与生命周期、折叠、持久化恢复、补位、每卡状态记忆 ──
    // 夹具：桩服务端真的记住换根（否则补位规则会把活跃卡拉回旧目录，测的就不是真行为）；
    // stored 预置 flowdeck-tabs 模拟「这个浏览器上次开过哪些卡」，null 即没记过。
    const settleTabs = async () => { await new Promise((r) => setTimeout(r, 150)) }   // 与后文 settle 同款首拍等待
    const TABS_A = '/tmp/fd-tab-alpha'
    const TABS_B = '/tmp/fd-tab-beta'
    const TABS_C = '/tmp/fd-tab-gamma'
    function tabStripDom(port, stored, servedRoot) {
      const errs = []
      const vcT = new VirtualConsole()
      vcT.on('jsdomError', (e) => errs.push(String((e && e.message) || e)))
      const posts = []
      let served = servedRoot
      // 把应答扣住，用来造「请求在途 / 旧载荷晚归」这两个窗口：
      //   on=true 换根应答扣到 release()；gateState=true 时下一拍状态应答扣到 flushState()
      const hold = { on: false, release: null, gateState: false, flushState: null }
      const d = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:' + port + '/',
        pretendToBeVisual: true,
        virtualConsole: vcT,
        beforeParse(window) {
          if (stored) window.localStorage.setItem('flowdeck-tabs', JSON.stringify(stored))
          window.fetch = (u, opts) => {
            const url = String(u)
            if (url.indexOf('/api/state') >= 0) {
              const payload = {
                ...ws, root: served, rootName: nodePath.basename(served), pollMs: 5000, configPath: '/tmp/config.json',
                recentRoots: [{ path: served, exists: true }, { path: TABS_A, exists: true }, { path: TABS_B, exists: true }, { path: TABS_C, exists: true }],
              }
              if (hold.gateState) {
                hold.gateState = false
                const held = payload   // 这一拍的目录在发请求时就定下了
                return new Promise((res) => { hold.flushState = () => res({ ok: true, json: async () => JSON.parse(JSON.stringify(held)) }) })
              }
              return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(payload)) })
            }
            if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
              const want = JSON.parse(opts.body).root
              if (want === '/tmp/fd-tab-deleted') {
                return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: '这个目录不存在或不是目录。', code: 'config.root-missing' }) })
              }
              posts.push(want)
              if (hold.on) {
                return new Promise((res) => {
                  hold.release = () => { served = want; res({ ok: true, json: async () => ({ ok: true, root: served }) }) }
                })
              }
              served = want
              return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: served }) })
            }
            return Promise.reject(new Error('标签条用例不该请求别的接口：' + url))
          }
        },
      })
      return { d, errs, posts, hold, setServed: (p) => { served = p } }
    }
    const cards = (c) => Array.from(c.d.window.document.querySelectorAll('#tabStrip .tabcard'))
    const cardNames = (c) => cards(c).map((n) => n.querySelector('.tname').textContent)
    const activeName = (c) => (c.d.window.document.querySelector('#tabStrip .tabcard.on .tname') || { textContent: null }).textContent
    const storedTabs = (c) => JSON.parse(c.d.window.localStorage.getItem('flowdeck-tabs') || 'null')
    const openTab = async (c, path) => {
      const w = c.d.window
      w.document.getElementById('newTabBtn').dispatchEvent(new w.Event('click', { bubbles: true }))
      const f = w.document.getElementById('newTabPath')
      f.value = path
      f.dispatchEvent(new w.Event('input', { bubbles: true }))
      f.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await tick()
      await tick()
    }

    // (1) 首次打开：没记过标签 → 以服务端追踪目录为真相补开一张置为活跃
    const strip = tabStripDom(39370, null, TABS_A)
    await settleTabs()
    assert.equal(cards(strip).length, 1, '没记过标签：只补开服务端追踪目录那一张')
    assert.equal(activeName(strip), 'fd-tab-alpha')
    assert.match(cards(strip)[0].querySelector('.temoji').textContent, /\S/, '卡面带自动派生的图形标记')
    assert.ok(cards(strip)[0].querySelector('.tdot.on'), '活跃卡状态点实心')
    assert.equal(cards(strip)[0].querySelector('.tdot').getAttribute('aria-hidden'), 'true', '状态点是装饰，语义进整卡 aria-label')
    assert.match(cards(strip)[0].getAttribute('aria-label'), /项目标签 fd-tab-alpha，当前/, '整卡 aria-label 自载项目名与活跃态')
    assert.equal(cards(strip)[0].getAttribute('aria-selected'), 'true')
    assert.ok(cards(strip)[0].querySelector('button.tclose'), '每张卡带关闭件')
    assert.deepEqual(strip.posts, [], '补位是纯客户端行为，零写请求')

    // (2) 开新标签：换根成功即开卡并激活
    await openTab(strip, TABS_B)
    assert.deepEqual(cardNames(strip), ['fd-tab-alpha', 'fd-tab-beta'])
    assert.equal(activeName(strip), 'fd-tab-beta', '新卡被激活')
    assert.ok(cards(strip)[0].querySelector('.tdot:not(.on)'), '旧卡状态点转空心（挂起）')
    assert.deepEqual(strip.posts, [TABS_B], '开卡复用既有 POST /api/config（零新端点）')
    assert.equal(storedTabs(strip).list.length, 2)
    assert.equal(storedTabs(strip).active, 1)
    assert.equal(storedTabs(strip).collapsed, false)

    // (3) 去重：已开过的目录再开一次落到已有卡，不出第二张
    await openTab(strip, TABS_A)
    assert.deepEqual(cardNames(strip), ['fd-tab-alpha', 'fd-tab-beta'], '同目录去重：不产生克隆')
    assert.equal(activeName(strip), 'fd-tab-alpha', '去重后落到那张已有卡并激活')
    assert.deepEqual(cards(strip).length, 2)

    // (4) 点卡切换：复用同一套换根请求
    cards(strip)[1].dispatchEvent(new strip.d.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(activeName(strip), 'fd-tab-beta')
    assert.equal(strip.posts[strip.posts.length - 1], TABS_B, '点卡即换根')
    assert.equal(storedTabs(strip).active, 1, '活跃索引随切换落盘')

    // (5) 每卡界面状态按目录分桶：选中 effort + 票筛选档位，切走再切回原样
    const effBtn = (c, name) => Array.from(c.d.window.document.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf(name) === 0)
    const tierChip = (c) => Array.from(c.d.window.document.querySelectorAll('.tierchip')).find((b) => b.textContent.indexOf('ready-for-agent') === 0)
    effBtn(strip, 'idea-b').dispatchEvent(new strip.d.window.Event('click'))
    const tier = tierChip(strip)
    tier.dispatchEvent(new strip.d.window.Event('click'))
    assert.ok(tierChip(strip).className.indexOf('on') >= 0, '票筛选档位点亮')
    cards(strip)[0].dispatchEvent(new strip.d.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(activeName(strip), 'fd-tab-alpha', '切到另一张卡')
    assert.ok(!(effBtn(strip, 'idea-b').className.indexOf('on') >= 0), '另一张卡不带这张卡的选中态（回到默认视图）')
    assert.equal(strip.d.window.document.querySelectorAll('.tierchip.on').length, 0, '票筛选按目录分桶：另一张卡上没有任何档位点亮')
    cards(strip)[1].dispatchEvent(new strip.d.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.ok(effBtn(strip, 'idea-b').className.indexOf('on') >= 0, '切回那张卡：选中的 effort 还在')
    assert.ok(tierChip(strip).className.indexOf('on') >= 0, '切回那张卡：票筛选档位还在')
    assert.equal(storedTabs(strip).list.length, 2, '每卡界面状态是内存级，不落 localStorage（存进去的只有标签条本身）')
    assert.deepEqual(Object.keys(JSON.parse(storedTabs(strip) ? JSON.stringify(storedTabs(strip)) : '{}')).sort(),
      ['active', 'collapsed', 'list'], '持久化的只有卡列表/顺序、活跃索引与折叠态')

    // (6) 关挂起卡：只动卡面，活跃卡不动、零写请求
    const postsBeforeIdleClose = strip.posts.length
    cards(strip)[0].querySelector('button.tclose').dispatchEvent(new strip.d.window.Event('click', { bubbles: true }))
    await tick()
    assert.deepEqual(cardNames(strip), ['fd-tab-beta'], '挂起卡关掉后卡面少一张')
    assert.equal(activeName(strip), 'fd-tab-beta', '活跃卡不受影响')
    assert.equal(strip.posts.length, postsBeforeIdleClose, '关挂起卡零写请求')

    // (7) 关活跃卡：落右邻（无右邻落左邻）并复用换根请求把服务端跟过去
    await openTab(strip, TABS_C)
    assert.deepEqual(cardNames(strip), ['fd-tab-beta', 'fd-tab-gamma'])
    cards(strip)[0].querySelector('button.tclose').dispatchEvent(new strip.d.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.deepEqual(cardNames(strip), ['fd-tab-gamma'], '关掉末位（无右邻）后只剩一张')
    assert.equal(activeName(strip), 'fd-tab-gamma')
    assert.equal(strip.posts[strip.posts.length - 1], TABS_C, '关活跃卡时服务端跟到落点那张卡')
    assert.deepEqual(strip.errs, [])
    strip.d.window.close()
    ok('项目标签条渲染与生命周期（jsdom）：首次以服务端追踪目录补位置活跃；开卡成功即激活、状态点实心/空心、aria 自载项目名；同目录去重不克隆；点卡切换复用换根请求；每卡按目录分桶记住选中 effort 与票筛选档位；关挂起卡零写请求、关活跃卡落右邻并让服务端跟上')

    // (8) 上限 8：第 9 张被拒、提示先关一张，且不发出写请求
    const cap = tabStripDom(39371, null, TABS_A)
    await settleTabs()
    for (const d of ['/p/1', '/p/2', '/p/3', '/p/4', '/p/5', '/p/6', '/p/7']) await openTab(cap, d)
    assert.equal(cards(cap).length, 8, '开到 8 张为止')
    const capPosts = cap.posts.length
    await openTab(cap, '/p/8')
    assert.equal(cards(cap).length, 8, '第 9 张不出卡')
    assert.equal(cap.posts.length, capPosts, '超上限连换根请求都不发（先在客户端拦）')
    assert.match(cap.d.window.document.getElementById('err').textContent, /标签最多 8 张：先关一张再开新的/, '超上限给出可执行的提示')
    assert.deepEqual(cap.errs, [])
    cap.d.window.close()

    // (9) 全关：空态出「打开目录」大入口，且不清服务端追踪目录（不产生写请求）
    const empty = tabStripDom(39372, { list: [TABS_A, TABS_B], active: 1, collapsed: false }, TABS_B)
    await settleTabs()
    assert.equal(cards(empty).length, 2, '记忆里的两张卡恢复出来')
    const emptyPosts = empty.posts.length
    // 逐张关：每关一次都重新查 DOM（渲染已重建，握着旧节点的监听器闭包带着旧下标）
    for (let guard = 0; cards(empty).length && guard < 8; guard++) {
      cards(empty)[0].querySelector('button.tclose').dispatchEvent(new empty.d.window.Event('click', { bubbles: true }))
      await tick()
    }
    await tick()
    assert.equal(cards(empty).length, 0, '全关后一张卡都不剩')
    assert.equal(empty.posts.length, emptyPosts, '全关零写请求：关浏览视图不破坏服务端追踪目录')
    const emptyState = empty.d.window.document.getElementById('tabStrip')
    assert.match(emptyState.className, /empty/, '空态有自己的形态')
    assert.equal(emptyState.querySelector('button').textContent, '打开目录', '空态出「打开目录」大入口')
    assert.match(emptyState.textContent, /项目文件一个没动/, '空态说清「全关不碰项目文件」')
    assert.deepEqual(storedTabs(empty), { list: [], active: -1, collapsed: false }, '全关态也落盘（重开仍是空态）')
    assert.deepEqual(empty.errs, [])
    empty.d.window.close()

    // (10) 折叠：折成细线、可再展开，折叠态持久化；重开页面原样恢复
    const fold = tabStripDom(39373, { list: [TABS_A, TABS_B], active: 0, collapsed: true }, TABS_A)
    await settleTabs()
    const foldBox = fold.d.window.document.getElementById('tabStrip')
    assert.match(foldBox.className, /collapsed/, '记忆「折叠」→ 重开就折着')
    assert.equal(cards(fold).length, 0, '折叠态不铺卡面（只留一条细线）')
    const handle = foldBox.querySelector('button.tabhandle')
    assert.match(handle.textContent, /fd-tab-alpha/, '把手带着当前项目名（折起来也知道在哪）')
    assert.equal(handle.getAttribute('aria-expanded'), 'false')
    handle.dispatchEvent(new fold.d.window.Event('click', { bubbles: true }))
    assert.deepEqual(cardNames(fold), ['fd-tab-alpha', 'fd-tab-beta'], '点把手展开，卡面回来')
    assert.equal(storedTabs(fold).collapsed, false, '展开态即时落盘')
    foldBox.querySelector('button.tabhandle').dispatchEvent(new fold.d.window.Event('click', { bubbles: true }))
    assert.match(fold.d.window.document.getElementById('tabStrip').className, /collapsed/, '再点折回去')
    assert.equal(storedTabs(fold).collapsed, true)
    assert.deepEqual(fold.errs, [])
    fold.d.window.close()

    // (11) 页面加载以服务端追踪目录为真相对齐：本地记忆里有它但活跃卡指别处 → 活跃卡对齐过去
    const realign = tabStripDom(39374, { list: [TABS_A, TABS_B, TABS_C], active: 0, collapsed: false }, TABS_C)
    await settleTabs()
    assert.deepEqual(cardNames(realign), ['fd-tab-alpha', 'fd-tab-beta', 'fd-tab-gamma'], '重开页面：卡列表与顺序原样恢复')
    assert.equal(activeName(realign), 'fd-tab-gamma', '活跃卡对齐服务端追踪目录（本地记忆的活跃索引只在与之一致时算数）')
    assert.deepEqual(realign.posts, [], '对齐是纯客户端行为')
    assert.deepEqual(realign.errs, [])
    realign.d.window.close()

    // (12) 补位：本地记忆里没有服务端追踪目录 → 为它补开一张置为活跃
    const place = tabStripDom(39375, { list: [TABS_A, TABS_B], active: 0, collapsed: false }, TABS_C)
    await settleTabs()
    assert.deepEqual(cardNames(place), ['fd-tab-alpha', 'fd-tab-beta', 'fd-tab-gamma'], '无对应卡则补开一张')
    assert.equal(activeName(place), 'fd-tab-gamma', '补开的那张置为活跃')
    assert.equal(storedTabs(place).active, 2, '补位后落盘')
    assert.deepEqual(place.errs, [])
    place.d.window.close()

    // (13) 失效目录：切不过去，停留原卡片、沿用既有失败提示
    const DEAD = '/tmp/fd-tab-deleted'
    const dead = tabStripDom(39376, { list: [TABS_A, DEAD], active: 0, collapsed: false }, TABS_A)
    await settleTabs()
    assert.deepEqual(cardNames(dead), ['fd-tab-alpha', 'fd-tab-deleted'], '挂起卡不主动探测磁盘（零请求），失效只在你切回去时暴露')
    cards(dead)[1].dispatchEvent(new dead.d.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.match(dead.d.window.document.getElementById('err').textContent, /换目录失败/, '切到失效目录沿用既有失败提示')
    assert.equal(activeName(dead), 'fd-tab-alpha', '失败后停留原卡片')
    assert.deepEqual(cardNames(dead), ['fd-tab-alpha', 'fd-tab-deleted'], '失败不吞掉那张失效卡，也不静默')
    assert.deepEqual(dead.posts, [], '失败的那次不写盘')
    assert.deepEqual(dead.errs, [])
    dead.d.window.close()
    ok('项目标签条边界（jsdom）：上限 8 张拦截且不发写请求；全关出「打开目录」空态且零写请求（不清服务端追踪目录）；折叠成细线可再展开且折叠态持久化；重开恢复卡列表/顺序/活跃索引，活跃卡以服务端追踪目录对齐、缺卡即补开置活跃；切到失效目录沿用既有失败提示并停留原卡片')

    // (14) 关活跃卡落右邻时，落点那张卡自己的界面状态分桶不能被「刚离开那张卡的样子」覆盖
    const land = tabStripDom(39377, { list: [TABS_A, TABS_B], active: 0, collapsed: false }, TABS_A)
    await settleTabs()
    effBtn(land, 'idea-b').dispatchEvent(new land.d.window.Event('click'))             // A 名下：idea-b
    cards(land)[1].dispatchEvent(new land.d.window.Event('click', { bubbles: true }))  // 切到 B
    await tick(); await tick()
    effBtn(land, 'idea-a').dispatchEvent(new land.d.window.Event('click'))             // B 名下：idea-a
    cards(land)[0].dispatchEvent(new land.d.window.Event('click', { bubbles: true }))  // 切回 A（活跃卡是 A 了）
    await tick(); await tick()
    assert.ok(effBtn(land, 'idea-b').className.indexOf('on') >= 0, 'A 切回来时用回自己的选中态')
    cards(land)[0].querySelector('button.tclose').dispatchEvent(new land.d.window.Event('click', { bubbles: true }))  // 关 A（活跃）落 B
    await tick(); await tick()
    assert.equal(activeName(land), 'fd-tab-beta', '关掉活跃卡后落在右邻那张')
    assert.ok(effBtn(land, 'idea-a').className.indexOf('on') >= 0, '落点卡用回自己的界面状态（没被刚离开那张的覆盖）')
    assert.ok(!(effBtn(land, 'idea-b').className.indexOf('on') >= 0), '刚离开那张卡的选中态没串过来')
    assert.deepEqual(land.errs, [])
    land.d.window.close()

    // (15) 换根在途期间回来的那一拍（还是旧目录）不能把刚点开的卡又拉回去
    const race = tabStripDom(39378, { list: [TABS_A, TABS_B], active: 0, collapsed: false }, TABS_A)
    await settleTabs()
    // 时序：轮询的一拍先发出去（此时服务端还在追 A）→ 用户点 B 切过去 → 那一拍才回来
    race.hold.gateState = true
    race.d.window.document.getElementById('refreshBtn').dispatchEvent(new race.d.window.Event('click', { bubbles: true }))
    await tick()
    assert.ok(race.hold.flushState, '有一拍状态在途（模拟轮询那一拍正好在切换前发出）')
    cards(race)[1].dispatchEvent(new race.d.window.Event('click', { bubbles: true }))  // 切到 B
    await tick()
    await tick()
    assert.equal(activeName(race), 'fd-tab-beta', '换根落定后活跃卡是 B')
    race.hold.flushState()     // 那一拍现在才回来——它报的还是旧目录 A
    await tick()
    await tick()
    assert.equal(activeName(race), 'fd-tab-beta', '切换之前发出、落定之后才回来的旧载荷没把活跃卡拉回 A')
    assert.equal(storedTabs(race).active, 1, '落盘的活跃索引也是新的那张')
    assert.deepEqual(race.errs, [])
    race.d.window.close()
    // (16) 换过一次根之后补位仍然活着：别处（手改 config.json / 另一个浏览器）把追踪目录改掉照样跟上
    const after = tabStripDom(39379, { list: [TABS_A, TABS_B], active: 0, collapsed: false }, TABS_A)
    await settleTabs()
    cards(after)[1].dispatchEvent(new after.d.window.Event('click', { bubbles: true }))  // 切到 B（换根代数 +1）
    await tick(); await tick()
    assert.equal(activeName(after), 'fd-tab-beta')
    after.setServed(TABS_C)     // 换根之外，追踪目录被改到了 C
    after.d.window.document.getElementById('refreshBtn').dispatchEvent(new after.d.window.Event('click', { bubbles: true }))
    await tick(); await tick()
    assert.deepEqual(cardNames(after), ['fd-tab-alpha', 'fd-tab-beta', 'fd-tab-gamma'], '换过根之后补位照常工作（没被换根次数卡住）')
    assert.equal(activeName(after), 'fd-tab-gamma', '跟到新追踪目录那张')
    assert.deepEqual(after.errs, [])
    after.d.window.close()
    ok('项目标签条两处竞态（jsdom）：关活跃卡落右邻时不覆盖落点卡自己的界面状态分桶；切换之前发出、落定之后才回来的旧载荷不参与补位、活跃卡不倒退，且换过根之后补位照常工作')

    // ── 挂起与恢复的刷新语义（project-tabs 票 02）：挂起零请求零通知、切回先示旧再补拍、三档不受扰 ──
    // 夹具比 tabStripDom 多两件事，都为「请求/通知为零」这类断言而存在：
    //   ① 请求按发出时的追踪目录记账（calls 记 {url, root}）——「这张卡一个请求都没有」得以数出来；
    //      载荷内容在请求发出那一刻就定死（hold.gateState 扣住的那一拍因此仍报旧目录）。
    //   ② Notification 桩记账（零通知得以数出来）。
    // 载荷随 gen 递增而变：标题换成「<项目> 旧/新数据」好断言主区此刻显示的是哪个项目的内容，
    // 迷雾数跟着递增好造出真的会触发通知的 diff（否则「零通知」是空断言）。
    const SUS_A = '/tmp/fd-susp-alpha'
    const SUS_B = '/tmp/fd-susp-beta'
    const SUS_C = '/tmp/fd-susp-gamma'
    const SUS_DEAD = '/tmp/fd-susp-deleted'
    function suspDom(port, stored, servedRoot, opts) {
      const o = opts || {}
      const errs = []
      const vcS = new VirtualConsole()
      vcS.on('jsdomError', (e) => errs.push(String((e && e.message) || e)))
      const calls = []            // 每一次请求都记下它发出时服务端在追哪个目录
      const notes = []            // 桌面通知实例
      const posts = []
      let served = servedRoot
      let gen = 0                 // 递增即「项目文件变了」
      const hold = { on: false, release: null, gateState: false, flushState: null }
      function payload() {
        const name = nodePath.basename(served)
        return {
          ...ws,
          root: served,
          rootName: name,
          pollMs: 1000,
          pollMode: o.pollMode || 'display',
          configPath: '/tmp/config.json',
          recentRoots: [{ path: served, exists: true }, { path: SUS_A, exists: true }, { path: SUS_B, exists: true }],
          efforts: (ws.efforts || []).map((e, i) => {
            if (i !== 0) return e
            const fog = e.map.fogCount + gen
            return {
              ...e,
              title: name + (gen ? ' 新数据' : ' 旧数据'),
              map: { ...e.map, fogCount: fog },
              chain: deriveChain({ slug: e.slug, map: { exists: e.map.exists, destination: e.map.destination, fogCount: fog }, spec: { exists: e.spec.exists, contentLength: e.spec.contentLength }, tickets: e.tickets }),
            }
          }),
        }
      }
      function FakeNotification(title, nopts) {
        const inst = { title, body: nopts && nopts.body, clicks: [] }
        inst.addEventListener = (ev, fn) => { if (ev === 'click') inst.clicks.push(fn) }
        notes.push(inst)
        return inst
      }
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = () => Promise.resolve('granted')
      const d = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:' + port + '/',
        pretendToBeVisual: true,
        virtualConsole: vcS,
        beforeParse(window) {
          window.Notification = FakeNotification
          if (stored) window.localStorage.setItem('flowdeck-tabs', JSON.stringify(stored))
          if (o.notify) window.localStorage.setItem('flowdeck-notify', '1')
          window.fetch = (u, ropts) => {
            const url = String(u)
            if (url.indexOf('/api/state') >= 0) {
              calls.push({ url, root: served })   // 记账用的是请求发出时的追踪目录
              const body = payload()              // 这一拍的目录在发请求时就定下了
              if (hold.gateState) {
                hold.gateState = false
                return new Promise((res) => { hold.flushState = () => res({ ok: true, json: async () => JSON.parse(JSON.stringify(body)) }) })
              }
              return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(body)) })
            }
            if (url.indexOf('/api/config') >= 0 && ropts && ropts.method === 'POST') {
              const want = JSON.parse(ropts.body).root
              if (want === SUS_DEAD) {
                return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: '这个目录不存在或不是目录。', code: 'config.root-missing' }) })
              }
              posts.push(want)
              served = want
              return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: served }) })
            }
            return Promise.reject(new Error('挂起语义用例不该请求别的接口：' + url))
          }
        },
      })
      return { d, errs, calls, notes, posts, hold, setServed: (p) => { served = p }, bump: () => { gen++ } }
    }
    const susCards = (c) => Array.from(c.d.window.document.querySelectorAll('#tabStrip .tabcard'))
    const susStamp = (c, i) => (susCards(c)[i].querySelector('.tstamp') || { textContent: null, title: null })
    const stampWhen = (c, i) => ((susStamp(c, i).title || '').match(/\d\d:\d\d:\d\d/) || [null])[0]   // 完整时刻在 title 里
    const callsFor = (c, path) => c.calls.filter((x) => x.root === path)
    const susMain = (c) => c.d.window.document.getElementById('main').textContent
    const susMeta = (c) => c.d.window.document.getElementById('meta').textContent
    const susToast = (c) => c.d.window.document.getElementById('toast').textContent
    const susActive = (c) => c.d.window.document.querySelector('#tabStrip .tabcard.on .tname').textContent
    const susOpen = async (c, path) => {
      const w = c.d.window
      w.document.getElementById('newTabBtn').dispatchEvent(new w.Event('click', { bubbles: true }))
      const f = w.document.getElementById('newTabPath')
      f.value = path
      f.dispatchEvent(new w.Event('input', { bubbles: true }))
      f.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await tick(); await tick()
    }
    const susClick = async (c, i) => {
      susCards(c)[i].dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      await tick(); await tick()
    }
    const susRefresh = async (c) => {
      c.d.window.document.getElementById('refreshBtn').dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      await tick(); await tick()
    }
    const closeAllTabs = async (c) => {
      for (let guard = 0; susCards(c).length && guard < 10; guard++) {
        susCards(c)[0].querySelector('button.tclose').dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
        await tick()
      }
      await tick()
    }
    const POLL_WAIT = 1300   // pollMs=1000：等过一轮多一点，自动拍该发的都发了
    const SUS_MODES = ['display', 'observe', 'manual']

    // (1) 挂起卡零请求：A 挂起期间，每一个 /api/state 都只属于活跃的那张卡（B）
    const susp = suspDom(39380, null, SUS_A, { pollMode: 'display' })
    await settleTabs()
    await susOpen(susp, SUS_B)                                  // A 挂起、B 活跃
    assert.equal(susActive(susp), 'fd-susp-beta')
    assert.match(susStamp(susp, 0).textContent, /^\d\d:\d\d$/, '挂起卡摆出离开那一刻的最近刷新时间')
    assert.match(susStamp(susp, 0).title, /挂起中/, '时间戳说清「数据停在这一拍」')
    assert.equal(susStamp(susp, 1).textContent, null, '活跃卡不摆时间戳（顶栏状态行报的是实时的）')
    const markSuspend = susp.calls.length
    susp.bump()                                                  // 项目文件在这期间变了：A 那边也有新内容
    await new Promise((r) => setTimeout(r, POLL_WAIT))           // 展示档轮了一轮不止
    const whileSuspended = susp.calls.slice(markSuspend)
    assert.ok(whileSuspended.length >= 1, '展示档下活跃卡照常轮询（挂起那段时间里发了 ' + whileSuspended.length + ' 拍）')
    assert.deepEqual([...new Set(whileSuspended.map((x) => x.root))], [SUS_B],
      '挂起期间每一个请求都属于活跃卡（挂起卡 A 的请求数为零，不因刷新模式是「展示」而破例）')
    const frozenStamp = susStamp(susp, 0).textContent
    await new Promise((r) => setTimeout(r, POLL_WAIT))
    assert.equal(susStamp(susp, 0).textContent, frozenStamp, '挂起期间那张卡的刷新时间原样不动（没有伪装刷新）')
    assert.doesNotMatch(susMain(susp), /fd-susp-alpha/, '挂起卡的内容不顶到主区（那属于另一张卡）')
    assert.deepEqual(susp.errs, [])
    susp.d.window.close()
    ok('挂起卡零请求（jsdom）：展示档下活跃卡照常轮询，而挂起卡的请求数恒为零；卡面摆出离开那一刻的最近刷新时间，挂起期间内容与该时间原样不动（不发起任何伪装刷新）')

    // (2) 切回流程：先呈现离开时的旧内容与旧「最近刷新」→ toast「已恢复刷新」→ 立即补一拍
    const res = suspDom(39381, null, SUS_A, { pollMode: 'display' })
    await settleTabs()
    res.d.window.document.getElementById('main').children[0].scrollTop = 77   // A 名下滚到某处
    await susOpen(res, SUS_B)                                   // A 挂起（分桶存下它离开时的样子），B 活跃
    const whenA = stampWhen(res, 0)
    assert.ok(whenA, 'A 的分桶记下了离开那一刻的完整刷新时刻')
    res.bump()                                                   // A 的文件在这期间变了
    res.hold.gateState = true                                   // 扣住切回后紧接着发出的那一拍补拍
    await susClick(res, 0)                                      // 切回挂起的 A
    assert.ok(res.hold.flushState, '切回后立刻补了一拍（在途，先不落地）')
    assert.equal(susActive(res), 'fd-susp-alpha')
    assert.match(susMain(res), /fd-susp-alpha 旧数据/, '切回瞬间先看到离开时的旧内容（不是白屏，也不是别张卡的内容）')
    assert.match(susToast(res), /已恢复 .*的刷新/, '弹「已恢复刷新」轻提示（走既有 toast 机制）')
    assert.match(susToast(res), /旧内容/, '提示里说清刚才显示的是离开时的旧内容')
    assert.match(susMeta(res), new RegExp('已刷新 ' + whenA), '「最近刷新」先停在离开时那一拍（不把旧内容伪装成新的）')
    assert.equal(res.d.window.document.getElementById('main').children[0].scrollTop, 77, '滚动位置也一并装回（切走再切回接着干）')
    res.hold.flushState()                                        // 补拍此刻才落地
    await tick(); await tick()
    assert.match(susMain(res), /fd-susp-alpha 新数据/, '补拍落地后是最新的内容')
    assert.equal(res.d.window.document.getElementById('main').children[0].scrollTop, 77, '补拍重画后滚动位置照样保住')
    assert.match(susMeta(res), /已刷新 \d\d:\d\d:\d\d/, '补拍后「最近刷新」照常报实时的时刻')
    assert.deepEqual(res.errs, [])
    res.d.window.close()
    ok('切回挂起卡（jsdom）：先呈现离开时的旧内容、旧「最近刷新」时间与滚动位置 → toast「已恢复刷新」→ 立即补上一拍最新内容（中间态逐段断言，不是只看终态）')

    // (3) 三档行为不受扰：挂着两张卡，活跃那张仍按选定的刷新模式行事
    for (const [i, mode] of SUS_MODES.entries()) {
      const m = suspDom(39382 + i, null, SUS_A, { pollMode: mode })
      await settleTabs()
      await susOpen(m, SUS_B)
      const afterBoot = m.calls.length
      await susRefresh(m)
      assert.equal(m.calls.length, afterBoot + 1, mode + ' 档：主动刷新永远一拍（挂起不改变这一条）')
      const base = m.calls.length
      if (mode === 'manual') {
        await new Promise((r) => setTimeout(r, POLL_WAIT))
        assert.equal(m.calls.length, base, '惰性档：活跃卡也是零自动请求')
      } else if (mode === 'observe') {
        Object.defineProperty(m.d.window.document, 'hidden', { value: true, configurable: true })
        m.d.window.document.dispatchEvent(new m.d.window.Event('visibilitychange'))
        await new Promise((r) => setTimeout(r, POLL_WAIT))
        assert.equal(m.calls.length, base, '观测档：页面不可见时活跃卡也停表')
        Object.defineProperty(m.d.window.document, 'hidden', { value: false, configurable: true })
        m.d.window.document.dispatchEvent(new m.d.window.Event('visibilitychange'))
        await tick(); await tick()
        assert.equal(m.calls.length, base + 1, '观测档：回前台立即补一拍')
      } else {
        await new Promise((r) => setTimeout(r, POLL_WAIT))
        assert.ok(m.calls.length > base, '展示档：活跃卡按间隔定时轮询')
      }
      assert.deepEqual([...new Set(m.calls.slice(afterBoot).map((x) => x.root))], [SUS_B], mode + ' 档：挂起之后全程只有活跃卡的请求')
      assert.deepEqual(m.errs, [])
      m.d.window.close()
    }
    ok('刷新模式三档不受标签条扰动（jsdom）：挂着两张卡时，活跃卡仍分别是常轮（展示）/ 不可见停表、回前台补拍（观测）/ 零自动请求只手动（惰性），手动刷新三档都一拍')

    // (4) 全关 = 全挂起：零定时器、零请求、零通知，且空态不被任何一拍自动摆回来
    for (const [i, mode] of SUS_MODES.entries()) {
      const c = suspDom(39385 + i, { list: [SUS_A, SUS_B], active: 1, collapsed: false }, SUS_B, { pollMode: mode, notify: true })
      await settleTabs()
      c.bump()                                                   // 造出真的会触发通知的 diff
      // 一拍定时拍在途（惰性档本来就没有自动拍，那档走下面的零请求那一半）
      c.hold.gateState = mode !== 'manual'
      if (c.hold.gateState) await new Promise((r) => setTimeout(r, 1100))
      const inFlight = !!c.hold.flushState
      if (mode !== 'manual') assert.ok(inFlight, mode + ' 档：有一拍定时拍在途')
      await closeAllTabs(c)
      assert.equal(susCards(c).length, 0, mode + ' 档：全关后一张卡都不剩')
      if (c.hold.flushState) c.hold.flushState()                 // 那一拍此刻才回来
      await tick(); await tick()
      assert.equal(c.notes.length, 0, mode + ' 档：全关后迟到的定时拍不弹桌面通知（挂起即零通知）')
      assert.equal(susCards(c).length, 0, mode + ' 档：迟到的那一拍也不把空态的卡摆回来')
      // 「全关」是使用者明说了「我不想它在动了」：连主动的「立即刷新」也一并停手（票 02 补）
      const btn = c.d.window.document.getElementById('refreshBtn')
      assert.equal(btn.disabled, true, mode + ' 档：全关之后「立即刷新」按钮停用（不能看着能点、点了没反应）')
      assert.match(btn.title, /不发请求/, mode + ' 档：停用原因写在按钮 title 上')
      assert.match(c.d.window.document.getElementById('tabStrip').textContent, /连「立即刷新」也一并停手/,
        mode + ' 档：空态把这个决定说出口（禁用按钮的 title 各浏览器不一定出得来）')
      const base = c.calls.length
      await susRefresh(c)                                        // 按钮已停用；jsdom 仍会派发被强行构造的 click，闸口必须兜住
      await tick()
      assert.equal(c.notes.length, 0, mode + ' 档：全关期间零桌面通知')
      assert.equal(susCards(c).length, 0, mode + ' 档：空态不会被任何一拍摆回来（关掉的浏览视图不被一拍复活）')
      assert.equal(c.calls.length, base, mode + ' 档：主动按「立即刷新」也是零请求（不只是没有定时器）')
      await new Promise((r) => setTimeout(r, POLL_WAIT))
      assert.equal(c.calls.length, base, mode + ' 档：过了轮询周期仍零自动请求（没有活跃卡就不排表）')
      // 开一张标签即收回那个表态：按钮恢复、闸口放行、刷新照旧
      await susOpen(c, SUS_A)
      assert.equal(btn.disabled, false, mode + ' 档：开一张标签后「立即刷新」恢复可用')
      assert.doesNotMatch(btn.title, /不发请求/, mode + ' 档：停用原因也一并收回')
      const back = c.calls.length
      await susRefresh(c)
      assert.equal(c.calls.length, back + 1, mode + ' 档：有前台项目了，刷新照旧发请求')
      assert.deepEqual(c.errs, [])
      c.d.window.close()
    }
    ok('全关即全挂起（jsdom）：三档（观测/展示/惰性）下都零定时器、零请求、零桌面通知；「立即刷新」一并停用且即便强行触发也零请求，空态把这个决定说出口（关掉的浏览视图不会被任何一拍复活）')

    // (5) 失效目录：挂起卡不探测磁盘；切回时换根失败走既有失败提示、停留原卡，且不谎报恢复
    const deadSus = suspDom(39388, { list: [SUS_A, SUS_DEAD], active: 0, collapsed: false }, SUS_A, { pollMode: 'display' })
    await settleTabs()
    await new Promise((r) => setTimeout(r, POLL_WAIT))
    assert.equal(callsFor(deadSus, SUS_DEAD).length, 0, '挂起卡不主动探测磁盘：指向失效目录也零请求')
    assert.ok(callsFor(deadSus, SUS_A).length >= 1, '活跃卡的轮询照常（请求确实在发，才谈得上「失效卡那一份是零」）')
    const deadPosts = deadSus.posts.length
    await susClick(deadSus, 1)
    assert.match(deadSus.d.window.document.getElementById('err').textContent, /换目录失败/, '切到失效目录沿用既有失败提示')
    assert.doesNotMatch(susToast(deadSus), /已恢复/, '失败不弹「已恢复刷新」——刷新压根没恢复')
    assert.equal(susActive(deadSus), 'fd-susp-alpha', '失败后停留原卡片')
    assert.match(susMain(deadSus), /fd-susp-alpha/, '主区仍是原来那张卡的内容（失效卡的内容没顶上来）')
    assert.equal(deadSus.posts.length, deadPosts, '失败的那次不写盘')
    assert.deepEqual(cardNames(deadSus), ['fd-susp-alpha', 'fd-susp-deleted'], '失效卡不消失、也不被静默吞掉')
    assert.deepEqual(deadSus.errs, [])
    deadSus.d.window.close()
    ok('失效目录（jsdom）：挂起卡不主动探测磁盘（零请求）；切回时换根失败走既有失败提示、停留原卡片、主区内容不串台，且不谎报「已恢复刷新」')

    // (6) 换根落定之前发出、落定之后才回来的那一拍整拍丢弃：不冒充当前项目
    const race2 = suspDom(39389, null, SUS_A, { pollMode: 'display' })
    await settleTabs()
    await susOpen(race2, SUS_B)                                 // A 挂起、B 活跃
    race2.hold.gateState = true
    await susRefresh(race2)                                      // 有一拍在途（它发出去时服务端还在追 B）
    assert.ok(race2.hold.flushState, '有一拍状态在途（模拟轮询那一拍正好在切换前发出）')
    await susClick(race2, 0)                                    // 切回 A
    await tick(); await tick()
    assert.equal(susActive(race2), 'fd-susp-alpha')
    assert.match(susMain(race2), /fd-susp-alpha/, '主区显示的是 A 的内容')
    race2.hold.flushState()                                     // 那一拍现在才回来——它报的还是 B
    await tick(); await tick()
    assert.equal(susActive(race2), 'fd-susp-alpha', '迟到的那一拍不参与补位、活跃卡不倒退')
    assert.doesNotMatch(susMain(race2), /fd-susp-beta/, '迟到的那一拍整拍丢弃：已挂起卡的数据不冒充当前项目')
    assert.deepEqual(race2.errs, [])
    race2.d.window.close()
    ok('挂起边界上的迟到载荷（jsdom）：切换之前发出、落定之后才回来的那一拍整拍丢弃——不拿已挂起那张卡的数据冒充当前项目')

    // (7) 服务端把追踪目录换到别处（手改 config.json / 另一个浏览器）而离开的那张卡：
    //     它同样是被挂起的那张，内容与刷新时间也得按离开时原样存下
    const ext = suspDom(39390, null, SUS_A, { pollMode: 'display' })
    await settleTabs()
    await susOpen(ext, SUS_B)                                  // A 挂起、B 活跃
    const whenB = (susMeta(ext).match(/已刷新 (\d\d:\d\d:\d\d)/) || [null, null])[1]   // B 此刻的「最近刷新」
    assert.ok(whenB, 'B 正在前台，状态行报着它这一拍的刷新时刻')
    ext.setServed(SUS_C)                                       // 别处把追踪目录改到 C
    await susRefresh(ext)
    assert.deepEqual(cardNames(ext), ['fd-susp-alpha', 'fd-susp-beta', 'fd-susp-gamma'], '跟上新追踪目录：补开一张 C')
    assert.equal(susActive(ext), 'fd-susp-gamma')
    assert.equal(susStamp(ext, 1).textContent, whenB.slice(0, 5), '被留下的那张 B 也按离开时原样记着刷新时刻')
    ext.bump()                                                 // 三个项目的文件都变了
    ext.hold.gateState = true
    await susClick(ext, 1)                                    // 切回 B
    assert.ok(ext.hold.flushState, '切回后立刻补了一拍（在途）')
    assert.match(susMain(ext), /fd-susp-beta 旧数据/, '被服务端换根留下的那张，切回来同样是先看到离开时的旧内容')
    ext.hold.flushState()
    await tick(); await tick()
    assert.match(susMain(ext), /fd-susp-beta 新数据/, '补拍落地后跟上最新内容')
    assert.deepEqual(ext.errs, [])
    ext.d.window.close()
    ok('服务端换根留下的卡（jsdom）：追踪目录被别处改掉而被留在挂起的那张，同样按离开时原样存下内容与刷新时刻，切回照样先示旧再补拍')

    // 旧控件退役：界面上不再有「换目录」按钮与单目录输入框，换目录心智只有标签条一套
    assert.equal(deckHtml.indexOf('id="switchBtn"'), -1, '「换目录」按钮已退役')
    assert.equal(deckHtml.indexOf('id="rootInput"'), -1, '单目录输入框已退役')
    for (const deadKey of ['root.input.title', 'root.input.placeholder', 'switch.btn.label', 'switch.btn.title', 'rootmenu.btn.title', 'rootmenu.btn.aria']) {
      assert.ok(!SHELL_TEXT[deadKey], '退役控件的词条已随之撤掉：' + deadKey)
    }
    ok('入口收编（文件级）：「换目录」按钮与单目录输入框连同其词条一并退役，换目录心智只留标签条一套')


    // ── 技能包弹窗：按钮打开、侧栏清单分组、点条目/内链取正文渲染 Markdown、Esc 关闭 ──
    const jsErrors4 = []
    const vc4 = new VirtualConsole()
    vc4.on('jsdomError', (e) => jsErrors4.push(String((e && e.message) || e)))
    const skillsPayload = [
      { name: 'README', category: 'overview', order: 0, title: '全景总览', summary: '总览一句话', inProgress: false },
      { name: 'tdd', category: 'engineering', order: 13, title: '测试驱动开发', summary: 'tdd 一句话', inProgress: false },
      { name: 'writing-beats', category: 'in-progress', order: 4, title: '写作·节拍', summary: '节拍一句话', inProgress: true },
    ]
    const skillDocs = {
      README: '---\nname: README\ncategory: overview\n---\n\n# README\n\n全景正文，内链到 [tdd](tdd.md)。\n',
      tdd: '---\nname: tdd\ncategory: engineering\n---\n\n# tdd\n\n**红绿循环**是核心，`seam` 上开测。\n\n## 什么时候用\n\n- 先红后绿；\n\n- 一次一片。\n\n## 原文描述\n\n> Test-driven development.\n',
      'writing-beats': '---\nname: writing-beats\ncategory: in-progress\n---\n\n# writing-beats\n\n节拍正文。\n',
    }
    const skillCalls = []
    const skillsDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39314/',
      pretendToBeVisual: true,
      virtualConsole: vc4,
      beforeParse(window) {
        window.fetch = (u) => {
          const url = String(u)
          skillCalls.push(url)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify({ ...ws, root: '/tmp/fd-skills', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [] })) })
          }
          if (/\/api\/skills\/?$/.test(url)) {
            return Promise.resolve({ ok: true, json: async () => ({ skills: skillsPayload }) })
          }
          if (url.indexOf('/api/skills/') >= 0) {
            const name = decodeURIComponent(url.split('/api/skills/')[1])
            return Promise.resolve({ ok: true, status: 200, text: async () => skillDocs[name] })
          }
          return Promise.reject(new Error('技能弹窗场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const sDoc = skillsDom.window.document
    const modal = sDoc.getElementById('skillsModal')
    assert.equal(modal.hasAttribute('hidden'), true, '弹窗初始隐藏')
    sDoc.getElementById('skillsBtn').dispatchEvent(new skillsDom.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(modal.hasAttribute('hidden'), false, '点「技能包」打开弹窗')
    assert.equal(skillCalls.filter((u) => /\/api\/skills\/?$/.test(u)).length, 1, '清单只拉一次')
    const navItems = Array.from(sDoc.querySelectorAll('#skillsNav .item'))
    assert.equal(navItems.length, 3, '侧栏每个技能一个条目')
    assert.match(sDoc.querySelector('#skillsNav .cat').textContent, /总览/, '分类标题分组展示')
    const beatsBtn = navItems.find((b) => b.querySelector('.en').textContent === 'writing-beats')
    assert.ok(beatsBtn.querySelector('.chip'), 'in-progress 条目亮「开发中」徽标')
    const article = sDoc.getElementById('skillsDoc')
    assert.equal(article.querySelector('h1').textContent, 'README', '默认打开总览')
    const innerLink = article.querySelector('a')
    assert.equal(innerLink.textContent, 'tdd', '文档内链渲染为链接')
    innerLink.dispatchEvent(new skillsDom.window.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(article.querySelector('h1').textContent, 'tdd', '点内链切换到该技能的介绍')
    assert.ok(article.querySelector('b'), '粗体渲染')
    assert.equal(article.querySelectorAll('li').length, 2, '列表渲染（空行分隔的松散列表算一张）')
    assert.match(article.querySelector('blockquote').textContent, /Test-driven development\./, '引用块渲染')
    const navAfter = Array.from(sDoc.querySelectorAll('#skillsNav .item'))
    assert.ok(navAfter.find((b) => b.querySelector('.en').textContent === 'tdd').className.indexOf('on') >= 0, '侧栏高亮当前技能')
    sDoc.dispatchEvent(new skillsDom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(modal.hasAttribute('hidden'), true, 'Esc 关闭弹窗')
    assert.equal(sDoc.body.style.overflow, '', '关闭后恢复页面滚动')
    assert.deepEqual(jsErrors4, [])
    skillsDom.window.close()
    ok('技能包弹窗：按钮打开、清单分组渲染、「开发中」徽标、内链切换、Markdown 渲染、Esc 关闭，全套可用')

    // ── 稳定阅读 + 设置弹窗：签名跳过重画、滚动恢复、Markdown 三扩展、阅读弹窗快照、设置表单 ──
    const jsErrors5 = []
    const vc5 = new VirtualConsole()
    vc5.on('jsdomError', (e) => jsErrors5.push(String((e && e.message) || e)))
    const stableCalls = []
    const mdSpec = [
      'Status: ready-for-agent', '',
      '# 想法 B 规格', '',
      '目标：全站搜索，先做 *索引核心*，再做 **分词器**。', '',
      '| 票 | 批次 |', '|---|---|', '| 01 | 索引 |', '| 02 | 分词 |', '',
      '```', '命令里的 ** 和 | 都不生效', '```', '',
      '蛇形词 snake_case 不斜体，_词边界斜体_ 才斜体。', '',
    ].join('\n')
    let stablePayload = JSON.parse(JSON.stringify({
      ...ws, root: '/tmp/fd-stable', pollMs: 5000, host: '127.0.0.1', port: 3210,
      tokenEnabled: true, configPath: '/tmp/config.json', recentRoots: [],
    }))
    stablePayload.efforts.find((e) => e.slug === 'idea-b').spec.content = mdSpec
    // 生效语义契约的可覆写桩：默认按 host/port=restart、其余 immediate；用例可换成未知值验证前端稳健性
    let appliedOverride = null
    const stableDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39315/',
      pretendToBeVisual: true,
      virtualConsole: vc5,
      beforeParse(window) {
        window.confirm = () => true
        window.fetch = (u, opts) => {
          const url = String(u)
          stableCalls.push({ url, opts })
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(stablePayload)) })
          }
          if (url.indexOf('/api/config') >= 0 && opts && opts.method === 'POST') {
            const body = JSON.parse(opts.body)
            const applied = {}
            Object.keys(body).forEach((k) => { applied[k] = k === 'host' || k === 'port' ? 'restart' : 'immediate' })
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: '/tmp/fd-stable', applied: appliedOverride || applied }) })
          }
          return Promise.reject(new Error('稳定阅读场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const stDoc = stableDom.window.document
    const stWin = stableDom.window
    const stRefresh = async () => {
      stDoc.getElementById('refreshBtn').dispatchEvent(new stWin.Event('click', { bubbles: true }))
      await tick()
      await tick()
    }
    const findReadBtn = () => Array.from(stDoc.querySelectorAll('.cardhead button')).find((b) => b.textContent === '展开阅读')

    // 渲染器直测：表格 / 围栏代码块 / 斜体 / 头部字段行剥除 / 孤立 | 行降级
    const mdBox = stDoc.createElement('div')
    stWin.renderMarkdown(mdSpec, mdBox)
    assert.ok(mdBox.querySelector('table thead'), '表格渲染进 thead')
    assert.equal(mdBox.querySelectorAll('tbody tr').length, 2, '表体两行')
    assert.equal(mdBox.querySelectorAll('tbody td').length, 4, '单元格数量对')
    assert.ok(mdBox.textContent.indexOf('Status:') < 0, '头部机器字段行剥除')
    const mdPre = mdBox.querySelector('pre code')
    assert.ok(mdPre && mdPre.textContent.indexOf('** 和 |') >= 0, '围栏代码块原样保留 ** 与 |')
    const italics = Array.from(mdBox.querySelectorAll('i')).map((i) => i.textContent)
    assert.ok(italics.includes('索引核心'), '*斜体* 生效')
    assert.ok(italics.includes('词边界斜体'), '_斜体_ 生效')
    assert.ok(!italics.some((t) => t.indexOf('snake_case') >= 0), 'snake_case 不斜体')
    const mdBox2 = stDoc.createElement('div')
    stWin.renderMarkdown('孤立行 | 没有 | 分隔行', mdBox2)
    assert.ok(!mdBox2.querySelector('table'), '无分隔行的 | 行降级为段落')
    ok('渲染器扩展：表格/围栏代码块/斜体渲染正确，头部字段行剥除，孤立 | 行降级')

    // 规格卡片轻渲染：切到 idea-b 看卡片
    Array.from(stDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf('idea-b') === 0).dispatchEvent(new stWin.Event('click'))
    await tick()
    const preview = stDoc.querySelector('.spec-preview')
    assert.ok(preview, '规格卡片正文是 .md 轻渲染容器')
    assert.ok(preview.querySelector('table'), '卡片内表格已渲染')
    assert.ok(preview.textContent.indexOf('Status:') < 0, '卡片内不出现字段行')
    assert.ok(findReadBtn(), '规格卡片头部有「展开阅读」按钮')

    // map/spec 卡头 "!" 徽标（票 03）：文件过大截断警告经同一徽标通道出现在卡片头
    stablePayload.efforts.find((e) => e.slug === 'idea-b').map.formatWarnings = [
      { kind: 'oversized', line: '', message: '文件过大，已截断（实际 2000000 字节，只读了前 1MB）——内容按截断文本尽力推导' },
    ]
    stablePayload.efforts.find((e) => e.slug === 'idea-b').spec.formatWarnings = [
      { kind: 'oversized', line: '', message: '文件过大，已截断（实际 2000000 字节，只读了前 1MB）——内容按截断文本尽力推导' },
    ]
    await stRefresh()
    const mapHead = Array.from(stDoc.querySelectorAll('.cols .card h2')).find((h) => h.textContent.indexOf('地图（map.md）') === 0)
    assert.ok(mapHead.querySelector('.warn'), 'map 卡头亮 "!" 徽标')
    assert.match(mapHead.querySelector('.warn').title, /文件过大/, '徽标 tooltip 给警告原文')
    const specTitleEl = Array.from(stDoc.querySelectorAll('.cols .card h2')).find((h) => h.textContent.indexOf('规格（spec.md）') === 0)
    assert.ok(specTitleEl.querySelector('.warn'), 'spec 卡头亮 "!" 徽标')

    // 签名跳过：同载荷刷新，#main 原地不动（元素身份不变）
    const markerNode = stDoc.querySelector('.spec-preview')
    await stRefresh()
    assert.equal(stDoc.querySelector('.spec-preview'), markerNode, '数据没变：#main DOM 一根手指都不碰')

    // 滚动恢复：数据变了重建 #main，容器滚动位置保住
    markerNode.scrollTop = 64
    stablePayload.efforts.find((e) => e.slug === 'idea-b').spec.content = mdSpec.replace('全站搜索', '全站搜索 v2')
    await stRefresh()
    const preview2 = stDoc.querySelector('.spec-preview')
    assert.notEqual(preview2, markerNode, '数据变了：#main 重建')
    assert.equal(preview2.scrollTop, 64, '重画后滚动位置恢复')
    assert.ok(preview2.textContent.indexOf('v2') >= 0, '新数据进入卡片')
    ok('刷新不打断：数据没变不重画；数据变了重画但滚动位置保住')

    // 阅读弹窗：开-关回路（Esc 归还焦点）+ 快照语义（后台刷新不改弹窗内容）
    const readBtn3 = findReadBtn()
    readBtn3.focus()
    readBtn3.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    const readModal = stDoc.getElementById('readModal')
    assert.equal(readModal.hasAttribute('hidden'), false, '「展开阅读」打开弹窗')
    assert.ok(stDoc.getElementById('readDoc').querySelector('table'), '弹窗内 Markdown 渲染')
    stDoc.dispatchEvent(new stWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(readModal.hasAttribute('hidden'), true, 'Esc 关闭阅读弹窗')
    assert.equal(stDoc.activeElement, readBtn3, '关闭后焦点归还触发按钮')
    const readBtn4 = findReadBtn()
    readBtn4.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    stablePayload.efforts.find((e) => e.slug === 'idea-b').spec.content = mdSpec.replace('全站搜索', '全站搜索 v3')
    await stRefresh()
    assert.ok(stDoc.getElementById('readDoc').textContent.indexOf('v3') < 0, '后台刷新不改弹窗内容（快照语义）')
    assert.ok(stDoc.querySelector('.spec-preview').textContent.indexOf('v3') >= 0, '卡片预览照常跟随新数据')
    stDoc.getElementById('readMask').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    assert.equal(readModal.hasAttribute('hidden'), true, '点遮罩关闭阅读弹窗')
    ok('规格阅读弹窗：按钮打开、Markdown 渲染、轮询快照不打扰、Esc/遮罩关闭且焦点归还')

    // 设置弹窗：表单初值、只提交变更字段、生效 toast、token 只写不读与清除
    const setBtn = stDoc.getElementById('settingsBtn')
    setBtn.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    const setModal = stDoc.getElementById('settingsModal')
    assert.equal(setModal.hasAttribute('hidden'), false, '点「设置」打开弹窗')
    assert.equal(stDoc.getElementById('setPollMs').value, '5000', 'pollMs 初值来自 /api/state')
    assert.equal(stDoc.getElementById('setPollMode').value, 'observe', '轮询模式初值 observe（载荷未带时回落默认）')
    assert.equal(stDoc.getElementById('setHost').value, '127.0.0.1', 'host 初值来自运行值')
    assert.equal(stDoc.getElementById('setPort').value, '3210', 'port 初值来自运行值')
    assert.equal(stDoc.getElementById('setToken').value, '', '令牌不回显当前值')
    assert.equal(stDoc.getElementById('setToken').placeholder, '已启用——输入新值可替换', '已启用时只给状态提示')
    assert.equal(stDoc.getElementById('setTokenClearRow').hidden, false, '已启用时出现「清除令牌」')
    stDoc.getElementById('setPollMs').value = '3000'
    stDoc.getElementById('setHost').value = '0.0.0.0'
    stDoc.getElementById('settingsSave').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    const configPosts = () => stableCalls.filter((c) => c.opts && c.opts.method === 'POST' && String(c.url).indexOf('/api/config') >= 0)
    assert.deepEqual(Object.keys(JSON.parse(configPosts()[configPosts().length - 1].opts.body)).sort(), ['host', 'pollMs'], '保存只提交变更字段')
    assert.equal(setModal.hasAttribute('hidden'), true, '保存成功后关闭弹窗')
    assert.match(stDoc.getElementById('toast').textContent, /已生效：轮询间隔/, 'toast 区分即时生效')
    assert.match(stDoc.getElementById('toast').textContent, /重启后生效：监听地址/, 'toast 区分重启生效')

    // 换令牌：保存后本地记忆与后续请求头同步（令牌值不进 DOM 文本）
    setBtn.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    stDoc.getElementById('setToken').value = 'tok-new'
    stDoc.getElementById('settingsSave').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(stWin.localStorage.getItem('flowdeck-token'), 'tok-new', '新令牌记忆到 localStorage')
    await stRefresh()
    assert.equal(stableCalls[stableCalls.length - 1].opts.headers['X-FlowDeck-Token'], 'tok-new', '后续请求自动携带新令牌')

    // 清除令牌：二次确认（已打桩）→ 保存空串 → 本地记忆抹去
    setBtn.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    stDoc.getElementById('setTokenClear').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(stDoc.getElementById('setTokenHint').textContent.indexOf('已标记清除') >= 0, true, '清除标记有明确提示')
    stDoc.getElementById('settingsSave').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.deepEqual(JSON.parse(configPosts()[configPosts().length - 1].opts.body), { token: '' }, '清除令牌提交空串')
    assert.equal(stWin.localStorage.getItem('flowdeck-token'), null, '本地记忆抹去')

    // 生效语义契约：前端只特判 restart——未知 applied 值一律按立即生效（对演进稳健）
    appliedOverride = { pollMs: '某个未来的新词' }
    setBtn.dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    stDoc.getElementById('setPollMs').value = '4000'
    stDoc.getElementById('setPollMode').value = 'manual'
    stDoc.getElementById('settingsSave').dispatchEvent(new stWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.match(stDoc.getElementById('toast').textContent, /已生效：轮询间隔/, '未知 applied 值按立即生效')
    const lastBody = JSON.parse(configPosts()[configPosts().length - 1].opts.body)
    assert.equal(lastBody.pollMode, 'manual', '轮询模式变更进保存补丁')
    assert.deepEqual(jsErrors5, [])
    stableDom.window.close()
    ok('设置弹窗：表单初值来自盘点、保存只提交变更字段、toast 区分生效时机、令牌只写不读（换/清除都同步本地记忆）')

    // ── 桌面通知（票 04）：stub Notification——开关与权限回落、事件文案、积压聚合一条、点击切 effort ──
    const jsErrorsN = []
    const vcN = new VirtualConsole()
    vcN.on('jsdomError', (e) => jsErrorsN.push(String((e && e.message) || e)))
    const nfyTickets = () => [
      { key: '01', fileName: '01-a.md', title: '通知票', state: 'open', status: 'ready-for-agent', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
    ]
    const nfyEffort = (slug, fogCount) => {
      const tickets = slug === 'beta' ? nfyTickets() : []
      return {
        slug, title: slug + ' 标题',
        map: { exists: true, title: '', destination: '终点', fog: [], decisions: [], outOfScope: [], fogCount, progress: null, formatWarnings: [] },
        spec: { exists: true, title: '', contentLength: 10, content: '# 规格', formatWarnings: [] },
        git: null,
        tickets,
        latestAt: '2026-09-18T00:00:00Z',
        chain: deriveChain({ slug, map: { exists: true, destination: '终点', fogCount }, spec: { exists: true, contentLength: 10 }, tickets }),
      }
    }
    let nfyPayload = {
      root: '/tmp/fd-notify-ui', rootName: 'fd-notify-ui', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 1000, pollMode: 'observe', configPath: '/tmp/config.json', recentRoots: [],
      efforts: [nfyEffort('alpha', 0), nfyEffort('beta', 2)],
    }
    const rechain = (e) => {
      e.chain = deriveChain({ slug: e.slug, map: { exists: e.map.exists, destination: e.map.destination, fogCount: e.map.fogCount }, spec: { exists: e.spec.exists, contentLength: e.spec.contentLength }, tickets: e.tickets })
    }
    // Notification 桩：记录实例与点击句柄；requestPermission 可编程应答，permission 随结果走（同真浏览器）
    const nfyMade = []
    let nfyGrant = 'granted'
    function FakeNotification(title, opts) {
      const inst = { title, body: opts && opts.body, clicks: [] }
      inst.addEventListener = (ev, fn) => { if (ev === 'click') inst.clicks.push(fn) }
      nfyMade.push(inst)
      return inst // 构造函数显式返回对象：new 出来的才是这个实例（否则是空 this，addEventListener 无从挂）
    }
    FakeNotification.permission = 'default'
    FakeNotification.requestPermissionCalls = 0
    FakeNotification.requestPermission = () => {
      FakeNotification.requestPermissionCalls++
      return Promise.resolve(nfyGrant).then((r) => { FakeNotification.permission = r; return r })
    }
    const nfyStateCalls = []
    let nfyFocus = 0
    const notifyDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39330/',
      pretendToBeVisual: true,
      virtualConsole: vcN,
      beforeParse(window) {
        window.Notification = FakeNotification
        window.focus = () => { nfyFocus++ }
        window.fetch = (u) => {
          const url = String(u)
          if (url.indexOf('/api/state') >= 0) {
            nfyStateCalls.push(url)
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(nfyPayload)) })
          }
          return Promise.reject(new Error('通知场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const nDoc = notifyDom.window.document
    const nWin = notifyDom.window
    const nBox = () => nDoc.getElementById('setNotify')
    const nToggle = async (on) => {
      nBox().checked = on
      nBox().dispatchEvent(new nWin.Event('change', { bubbles: true }))
      await tick()
      await tick()
    }

    // 开关：默认关；开启即申请权限，granted 后偏好落本浏览器、不进任何 POST
    assert.equal(nWin.localStorage.getItem('flowdeck-notify'), null, '默认关：本地无偏好')
    nDoc.getElementById('settingsBtn').dispatchEvent(new nWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(nBox().checked, false, '弹窗初值 = 本地偏好（关）')
    await nToggle(true)
    assert.equal(FakeNotification.requestPermissionCalls, 1, '开启即申请权限（时机由用户掌控）')
    assert.equal(nWin.localStorage.getItem('flowdeck-notify'), '1', 'granted 后偏好记本浏览器')
    assert.equal(nBox().checked, true, '授权成功开关保持开')
    assert.match(nDoc.getElementById('toast').textContent, /已开启/, '开启有 toast 播报')

    // 拒绝回落：关掉再开、这次应答 denied——开关回落、偏好抹去、toast 给补救路径
    await nToggle(false)
    assert.equal(nWin.localStorage.getItem('flowdeck-notify'), null, '关掉即抹去偏好')
    FakeNotification.permission = 'default' // 授权状态归零：模拟一台从没允许过的浏览器（真浏览器 granted 后不会再问）
    nfyGrant = 'denied'
    await nToggle(true)
    assert.equal(FakeNotification.requestPermissionCalls, 2, '再次开启再次申请')
    assert.equal(nBox().checked, false, '被拒后开关回落')
    assert.equal(nWin.localStorage.getItem('flowdeck-notify'), null, '被拒不留偏好')
    assert.match(nDoc.getElementById('toast').textContent, /拒绝/, 'toast 给补救路径（站点设置）')
    assert.equal(FakeNotification.permission, 'denied', '桩的 permission 随应答结果走（同真浏览器）')
    // 重开走 toast 指的补救路径：用户在浏览器站点设置里允许后（permission 已是 granted，页面无需再申请）
    nfyGrant = 'granted'
    FakeNotification.permission = 'granted'
    await nToggle(true)
    assert.equal(nWin.localStorage.getItem('flowdeck-notify'), '1', '补救路径后开关生效')
    nDoc.dispatchEvent(new nWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(nDoc.getElementById('settingsModal').hasAttribute('hidden'), true, 'Esc 关设置弹窗')

    // 积压聚合：回前台补拍（visibilitychange）把攒下的 3 类变化（关票/迷雾/阶段完成）聚成一条
    assert.deepEqual(nfyMade, [], '此前零通知（开关才刚开）')
    const beta = nfyPayload.efforts.find((e) => e.slug === 'beta')
    beta.tickets[0].state = 'closed'
    beta.map.fogCount = 1
    rechain(beta)
    nDoc.dispatchEvent(new nWin.Event('visibilitychange'))
    await tick()
    await tick()
    assert.equal(nfyMade.length, 1, '积压聚合为一条（不逐条轰炸）')
    assert.equal(nfyMade[0].title, '流程板 · fd-notify-ui', '通知标题带项目名')
    assert.equal(nfyMade[0].body, '离开期间有 3 项变化', '三类事件（关票 + 迷雾 + 阶段完成）聚合成一条计数')
    const selectedBefore = nDoc.querySelector('#tabs button.on').textContent
    nfyMade[0].clicks.forEach((fn) => fn())
    assert.equal(nfyFocus, 1, '通知点击聚焦窗口')
    assert.equal(nDoc.querySelector('#tabs button.on').textContent, selectedBefore, '聚合通知不带 effort 上下文：只聚焦不切换')

    // 仅 mtime 变化：补拍零通知
    nfyPayload.generatedAt = '2026-09-18T09:00:00Z'
    nfyPayload.efforts.forEach((e) => { e.latestAt = '2026-09-18T09:00:00Z'; e.tickets.forEach((t) => { t.updatedAt = '2026-09-18T09:00:00Z' }) })
    nDoc.dispatchEvent(new nWin.Event('visibilitychange'))
    await tick()
    await tick()
    assert.equal(nfyMade.length, 1, '仅 mtime / generatedAt 变化零通知')

    // 定时拍逐条出事件：可见期间的轮询拍（非补拍、非主动）一条事件一条通知；点击切到涉及 effort
    beta.map.fogCount = 0
    rechain(beta)
    await new Promise((r) => setTimeout(r, 1400))
    const fogN = nfyMade.find((n) => n.body === 'beta：迷雾 1→0')
    assert.ok(fogN, '定时拍逐条出事件文案（beta：迷雾 1→0）')
    fogN.clicks.forEach((fn) => fn())
    assert.equal(nfyFocus, 2, '通知点击聚焦窗口')
    assert.match(nDoc.querySelector('#tabs button.on').textContent, /^beta/, '通知点击切到事件涉及的 effort')

    // 用户主动触发的拍不通知（人在看）：重开一张票后点「立即刷新」，事件发生但不弹
    beta.tickets[0].state = 'open'
    rechain(beta)
    const madeBeforeForce = nfyMade.length
    nDoc.getElementById('refreshBtn').dispatchEvent(new nWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(nfyMade.length, madeBeforeForce, '主动拍（force 且非补拍）不通知')
    assert.equal(nDoc.querySelectorAll('tr.ticket .state-open').length, 1, '主动拍照常更新界面（票重开可见）')

    // 惰性档联动：先把 manual 送达页面（主动拍不通知已验证），此后回前台零补拍（零请求零通知）
    nfyPayload.pollMode = 'manual'
    nDoc.getElementById('refreshBtn').dispatchEvent(new nWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    nfyPayload.efforts.find((e) => e.slug === 'beta').map.fogCount = 5
    rechain(nfyPayload.efforts.find((e) => e.slug === 'beta'))
    const callsBeforeManual = nfyStateCalls.length
    const madeBeforeManual = nfyMade.length
    await new Promise((r) => setTimeout(r, 200)) // 让残留的定时拍（如有）先跑完
    nDoc.dispatchEvent(new nWin.Event('visibilitychange'))
    await tick()
    await tick()
    assert.equal(nfyStateCalls.length, callsBeforeManual, '惰性档回前台零补拍')
    assert.equal(nfyMade.length, madeBeforeManual, '零自动拍零通知')
    assert.deepEqual(jsErrorsN, [])
    notifyDom.window.close()
    ok('桌面通知（jsdom）：开关开启即申请、被拒回落带补救提示；积压聚合一条「期间 N 项变化」、仅 mtime 零通知、定时拍逐条文案、点击聚焦并切 effort、主动拍与惰性档零通知')

    // ── 杂件三件（票 05）：导出快照（原始响应体）· 建骨架指令 · 技能联动定位 ──
    const jsErrorsM = []
    const vcM = new VirtualConsole()
    vcM.on('jsdomError', (e) => jsErrorsM.push(String((e && e.message) || e)))
    const miscTickets = [
      { key: '01', fileName: '01-a.md', title: '联动票', state: 'open', status: 'ready-for-agent', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' },
    ]
    const miscPayload = {
      root: '/tmp/fd-misc', rootName: 'fd-misc', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 60000, pollMode: 'manual', configPath: '/tmp/config.json', recentRoots: [],
      efforts: [{
        slug: 'demo', title: '联动演示',
        map: { exists: true, title: '', destination: '终点', fog: [], decisions: [], outOfScope: [], fogCount: 0, progress: null, formatWarnings: [] },
        spec: { exists: true, title: '', contentLength: 10, content: '# 规格', formatWarnings: [] },
        git: null,
        tickets: miscTickets,
        latestAt: '2026-09-18T00:00:00Z',
        chain: deriveChain({ slug: 'demo', map: { exists: true, destination: '终点', fogCount: 0 }, spec: { exists: true, contentLength: 10 }, tickets: miscTickets }),
      }],
    }
    // 原始响应体带缩进序列化：与 JSON.stringify(parsed) 的紧凑形态不同——钉「导的是原始响应体，不是重新序列化」
    const miscRaw = JSON.stringify(miscPayload, null, 2)
    const miscSkillDocs = {
      README: '# 技能包总览\n\n总览正文。\n',
      flowchain: '# flowchain\n\n四阶段导读正文。\n',
      'to-spec': '# to-spec\n\n规格技能正文。\n',
      implement: '# implement\n\n实现技能正文。\n',
    }
    // 清单里聚合页与总览同在 overview 分类、次序紧跟总览（服务端就是按 category + order 排的）
    const miscSkillsPayload = [
      { name: 'README', category: 'overview', order: 0 },
      { name: 'flowchain', category: 'overview', order: 1 },
      { name: 'to-spec', category: 'engineering', order: 0 },
      { name: 'implement', category: 'engineering', order: 0 },
    ].map((s) => ({ ...s, title: s.name, summary: s.name + ' 一句话', inProgress: false }))
    const miscCalls = []
    const miscCopies = []
    const miscDownloads = []
    const miscAnchorClicks = []
    let miscRevoked = 0
    const miscDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39331/',
      pretendToBeVisual: true,
      virtualConsole: vcM,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { miscCopies.push(t); return Promise.resolve() } } })
        // URL.createObjectURL / revokeObjectURL 与 <a>.click() 的桩：jsdom 没有对象 URL 与下载导航，
        // 桩住后把「给了哪个 Blob、文件名是什么」记录下来断言（内容读自 Blob 本体）
        window.URL.createObjectURL = (blob) => { const u = 'blob:fake-' + miscDownloads.length; miscDownloads.push({ blob, url: u }); return u }
        window.URL.revokeObjectURL = () => { miscRevoked++ }
        window.HTMLAnchorElement.prototype.click = function () { miscAnchorClicks.push(this) }
        window.fetch = (u) => {
          const url = String(u)
          miscCalls.push(url)
          if (url.indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, status: 200, text: async () => miscRaw, json: async () => JSON.parse(miscRaw) })
          }
          if (/\/api\/skills\/?$/.test(url)) {
            return Promise.resolve({ ok: true, status: 200, json: async () => ({ skills: miscSkillsPayload }) })
          }
          if (url.indexOf('/api/skills/') >= 0) {
            const name = decodeURIComponent(url.split('/api/skills/')[1])
            return Promise.resolve({ ok: true, status: 200, text: async () => (miscSkillDocs[name] || '') })
          }
          return Promise.reject(new Error('杂件场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const zpDoc = miscDom.window.document
    const zpWin = miscDom.window

    // 导出快照：按钮在首拍后可用；文件名 flowdeck-snapshot-<项目名>-<YYYYMMDD-HHmmss>.json（本地时区无冒号）
    assert.equal(zpDoc.getElementById('snapshotBtn').disabled, false, '首拍成功后快照按钮可用')
    zpDoc.getElementById('snapshotBtn').dispatchEvent(new zpWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(miscDownloads.length, 1, '点一下导出一个对象 URL')
    assert.equal(miscAnchorClicks.length, 1, '触发一次下载点击')
    assert.match(miscAnchorClicks[0].download, /^flowdeck-snapshot-fd-misc-\d{8}-\d{6}\.json$/, '文件名 = flowdeck-snapshot-<项目名>-<本地时间 YYYYMMDD-HHmmss>.json')
    assert.equal(miscAnchorClicks[0].href, miscDownloads[0].url, '下载锚点指向刚建的对象 URL')
    assert.equal(await miscDownloads[0].blob.text(), miscRaw, '快照内容 = 最近一拍盘点接口的原始响应体（带缩进原样，不重新序列化）')
    assert.equal(miscDownloads[0].blob.type, 'application/json', 'Blob 类型是 JSON')
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(miscRevoked, 1, '对象 URL 用完即释放')

    // 技能入口（票 02 减负）：链格内的大按钮行退役，标题行右上角常驻一个小「？」，
    // 点开打开技能包弹窗并定位到聚合页 flowchain（复用单篇懒加载端点，零新增机制）
    assert.equal(zpDoc.querySelectorAll('.stage .skillrow').length, 0, '链格内不再有技能按钮行')
    const chainQ = zpDoc.querySelector('.cardhead .chainq')
    assert.ok(chainQ, '「流程链」标题行右上角常驻一个「？」')
    // 阻断冒泡为什么有意义的根：按钮在 .chain 的**兄弟**位置、不在任何 .stage 里。链格本体
    // 可点复制指引词，只有「？」在 stage 内时两者才会互相干扰；现在结构上就碰不到，
    // stopPropagation() 是留给日后的护栏（谁再往标题行加个点击处理也不会连带触发）。
    assert.equal(chainQ.closest('.stage'), null, '「？」不在任何链格内（结构上就不可能误触链格的复制指引）')
    assert.equal(zpDoc.querySelector('.cardhead.chainhead'), chainQ.parentNode, '「？」挂在链卡的标题行上')
    assert.equal(chainQ.textContent, '？', '中文态按钮文案是「？」')
    assert.equal(chainQ.tagName, 'BUTTON', '原生 button（可 Tab 到达、Enter/Space 有默认键盘行为）')
    chainQ.focus()
    assert.equal(zpDoc.activeElement, chainQ, '「？」可聚焦（键盘可达）')
    assert.match(chainQ.getAttribute('aria-label'), /flowchain|四阶段|阶段/, 'aria-label 说明点开的是聚合导读')
    chainQ.dispatchEvent(new zpWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(zpDoc.getElementById('skillsModal').hasAttribute('hidden'), false, '点「？」打开技能包弹窗')
    assert.ok(miscCalls.some((u) => u.indexOf('/api/skills/flowchain') >= 0), '复用单篇懒加载端点取聚合页')
    assert.equal(zpDoc.getElementById('skillsDoc').querySelector('h1').textContent, 'flowchain', '清单回来后直接定位到聚合页（不是默认总览）')
    assert.deepEqual(miscCopies, [], '点「？」不得触发链格的复制指引（点击阻断冒泡）')
    assert.ok(Array.from(zpDoc.querySelectorAll('#skillsNav .item')).find((b) => b.querySelector('.en').textContent === 'flowchain').className.indexOf('on') >= 0, '侧栏高亮定位篇')
    // 聚合页在导航里就是一条普通条目，落在总览分类下、与总览篇相邻（不是被藏起来的第二套路）
    const navCats = Array.from(zpDoc.querySelectorAll('#skillsNav .cat')).map((c) => c.textContent)
    const navNames = Array.from(zpDoc.querySelectorAll('#skillsNav .item .en')).map((s) => s.textContent)
    assert.equal(navCats[0], '总览', '总览分类仍排第一')
    assert.deepEqual(navNames, ['README', 'flowchain', 'to-spec', 'implement'], '聚合页与总览篇同在总览分类下、次序紧跟其后')
    // 已开窗再定位：点另一条进弹窗的路直接换篇，清单不重拉
    const listCallsBefore = miscCalls.filter((u) => /\/api\/skills\/?$/.test(u)).length
    zpDoc.getElementById('skillsBtn').dispatchEvent(new zpWin.Event('click', { bubbles: true }))
    Array.from(zpDoc.querySelectorAll('#skillsNav .item')).find((b) => b.querySelector('.en').textContent === 'to-spec')
      .dispatchEvent(new zpWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.equal(zpDoc.getElementById('skillsDoc').querySelector('h1').textContent, 'to-spec', '已开窗从侧栏换篇直接换文')
    assert.equal(miscCalls.filter((u) => /\/api\/skills\/?$/.test(u)).length, listCallsBefore, '清单只拉一次')
    // 死代码零残留（票 02）：只服务那排大按钮的词条与样式一并撤掉——留在词表和 CSS 里只会
    // 误导下一个改的人（「链格里还有技能按钮吗」）。渲染层不再碰 s.skills。
    for (const deadKey of ['stage.skill.label', 'stage.skill.title']) {
      assert.equal(SHELL_TEXT[deadKey], undefined, '退役按钮的词条已撤掉：' + deadKey)
    }
    assert.equal(appCss.indexOf('.skillrow'), -1, '链格技能按钮行的 .skillrow 样式已撤掉')
    assert.equal(deckHtml.indexOf("el('div', 'skillrow')"), -1, '链格不再渲染 skillrow 容器')
    // 标题行弹性布局：钉关键声明（jsdom 无布局，钉不了换行后的像素）
    assert.match(appCss, /\.cardhead\s*\{[^}]*display:\s*flex/, '标题行是弹性布局')
    assert.match(appCss, /\.cardhead h2\s*\{[^}]*flex:\s*1/, '标题 flex:1')
    assert.match(appCss, /\.cardhead\.chainhead h2\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/, '换行规则只加在链卡标题行上（min-width:0 + 允许断词），共享的 .cardhead h2 不被顺手改到')
    assert.doesNotMatch(appCss, /\.cardhead h2\s*\{[^}]*overflow-wrap/, '共享的 .cardhead h2 上不留换行规则的全局副作用')
    assert.match(appCss, /\.cardhead button\s*\{[^}]*flex:\s*none/, '「？」flex:none（不参与拉伸，钉在行右侧）')
    assert.ok(deckHtml.indexOf("openSkillsModal(FLOWCHAIN_DOC)") > 0, '「？」定位的目标走 FLOWCHAIN_DOC 常量')
    assert.match(deckHtml, /var FLOWCHAIN_DOC = 'flowchain'/, '聚合页 slug 是一处具名常量（改名只改这一处 + 文件名）')
    zpDoc.dispatchEvent(new zpWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.deepEqual(jsErrorsM, [])
    miscDom.window.close()
    ok('导出快照 + 流程链技能入口（jsdom + 文件级）：文件名含项目名与本地时间、内容为原始响应体原样（不重新序列化）、对象 URL 用完释放；链格内按钮行退役（stage.skill.* 词条与 .skillrow 样式零残留）、标题行「？」可 Tab 到达且开弹窗即定位聚合页 flowchain、不误触复制，聚合页在导航里是总览分类下的普通条目；已开窗换篇不重拉清单')

    // ── 建骨架指令（票 05）：空态页「工作约定」旁的第二段一键复制 ──
    const jsErrorsS = []
    const vcS = new VirtualConsole()
    vcS.on('jsdomError', (e) => jsErrorsS.push(String((e && e.message) || e)))
    const scaffoldCopies = []
    const scaffoldDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39332/',
      pretendToBeVisual: true,
      virtualConsole: vcS,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { scaffoldCopies.push(t); return Promise.resolve() } } })
        window.fetch = (u) => {
          if (String(u).indexOf('/api/state') >= 0) {
            return Promise.resolve({ ok: true, json: async () => ({ root: '/tmp/fd-scaffold', rootName: 'fd-scaffold', generatedAt: '2026-09-18T00:00:00Z', scratchExists: false, efforts: [], pollMs: 60000, pollMode: 'manual', configPath: '/tmp/config.json', recentRoots: [] }) })
          }
          return Promise.reject(new Error('空态场景不该请求别的接口：' + u))
        }
      },
    })
    await new Promise((r) => setTimeout(r, 150))
    const scDoc = scaffoldDom.window.document
    const scWin = scaffoldDom.window
    const scPres = Array.from(scDoc.querySelectorAll('pre.agreement'))
    assert.equal(scPres.length, 2, '空态页有两段可复制文本（工作约定 + 建骨架指令）')
    assert.doesNotMatch(scPres[0].textContent, /\bgit\b/, '工作约定副本零 git 措辞（custom-guides 01）')
    assert.match(scPres[1].textContent, /\.scratch\/<特性名>\/map\.md/, '骨架指令给出相对追踪目录的 map.md 路径')
    assert.match(scPres[1].textContent, /Destination/, '要求 Destination 一节')
    assert.match(scPres[1].textContent, /Not yet specified/, '要求 Not yet specified 一节')
    assert.match(scPres[1].textContent, /盘点就会出现这个新 effort/, '一句预期盘点变化')
    const scaffoldBtn = Array.from(scDoc.querySelectorAll('.empty button')).find((b) => b.textContent === '复制建骨架指令')
    scaffoldBtn.dispatchEvent(new scWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(scaffoldCopies.length, 1, '点一下复制一段')
    assert.equal(scaffoldCopies[0], scPres[1].textContent, '复制的内容就是展示的指令原文')
    Array.from(scDoc.querySelectorAll('.empty button')).find((b) => b.textContent === '复制工作约定').dispatchEvent(new scWin.Event('click', { bubbles: true }))
    await tick()
    assert.equal(scaffoldCopies.length, 2)
    assert.equal(scaffoldCopies[1], scPres[0].textContent, '两段各自复制各自的（互不串台）')
    assert.deepEqual(jsErrorsS, [])
    scaffoldDom.window.close()
    ok('建骨架指令（jsdom）：空态页第二段在位（map.md 相对路径 + Destination/Not yet specified + 预期盘点变化），一键复制、与工作约定互不串台')

    // ── 语言切换细线（english-ui 票 01）：初始语言按浏览器语言判定 · 顶栏按钮即时中英互换 · 偏好落本浏览器 ──
    const langPayload = { ...ws, root: '/tmp/fd-lang', pollMs: 5000, configPath: '/tmp/config.json', recentRoots: [], stageNames: STAGE_TABLE }
    const ZH_NAMES = ['Grill 拷问', 'To-Spec 规格', 'To-Tickets 拆票', 'Implement 实现']
    const EN_NAMES = ['Grill', 'To-Spec', 'To-Tickets', 'Implement']
    const EN_SUBS = ['Idea → map.md', 'Understanding → spec.md', 'Spec → issues/ tickets', 'Ticket by ticket → all closed']
    const langCalls = []
    /** 起一版界面：browserTags = 浏览器偏好语言列表，stored = 本浏览器已记的界面语言（null = 没记过）。
        每个实例换端口——localStorage 按源分家，端口不同即互不串台。 */
    function langDom(port, browserTags, stored) {
      const errs = []
      const vcL = new VirtualConsole()
      vcL.on('jsdomError', (e) => errs.push(String((e && e.message) || e)))
      const d = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:' + port + '/',
        pretendToBeVisual: true,
        virtualConsole: vcL,
        beforeParse(window) {
          if (browserTags) Object.defineProperty(window.navigator, 'languages', { value: browserTags, configurable: true })
          if (stored) window.localStorage.setItem('flowdeck-lang', stored)
          window.fetch = fetchRouter([
            ['/api/state', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(langPayload)) })],
          ], '语言用例不该请求别的接口', (url) => { langCalls.push(url) })
        },
      })
      return { d, errs }
    }
    const settle = async () => { await new Promise((r) => setTimeout(r, 150)) }
    const stageNames = (doc) => Array.from(doc.querySelectorAll('.stage .name')).map((n) => n.textContent)
    const stageSubs = (doc) => Array.from(doc.querySelectorAll('.stage .tiny')).map((n) => n.textContent)

    // 中文浏览器 + 没记过偏好 → 中文界面；阶段名的中文列就是服务端下发原文（界面直接读载荷列，词表不长第二套中文真相）
    const zhCase = langDom(39333, ['zh-CN', 'zh'], null)
    await settle()
    const zhDoc = zhCase.d.window.document
    assert.deepEqual(stageNames(zhDoc), ZH_NAMES)
    assert.deepEqual(stageNames(zhDoc), langPayload.efforts[0].chain.stages.map((s) => s.title), '中文态链格阶段名应为服务端下发原文')
    assert.deepEqual(stageSubs(zhDoc), langPayload.efforts[0].chain.stages.map((s) => s.subtitle), '中文态链格副题也应为服务端下发原文（副题与阶段名同走载荷列，漂移即红）')
    assert.equal(zhDoc.getElementById('langBtn').textContent, 'EN', '中文态按钮给的是切过去的那个语言')
    // 判不中默认中文（现状不劣化）
    const frCase = langDom(39334, ['fr-FR', 'fr'], null)
    await settle()
    assert.deepEqual(stageNames(frCase.d.window.document), ZH_NAMES, '非英文系浏览器判不中 → 默认中文')
    // 英文系浏览器、没记过偏好 → 英文界面
    const enCase = langDom(39335, ['en-GB', 'en'], null)
    await settle()
    const enDoc = enCase.d.window.document
    assert.deepEqual(stageNames(enDoc), EN_NAMES, '英文系浏览器首开即英文')
    assert.deepEqual(stageSubs(enDoc), EN_SUBS)
    assert.equal(enDoc.getElementById('langBtn').textContent, '中文')
    assert.ok(enDoc.querySelectorAll('.stage')[0].getAttribute('aria-label').indexOf('Grill·') === 0, '兜底层 aria-label 与展示同语言')
    // 点一下：即时互换，不发请求
    const callsBeforeToggle = langCalls.length
    enDoc.getElementById('langBtn').dispatchEvent(new enCase.d.window.Event('click', { bubbles: true }))
    assert.deepEqual(stageNames(enDoc), ZH_NAMES, '英文态点按钮回中文')
    assert.equal(enCase.d.window.localStorage.getItem('flowdeck-lang'), 'zh', '显式选择记进本浏览器')
    zhDoc.getElementById('langBtn').dispatchEvent(new zhCase.d.window.Event('click', { bubbles: true }))
    assert.deepEqual(stageNames(zhDoc), EN_NAMES, '中文态点按钮切英文')
    assert.deepEqual(Array.from(zhDoc.querySelectorAll('.stage .tiny')).map((n) => n.textContent), EN_SUBS, '副标题同格一起翻')
    assert.equal(zhDoc.getElementById('langBtn').textContent, '中文', '按钮文案跟着当前语言走')
    assert.equal(langCalls.length, callsBeforeToggle, '切换零请求：不重盘点、不刷页面')
    assert.deepEqual(zhCase.errs, [])
    assert.deepEqual(enCase.errs, [])
    zhCase.d.window.close()
    frCase.d.window.close()
    enCase.d.window.close()
    ok('语言切换（jsdom）：初始语言按浏览器语言判定（en-* 英文、判不中默认中文）、顶栏按钮即时中英互换且零请求、选择记进 localStorage')

    // 重开页面（新实例带着本浏览器记忆）：偏好优先于浏览器语言
    const keepEn = langDom(39336, ['zh-CN', 'zh'], 'en')
    await settle()
    assert.deepEqual(stageNames(keepEn.d.window.document), EN_NAMES, '中文浏览器 + 记过英文 → 仍是英文')
    assert.ok(keepEn.d.window.document.querySelectorAll('.stage')[0].getAttribute('aria-label').indexOf('Grill·') === 0)
    const keepZh = langDom(39337, ['en-US', 'en'], 'zh')
    await settle()
    assert.deepEqual(stageNames(keepZh.d.window.document), ZH_NAMES, '英文浏览器 + 记过中文 → 尊重所选')
    assert.equal(keepEn.errs.length, 0)
    assert.equal(keepZh.errs.length, 0)
    keepEn.d.window.close()
    keepZh.d.window.close()
    ok('语言持久化（jsdom）：语言偏好存浏览器侧、优先于浏览器语言，重开页面保持所选')

    // ── 三主题并列（ui-appearance 票 02）：默认冷白住在标记上，顶栏三选下拉，legacy 迁移，白名单可服务 ──
    // 文件级钉：三套 token 字面平级（各自 :root[data-theme=<名>]，无充当无条件 base 的主题），
    // 冷白保留自身色值（朱红 #b1413e，不对齐暖纸的 #b0413e）
    assert.match(deckHtml, /<html[^>]*data-theme="cold"/, '默认冷白是静态标记属性（无 JS / 存储抛错也命中）')
    const coldCss = await fs.readFile(nodePath.join(HERE, 'styles', 'tokens-cold.css'), 'utf8')
    const paperCss = await fs.readFile(nodePath.join(HERE, 'styles', 'tokens-paper.css'), 'utf8')
    const darkCss = await fs.readFile(nodePath.join(HERE, 'styles', 'tokens-github-dark.css'), 'utf8')
    assert.match(coldCss, /:root\[data-theme="cold"\] \{/)
    assert.match(paperCss, /:root\[data-theme="paper"\] \{/)
    assert.match(darkCss, /:root\[data-theme="dark"\] \{/)
    assert.ok(!/^:root \{/m.test(coldCss) && !/^:root \{/m.test(paperCss) && !/^:root \{/m.test(darkCss), '没有任何主题充当无条件 :root 基底')
    assert.match(coldCss, /--accent: #b1413e/, '冷白保留自身朱红（不对齐暖纸）')
    assert.match(paperCss, /--accent: #b0413e/)
    // 语义一一对齐：冷白与暖纸定义的 token 名完全同集，暗色是其超集（多出的全是 GitHub 专属槽位，业务侧 var(name, 回落) 消费）
    const tokenNames = (css) => [...css.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]).sort()
    assert.deepEqual(tokenNames(coldCss), tokenNames(paperCss), '冷白与暖纸的 token 名同集（光源语义对齐）')
    assert.deepEqual(
      tokenNames(darkCss).filter((n) => !tokenNames(coldCss).includes(n)),
      ['--btn-primary', '--btn-primary-hover', '--fog-ink', '--key-ink', '--mark-bg', '--mark-ink'],
      '暗色只多出 GitHub 专属槽位')
    // 冷白 token 经白名单可被 HTTP 服务
    const themeServer = await startServer({ root: tmp, port: 0 })
    try {
      const coldRes = await fetch(themeServer.url + '/styles/tokens-cold.css')
      assert.equal(coldRes.status, 200, 'tokens-cold.css 经白名单可服务')
      assert.match(coldRes.headers.get('content-type') || '', /^text\/css/)
      assert.match(await coldRes.text(), /:root\[data-theme="cold"\]/)
    } finally {
      await new Promise((r) => themeServer.server.close(r))
    }
    // 界面级钉（jsdom）：外观两键共用一个夹具——stored 预置 flowdeck-theme、storedScale 预置
    // flowdeck-ui-scale，传 null 即「本浏览器没记过」。命名跟着「外观」这件事走，不跟着票 02 的主题走。
    function appearanceDom(port, stored, storedScale) {
      const errs = []
      const vcT = new VirtualConsole()
      vcT.on('jsdomError', (e) => errs.push(String((e && e.message) || e)))
      const d = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:' + port + '/',
        pretendToBeVisual: true,
        virtualConsole: vcT,
        beforeParse(window) {
          if (stored) window.localStorage.setItem('flowdeck-theme', stored)
          if (storedScale) window.localStorage.setItem('flowdeck-ui-scale', storedScale)
          window.fetch = fetchRouter([
            ['/api/state', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(statePayload)) })],
          ], '主题/缩放用例不该请求别的接口')
        },
      })
      return { d, errs }
    }
    const pickTheme = (c, v) => {
      const sel = c.d.window.document.getElementById('themeSelect')
      sel.value = v
      sel.dispatchEvent(new c.d.window.Event('change'))
    }
    const themeAttr = (c) => c.d.window.document.documentElement.getAttribute('data-theme')
    const plain = appearanceDom(39351, null)
    await settle()
    assert.equal(themeAttr(plain), 'cold', '没记过偏好 → 冷白（标记默认）')
    assert.equal(plain.d.window.document.getElementById('themeSelect').value, 'cold', '下拉选中态与标记一致')
    pickTheme(plain, 'paper')
    assert.equal(themeAttr(plain), 'paper', '切暖纸即时生效')
    assert.equal(plain.d.window.localStorage.getItem('flowdeck-theme'), 'paper', '选择写进 flowdeck-theme')
    pickTheme(plain, 'dark')
    assert.equal(themeAttr(plain), 'dark', '切 GitHub 暗即时生效')
    pickTheme(plain, 'cold')
    assert.equal(themeAttr(plain), 'cold', '切回冷白即时生效')
    assert.equal(plain.d.window.localStorage.getItem('flowdeck-theme'), 'cold')
    assert.deepEqual(plain.errs, [])
    plain.d.window.close()
    const legacyCases = [['dark', 'dark'], ['paper', 'paper'], ['cold', 'cold'], ['light', 'cold']]
    for (let i = 0; i < legacyCases.length; i++) {
      const [stored, want] = legacyCases[i]
      const c = appearanceDom(39352 + i, stored)
      await settle()
      assert.equal(themeAttr(c), want, '记过 ' + stored + ' → 重开仍是 ' + want + (stored === 'light' ? '（legacy 亮色迁移到冷白）' : ''))
      assert.equal(c.d.window.document.getElementById('themeSelect').value, want, '下拉选中态随记忆/迁移')
      assert.deepEqual(c.errs, [])
      c.d.window.close()
    }
    ok('三主题（jsdom + 文件级）：冷白默认住在标记上、顶栏三选下拉切换落对 data-theme 并写 flowdeck-theme、重开尊重记忆、legacy「light」迁移到冷白；三套 token 字面平级、语义槽位对齐、冷白保留自身朱红且经白名单可服务')

    // ── 界面缩放档（ui-appearance 票 04）：倍率数值只住 CSS，控件只设标记属性 + 记本浏览器偏好 ──
    // 文件级钉：档位值域两处必须同集——CSS 多一档是「有倍率没入口」，<option> 多一档是「选了没倍率」
    const scaleCss = await fs.readFile(nodePath.join(HERE, 'styles', 'app.css'), 'utf8')
    const cssTiers = [...scaleCss.matchAll(/:root\[data-ui-scale="(\w+)"\] \{ --ui-scale: ([\d.]+); \}/g)]
      .map((m) => [m[1], m[2]])
    assert.deepEqual(cssTiers, [['sm', '0.9'], ['md', '1'], ['lg', '1.125'], ['xl', '1.25']], '四档倍率住在 CSS（JS 不碰数值）')
    const scaleBox = deckHtml.match(/<select id="setScale">([\s\S]*?)<\/select>/)
    assert.ok(scaleBox, '设置弹窗「外观」区有缩放控件')
    assert.deepEqual([...scaleBox[1].matchAll(/value="(\w+)"/g)].map((m) => m[1]), cssTiers.map(([k]) => k), '档位值域 CSS 与控件同集')
    // 「绘制前定档」的结构面（评审收口）：切「样式表之前的那段文档」再找读数，顺序才真的被钉住——
    // 拿字面量首次出现比下标是假钉（'flowdeck-ui-scale' 在主脚本的 SCALE_KEY 处还会出现一次）。
    const preCss = deckHtml.slice(0, deckHtml.indexOf('<link rel="stylesheet" href="styles/app.css">'))
    assert.match(preCss, /localStorage\.getItem\('flowdeck-ui-scale'\)/, '缩放档读数排在样式表之前（先定档再绘制）')
    assert.match(preCss, /localStorage\.getItem\('flowdeck-theme'\)/, '主题读数同在那个防闪脚本里')
    // 界面级钉（jsdom）：切档落对 data-ui-scale 并写 flowdeck-ui-scale；缺省不写属性即中档；重开尊重记忆；野值回落中档
    const scaleAttr = (c) => c.d.window.document.documentElement.getAttribute('data-ui-scale')
    const scaleValue = (c) => c.d.window.document.getElementById('setScale').value
    const pickScale = (c, v) => {
      const sel = c.d.window.document.getElementById('setScale')
      sel.value = v
      sel.dispatchEvent(new c.d.window.Event('change'))
    }
    const untouched = appearanceDom(39356, null, null)
    await settle()
    assert.equal(scaleAttr(untouched), null, '没记过偏好 → 不写属性（CSS 缺省 --ui-scale: 1 即中档）')
    assert.equal(scaleValue(untouched), 'md', '控件选中态落中档')
    pickScale(untouched, 'xl')
    assert.equal(scaleAttr(untouched), 'xl', '选特大 → data-ui-scale 即时落值')
    assert.equal(untouched.d.window.localStorage.getItem('flowdeck-ui-scale'), 'xl', '选择写进 flowdeck-ui-scale')
    pickScale(untouched, 'sm')
    assert.equal(scaleAttr(untouched), 'sm', '再选小档即换，不是一次性控件')
    assert.equal(untouched.d.window.localStorage.getItem('flowdeck-ui-scale'), 'sm')
    assert.deepEqual(untouched.errs, [])
    untouched.d.window.close()
    for (let i = 0; i < cssTiers.length; i++) {
      const [tier] = cssTiers[i]
      const c = appearanceDom(39357 + i, null, tier)
      await settle()
      assert.equal(scaleAttr(c), tier, '记过 ' + tier + ' → 绘制前就设好 data-ui-scale')
      assert.equal(scaleValue(c), tier, '控件选中态随记忆')
      assert.deepEqual(c.errs, [])
      c.d.window.close()
    }
    const junkScale = appearanceDom(39361, null, 'huge')
    await settle()
    assert.equal(scaleAttr(junkScale), null, '认不出的档位不写属性')
    assert.equal(scaleValue(junkScale), 'md', '野值落回中档（跟主题一样不猜用户想要什么）')
    assert.deepEqual(junkScale.errs, [])
    junkScale.d.window.close()
    ok('界面缩放档（jsdom + 文件级）：四档倍率只住 CSS 且与「外观」区控件值域同集、切档即时落 data-ui-scale 并写 flowdeck-ui-scale、缺省不写属性即中档、重开绘制前定档、野值回落中档')

    // ── 阶段名单一来源（双轴评审收口）：界面词表不再抄四阶段名/副题，取词全走载荷下发列 ──
    assert.deepEqual(
      Object.keys(SHELL_TEXT).filter((k) => /^stage\.(grill|spec|tickets|implement)\./.test(k)), [],
      '四个阶段名/副题不再进界面词表（单一来源在 FLOW_STAGES，经 stageNames 与 chain.stages.en 下发）')
    ok('阶段名单一来源（jsdom）：界面词表撤四阶段名/副题的第二份拷贝，链格/全部视图/通知/项目总览取词全走载荷下发列')

    // ── 指引词自定义段（custom-guides 票 02 + 03，ADR-0004）：config → 服务端 → 界面 → 复制 ──
    // 票 03 把面从一面扩到五面（四个阶段格 + 票行）、给编辑器加面下拉、给票行那面开三个槽。规则一句话：
    // 某一面的自定义段非空即整段取代内置段，为空回落内置段，中英各判各的。票行是五面里唯一带槽的一面
    // （{key}/{path}/{title}），其余四面无槽——不引入通用模板语言（ADR-0004 已否）。
    // 这组只钉接线，不碰像素（jsdom 无布局能力）。
    const gdTk = { key: '01', fileName: '01-guides.md', title: '指引票', state: 'open', status: 'ready-for-agent', claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z' }
    const gdEffort = {
      slug: 'demo', title: '指引词 demo', git: null, latestAt: '2026-09-18T00:00:00Z',
      map: { exists: true, title: '', destination: 'Ship it', fog: [], decisions: [], outOfScope: [], fogCount: 0, progress: null, formatWarnings: [] },
      spec: { exists: true, title: '', contentLength: 12, content: '# 规格\n\n一段内容。\n', formatWarnings: [] },
      tickets: [gdTk],
      chain: deriveChain({ slug: 'demo', map: { exists: true, destination: 'Ship it', fogCount: 0 }, spec: { exists: true, contentLength: 12 }, tickets: [gdTk] }),
    }
    // guides 就是载荷里那份原值（服务端不拼装，见服务端那组）：测试自己造，不从 config.json 读回来绕一圈
    const gdPayload = (guides) => ({
      root: '/tmp/fd-guides', rootName: 'fd-guides', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 60000, pollMode: 'manual', configPath: '/tmp/config-guides.json', recentRoots: [], stageNames: STAGE_TABLE,
      efforts: [JSON.parse(JSON.stringify(gdEffort))], guides,
    })
    /** 夹具：带剪贴板（复制内容落 copies）、confirm（恢复默认的二次确认）与 /api/config POST 记录。 */
    function guidesDom(port, guides, langStored) {
      const errs = []
      const copies = []
      const posts = []
      const payload = gdPayload(guides)
      const vcG = new VirtualConsole()
      vcG.on('jsdomError', (e) => errs.push(String((e && e.message) || e)))
      const d = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:' + port + '/',
        pretendToBeVisual: true,
        virtualConsole: vcG,
        beforeParse(window) {
          if (langStored) window.localStorage.setItem('flowdeck-lang', langStored)
          window.confirm = () => true
          Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (x) => { copies.push(x); return Promise.resolve() } } })
          window.fetch = fetchRouter([
            ['/api/config', (url, opts) => {
              const sent = JSON.parse(opts.body)
              posts.push(sent)
              const applied = {}
              for (const k of Object.keys(sent)) applied[k] = 'immediate'
              return Promise.resolve({ ok: true, json: async () => ({ ok: true, applied }) })
            }],
            ['/api/state', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(payload)) })],
          ], '指引词用例不该请求别的接口')
        },
      })
      return { d, errs, copies, posts }
    }
    const gdSettle = async () => { await new Promise((r) => setTimeout(r, 150)) }
    const gdDoc = (c) => c.d.window.document
    /** 关窗前先等一拍：剪贴板那声 toast 走 Promise，等它落地再关（关早了回调里 document 已经没了）。 */
    const gdClose = async (c) => { await tick(); c.d.window.close() }
    const gdOpenSettings = async (c) => {
      gdDoc(c).getElementById('settingsBtn').dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      await tick()
    }
    const gdSave = async (c) => {
      gdDoc(c).getElementById('settingsSave').dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      await tick()
      await tick()
    }
    /** 选面：面下拉的 change 通路——置值 + 派发 change，与真实下拉同一条路。 */
    const gdPickFace = (c, face) => {
      const sel = gdDoc(c).getElementById('setGuidesFace')
      sel.value = face
      sel.dispatchEvent(new c.d.window.Event('change', { bubbles: true }))
    }
    /** 往当前面的某一列打字：置值 + 派发 input（预览边打字边重画，靠的就是这个事件）。 */
    const gdType = (c, langKey, value) => {
      const ta = gdDoc(c).getElementById(langKey === 'zh' ? 'setGuidesZh' : 'setGuidesEn')
      ta.value = value
      ta.dispatchEvent(new c.d.window.Event('input', { bubbles: true }))
    }
    const gdCopyStage = (c, i) => {
      const cell = gdDoc(c).querySelectorAll('.stage')[i]
      cell.dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      return c.copies[c.copies.length - 1]
    }
    const gdCopyNext = (c) => {
      gdDoc(c).querySelector('.card.next button').dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      return c.copies[c.copies.length - 1]
    }
    /** 票行点击复制（票 03 的第五面）：tr.ticket 与 a11y 那组用同一个选择器。 */
    const gdCopyTicket = (c, i) => {
      const row = gdDoc(c).querySelectorAll('tr.ticket')[i]
      row.dispatchEvent(new c.d.window.Event('click', { bubbles: true }))
      return c.copies[c.copies.length - 1]
    }
    const gdBuiltin = gdEffort.chain.stages[3].copyText
    const gdTkPath = '/tmp/fd-guides/.scratch/demo/issues/01-guides.md'
    /** 面下拉里某一面的名字：四个阶段面读载荷 stageNames（阶段名单一来源），票行面读界面词表。 */
    const gdFaceLabel = (c, face) => {
      const opt = gdDoc(c).querySelector('#setGuidesFace option[value="' + face + '"]')
      return opt && opt.textContent
    }

    // 出厂（载荷不带 guides）：五面各复制一次都落内置段
    const factory = guidesDom(39370, undefined)
    await gdSettle()
    for (let i = 0; i < 4; i++) {
      assert.equal(gdCopyStage(factory, i), gdEffort.chain.stages[i].copyText, `出厂：第 ${i} 面阶段格复制出该面内置段`)
    }
    assert.equal(gdCopyNext(factory), gdBuiltin, '出厂：未完工的下一步卡按钮也是内置段')
    const gdFactoryTk = gdCopyTicket(factory, 0)
    assert.ok(gdFactoryTk.includes(gdTkPath) && gdFactoryTk.includes('指引票'), '出厂：票行复制出内置段且三槽已实填（票号/路径/标题）')
    assert.deepEqual(factory.errs, [])

    // 面下拉的空态：默认**不**落在某一面（默认落在 implement 上会让人以为那就是全部五面），
    // 明确说「还没选」，并把两个输入框与恢复默认一并禁掉——没选面时无处可编辑，这比留个能敲的
    // 空框更像「这里得先选」。
    await gdOpenSettings(factory)
    const gdFace = gdDoc(factory).getElementById('setGuidesFace')
    assert.deepEqual(Array.from(gdFace.querySelectorAll('option')).map((o) => o.value), ['', 'grill', 'spec', 'tickets', 'implement', 'ticket'], '面下拉是空态项 + 五面')
    assert.equal(gdFace.value, '', '开窗不默认落在某一面')
    assert.equal(gdDoc(factory).getElementById('setGuidesZh').disabled, true, '空态：中文 textarea 禁用')
    assert.equal(gdDoc(factory).getElementById('setGuidesEn').disabled, true, '空态：英文 textarea 禁用')
    assert.equal(gdDoc(factory).getElementById('setGuidesReset').disabled, true, '空态：恢复默认禁用')
    assert.equal(gdDoc(factory).getElementById('setGuidesSlotsRow').hidden, true, '空态：槽那一行整行收掉（不留一个配空白的标签）')
    assert.equal(gdDoc(factory).getElementById('setGuidesPreview').textContent, SHELL_TEXT['set.guides.preview.pick'].zh, '空态：预览明说先选一面')
    // 下拉里四个阶段面的名字读载荷 stageNames——界面词表里不留第二份（抄一份迟早和 FLOW_STAGES 漂开）
    for (const id of ['grill', 'spec', 'tickets', 'implement']) {
      assert.equal(gdFaceLabel(factory, id), STAGE_TABLE.find((f) => f.id === id).title, `下拉里 ${id} 面的名字取自载荷 stageNames（阶段名单一来源）`)
    }
    assert.deepEqual(
      Object.keys(SHELL_TEXT).filter((k) => /^set\.guides\.face\.(grill|spec|tickets|implement)$/.test(k)), [],
      '四个阶段名不进界面词表（下拉标签读载荷，抄一份就是第二真相）')
    assert.equal(gdFaceLabel(factory, 'ticket'), SHELL_TEXT['set.guides.face.ticket'].zh, '票行面是五面里唯一没有阶段名来源的一面，标签住词表')
    // 读不到阶段名时（旧快照没有 stageNames）回落面名本身，不留四个没名字的空选项
    const gdBare = guidesDom(39385, undefined)
    await gdSettle()
    // 旧快照的极端情形：既没有 stageNames，也没有 effort 可回落 → 阶段名彻底读不出
    gdBare.d.window.eval('state.stageNames = null; state.efforts = []')
    await gdOpenSettings(gdBare)
    for (const id of ['grill', 'spec', 'tickets', 'implement']) {
      assert.equal(gdFaceLabel(gdBare, id), id, `读不到阶段名时回落面名本身（不是空选项）：${id}`)
    }
    await gdClose(gdBare)

    // 切面即换内容与预览；编辑器逐面明写「这一面有没有槽」
    gdPickFace(factory, 'grill')
    assert.equal(gdDoc(factory).getElementById('setGuidesZh').disabled, false, '选面后 textarea 可编辑')
    assert.equal(gdDoc(factory).getElementById('setGuidesReset').disabled, false, '选面后恢复默认可用')
    assert.equal(gdDoc(factory).getElementById('setGuidesPreview').textContent, gdEffort.chain.stages[0].copyText, '切到 grill 面：预览换成该面内置段')
    assert.equal(gdDoc(factory).getElementById('setGuidesSlotsRow').hidden, false, '选面后槽那一行出现')
    assert.equal(gdDoc(factory).getElementById('setGuidesSlots').textContent, SHELL_TEXT['set.guides.slots.none'].zh, '阶段面：编辑器明写这一面无槽')
    gdPickFace(factory, 'ticket')
    assert.equal(gdDoc(factory).getElementById('setGuidesSlots').textContent, SHELL_TEXT['set.guides.slots.ticket'].zh, '票行面：编辑器明写三个槽')
    // 「保存后生效」就得显示真会复制出去的那一份：三个槽拿当前 effort 的第一张票实填过，
    // 而不是把永远不会被逐字复制的模板摆出来
    assert.equal(gdDoc(factory).getElementById('setGuidesPreview').textContent,
      SHELL_TEXT['copy.ticket'].zh.replace('{key}', '01').replace('{path}', gdTkPath).replace('{title}', '指引票'),
      '票行面：预览显示的是实填后的内置段（与点第一张票复制出来的逐字一致）')
    assert.equal(gdDoc(factory).getElementById('setGuidesPreview').textContent.indexOf('{'), -1, '票行面预览不残留未实填的槽')
    assert.deepEqual(factory.errs, [])
    await gdClose(factory)

    // 五面各设自定义段 → 五面各复制一次，都走该面自己的段
    const five = guidesDom(39381, {
      grill: { zh: '甲面自定义段' }, spec: { zh: '乙面自定义段' },
      tickets: { zh: '丙面自定义段' }, implement: { zh: '丁面自定义段' },
      ticket: { zh: '票行自定义段：{key} / {title}' },
    })
    await gdSettle()
    const gdFive = ['甲面自定义段', '乙面自定义段', '丙面自定义段', '丁面自定义段']
    for (let i = 0; i < 4; i++) assert.equal(gdCopyStage(five, i), gdFive[i], `第 ${i} 面：阶段格复制走该面自己的自定义段（互不串台）`)
    assert.equal(gdCopyTicket(five, 0), '票行自定义段：01 / 指引票', '票行：复制走票行那面的自定义段，并实填 {key} 与 {title}')
    await gdOpenSettings(five)
    gdPickFace(five, 'ticket')
    assert.equal(gdDoc(five).getElementById('setGuidesPreview').textContent, '票行自定义段：01 / 指引票', '票行面：自定义段的预览同样实填三槽（预览即生效的那一份）')
    assert.deepEqual(five.errs, [])
    await gdClose(five)

    // 其余四面无槽：段里写了 {key} 也原样留着——不引入通用模板语言（ADR-0004 已否）
    const noSlots = guidesDom(39382, { implement: { zh: '段里的 {key} {path} {title} 都原样留着' } })
    await gdSettle()
    assert.equal(gdCopyStage(noSlots, 3), '段里的 {key} {path} {title} 都原样留着', '阶段那四面无槽：槽标记原样留在段里（不会被偷偷填上）')
    assert.deepEqual(noSlots.errs, [])
    await gdClose(noSlots)

    // 票行无自定义段 → 回落内置段，且内置段那三个槽照旧实填
    const tkFallback = guidesDom(39383, { implement: { zh: '只改 implement' } })
    await gdSettle()
    const gdTkCopy = gdCopyTicket(tkFallback, 0)
    assert.ok(gdTkCopy.includes(gdTkPath), '票行回落内置段：{path} 实填成票的路径')
    assert.ok(gdTkCopy.includes('指引票'), '票行回落内置段：{title} 实填成票标题')
    assert.ok(gdTkCopy.includes('01'), '票行回落内置段：{key} 实填成票号')
    assert.equal(gdTkCopy.indexOf('{'), -1, '票行复制结果里不残留未实填的槽')
    assert.deepEqual(tkFallback.errs, [])
    await gdClose(tkFallback)

    // 自定义段非空：阶段格与下一步卡按钮都取自定义段，逐字相等（整段取代，不是接在前面）
    const custom = guidesDom(39371, { implement: { zh: '自定义中文段：请在隔离工作树里实现这张票。', en: 'Custom English segment.' } })
    await gdSettle()
    assert.equal(gdCopyStage(custom, 3), '自定义中文段：请在隔离工作树里实现这张票。', '阶段格复制走中文自定义段（整段取代）')
    assert.equal(gdCopyNext(custom), '自定义中文段：请在隔离工作树里实现这张票。', '未完工的下一步卡按钮同走自定义段')
    await gdOpenSettings(custom)
    gdPickFace(custom, 'implement')
    assert.equal(gdDoc(custom).getElementById('setGuidesZh').value, '自定义中文段：请在隔离工作树里实现这张票。', '预填：中文 textarea 来自 /api/state 的 guides')
    assert.equal(gdDoc(custom).getElementById('setGuidesEn').value, 'Custom English segment.', '预填：英文 textarea 来自同一份载荷')
    assert.equal(gdDoc(custom).getElementById('setGuidesPreview').textContent, '自定义中文段：请在隔离工作树里实现这张票。', '预览显示自定义段')
    assert.equal(gdDoc(custom).getElementById('setGuidesPreview').textContent.indexOf(gdBuiltin), -1, '被取代的内置段不并列显示')
    assert.deepEqual(custom.errs, [])
    await gdClose(custom)

    // 中英各判各的：只填中文时，英文界面复制出的仍是内置英文段（不串台）
    const zhOnly = guidesDom(39372, { implement: { zh: '只有中文有自定义段' } }, 'en')
    await gdSettle()
    assert.equal(gdCopyStage(zhOnly, 3), gdEffort.chain.stages[3].en.copyText, '只填中文 → 英文界面复制出内置英文段')
    await gdOpenSettings(zhOnly)
    gdPickFace(zhOnly, 'implement')
    assert.equal(gdDoc(zhOnly).getElementById('setGuidesPreview').textContent, gdEffort.chain.stages[3].en.copyText, '英文界面预览内置英文段（不拿中文那份顶上）')
    assert.equal(gdDoc(zhOnly).getElementById('setGuidesEn').value, '', '英文 textarea 留空（缺面即回落）')
    // 下拉里那四个阶段名读的是载荷的 en 列——中文阶段名漏进英文界面，这条挡得住
    for (const id of ['grill', 'spec', 'tickets', 'implement']) {
      const opt = gdDoc(zhOnly).querySelector('#setGuidesFace option[value="' + id + '"]')
      assert.equal(opt.textContent, STAGE_TABLE.find((f) => f.id === id).en.title, `英文界面：下拉里 ${id} 面的名字取英文列（阶段名单一来源随语言）`)
    }
    assert.equal(gdDoc(zhOnly).querySelector('#setGuidesFace option[value="ticket"]').textContent, SHELL_TEXT['set.guides.face.ticket'].en, '票行面标签随语言翻')
    assert.deepEqual(zhOnly.errs, [])
    await gdClose(zhOnly)

    // 「整段取代」是逐字的：边缘空白原样带出去，粘出来的与 config.json 里存的同一个字符串
    const spaced = guidesDom(39376, { implement: { zh: '  前后留白也算内容  ' } })
    await gdSettle()
    assert.equal(gdCopyStage(spaced, 3), '  前后留白也算内容  ', '边缘空白原样带出（取用时不悄悄去空白，粘出去的与存盘的逐字一致）')
    await tick() // 剪贴板那声 toast 走 Promise，等它落地再关窗（关早了回调里 document 已经没了）
    assert.deepEqual(spaced.errs, [])
    spaced.d.window.close()

    // 清空 = 回落：已存的值只剩空白等同没填（取用时去首尾空白）
    const blank = guidesDom(39373, { implement: { zh: '   \n  ' } })
    await gdSettle()
    assert.equal(gdCopyStage(blank, 3), gdBuiltin, '只存了空白等同没填 → 复制回落内置段')
    assert.equal(gdCopyNext(blank), gdBuiltin, '下一步卡按钮同样回落内置段')
    // 预览读的是输入框里的草稿：敲进空白也该立刻回落，不必等保存
    await gdOpenSettings(blank)
    gdPickFace(blank, 'implement')
    gdType(blank, 'zh', '   \n  ')
    assert.equal(gdDoc(blank).getElementById('setGuidesPreview').textContent, gdBuiltin, '草稿只剩空白 → 预览同步回落内置段')
    assert.deepEqual(blank.errs, [])
    await gdClose(blank)

    // 保存：没动就不进补丁；只动中文就发中英两列（恢复默认清的是两列，发半边会给另一列留旧值）
    const saver = guidesDom(39374, { implement: { zh: '旧中文', en: 'Old English' } })
    await gdSettle()
    await gdOpenSettings(saver)
    await gdSave(saver)
    assert.deepEqual(saver.posts, [], '一字未改时不提交任何字段（沿用 settingsChanges 的差异收集）')
    await gdOpenSettings(saver)
    gdPickFace(saver, 'implement')
    gdDoc(saver).getElementById('setGuidesZh').value = '新中文'
    await gdSave(saver)
    assert.deepEqual(saver.posts[saver.posts.length - 1], { guides: { implement: { zh: '新中文', en: 'Old English' } } }, '只改中文也把英文原样带回（不丢另一列）')
    assert.match(gdDoc(saver).getElementById('toast').textContent, /已生效：指引词/, 'toast 的字段名走 set.field.guides')
    assert.deepEqual(saver.errs, [])
    await gdClose(saver)

    // 五面并存时保存：改一面，其余四面原样带回（补丁以初值起底、只换当前面）
    const multi = guidesDom(39384, { grill: { zh: '甲留' }, spec: { zh: '乙留' }, implement: { zh: '丙留' } })
    await gdSettle()
    await gdOpenSettings(multi)
    gdPickFace(multi, 'spec')
    gdDoc(multi).getElementById('setGuidesZh').value = '乙改'
    await gdSave(multi)
    assert.deepEqual(multi.posts[multi.posts.length - 1], { guides: { grill: { zh: '甲留', en: '' }, spec: { zh: '乙改', en: '' }, implement: { zh: '丙留', en: '' } } }, '只改 spec 一面，其余四面原样带回（不吞掉没编辑过的面）')
    assert.deepEqual(multi.errs, [])
    await gdClose(multi)

    // 恢复默认：只清**当前**这一面的中英两列，其余四面不碰（二次确认挡住误点）
    const reset = guidesDom(39375, { implement: { zh: '要恢复的中文', en: 'English to restore' }, grill: { zh: '保留的中文' } })
    await gdSettle()
    await gdOpenSettings(reset)
    gdPickFace(reset, 'grill')
    assert.equal(gdDoc(reset).getElementById('setGuidesZh').value, '保留的中文', '预填：切到 grill 面显示的是这一面存的值')
    gdPickFace(reset, 'implement')
    assert.equal(gdDoc(reset).getElementById('setGuidesZh').value, '要恢复的中文', '切回 implement 面：另一面的草稿没被冲掉')
    let gdConfirmText = ''
    reset.d.window.confirm = (msg) => { gdConfirmText = msg; return true }
    gdDoc(reset).getElementById('setGuidesReset').dispatchEvent(new reset.d.window.Event('click', { bubbles: true }))
    assert.equal(gdConfirmText, SHELL_TEXT['set.guides.reset.confirm'].zh.replace('{face}', gdFaceLabel(reset, 'implement')), '恢复默认走二次确认，且确认文案点名当前面')
    assert.equal(gdDoc(reset).getElementById('setGuidesZh').value, '', '恢复默认清空当前面的中文段')
    assert.equal(gdDoc(reset).getElementById('setGuidesEn').value, '', '恢复默认清空当前面的英文段')
    assert.equal(gdDoc(reset).getElementById('setGuidesPreview').textContent, gdBuiltin, '恢复后预览回落内置段')
    gdPickFace(reset, 'grill')
    assert.equal(gdDoc(reset).getElementById('setGuidesZh').value, '保留的中文', '恢复默认不碰其余四面（切回去还在）')
    await gdSave(reset)
    assert.deepEqual(reset.posts[reset.posts.length - 1], { guides: { implement: { zh: '', en: '' }, grill: { zh: '保留的中文', en: '' } } }, '保存把当前面两列一起清空、其余面原样带回')
    assert.deepEqual(reset.errs, [])
    await gdClose(reset)

    // 文件级钉：设置弹窗的「指引词」分区、面下拉与两个 textarea 真在 markup 里（jsdom 那几组是接线面，
    // 控件本身没了它们会一起「安静地绿」——所以分区与控件各钉一次）
    const guidesCat = deckHtml.match(/<div class="fcat" data-i18n="settings\.guides">([\s\S]*?)<\/div>/)
    assert.ok(guidesCat, '设置弹窗有「指引词」分区（.fcat 标题）')
    assert.equal(guidesCat[1], SHELL_TEXT['settings.guides'].zh, '分区标题的 markup 默认态与词表中文列一致')
    assert.ok(deckHtml.includes('<select id="setGuidesFace">'), '设置弹窗有面下拉（#setGuidesFace）')
    assert.ok(deckHtml.includes('<label for="setGuidesFace"'), '面下拉有配对的 <label for>（点标签能聚焦）')
    assert.equal(deckHtml.match(/<option value="(?:grill|spec|tickets|implement|ticket)"/g).length, 5, '下拉里五个面各一项（与五面同集）')
    assert.equal(deckHtml.match(/<textarea id="setGuides(\w+)"/g).length, 2, '指引词分区里有两个 textarea（中英各一）')
    assert.ok(deckHtml.includes('<label for="setGuidesZh"'), 'textarea 有配对的 <label for>（点标签能聚焦）')
    assert.match(appCss, /\.frow textarea \{[^}]*min-height:/, 'styles/app.css 补了 .frow textarea 规则（设置弹窗第一个 textarea）')
    assert.match(appCss, /textarea:focus-visible/, 'textarea 进得了焦点环（漏了就只靠浏览器默认，键盘用户看不见焦点）')

    // 文档面：config.example.json 与两份 README 的 config 段都得列出 guides 字段，
    // 否则「配置文档同步」这条只在代码里成立、文档那头没人知道这个字段存在。
    const gdExCfg = JSON.parse(await fs.readFile(nodePath.join(HERE, 'config.example.json'), 'utf8'))
    assert.deepEqual(gdExCfg.guides, {}, 'config.example.json 有 guides 字段，且出厂是空对象（缺面 = 回落内置段）')
    const gdNote = gdExCfg['字段说明'] && gdExCfg['字段说明'].guides
    assert.ok(typeof gdNote === 'string' && gdNote.length > 40, 'config.example.json 的「字段说明」有 guides 条目')
    for (const faceId of ['grill', 'spec', 'tickets', 'implement', 'ticket']) {
      assert.ok(gdNote.includes(faceId), `config.example.json 的 guides 说明点明 ${faceId} 面`)
    }
    for (const slot of ['{key}', '{path}', '{title}']) {
      assert.ok(gdNote.includes(slot), `config.example.json 的 guides 说明点明票行那面的槽 ${slot}`)
    }
    for (const readme of ['README.zh-CN.md', 'README.md']) {
      const txt = await fs.readFile(nodePath.join(HERE, readme), 'utf8')
      assert.match(txt, /"guides":\s*\{\}/, `${readme} 的 config.json 段列出 guides 字段`)
    }
    ok('指引词可整段改写 · 五面铺开（custom-guides 02 + 03 · jsdom + 文件级 + 文档）：出厂五面各复制一次都落内置段；面下拉带空态（不默认落在某一面，未选面时输入框与恢复默认一并禁用）、切面即换内容与预览、下拉里四个阶段名读载荷 stageNames；五面各设自定义段各复制一次都走该面自己的段（互不串台）；票行那面 {key}/{path}/{title} 实填、其余四面无槽（段里的槽标记原样留着）；票行无自定义段回落内置段且内置段三槽照旧实填；只填中文时英文界面仍复制内置英文段；只敲全白等同没填（但有内容的边缘空白原样带出）、预览与复制同步回落；预填来自载荷、保存只提交变更字段（改动中英成对发、五面并存时只换当前面、其余面原样带回）、恢复默认只清当前面；「指引词」分区、面下拉与两个 textarea 在案，.frow textarea 与焦点环规则到位；config.example.json 与两份 README 的 config 段同步了 guides 字段')

    // ── 英文态整页无残留（english-ui 票 02）：真跑界面，逐视图扫中文残留 ──
    /** 界面夹具用的英文用户数据：票标题、地图小节、规格正文全 ASCII——判据字段名（Status /
        Blocked by / Destination）本就是英文，剩余中文只可能来自界面文案或服务端指引词。 */
    const shTk = (key, over) => Object.assign({
      key, fileName: key + '-item.md', title: 'Ticket ' + key, state: 'open', status: 'ready-for-agent',
      claimedBy: '', type: 'task', blockedBy: [], progress: null, formatWarnings: [], updatedAt: '2026-09-18T00:00:00Z',
    }, over)
    const shEffort = (slug, o) => {
      const tickets = o.tickets || []
      const map = {
        exists: !o.noMap, title: '', destination: 'Ship the deck',
        fog: ['Rollback policy'], decisions: [{ title: 'Markdown only', gist: 'one file per ticket' }],
        outOfScope: ['No accounts'], fogCount: o.fog || 0, progress: 40, formatWarnings: [],
      }
      const spec = { exists: !o.noSpec, title: 'Deck spec', contentLength: 128, content: '# Deck spec\n\nTrack what the agents write into .scratch.\n', formatWarnings: [] }
      return {
        slug, title: 'Deck ' + slug, map, spec, tickets, git: o.git || null, latestAt: '2026-09-18T00:00:00Z',
        chain: deriveChain({ slug, map: { exists: map.exists, destination: map.destination, fogCount: map.fogCount }, spec: { exists: spec.exists, contentLength: spec.contentLength }, tickets }),
      }
    }
    const shellPayloadOf = (efforts, over) => Object.assign({
      root: '/tmp/fd-shell-en', rootName: 'fd-shell-en', generatedAt: '2026-09-18T00:00:00Z', scratchExists: true,
      pollMs: 60000, pollMode: 'manual', configPath: '/tmp/config-shell.json',
      recentRoots: [{ path: '/tmp/fd-shell-en', exists: true }, { path: '/tmp/fd-gone-en', exists: false }],
      stageNames: STAGE_TABLE,
      efforts,
    }, over || {})
    const shellRoots = {
      roots: [
        { path: '/tmp/fd-shell-en', name: 'fd-shell-en', status: 'ok', stage: 'implement', closed: 1, tickets: 3, fog: 1, current: true },
        { path: '/tmp/fd-shell-en', name: 'fd-shell-en', status: 'no-scratch', current: false },
        { path: '/tmp/fd-gone-en', name: 'fd-gone-en', status: 'unreadable', current: false },
      ],
    }
    const shellSkills = {
      skills: [
        { name: 'overview', category: 'overview', order: 1, title: 'The skill map', summary: 'How the stages chain up', inProgress: false },
        { name: 'grilling', category: 'engineering', order: 2, title: 'Grilling', summary: 'Stress-test the plan', inProgress: false },
        { name: 'wizard', category: 'in-progress', order: 3, title: 'Wizard', summary: 'Still cooking', inProgress: true },
      ],
    }
    /** 整页扫残留中文：文本节点 + title / aria-label / placeholder 三类属性 + 文档标题。
        两处剪枝：script/style 的文本不是界面文案；#langBtn 按「用目标语言写自己的目标语言名」自指
        （英文态就是「中文」二字，票 01 钉死的设计）。技能正文自票 03 起进扫描面——英文态它读的就是
        同名镜像篇，本夹具给的是英文正文，没有理由再豁免（缺镜像时的中文正文由按语言取篇那组钉住）。 */
    function cjkResidue(doc) {
      const hits = []
      const check = (where, v) => {
        const s = String(v === null || v === undefined ? '' : v)
        if (CJK_RE.test(s)) hits.push(where + ' = ' + s.slice(0, 70))
      }
      const tw = doc.createTreeWalker(doc.body, 4, {
        acceptNode(n) {
          const p = n.parentNode
          if (!p || !p.closest) return 1
          return p.closest('script, style, noscript, #langBtn') ? 2 : 1 // 2 = FILTER_REJECT：整棵子树不进扫描面
        },
      })
      for (let n = tw.nextNode(); n; n = tw.nextNode()) check('#text', n.nodeValue)
      for (const node of Array.from(doc.querySelectorAll('*'))) {
        check(node.tagName + '[title]', node.getAttribute('title'))
        check(node.tagName + '[aria-label]', node.getAttribute('aria-label'))
        check(node.tagName + '[placeholder]', node.getAttribute('placeholder'))
      }
      check('title', doc.title)
      return hits
    }
    const jsErrorsShell = []
    const vcShell = new VirtualConsole()
    vcShell.on('jsdomError', (e) => jsErrorsShell.push(String((e && e.message) || e)))
    let shellPayload = shellPayloadOf([
      shEffort('alpha', { fog: 2, tickets: [shTk('01'), shTk('02', { blockedBy: ['01'] }), shTk('03', { state: 'closed', status: 'resolved' })] }),
      shEffort('beta', { noMap: true }),
      shEffort('gamma', { tickets: [shTk('01', { state: 'closed', status: 'resolved' })], git: { hash: 'abc1234', date: '2026-09-17T00:00:00Z', subject: 'docs: close out the deck' } }),
    ])
    const shellCalls = []
    const shellDom = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39341/',
      pretendToBeVisual: true,
      virtualConsole: vcShell,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
        window.fetch = fetchRouter([
          ['/api/skills/', () => Promise.resolve({ ok: true, headers: docHeaders('en'), text: async () => '# Grilling\n\nStress-test the plan until nothing is left vague.\n' })],
          ['/api/skills', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(shellSkills)) })],
          ['/api/state', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(shellPayload)) })],
          ['/api/roots-overview', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(shellRoots)) })],
          ['/api/issue', () => Promise.resolve({ ok: true, headers: docHeaders('en'), text: async () => '# Ticket 01\n\nStatus: ready-for-agent\n\nDo the indexing core.\n' })],
        ], '英文界面用例不该请求别的接口', (url) => { shellCalls.push(url) })
      },
    })
    await settle()
    const shDoc = shellDom.window.document
    const shWin = shellDom.window
    const shClick = (node) => node.dispatchEvent(new shWin.Event('click', { bubbles: true }))
    const shTab = (label) => Array.from(shDoc.querySelectorAll('#tabs button')).find((b) => b.textContent.indexOf(label) === 0)
    const shOpen = (id) => shDoc.getElementById(id).dispatchEvent(new shWin.Event('click', { bubbles: true }))
    const shEsc = () => shDoc.dispatchEvent(new shWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(shDoc.documentElement.getAttribute('lang'), 'en', '英文态 <html lang> 跟着翻（读屏与断字规则要选对语言）')
    assert.equal(shDoc.title, 'AI Coding Workflow Deck', '文档标题随语言')
    assert.deepEqual(cjkResidue(shDoc), [], '英文态首屏整页零中文残留（文本 + title + aria-label + placeholder + 标题）')
    // 静态壳还得「取得到词」：残留扫描对一张空白页面同样通过（票 04 实拍撞出来的洞——取词通道
    // 误按选择器读属性名，整条顶栏被擦成空标签，而「零中文」照样成立）。反向钉一遍四条通道。
    for (const [attr, dom] of [['data-i18n', null], ['data-i18n-title', 'title'],
      ['data-i18n-placeholder', 'placeholder'], ['data-i18n-aria', 'aria-label']]) {
      const rows = Array.from(shDoc.querySelectorAll('[' + attr + ']')).map((n) => {
        const key = n.getAttribute(attr)
        return [key, dom ? n.getAttribute(dom) : n.textContent]
      })
      assert.ok(rows.length >= 1, attr + ' 通道有节点在取词面上')
      assert.deepEqual(rows.filter((r) => !String(r[1] || '').trim()).map((r) => r[0]), [], '英文态 ' + attr + ' 无空文案')
      assert.deepEqual(rows.filter((r) => r[1] !== shWin.UI_TEXT[r[0]].en).map((r) => r[0]), [], '英文态 ' + attr + ' 逐字取英文列')
    }
    // 项目标签条（票 01）：动态渲染出来的卡面不在静态壳的取词面上，得单独钉一遍英文
    const shStrip = shDoc.getElementById('tabStrip')
    const shCards = Array.from(shStrip.querySelectorAll('.tabcard'))
    assert.equal(shCards.length, 1, '英文态标签条以服务端追踪目录补位出卡')
    assert.equal(shCards[0].querySelector('.tname').textContent, 'fd-shell-en', '卡面出目录 basename')
    assert.match(shCards[0].getAttribute('aria-label'), /Project tab fd-shell-en, Current/, '整卡 aria-label 出英文')
    assert.match(shCards[0].getAttribute('title'), /Click to switch to this project/, '卡面 title 出英文')
    assert.equal(shCards[0].querySelector('button.tclose').getAttribute('aria-label'), 'Close the fd-shell-en tab', '关闭件 aria-label 出英文')
    assert.match(shStrip.querySelector('button.tabhandle').getAttribute('aria-label'), /Current project: fd-shell-en/, '折叠把手 aria-label 出英文')
    assert.deepEqual(cjkResidue(shDoc).filter((h) => /tabcard|tdot|tabhandle/.test(h)), [], '标签条零中文残留（卡面、状态点与把手）')
    shClick(shTab('All'))
    assert.deepEqual(cjkResidue(shDoc), [], '「全部」视图零残留（表头、折叠行、行 aria-label）')
    // 切换条的完工折叠入口（票 01）：英文态自己也得零残留，展开后 gamma 才点得到
    const shFold = () => shDoc.querySelector('#tabs button[aria-expanded]')
    assert.match(shFold().textContent, /^✓ Done \(\d+\)$/, '英文态折叠入口出英文文案与计数')
    assert.equal(shFold().getAttribute('aria-expanded'), 'false', '英文态折叠入口的展开态照实自报')
    shClick(shFold())
    assert.equal(shFold().getAttribute('aria-expanded'), 'true', '英文态展开后 aria-expanded 翻 true')
    shClick(shTab('gamma'))
    assert.match(shDoc.querySelector('.next .label').textContent, /all done|complete/i, '完工卡的标签也随语言')
    assert.deepEqual(cjkResidue(shDoc), [], '完工 effort（四格全绿）零残留')
    shClick(shTab('beta'))
    assert.ok(shDoc.querySelector('.chip.infer'), '无 map 的 effort 亮推定标注')
    assert.deepEqual(cjkResidue(shDoc), [], '推定标注零残留')
    shClick(shTab('alpha'))
    // 流程链标题行的「？」（票 02）：英文态出英文问号，aria-label 说明点开的是四阶段导读
    const shQ = shDoc.querySelector('.cardhead .chainq')
    assert.equal(shQ.textContent, '?', '英文态「？」出英文问号')
    assert.match(shQ.getAttribute('aria-label'), /four-stage flowchain tour/i, '英文态 aria-label 说明点开的是四阶段导读')
    assert.deepEqual(cjkResidue(shDoc), [], '「？」零中文残留（文案、title 与 aria-label）')
    // 前沿徽标面板
    shOpen('frontierBadge')
    assert.deepEqual(cjkResidue(shDoc), [], '前沿面板零残留（分组名、票行 title 与 aria-label）')
    shEsc()
    // 开新标签菜单（含失效条目、删除按钮 tooltip 与顶部路径框）
    shOpen('newTabBtn')
    await tick()
    assert.deepEqual(cjkResidue(shDoc), [], '开新标签菜单零残留（「当前」「目录不存在」徽标、删除提示与路径框）')
    shDoc.dispatchEvent(new shWin.Event('click', { bubbles: true }))
    // 设置弹窗（表单各项、说明行、轮询模式三个选项）
    shOpen('settingsBtn')
    await tick()
    assert.deepEqual(cjkResidue(shDoc), [], '设置弹窗零残留（label、hint、select 选项、按钮）')
    shEsc()
    // 项目总览弹窗（表头、链阶段、状态徽标、行 tooltip）
    shOpen('rootsBtn')
    await tick()
    await tick()
    assert.ok(shDoc.getElementById('rootsBody').textContent.indexOf('Implement') >= 0, '总览行的链阶段出英文（stageNames 单一表下发）')
    assert.deepEqual(cjkResidue(shDoc), [], '项目总览弹窗零残留（含 no-scratch / unreadable 两类降级行）')
    shEsc()
    // 规格阅读弹窗（头部标题与要素行随语言，正文是打开时刻的快照）
    const specRead = Array.from(shDoc.querySelectorAll('#main button')).find((b) => b.textContent === 'Read full')
    assert.ok(specRead, '英文态规格卡的阅读按钮出英文')
    specRead.dispatchEvent(new shWin.Event('click', { bubbles: true }))
    await tick()
    assert.deepEqual(cjkResidue(shDoc), [], '规格阅读弹窗零残留（标题行、要素标签）')
    shEsc()
    // 票正文弹窗（标题、来源行、加载中）
    shDoc.querySelector('tr.ticket button').dispatchEvent(new shWin.Event('click', { bubbles: true }))
    await tick()
    await tick()
    assert.deepEqual(cjkResidue(shDoc), [], '票正文弹窗零残留（含「更新于」来源行）')
    shEsc()
    // 技能包弹窗（分类名、计数行、开发中徽标，英文态连正文一起扫——票 03 后镜像篇就是英文）
    shOpen('skillsBtn')
    await tick()
    await tick()
    assert.deepEqual(cjkResidue(shDoc), [], '技能包弹窗零残留（分类、计数、侧栏徽标与 Markdown 正文）')
    assert.ok(shDoc.getElementById('skillsNav').textContent.indexOf('Engineering') >= 0, '分类名出英文')
    assert.equal(shellCalls.filter((u) => u === '/api/skills?lang=en').length, 1, '开窗按英文取清单（正文同批进上面的残留扫描）')
    shEsc()
    // 空态页（工作约定 + 建骨架指令两段可复制文本）
    shellPayload = shellPayloadOf([], { scratchExists: false })
    shOpen('refreshBtn')
    await tick()
    await tick()
    assert.equal(shDoc.querySelectorAll('pre.agreement').length, 2, '空态页两段指令在位')
    assert.deepEqual(cjkResidue(shDoc), [], '空态页零残留（约定与骨架指令都出英文）')
    assert.deepEqual(jsErrorsShell, [])
    shellDom.window.close()
    ok('英文态整页无残留（jsdom）：链卡/票表/地图规格/全部视图/切换条完工折叠入口/完工卡/推定标注/前沿面板/项目标签条/开新标签菜单/设置/项目总览/票正文/技能弹窗（含正文）/空态页逐视图扫中文，含 title、aria-label、placeholder 与文档标题')

    // ── 英文态内容随语言（票 02）：一键复制、桌面通知、报错措辞三处人话都翻；未知 code 回落原文 ──
    const jsErrorsLang = []
    const vcLang = new VirtualConsole()
    vcLang.on('jsdomError', (e) => jsErrorsLang.push(String((e && e.message) || e)))
    const langCopies = []
    const langNotes = []
    let langCfgReply = null // 换目录应答：null = 成功，否则 { error, code }
    let langState401 = false
    const langPayload2 = shellPayloadOf([
      shEffort('alpha', { tickets: [shTk('01')] }),
      shEffort('beta', { tickets: [], fog: 1 }),
    ], { pollMs: 1000, pollMode: 'observe' })
    function LangNotification(title, opts) {
      const inst = { title, body: opts && opts.body }
      langNotes.push(inst)
      return inst
    }
    LangNotification.permission = 'granted'
    LangNotification.requestPermission = () => Promise.resolve('granted')
    const langDom2 = uiDom({
      runScripts: 'dangerously',
      url: 'http://127.0.0.1:39342/',
      pretendToBeVisual: true,
      virtualConsole: vcLang,
      beforeParse(window) {
        Object.defineProperty(window.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
        Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (s) => { langCopies.push(s); return Promise.resolve() } } })
        window.Notification = LangNotification
        window.localStorage.setItem('flowdeck-notify', '1')
        // 页面上先有令牌再遇 401：横幅「不回显令牌值」这条只有在真带着令牌时才是断言，否则永真
        window.localStorage.setItem('flowdeck-token', 'tok-secret-9f3')
        window.fetch = fetchRouter([
          ['/api/config', (u, opts) => {
            if (!(opts && opts.method === 'POST')) return Promise.reject(new Error('语言内容用例不该请求别的接口：' + u))
            if (langCfgReply) return Promise.resolve({ ok: false, status: 400, json: async () => langCfgReply })
            return Promise.resolve({ ok: true, json: async () => ({ ok: true, root: '/tmp/fd-shell-en', applied: { root: 'immediate' } }) })
          }],
          ['/api/state', () => {
            if (langState401) return Promise.resolve({ ok: false, status: 401, json: async () => ({ error: '需要有效的访问令牌', code: 'auth.token-required' }) })
            return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(langPayload2)) })
          }],
        ], '语言内容用例不该请求别的接口')
      },
    })
    await settle()
    const lgDoc = langDom2.window.document
    const lgWin = langDom2.window
    const lgClick = (node) => node.dispatchEvent(new lgWin.Event('click', { bubbles: true }))
    /** 为一个路径走完整开新标签流（顶栏按钮 → 路径框 → Enter），供报错措辞用例复用。 */
    const lgOpenTabField = (path) => {
      lgClick(lgDoc.getElementById('newTabBtn'))
      const f = lgDoc.getElementById('newTabPath')
      f.value = path
      f.dispatchEvent(new lgWin.Event('input', { bubbles: true }))
      f.dispatchEvent(new lgWin.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    }
    // 一键复制随语言：票行 = 实现指引词，链格 = 阶段指引词（与服务端英文列同源），下一步卡 = 当前步指引词
    lgClick(lgDoc.querySelector('tr.ticket'))
    await tick()
    assert.equal(langCopies.length, 1)
    assert.ok(!CJK_RE.test(langCopies[0]), '票行复制的指引词零中文：' + langCopies[0])
    assert.match(langCopies[0], /#01/, '英文实现指引带票号')
    assert.match(langCopies[0], /\.scratch\/alpha\/issues\/01-item\.md/, '英文实现指引给出票文件路径')
    assert.match(langCopies[0], /Status.{0,40}resolved/s, '英文实现指引仍要求改 Status 行')
    const alphaChain = langPayload2.efforts[0].chain
    const curStage = alphaChain.stages.filter((s) => s.status === 'current')[0]
    lgClick(lgDoc.querySelectorAll('.stage')[alphaChain.stages.indexOf(curStage)])
    await tick()
    assert.equal(langCopies[1], curStage.en.copyText, '链格复制的是服务端英文列的指引词（单一派生表，界面不再另写一套）')
    lgClick(lgDoc.querySelector('.next button'))
    await tick()
    assert.equal(langCopies[2], curStage.en.copyText, '下一步卡的「复制指引词」同走英文列')
    // 桌面通知随语言：定时拍（非主动、非积压）逐条出事件文案
    langPayload2.efforts[0].tickets[0].state = 'closed'
    langPayload2.efforts[0].tickets[0].status = 'resolved'
    langPayload2.efforts[0].chain = deriveChain({ slug: 'alpha', map: { exists: true, destination: 'Ship the deck', fogCount: 0 }, spec: { exists: true, contentLength: 128 }, tickets: langPayload2.efforts[0].tickets })
    await new Promise((r) => setTimeout(r, 1400))
    const closedNote = langNotes.find((n) => /ticket #01/i.test(String(n.body)))
    assert.ok(closedNote, '关票出一条英文桌面通知：' + JSON.stringify(langNotes.map((n) => n.body)))
    assert.ok(!CJK_RE.test(closedNote.body), '通知正文零中文：' + closedNote.body)
    assert.ok(!CJK_RE.test(closedNote.title), '通知标题零中文：' + closedNote.title)
    // 阶段推进的通知文案用阶段名的英文列（阶段名单一来源：随载荷下发的 stageNames，不再各自抄一份）
    const stageNote = langNotes.find((n) => /stage/i.test(String(n.body)))
    assert.ok(stageNote, '关票后四阶段完成 → 阶段推进也有通知：' + JSON.stringify(langNotes.map((n) => n.body)))
    assert.ok(!/Grill 拷问|To-Spec 规格|四阶段完成/.test(stageNote.body), '通知里的阶段名与「完成」用英文说法：' + stageNote.body)
    assert.match(stageNote.body, /Implement/, '推进通知的阶段名出英文（stageNameById 读 stageNames 表）')
    // 服务端报错按 code 措辞
    langCfgReply = { error: '这个目录不存在或不是目录：/tmp/xyz', code: 'config.root-missing' }
    lgOpenTabField('/tmp/xyz')
    await tick()
    await tick()
    const banner = lgDoc.getElementById('err')
    assert.equal(banner.className.indexOf('err') >= 0, true, '换目录失败要亮错误横幅')
    assert.ok(!CJK_RE.test(banner.textContent), '报错横幅零中文：' + banner.textContent)
    assert.match(banner.textContent, /does not exist|not a directory/i, '按 code 出英文措辞')
    // 未知 code 回退原文：界面不猜，宁可把服务端原话说出来
    langCfgReply = { error: '一种界面还没学过的错法。', code: 'mystery.unknown-case' }
    lgOpenTabField('/tmp/xyz')
    await tick()
    await tick()
    assert.ok(lgDoc.getElementById('err').textContent.indexOf('一种界面还没学过的错法。') >= 0, '未知 code 回退服务端原文：' + lgDoc.getElementById('err').textContent)
    // 401 的定向补救指引也随语言（令牌只进请求头，文案不带令牌值）
    langCfgReply = null
    langState401 = true
    lgClick(lgDoc.getElementById('refreshBtn'))
    await tick()
    await tick()
    assert.ok(!CJK_RE.test(lgDoc.getElementById('err').textContent), '401 横幅零中文：' + lgDoc.getElementById('err').textContent)
    assert.match(lgDoc.getElementById('err').textContent, /\?token=/, '英文措辞仍给出 ?token= 的补救写法')
    assert.ok(!String(lgDoc.getElementById('err').textContent).includes('tok-secret-9f3'), '横幅不回显令牌值')
    assert.deepEqual(jsErrorsLang, [])
    langDom2.window.close()
    ok('英文态内容随语言（jsdom）：票行/链格/下一步卡三处一键复制出英文（链格直取服务端英文列）、桌面通知随语言且阶段名同词表、报错按 code 措辞而未知 code 回退原文、401 补救指引也翻')

    // ── 技能弹窗按语言取篇（票 03）：英文态两条请求都带 ?lang=en，中文态一个参数都不带；
    //    镜像缺篇时服务端回退中文并在 X-FlowDeck-Doc-Lang 自报 zh → 正文回退 + 挂英文标注，
    //    切语言重取清单、同篇两版各自缓存 ──
    {
      const SK_ZH_LIST = { skills: [
        { name: 'grilling', category: 'engineering', order: 1, title: '拷问原语', summary: '访谈的地基', inProgress: false },
        { name: 'wizard', category: 'in-progress', order: 2, title: '人工步骤向导', summary: '只有人能走的那几步', inProgress: true },
      ] }
      const SK_EN_LIST = { skills: [
        { name: 'grilling', category: 'engineering', order: 1, title: 'The grilling primitive', summary: 'The ground under the interview', inProgress: false },
        { name: 'wizard', category: 'in-progress', order: 2, title: '人工步骤向导', summary: '只有人能走的那几步', inProgress: true, noEnglish: true },
      ] }
      const SK_DOCS = {
        'zh|grilling': '---\nname: grilling\ncategory: engineering\n---\n\n# grilling\n\n访谈的地基：设计树按轮推进。\n',
        'en|grilling': '---\nname: grilling\ncategory: engineering\n---\n\n# grilling\n\nThe ground under the interview: a design tree in rounds.\n',
        'zh|wizard': '---\nname: wizard\ncategory: in-progress\n---\n\n# wizard\n\n只有人能做的那几步。\n',
        'en|wizard': '---\nname: wizard\ncategory: in-progress\n---\n\n# wizard\n\n只有人能做的那几步。\n', // 镜像缺篇：服务端回退的就是中文原文
      }
      // 英文请求实际所服务的语言（双轴评审收口：标注以响应头为准，清单快照的 noEnglish 会过期）——wizard 缺镜像回退中文
      const SK_SERVED = { grilling: 'en', wizard: 'zh' }
      const skCalls = []
      const jsErrorsSk = []
      const vcSk = new VirtualConsole()
      vcSk.on('jsdomError', (e) => jsErrorsSk.push(String((e && e.message) || e)))
      const skDom = uiDom({
        runScripts: 'dangerously',
        url: 'http://127.0.0.1:39343/',
        pretendToBeVisual: true,
        virtualConsole: vcSk,
        beforeParse(window) {
          Object.defineProperty(window.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
          window.fetch = fetchRouter([
            ['/api/skills?lang=en', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(SK_EN_LIST)) })],
            ['/api/skills/', (u) => {
              const m = /^\/api\/skills\/([^?]+)(\?lang=en)?$/.exec(u)
              if (!m) return Promise.reject(new Error('技能语言用例不该请求别的接口：' + u))
              const name = decodeURIComponent(m[1])
              const served = m[2] ? SK_SERVED[name] : 'zh'
              return Promise.resolve({ ok: true, status: 200, headers: docHeaders(served), text: async () => SK_DOCS[(m[2] ? 'en|' : 'zh|') + name] })
            }],
            ['/api/skills', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(SK_ZH_LIST)) })],
            ['/api/state', () => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(statePayload)) })],
          ], '技能语言用例不该请求别的接口', (url) => { skCalls.push(url) })
        },
      })
      await new Promise((r) => setTimeout(r, 150))
      const skDoc = skDom.window.document
      const skWin = skDom.window
      const skOpen = () => skDoc.getElementById('skillsBtn').dispatchEvent(new skWin.Event('click', { bubbles: true }))
      const skNavItem = (name) => Array.from(skDoc.querySelectorAll('#skillsNav .item')).find((b) => b.querySelector('.en').textContent === name)
      const skArt = () => skDoc.getElementById('skillsDoc')
      const skCallsTo = (pred) => skCalls.filter(pred).length
      skOpen()
      await tick()
      await tick()
      assert.equal(skCallsTo((u) => u === '/api/skills?lang=en'), 1, '英文态开窗拉清单带 ?lang=en')
      assert.equal(skCallsTo((u) => u === '/api/skills'), 0, '英文态不发无参数的清单请求')
      assert.equal(skCallsTo((u) => u === '/api/skills/grilling?lang=en'), 1, '单篇也按语言取（默认总览篇）')
      assert.ok(Array.from(skDoc.querySelectorAll('#skillsNav .item')).some((b) => b.querySelector('.nm').textContent.indexOf('The grilling primitive') === 0), '侧栏标题出自英文清单')
      assert.match(skArt().textContent, /design tree in rounds/, '正文是英文镜像篇')
      assert.ok(!CJK_RE.test(skArt().textContent), '有镜像的篇整屏正文零中文')
      assert.equal(skArt().querySelector('.fallback'), null, '有镜像的篇不挂「暂无英文」标注')
      skNavItem('wizard').dispatchEvent(new skWin.Event('click', { bubbles: true }))
      await tick()
      await tick()
      assert.equal(skCallsTo((u) => u === '/api/skills/wizard?lang=en'), 1, '换篇仍带语言参数')
      assert.ok(CJK_RE.test(skArt().querySelector('p').textContent), '缺镜像的篇回退中文原文')
      const fb = skArt().querySelector('.fallback')
      assert.ok(fb, '回退时正文上方挂标注')
      assert.match(fb.textContent, /no English version yet/i, '标注说清「这篇暂无英文」')
      assert.ok(!CJK_RE.test(fb.textContent), '标注本身随界面语言（英文态出英文）')
      // 切中文：清单作废重取且不带任何参数（中文态请求与票 03 之前逐字节的红线就在这一格上）
      skDoc.getElementById('langBtn').dispatchEvent(new skWin.Event('click', { bubbles: true }))
      await tick()
      await tick()
      assert.equal(skCallsTo((u) => u === '/api/skills'), 1, '中文态开窗拉清单不带参数')
      assert.deepEqual(skCalls.filter((u) => u.indexOf('/api/skills') === 0 && u.indexOf('?lang=zh') >= 0), [], '中文态不用 ?lang=zh 表达中文')
      assert.match(skDoc.querySelector('#skillsNav .item .nm').textContent, /拷问原语|人工步骤向导/, '侧栏标题回到中文清单')
      assert.match(skArt().querySelector('p').textContent, /只有人|那几步/, '正文延续正在看的那篇（切语言不换篇）')
      assert.equal(skArt().querySelector('.fallback'), null, '中文态永不挂「暂无英文」标注')
      // 切回英文：清单重取一次，正文命中同语言的缓存（不再发单篇请求）
      const docCallsBefore = skCallsTo((u) => u.indexOf('/api/skills/') === 0)
      skDoc.getElementById('langBtn').dispatchEvent(new skWin.Event('click', { bubbles: true }))
      await tick()
      await tick()
      assert.equal(skCallsTo((u) => u === '/api/skills?lang=en'), 2, '清单按语言只有一份，切回来重取')
      assert.equal(skCallsTo((u) => u.indexOf('/api/skills/') === 0), docCallsBefore, '单篇缓存键含语言：切回来的这一篇不重发')
      assert.ok(skArt().querySelector('.fallback'), '缓存路径也照常挂标注')
      assert.deepEqual(jsErrorsSk, [])
      skDom.window.close()
      ok('技能弹窗按语言取篇（jsdom）：英文态清单与单篇都带 ?lang=en、侧栏与正文出英文；中文态两类请求都不带参数且不挂标注；镜像缺篇回退中文原文（响应头 X-FlowDeck-Doc-Lang 自报 zh）并在正文上方挂英文标注、缓存路径同挂；切语言重取清单而单篇按语言各自缓存')
    }

    ok('界面运行时：jsdom 真跑一遍无报错，流程链渲染、effort 切换、票表、项目标签条与开新标签菜单都对')
  }
}

async function main() {
  const tmp = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'flowdeck-'))
  try {
    await runScenarios(tmp)
  } finally {
    // 断言抛错也要清走临时工作区：各服务器句早有 try/finally，tmp 原先只在成功路径末尾删。
    await fs.rm(tmp, { recursive: true, force: true })
  }
  console.log('\nOK · ' + passed + ' 组断言全绿')
}

main().catch((e) => {
  console.error('\n验证失败：' + (e && e.stack ? e.stack : e))
  process.exit(1)
})
