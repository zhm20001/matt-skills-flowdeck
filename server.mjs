/**
 * flowdeck/server.mjs — 流程板本地服务（零依赖，Node ≥ 18）。
 *
 * 这是什么：「追踪 .scratch 产物 + 流程链可视化」的通用本地 Web 服务。
 * 它不依赖任何 npm 包；任何 Agent（Claude Code / Cursor / 手写都行）
 * 只要把产物按约定写进 .scratch/，打开浏览器就能看到 grill → to-spec → to-tickets → implement
 * 走到了哪一步、下一步该干什么。
 *
 * 本目录是自包含的：整体拷到任何地方都能跑（node server.mjs 或 npm start），
 * 配置全部读本目录的 config.json，追踪目录既能在配置里写死，也能在网页右上角
 * 随时换（POST /api/config，改完立即生效并写回 config.json）。
 *
 * 路由：
 *   GET  /            界面（本目录的 index.html）
 *   GET  /styles/*.css  界面的运行时 CSS（app.css + 各主题 tokens，白名单放行）
 *   GET  /api/state   当前追踪目录的完整盘点（JSON，含 pollMs / pollMode / host / port / tokenEnabled / configPath / recentRoots 常用目录、
 *                     guides 指引词自定义段（五面：grill / spec / tickets / implement / ticket，各 { zh, en }；
 *                     guidesPrefix 指引词前缀（与 guides 平级，形状 { 面名: 字符串 }，中英不分列）；
 *                     原值下发，界面据此取代内置指引词、给票行那面填 {key}/{path}/{title} 三个槽，
 *                     并在复制那一刻把前缀贴在最前面；服务端不参与拼装）、
 *                     stageNames 四阶段人话名表（flowchain.mjs FLOW_STAGES 的直通车，链格/通知/项目总览共用）、
 *                     每 effort 一条 git 旁证字段——最近提交或 null，~15s TTL、不随指纹走）。
 *                     双层短路：磁盘没变的那一拍由服务端指纹短路（不重扫不重传，复用上一拍 JSON；
 *                     git 旁证例外——提交不动文件 mtime，指纹命中拍仍按 TTL 重查，见 gitForEfforts）；
 *                     响应带 ETag，If-None-Match 命中回 304 空身（配 Cache-Control: no-cache）
 *   GET  /api/health  探活
 *   GET  /api/roots-overview  项目总览：常用目录逐个只读盘点（每行 = 归一路径/项目名/状态分级/
 *                     链阶段/票计数/迷雾数；单目录失败只标该行，不拖垮整窗）。按需单拍——弹窗打开才请求，
 *                     不进轮询载荷；GET 不触碰常用目录排序（收录/置顶只发生在真切换）
 *   GET  /api/issue?effort=<slug>&ticket=<票号>  单张票的 Markdown 原文（懒加载：点开才取，不进轮询载荷；
 *                     读侧 1MB 护栏与扫描同款；effort 或票号不存在回 404）
 *   GET  /api/skills[?lang=en]  技能介绍文档清单（docs/skill-intros/*.md 的 frontmatter，按分类与 order 排序；
 *                     lang=en 只换 title/summary 为同名英文镜像篇（docs/skill-intros-en/），缺镜像的条目加 noEnglish，
 *                     分类/顺序/开发中一律仍以中文目录为准；不带 lang = 响应逐字节不变）
 *   GET  /api/skills/<名字>[?lang=en]  单篇技能介绍原文（Markdown；名字限字母数字与连字符，中文原文只读
 *                     docs/skill-intros/、英文镜像只读 docs/skill-intros-en/，两个目录都定死，无路径穿越面；
 *                     lang=en 先取同名英文镜像篇，缺篇回退中文原文；实际所服务的语言随
 *                     X-FlowDeck-Doc-Lang 头下发，界面据此挂「暂无英文」标注）
 *   POST /api/config  改配置并持久化到 config.json：root（热切换+收录常用目录）、pollMs / pollMode / guides / guidesPrefix（下一拍生效）、
 *                     token（立即接管校验；空串=清除）、host/port（写盘，重启后生效）（要求带 X-FlowDeck 头，防跨站写）
 *   POST /api/recent-roots  删一条常用目录并写回 config.json（防护同上；删未知条目幂等成功）
 *
 * 防护三层：所有请求先过 Host 头校验（回环绑定下只认 127.0.0.1 / localhost / [::1]，
 * 封 DNS rebinding；非回环绑定如 0.0.0.0 放宽，README 记录残留风险）；POST 端点另要求
 * X-FlowDeck 自定义头 + JSON Content-Type，请求体按字节计、超 30KB（30720 字节）应答 413；config.json 的 token
 * 非空时，/api/* 全部要求令牌（X-FlowDeck-Token 头或 ?token= 查询串，局域网暴露场景用）。
 *
 * 用法：
 *   node server.mjs [--root <目录>] [--port 3210] [--host 127.0.0.1] [--config <config.json 路径>] [--token <令牌>]
 *   配置优先级：命令行参数 > config.json > 内置默认。端口被占自动向后试 10 个。
 */

import http from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import nodePath from 'node:path'
import os from 'node:os'
import { readFile, stat, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import { scanWorkspace, readIfExists, TICKET_FILE } from './scan.mjs'
import { FLOW_STAGES } from './flowchain.mjs'

const execFile = promisify(execFileCb)

const HERE = nodePath.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONFIG_PATH = nodePath.join(HERE, 'config.json')
const INDEX_HTML = nodePath.join(HERE, 'index.html')
// 技能介绍文档目录（docs/skill-intros/，随仓库自包含）。只读这一目录下的 .md，没有路径穿越面。
const SKILLS_DOCS_DIR = nodePath.join(HERE, 'docs', 'skill-intros')
/* 英文镜像目录（english-ui 票 03）：与中文篇同名一一对应，只翻 title/summary 与正文。
   中文目录是清单的唯一骨架——分类、顺序、开发中标一律以它为准，镜像不是第二套元数据；
   镜像缺篇时清单打 noEnglish 标注、单篇回退中文原文。 */
const SKILLS_DOCS_EN_DIR = nodePath.join(HERE, 'docs', 'skill-intros-en')
const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/
const SKILL_CATEGORY_RANK = { overview: 0, engineering: 1, productivity: 2, misc: 3, 'in-progress': 4 }
// 界面引用的静态资源白名单：只放行 styles/ 里点名的文件，不做通用静态服务，也就没有路径穿越。
const STATIC_FILES = {
  '/styles/app.css': [nodePath.join(HERE, 'styles', 'app.css'), 'text/css; charset=utf-8'],
  '/styles/tokens-cold.css': [nodePath.join(HERE, 'styles', 'tokens-cold.css'), 'text/css; charset=utf-8'],
  '/styles/tokens-paper.css': [nodePath.join(HERE, 'styles', 'tokens-paper.css'), 'text/css; charset=utf-8'],
  '/styles/tokens-github-dark.css': [nodePath.join(HERE, 'styles', 'tokens-github-dark.css'), 'text/css; charset=utf-8'],
}

const DEFAULT_CONFIG = { root: '', port: 3210, host: '127.0.0.1', pollMs: 5000, pollMode: 'observe', recentRoots: [], token: '', guides: {}, guidesPrefix: {} }

/** 指引词自定义段每一面的语言列（custom-guides 票 02，票 03 起服务五面）：形状 `guides.<面名>.{zh, en}`。
 *  一个 config 字段装全部面——config.json 里一处可找，界面也只发一个字段。
 *  五个面名是 grill / spec / tickets / implement（四个阶段格，面名即 flowchain.mjs 的阶段 id）加 ticket
 *  （点票行复制那面）；它们住在界面的面下拉里，服务端只把原值搬下去，所以这里不必也不该知道有五面。 */
const GUIDE_LANGS = Object.freeze(['zh', 'en'])

/** 指引词自定义段的归一（custom-guides 票 02，ADR-0004）：合规返回归一后的对象，不合规返回 undefined。
 *  合规的判据只有一条——每面是个对象，且里面的键**只有** zh/en 两个、都得是字符串。缺面与空串都合法：
 *  那正是「回落内置段」这一事实本身，由客户端按非空判定，不靠键的缺席。
 *  「只有 zh/en」是有意收紧：面里多出来的键没有第二个消费者，悄悄丢掉就等于静默吞掉一个笔误
 *  （键名打错的人会以为改生效了）。面名反过来不设限，原样透传——票 03 把面数从一扩到五、给票行
 *  开三个槽时，服务端因此一个字都不用改（照旧只搬值不拼装），面下拉与取词全在界面那一侧。
 *  两条路径宽严不同，各有各的理由：POST /api/config 把 undefined 当非法、整体 400 且一个字都不写盘
 *  （沿用既有语义）；读 config.json 那条（applyConfigText）把它当坏值回落空对象并告警一次，与 pollMode
 *  归一同姿态——手改文件写坏一个面的形状不该让整份配置失效，更不该让服务起不来。 */
export function normalizeGuides(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out = {}
  for (const face of Object.keys(raw)) {
    // __proto__ 不是面名。JSON.parse 会把它落成自有属性（读得到），而 out[face] = … 走的是原型
    // setter（会改 out 的原型而不是加键）——两种行为都不是「一个叫 __proto__ 的面」，早拒最省事。
    if (face === '__proto__') return undefined
    const one = raw[face]
    if (!one || typeof one !== 'object' || Array.isArray(one)) return undefined
    const langs = {}
    for (const key of Object.keys(one)) {
      if (GUIDE_LANGS.indexOf(key) < 0) return undefined
      if (typeof one[key] !== 'string') return undefined
      langs[key] = one[key]
    }
    out[face] = langs
  }
  return out
}

/** 指引词前缀每一面的归一（guides-prefix 票 01）：形状 `guidesPrefix.<面名>` = 一个字符串。
 *  比 guides 窄一维是刻意的——前缀装的是每次都一样的一段话（典型是一条斜杠命令），
 *  中英文本无差别，分列会造出「两列不等」这种界面表示不了的状态（面下拉只有一行输入框）。
 *  合规的判据只有一条——每面是个字符串。缺面与空串都合法：空串就是「空前缀 = 不贴」这一事实本身，
 *  由客户端按非空判定，不靠键的缺席。面名照 guides 那一侧的纪律原样透传、不校验。
 *  两条路径宽严不同，与 guides 同一套处置：POST 把 undefined 当非法、整体 400 且一个字都不写盘；
 *  读 config.json 那条把它当坏值回落空对象并告警一次。 */
export function normalizeGuidesPrefix(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out = {}
  for (const face of Object.keys(raw)) {
    // 与 normalizeGuides 同一处置：__proto__ 读得到、赋值又会走原型 setter，两头都不是「一个面」
    if (face === '__proto__') return undefined
    const one = raw[face]
    if (typeof one !== 'string') return undefined
    out[face] = one
  }
  return out
}

/** pollMs 归一：数字且有限才收，钳到下限 1000（太小会白耗磁盘），其余回落默认。启动与每次轮询现读共用。 */
export function normalizePollMs(raw) {
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(1000, Math.round(n)) : DEFAULT_CONFIG.pollMs
}

/** 轮询模式三档（eng-optimizations 票 06）：
 *  observe = 观测（默认）：页面可见才定时轮询，不可见停表、回前台立即一拍；
 *  display = 展示：常规定时轮询（大屏常亮场景的原行为）；
 *  manual  = 惰性：零自动请求，只靠界面「立即刷新」。
 *  归一：取值之外的回落默认。 */
export const POLL_MODES = Object.freeze(['observe', 'display', 'manual'])

export function normalizePollMode(raw) {
  return POLL_MODES.includes(raw) ? raw : DEFAULT_CONFIG.pollMode
}

/** 生效语义（HTTP 契约的两词）：immediate = 写盘即生效；restart = 写盘后重启才接管。
 *  前端（index.html 的 APPLY_RESTART）只特判 restart、其余一律按立即生效——零依赖无构建，
 *  两端代码共享不了，靠这对常量与注释互指钉住契约。 */
const EFFECT = Object.freeze({ IMMEDIATE: 'immediate', RESTART: 'restart' })

/**
 * config 同构字段描述表（校验 + 生效语义）：POST /api/config 的「校验 → patch → applied」
 * 由此表驱动，加一个同构字段 = 加一行表项。normalize 合法返回归一值（token 允许空串=清除）、
 * 非法返回 undefined；effect 是 applied 的生效语义；error 是 400 文案；code 是该文案的稳定错误码
 * （小写 `域.名字`，字段名按 kebab 写法——pollMs → poll-ms）。
 * root 不在表里——假同构：存在性校验、换目录热切换、收录常用目录是副作用，独立分支处理
 * （见 handleConfigPost），硬塞进表是假统一。
 */
const CONFIG_FIELDS = {
  pollMs: {
    normalize: (v) => {
      const n = Number(v)
      return Number.isFinite(n) && n >= 1000 ? Math.round(n) : undefined
    },
    effect: EFFECT.IMMEDIATE, // /api/state 真变化拍现读 config.json，写盘即生效
    code: 'config.poll-ms',
    error: 'pollMs 需为不小于 1000 的数字（毫秒）。',
  },
  // pollMode 是表驱动化后的第一个新字段（票 06 的实战检验）：一行表项接住三档轮询模式
  pollMode: {
    normalize: (v) => (typeof v === 'string' && POLL_MODES.includes(v) ? v : undefined),
    effect: EFFECT.IMMEDIATE, // 随 /api/state 下发，写盘后下一拍每个浏览器都换档
    code: 'config.poll-mode',
    error: 'pollMode 需为 observe / display / manual 之一。',
  },
  host: {
    normalize: (v) => {
      const h = String(v).trim()
      return h && h.length <= 64 && /^[0-9A-Za-z.:[\]-]+$/.test(h) ? h : undefined
    },
    effect: EFFECT.RESTART, // 监听地址启动时绑定，写盘后重启才接管
    code: 'config.host',
    error: 'host 需为非空的主机名或 IP（如 127.0.0.1、0.0.0.0、localhost）。',
  },
  port: {
    normalize: (v) => {
      const p = Number(v)
      return Number.isInteger(p) && p >= 1 && p <= 65535 ? p : undefined
    },
    effect: EFFECT.RESTART,
    code: 'config.port',
    error: 'port 需为 1–65535 的整数。',
  },
  token: {
    normalize: (v) => (typeof v === 'string' ? v.trim() : undefined),
    effect: EFFECT.IMMEDIATE,
    code: 'config.token',
    error: 'token 需为字符串；空串表示清除令牌（关闭鉴权）。',
  },
  // guides（custom-guides 票 02，五面接通于票 03）：指引词自定义段，一个字段装全部五面
  // （grill / spec / tickets / implement / ticket）。归一回 undefined = 结构非法 → 整个请求 400
  // 且一个字都不写盘；immediate = 写盘即生效（/api/state 真变化拍现读 config.json，且 config 的
  // mtime+size 本就在指纹里，手改也下一拍跟上）。服务端只把值原样搬下去，不参与拼装——
  // 「服务端不造字」的纪律在这一格同样成立，票行那面的 {key}/{path}/{title} 也由界面在复制那一刻填。
  guides: {
    normalize: (v) => normalizeGuides(v),
    effect: EFFECT.IMMEDIATE,
    code: 'config.guides',
    error: 'guides 需为 { 面名: { zh, en } } 形状的对象，面内只认 zh/en 两键且都必须是字符串（缺面或空串 = 回落内置指引词）。面名通常是 grill / spec / tickets / implement / ticket 五面，但不校验——别的面名也照收不误（界面只认这五面，写错的面名等于没写）。',
  },
  // guidesPrefix（guides-prefix 票 01）：与 guides 平级的一个字段，装每一面复制时要贴在最前面那句话。
  // 形状 { 面名: 字符串 }——值的维度只有一个（中英不分列），与 guides 同一套纪律：不参与拼装、
  // immediate 生效、面名不校验。空串 = 不贴，由界面按非空判定。
  guidesPrefix: {
    normalize: (v) => normalizeGuidesPrefix(v),
    effect: EFFECT.IMMEDIATE,
    code: 'config.guides-prefix',
    error: 'guidesPrefix 需为 { 面名: 字符串 } 形状的对象，每个面的前缀都必须是字符串（缺面或空串 = 这一面不贴前缀）。面名通常是 grill / spec / tickets / implement / ticket 五面，但不校验——别的面名也照收不误（界面只认这五面，写错的面名等于没写）。',
  },
}

// Host 头校验（防 DNS rebinding）：恶意页面把它的域名重绑定到 127.0.0.1 后请求即同源，
// X-FlowDeck 头随手就能带，只剩 Host 头能分辨「请求是不是冲着本机服务来的」。
const LOOPBACK_BIND_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const ALLOWED_REQUEST_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

/** 绑定地址是不是回环。只有回环绑定才启用严格 Host 白名单；用户显式绑 0.0.0.0 等
 *  是主动暴露给局域网（无鉴权），此时校验放宽，不然局域网用法全被 403 打死。 */
function isLoopbackBind(bindHost) {
  return LOOPBACK_BIND_HOSTS.has(String(bindHost || '').trim().toLowerCase())
}

/** 访问令牌是否匹配：两边各过一遍 sha256 再常数时间比较，长度差异也不泄露。
 *  期望值为空 = 未启用令牌，恒通过。 */
function tokenMatches(expected, provided) {
  if (!expected) return true
  const a = createHash('sha256').update(String(expected)).digest()
  const b = createHash('sha256').update(String(provided === undefined || provided === null ? '' : provided)).digest()
  return timingSafeEqual(a, b)
}

/** Host 头是否放行：剥端口（[::1]:3210 与 host:port 两种写法）、忽略大小写后比对白名单。 */
function hostAllowed(rawHost, bindHost) {
  if (!isLoopbackBind(bindHost)) return true
  if (!rawHost) return false
  let h = String(rawHost).trim().toLowerCase()
  if (h.startsWith('[')) {
    const end = h.indexOf(']')
    h = end < 0 ? h : h.slice(0, end + 1)
  } else {
    const colon = h.indexOf(':')
    if (colon >= 0) h = h.slice(0, colon)
  }
  return ALLOWED_REQUEST_HOSTS.has(h)
}

/** 每个配置路径至多告警一次的记账：/api/state 每次轮询都会重读 config.json，不能让坏文件刷屏。 */
const warnedConfigPaths = new Set()

/** 配置读取失败的记账：文件不存在是正常起步状态，静默回退；其余失败（多半是手写坏 JSON）
 *  按路径告警一次。同步与异步两条读取路径共用这份记账，告警不随轮询刷屏。 */
function noteConfigReadFailure(path, e) {
  if (e && e.code === 'ENOENT') return
  if (warnedConfigPaths.has(path)) return
  warnedConfigPaths.add(path)
  console.warn('config.json 读取失败，已回退内置默认值：' + path + '（原因：' + String((e && e.message) || e) + '）')
}

/** 把配置原文合并进默认配置：文件里缺的字段保持默认，recentRoots 归一，guides / guidesPrefix 结构非法回落空对象。 */
function applyConfigText(cfg, raw) {
  const data = JSON.parse(raw)
  for (const key of ['root', 'port', 'host', 'pollMs', 'pollMode', 'token']) {
    if (data && data[key] !== undefined) cfg[key] = key === 'pollMode' ? normalizePollMode(data[key]) : data[key]
  }
  if (data && data.recentRoots !== undefined) cfg.recentRoots = normalizeRecentRoots(data.recentRoots)
  if (data && data.guides !== undefined) {
    const guides = normalizeGuides(data.guides)
    // 读侧比写侧宽：坏形状回落空对象（= 全用内置段），不抛也不整份丢弃——与 pollMode 归一同姿态。
    // 但「静默」两个字要不得：POST 那边同一份坏形状是 400，这边若是闷声回落，键名打错的人只会看到
    // 自定义段忽然不生效而无从查起。沿用每个路径至多告警一次的记账，不随轮询刷屏。
    if (guides === undefined) {
      noteConfigReadFailure(cfg.configPath, new Error('guides 字段形状非法（需 { 面名: { zh, en } }，面内只认 zh/en），已回退内置指引词'))
      cfg.guides = {}
    } else {
      cfg.guides = guides
    }
  }
  if (data && data.guidesPrefix !== undefined) {
    const guidesPrefix = normalizeGuidesPrefix(data.guidesPrefix)
    // 与 guides 同一姿态：手改写坏一个面的形状，不该让整份配置失效、更不该让服务起不来（回落 = 不贴前缀）
    if (guidesPrefix === undefined) {
      noteConfigReadFailure(cfg.configPath, new Error('guidesPrefix 字段形状非法（需 { 面名: 字符串 }，每个面都必须是一个字符串），已回退空前缀'))
      cfg.guidesPrefix = {}
    } else {
      cfg.guidesPrefix = guidesPrefix
    }
  }
}

function baseConfig(configPath) {
  const path = nodePath.resolve(configPath || DEFAULT_CONFIG_PATH)
  return { ...DEFAULT_CONFIG, configPath: path }
}

/** 读配置文件；文件不存在或字段缺失就用内置默认（不抛、不自动建文件）。
 *  recentRoots 是手写友好的：读入时按 resolveRoot 归一去重（~/ 与绝对路径的不同写法算同一条）。
 *
 *  设计声明（勿单侧删除同步版）：写路径的读-改-写（loadConfig → 改 → saveConfig）全程同步，
 *  Node 单线程内不可交错，并发 POST 不丢补丁；轮询热路径的同一读取走下面的异步版，
 *  同步 IO 不压事件循环。两对「同步守原子、异步守热路径」是接缝不是重复。 */
export function loadConfig(configPath) {
  const cfg = baseConfig(configPath)
  try {
    applyConfigText(cfg, readFileSync(cfg.configPath, 'utf8'))
  } catch (e) {
    noteConfigReadFailure(cfg.configPath, e)
  }
  return cfg
}

/** 异步版 loadConfig：/api/state 轮询热路径用，同样的合并与告警语义，但同步 IO 不跑在事件循环上。
 *  设计声明（勿单侧删除）：双版本是有意接缝，同步版的存在理由见 loadConfig 注释。 */
async function loadConfigAsync(configPath) {
  const cfg = baseConfig(configPath)
  try {
    applyConfigText(cfg, await readFile(cfg.configPath, 'utf8'))
  } catch (e) {
    noteConfigReadFailure(cfg.configPath, e)
  }
  return cfg
}

/** 把补丁合并进现有配置并写盘（保留文件里其他字段，比如「说明」）。 */
export function saveConfig(patch, configPath) {
  const path = nodePath.resolve(configPath || DEFAULT_CONFIG_PATH)
  let current = {}
  try {
    current = JSON.parse(readFileSync(path, 'utf8'))
  } catch {}
  const next = { ...current }
  for (const key of Object.keys(patch)) next[key] = patch[key]
  writeFileSync(path, JSON.stringify(next, null, 2) + '\n')
  return next
}

/**
 * 解析用户填的追踪目录：
 *   空        → 启动服务时的当前目录；
 *   ~/ 开头   → 展开成用户主目录；
 *   相对路径  → 按本目录（config.json 所在目录）解析，拷到哪里都行为一致。
 */
export function resolveRoot(raw) {
  let s = String(raw === undefined || raw === null ? '' : raw).trim()
  if (!s) return process.cwd()
  if (s === '~' || s.startsWith('~/')) s = nodePath.join(os.homedir(), s.slice(1))
  if (!nodePath.isAbsolute(s)) s = nodePath.join(HERE, s)
  return nodePath.resolve(s)
}

/** 常用目录列表上限：满了挤掉最久未用的尾部条目。 */
export const RECENT_ROOTS_LIMIT = 50

/** 把 config 里的 recentRoots 原始值归一成 MRU 列表：每条按 resolveRoot 归一（~/ 展开、相对按本目录解析），
 *  同一目录的不同写法算一条，非字符串/空白条目丢弃，截到上限。纯函数，不动入参。 */
export function normalizeRecentRoots(raw) {
  const out = []
  for (const item of Array.isArray(raw) ? raw : []) {
    if (typeof item !== 'string' || !item.trim()) continue
    const n = resolveRoot(item)
    if (!out.includes(n)) out.push(n)
  }
  return out.slice(0, RECENT_ROOTS_LIMIT)
}

/** 收录一次目录使用：归一后放到最前（已存在等于移顶），超出上限淘汰最久未用的尾部。纯函数。 */
export function touchRecentRoot(raw, usedPath) {
  return normalizeRecentRoots([resolveRoot(usedPath), ...(Array.isArray(raw) ? raw : [])])
}

function sendJson(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

/** JSON 错误应答的统一出口（english-ui 票 02）：两个字段各司其职——
 *  error 是人话原文（日志读它，界面在 code 不认识时回退读它），code 是稳定契约键
 *  （小写 `域.名字`，换措辞不换 code，界面按 code + 当前语言自己组句）。
 *  纯文本通道（sendFile 的 404、未知路径）不在此列：界面不消费其正文。
 *  逐字节红线的适用面（双轴评审收口写明）：技能端点「不带 lang 响应逐字节不变」钉的是成功体——
 *  JSON 错误应答从本票起就带 code 字段，这是有意的豁免（界面按 code 措辞靠它），
 *  verify 的 code 契约组钉住这一形状。 */
function sendErr(res, status, code, error) {
  sendJson(res, status, { error, code })
}

/** /api/state 专用应答：带 ETag 与 Cache-Control: no-cache；If-None-Match 命中回 304 空身。
 *  no-cache 必须同发——它要求浏览器「可以缓存，但用前必须复验」，缺了它浏览器可能不问
 *  直接用旧副本，界面会停更。304 应答同样带这两头，复验链不断。 */
function sendState(req, res, entry) {
  const asked = String(req.headers['if-none-match'] || '')
    .split(',')
    .map((s) => s.trim().replace(/^W\//, ''))
    .filter(Boolean)
  if (asked.includes(entry.etag)) {
    res.writeHead(304, { ETag: entry.etag, 'Cache-Control': 'no-cache' })
    res.end()
    return
  }
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    ETag: entry.etag,
    'Cache-Control': 'no-cache',
  })
  res.end(entry.body)
}

/** 同步版存在性检查：POST 写路径用（低频）。与 dirExistsAsync 是有意接缝（设计声明，勿单侧删除）：
 *  写路径的读-改-写全程同步守进程内原子性；轮询热路径走异步版，同步 IO 不压事件循环。 */
function dirExists(p) {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** dirExists 的异步版：轮询热路径（指纹与载荷的常用目录存在性逐条 stat）不把同步 IO 压在事件循环上。 */
async function dirExistsAsync(p) {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** recentRoots 的接口形态映射：对象数组（归一路径 + 该目录当前是否存在）——存在性只能由服务端看磁盘。
 *  同步版只服务低频的 POST 删除端点；轮询热路径（stateEntry）走异步并行版。 */
function withExists(paths) {
  return paths.map((path) => ({ path, exists: dirExists(path) }))
}

/** /api/state 的可调配置载荷组装：recentRoots（归一路径 + 存在性）、pollMs（归一）、
 *  host/port（本次启动的运行值——设置表单的初值语义：写进 config.json 的新值要重启才接管）、
 *  tokenEnabled（非机密）、guides（指引词自定义段原值）与 guidesPrefix（指引词前缀原值）。cfg 与存在性
 * 向量由调用方读好传入——真变化拍一份配置只读一次。
 *  注意：本组装只在「真变化拍」跑——指纹命中的拍整包复用缓存，这里不执行。 */
function configPart(cfg, runtime, exists) {
  return {
    recentRoots: cfg.recentRoots.map((path, i) => ({ path, exists: exists[i] })),
    pollMs: normalizePollMs(cfg.pollMs),
    pollMode: normalizePollMode(cfg.pollMode),
    host: runtime.host,
    port: runtime.port,
    tokenEnabled: runtime.token !== '',
    guides: cfg.guides || {},
    guidesPrefix: cfg.guidesPrefix || {},
  }
}

// ── /api/state 双层短路（eng-optimizations 票 01）──
//
// 第一层·服务端指纹：指纹 = stat 摘要——.scratch 全树各条目的 mtime+大小与目录结构、
// config.json 的 mtime+大小、常用目录存在性、运行时值（root/host/port/tokenEnabled）。
// 盘点会读的每样东西都进指纹；命中则整拍复用上一拍 JSON，读盘、解析、序列化整站跳过
// （config 载荷部分同样不重算——覆盖条款：config.json 的 stat 变化即指纹失效，
// 「手改 config 下一拍可见」语义不变）。残余成本只有指纹自己的一次小读与 stat。
// 第二层·ETag/304：响应带内容编号（响应体的 sha256），浏览器拿 If-None-Match 复验，
// 命中回 304 空身，省传输与前端解析。必须同发 Cache-Control: no-cache——不配的话
// 浏览器可能不问直接用旧副本，界面会「停更」。本机回环用法指纹是收益主体，
// ETag 在 0.0.0.0 局域网模式收益变实在。

/** .scratch 全树的 stat 摘要：每个条目一行 [相对路径, d|f, mtime, 大小]，按名排序后整树可比。
 *  只 stat 不读内容——指纹比全量盘点便宜的全部原因。stat 不到的条目记 '?'（读得到时指纹必变，保守失效）。 */
async function stampTree(base) {
  const rows = []
  async function walk(dir, prefix) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const rel = prefix + ent.name
      let st = null
      try {
        st = await stat(nodePath.join(dir, ent.name))
      } catch {}
      rows.push(st ? [rel, st.isDirectory() ? 'd' : 'f', st.mtimeMs, st.size] : [rel, '?', 0, 0])
      if (ent.isDirectory()) await walk(nodePath.join(dir, ent.name), rel + '/')
    }
  }
  await walk(base, '')
  return rows
}

/** 组装 /api/state 的指纹串：树 + config.json stat + 常用目录存在性向量 + 运行时值。 */
async function stateFingerprint(root, configPath, recentRoots, runtime) {
  const [tree, cfgStat, exists] = await Promise.all([
    stampTree(nodePath.join(nodePath.resolve(root), '.scratch')),
    stat(configPath).then(
      (s) => [s.mtimeMs, s.size],
      () => null
    ),
    Promise.all(recentRoots.map((p) => dirExistsAsync(p))),
  ])
  return JSON.stringify([
    nodePath.resolve(root),
    tree,
    cfgStat,
    exists,
    runtime.host,
    runtime.port,
    runtime.token !== '',
  ])
}

// ── git 旁证（feature-extensions 票 01）：每 effort 目录一次最近提交查询，只作展示、绝不参与完成判据 ──
//
// 分层声明：/api/state 的指纹保「磁盘没变不重盘」，本层保「提交了但文件没动也能在 TTL 内追上」。
// 两层必须分开——提交不改变文件 mtime，git 旁证若随指纹走，指纹命中的拍会永远复用旧值（陈旧陷阱）。
// 所以指纹命中的拍仍要重查本层（TTL 命中则零开销），git 变了就重组 body、换 ETag。
// 无 .git、git 不可用、命令失败一律 null（null 也进 TTL 缓存——无仓库的目录不该每拍空跑子进程）。

const GIT_TTL_DEFAULT_MS = 15000
/** TTL 惰性读：测试可用环境变量缩短（verify 用它验证「不随指纹走」的外部行为，非配置面）。 */
function gitTtlMs() {
  const v = Number(process.env.FLOWDECK_GIT_TTL)
  return v > 0 ? v : GIT_TTL_DEFAULT_MS
}

const gitCache = new Map() // effort 目录 → { at, value }

/** 一个目录的最近一次提交（限该目录）：短哈希 + ISO 时间 + 标题；任何失败都是 null。 */
async function gitLastCommit(dir) {
  try {
    const { stdout } = await execFile(
      'git',
      ['-C', dir, 'log', '-1', '--pretty=format:%h%x1f%cI%x1f%s', '--', '.'],
      { timeout: 4000, maxBuffer: 64 * 1024 }
    )
    // %h 等字段用 \x1f（单元分隔符）拼接；标题里出现 \x1f 的概率按零算，出现了也只是标题被切开再拼回。
    const line = String(stdout).split('\n')[0]
    const parts = line.split('\x1f')
    if (parts.length < 3 || !parts[0] || !parts[1]) return null
    return { hash: parts[0], date: parts[1], subject: parts.slice(2).join('\x1f') }
  } catch {
    return null
  }
}

/** 全部 effort 的 git 旁证（TTL 缓存按目录独立、命中拍零子进程）。输出按 slug 索引，供载荷组装。 */
async function gitForEfforts(root, efforts) {
  const scratchDir = nodePath.join(nodePath.resolve(root), '.scratch')
  const now = Date.now()
  const ttl = gitTtlMs()
  const values = await Promise.all(efforts.map((e) => {
    const dir = e.slug === '__root' ? scratchDir : nodePath.join(scratchDir, e.slug)
    const hit = gitCache.get(dir)
    if (hit && now - hit.at < ttl) return hit.value
    return gitLastCommit(dir).then((value) => {
      gitCache.set(dir, { at: Date.now(), value })
      return value
    })
  }))
  const out = {}
  efforts.forEach((e, i) => { out[e.slug] = values[i] })
  return out
}

/** 阶段名表随载荷下发（english-ui 双轴评审收口）：链格/通知/项目总览的阶段人话都从这里取，
 *  界面不再自抄第二份中文（此前抄在界面词表里，同名两处只能靠漂移断言兜着）。
 *  zh 列逐字节 = FLOW_STAGES 的 title/subtitle，en 列 = titleEn/subtitleEn——
 *  阶段名的单一来源在 flowchain.mjs 一张表，这里只是搬运工。 */
const STAGE_NAMES = FLOW_STAGES.map((f) => ({
  id: f.id, title: f.title, subtitle: f.subtitle, en: { title: f.titleEn, subtitle: f.subtitleEn },
}))

/** /api/state 应答条目的组装：盘点 + 阶段名表 + 配置载荷 + 每 effort 附 git 旁证字段。 */
function stateBody(state, cfg, runtime, exists, git) {
  const efforts = state.efforts.map((e) => ({ ...e, git: git[e.slug] || null }))
  return JSON.stringify({ ...state, stageNames: STAGE_NAMES, efforts, ...configPart(cfg, runtime, exists), configPath: cfg.configPath })
}

/** 取 /api/state 应答条目：先算指纹（用上一拍的 cfg 出存在性向量——config.json 的 stat
 *  钉住了它的内容，stat 没变解析结果就不会变），命中直接复用——但 git 旁证仍按 TTL 重查
 *  （不随指纹走）；git 变了重组 body 与 ETag。未命中全量重盘并落缓存。
 *  指纹算不出来（极端 IO 故障）当作未命中，行为回落「每拍全量」。 */
async function stateEntry(ctx) {
  const { currentRoot, runtime, configPath, cache } = ctx
  if (cache.state) {
    try {
      const fp = await stateFingerprint(currentRoot.path, configPath, cache.state.cfg.recentRoots, runtime)
      if (fp === cache.state.fp) {
        const git = await gitForEfforts(currentRoot.path, cache.state.state.efforts)
        if (JSON.stringify(git) === cache.state.gitSig) return cache.state
        const entry = {
          ...cache.state,
          gitSig: JSON.stringify(git),
          body: stateBody(cache.state.state, cache.state.cfg, runtime, cache.state.exists, git),
        }
        entry.etag = '"' + createHash('sha256').update(entry.body).digest('hex') + '"'
        cache.state = entry
        return entry
      }
    } catch {}
  }
  // 真变化拍：重读配置（手改文件下一拍生效的语义在这里）、全量重盘、存在性并行 stat、git 旁证。
  const cfg = await loadConfigAsync(configPath)
  const [state, exists] = await Promise.all([
    scanWorkspace(currentRoot.path),
    Promise.all(cfg.recentRoots.map((p) => dirExistsAsync(p))),
  ])
  const git = await gitForEfforts(currentRoot.path, state.efforts)
  const body = stateBody(state, cfg, runtime, exists, git)
  const entry = {
    fp: await stateFingerprint(currentRoot.path, configPath, cfg.recentRoots, runtime),
    state,
    cfg,
    exists,
    gitSig: JSON.stringify(git),
    body,
    etag: '"' + createHash('sha256').update(body).digest('hex') + '"',
  }
  cache.state = entry
  return entry
}

function sendSaveFailed(res, code, e) {
  sendErr(res, 500, code, '写 config.json 失败：' + String((e && e.message) || e))
}

/** POST 体积护栏上限（字节）：30720 = 30KB。原「10240 字符」在全中文（UTF-8 每字 3 字节）
 *  下的实际字节天花板即 30720——改按字节计后沿用该天花板，对既有合法载荷零收紧。 */
const POST_BODY_LIMIT = 30720

/** POST 端点共用：防跨站写校验 + 限额读体 + 解析 JSON。
 *  浏览器里别的网页发不出自定义头（没有 CORS 允许就发不过来），这一层挡掉跨站写。
 *  体积按字节计：data 回调里累计 chunk.length（chunk 本身就是 Buffer），多字节文案与事实一致。
 *  校验失败时本函数已应答（403/400/413）；合格时把解析出的对象交给 onJson。 */
function guardPostJson(req, res, onJson) {
  if (req.headers['x-flowdeck'] !== '1' || String(req.headers['content-type'] || '').indexOf('application/json') < 0) {
    sendErr(res, 403, 'write.header', '请求缺少 X-FlowDeck 头或 Content-Type 不是 JSON，已拒绝。')
    return
  }
  const chunks = []
  let size = 0
  let tooBig = false
  req.on('data', (chunk) => {
    if (tooBig) return
    size += chunk.length
    if (size > POST_BODY_LIMIT) {
      tooBig = true
      // 先把 413 完整写出、应答落盘后再掐连接：客户端拿到的是明确错误而不是「网络断了」。
      sendErr(res, 413, 'write.too-large', '请求体超过 30KB 上限。')
      res.once('finish', () => req.destroy())
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (tooBig) return
    let input
    try {
      // Buffer 收齐再一次性转字符串：按 chunk 逐段 toString 会把跨块的多字节字符拆成替换符。
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      sendErr(res, 400, 'write.bad-json', '请求体不是合法 JSON。')
      return
    }
    onJson(input)
  })
  // 客户端半途中断：此时可能已应答也可能无需应答，兜住读流上的 error 不让进程崩。
  req.on('error', () => {})
}

async function sendFile(res, filePath, type, extraHeaders) {
  try {
    const body = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extraHeaders })
    res.end(body)
  } catch (e) {
    // 文档缺了就是缺了（404）；其余错误（权限等）照旧 500 交代原因。
    const code = e && e.code === 'ENOENT' ? 404 : 500
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end((code === 404 ? '没有这个文件：' : '读文件失败：') + String((e && e.message) || e))
  }
}

// ── 技能介绍文档（docs/skill-intros/ + 英文镜像 docs/skill-intros-en/）：清单与单篇，两端点认 ?lang ──

/** 技能端点的语言参数：只认 'en'（首尾空格与大小写宽容），其余一律中文——包括不带参数。
 *  「不带参数 = 现状响应」这条缺省路径是票 03 的红线，乱值不该另开第三条分支。 */
function skillLang(reqUrl) {
  return String(reqUrl.searchParams.get('lang') || '').trim().toLowerCase() === 'en' ? 'en' : 'zh'
}

/** 解析文档顶部的 frontmatter（--- 包围的 key: value 行）。缺块、坏行都宽容：清单字段逐个回落。 */
function parseSkillFrontmatter(text) {
  if (!text.startsWith('---')) return {}
  const end = text.indexOf('\n---', 3)
  if (end < 0) return {}
  const meta = {}
  for (const line of text.slice(3, end).split('\n')) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return meta
}

/** 英文镜像篇（english-ui 票 03）：「这篇有没有英文」的口径只此一处——同名文件读得出、
 *  frontmatter 带 title 才算有。清单据此决定要不要打 noEnglish（展示格），单篇据此决定
 *  回不回退中文（回退与否经 X-FlowDeck-Doc-Lang 头告知界面），两处共用一个谓词。
 *  （readIfExists 永不抛，坏篇只会 null。） */
async function readEnglishSkill(name) {
  if (!SKILL_NAME_RE.test(name)) return null
  const mirror = await readIfExists(nodePath.join(SKILLS_DOCS_EN_DIR, name + '.md'))
  if (!mirror) return null
  const meta = parseSkillFrontmatter(mirror.text)
  return meta.title ? { text: mirror.text, meta } : null
}

/** 技能清单：读 docs/skill-intros/ 全部 .md 的 frontmatter，按分类（总览最前）与 order 排序。
 *  目录读不到（整体拷走时缺了文档）回落空清单，界面照常渲染空态。
 *  lang='en'（english-ui 票 03）：骨架仍是中文清单，只把 title/summary 换成同名镜像篇的两格；
 *  镜像缺篇 → 保留中文两格并打 noEnglish（侧栏与导出可见的展示格；单篇正文的标注以
 *  X-FlowDeck-Doc-Lang 响应头为准——清单快照会过期，头不会）。
 *  除 title/summary/noEnglish 之外的字段一律不读镜像——分类与顺序的单一真相在中文目录。 */
async function skillsList(lang) {
  const base = await skillsListZh()
  if (lang !== 'en') return base
  const out = []
  for (const s of base) {
    const mirror = await readEnglishSkill(s.name)
    if (mirror) out.push({ ...s, title: mirror.meta.title, summary: mirror.meta.summary || s.summary })
    else out.push({ ...s, noEnglish: true })
  }
  return out
}

/** 中文清单（现状口径）：docs/skill-intros/ 逐篇读 frontmatter 成条目。不带语言参数的响应就出自这里。 */
async function skillsListZh() {
  let files
  try {
    files = await readdir(SKILLS_DOCS_DIR)
  } catch {
    return []
  }
  const list = []
  for (const f of files) {
    if (!f.endsWith('.md')) continue
    let text
    try {
      text = await readFile(nodePath.join(SKILLS_DOCS_DIR, f), 'utf8')
    } catch {
      continue
    }
    const meta = parseSkillFrontmatter(text)
    const name = meta.name || f.replace(/\.md$/, '')
    const order = Number(meta.order)
    list.push({
      name,
      category: meta.category || 'misc',
      order: Number.isFinite(order) ? order : 999,
      title: meta.title || name,
      summary: meta.summary || '',
      inProgress: meta.inProgress === 'true',
    })
  }
  list.sort((a, b) =>
    ((SKILL_CATEGORY_RANK[a.category] ?? 99) - (SKILL_CATEGORY_RANK[b.category] ?? 99)) ||
    (a.order - b.order) ||
    a.name.localeCompare(b.name)
  )
  return list
}

// ── 路由处理函数（按端点拆分；分发层见 startServer 内的 createServer）──
// 加一个端点 = 加一个这里的命名函数 + 分发器一行；跨切关注点（Host 校验、令牌闸门、
// 404）留在分发层。共享可变状态经 ctx 传入：{ currentRoot, runtime, configPath, cache }。

/** GET /api/state：双层短路热路径（stateEntry 内指纹短路，sendState 内 304）。 */
function handleApiState(ctx, req, res) {
  stateEntry(ctx)
    .then((entry) => sendState(req, res, entry))
    .catch((e) => sendErr(res, 500, 'state.failed', String((e && e.message) || e)))
}

/** GET /api/health：探活。 */
function handleApiHealth(ctx, res) {
  sendJson(res, 200, { ok: true, root: ctx.currentRoot.path })
}

/** GET /api/issue?effort=<slug>&ticket=<票号>：单张票的 Markdown 原文（懒加载，不进轮询载荷）。
 *  票正文偶尔查证、规格常读，不同权重——这里取的是磁盘现状，与盘点拍各是各的快照。
 *  输入白名单（slug 无路径分隔符/不以点开头、票号纯数字）+ 文件名走 TICKET_FILE 正则，
 *  两层都过才有路径可拼——没有路径穿越面。读侧 1MB 护栏与扫描同款（readIfExists）。
 *  Host 校验与令牌闸门在分发层，天然罩住本端点。 */
async function handleApiIssue(ctx, reqUrl, res) {
  const effort = String(reqUrl.searchParams.get('effort') || '')
  const ticket = String(reqUrl.searchParams.get('ticket') || '')
  const effortOk = effort && !effort.startsWith('.') && !effort.includes('/') && !effort.includes('\\')
    && effort !== '__proto__' && effort !== '.'
  if (!effortOk || !/^\d+$/.test(ticket)) {
    sendErr(res, 404, 'issue.bad-params', 'effort 或 ticket 参数不合法（effort 是目录名，ticket 是票号数字）。')
    return
  }
  const scratchDir = nodePath.join(nodePath.resolve(ctx.currentRoot.path), '.scratch')
  const effortDir = effort === '__root' ? scratchDir : nodePath.join(scratchDir, effort)
  const issuesDir = nodePath.join(effortDir, 'issues')
  let names
  try {
    names = await readdir(issuesDir)
  } catch {
    sendErr(res, 404, 'issue.no-effort', '没有这个 effort：' + effort)
    return
  }
  const want = ticket.padStart(2, '0')
  const hit = names.sort().find((name) => {
    const m = TICKET_FILE.exec(name)
    return m && m[1].padStart(2, '0') === want
  })
  if (!hit) {
    sendErr(res, 404, 'issue.no-ticket', '没有这张票：#' + ticket + '（effort ' + effort + '）')
    return
  }
  const file = await readIfExists(nodePath.join(issuesDir, hit))
  if (file === null) {
    // readdir 与 read 之间的竞态删除：按不存在应答，与盘点侧「打不开→丢弃」同款兜底。
    sendErr(res, 404, 'issue.no-ticket', '没有这张票：#' + ticket + '（effort ' + effort + '）')
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(file.text)
}

/** GET /api/skills[?lang=en]：技能介绍文档清单。不带 lang（或 lang 非 'en'）＝ 现状响应，逐字节不变。 */
function handleApiSkills(reqUrl, res) {
  skillsList(skillLang(reqUrl))
    .then((skills) => sendJson(res, 200, { skills }))
    .catch((e) => sendErr(res, 500, 'skills.list-failed', '盘点技能文档失败：' + String((e && e.message) || e)))
}

/** GET /api/skills/<名字>：单篇技能介绍原文（名字白名单；中文原文限 docs/skill-intros/、镜像限
 *  docs/skill-intros-en/，两个目录都定死，无路径穿越面）。
 *  ?lang=en 先取同名英文镜像篇；镜像缺篇（未译 / 读不出）回退中文原文。
 *  实际所服务的语言随 X-FlowDeck-Doc-Lang 头下发（english-ui 双轴评审收口）：英文请求命中镜像 = en，
 *  其余（中文请求、缺篇回退）= zh。界面据此挂「此篇暂无英文」标注——标注以实际响应为准，
 *  清单快照里的 noEnglish 会过期（拉清单之后镜像才缺/补），拿它当标注源会无声错版。 */
async function handleApiSkillDoc(reqUrl, res, url) {
  // 畸形百分号转义（%ZZ）decode 会抛 URIError：按名字不合法处理，404，不炸进程。
  let name = url.slice('/api/skills/'.length)
  try {
    name = decodeURIComponent(name)
  } catch {
    name = ''
  }
  // 名字白名单（字母数字与连字符）已挡掉路径分隔符与点；resolve 前缀再兜一层底，中文原文出不了
  // docs/skill-intros/。镜像侧（readEnglishSkill）走同一份白名单，没有第二层——白名单里已经没有
  // 点与分隔符可用。
  const zhFile = nodePath.resolve(SKILLS_DOCS_DIR, name + '.md')
  if (!name || !SKILL_NAME_RE.test(name) || !zhFile.startsWith(SKILLS_DOCS_DIR + nodePath.sep)) {
    sendErr(res, 404, 'skills.no-doc', '没有这个技能文档：' + name)
    return
  }
  if (skillLang(reqUrl) === 'en') {
    const mirror = await readEnglishSkill(name)
    if (mirror) {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store', 'X-FlowDeck-Doc-Lang': 'en' })
      res.end(mirror.text)
      return
    }
  }
  sendFile(res, zhFile, 'text/markdown; charset=utf-8', { 'X-FlowDeck-Doc-Lang': 'zh' })
}

/** GET /api/roots-overview：项目总览（票 03）——常用目录 + 当前追踪目录逐个只读盘点。
 *  每行按需现盘（不进轮询载荷），单目录失败只降级该行；GET 纯读，不触碰 recentRoots 排序。
 *  链阶段口径：全完工 → 'done'；否则取「最近活跃的那个未完工 effort」的当前步——
 *  多 effort 项目的「走到哪了」按最近在干的事说，不按最老的事说。 */
async function rootsOverviewRow(rootPath, current) {
  const abs = nodePath.resolve(rootPath)
  const base = { path: abs, name: nodePath.basename(abs), current: !!current }
  // 目录本身都读不了（不存在 / 权限 / 路径其实是文件）→ 不可读行
  try {
    await readdir(abs)
  } catch {
    return { ...base, status: 'unreadable' }
  }
  try {
    const ws = await scanWorkspace(abs)
    if (!ws.scratchExists) return { ...base, status: 'no-scratch' }
    const efforts = ws.efforts
    const tickets = efforts.reduce((n, e) => n + e.tickets.length, 0)
    const closed = efforts.reduce((n, e) => n + e.chain.counts.closed, 0)
    const fog = efforts.reduce((n, e) => n + (e.map.fogCount || 0), 0)
    const incomplete = efforts.filter((e) => !e.chain.complete)
    let stage = null
    if (efforts.length && !incomplete.length) stage = 'done'
    else if (incomplete.length) {
      const focus = incomplete.slice().sort((a, b) => {
        const x = a.latestAt || ''
        const y = b.latestAt || ''
        return x < y ? 1 : x > y ? -1 : 0
      })[0]
      stage = focus.chain.currentId
    }
    return { ...base, status: 'ok', stage, efforts: efforts.length, tickets, closed, fog }
  } catch {
    return { ...base, status: 'unreadable' }
  }
}

/** GET /api/roots-overview 处理：当前追踪目录置顶（current: true），常用目录去重随后。 */
async function handleApiRootsOverview(ctx, res) {
  const cfg = await loadConfigAsync(ctx.configPath)
  const ordered = []
  const seen = new Set()
  const cur = nodePath.resolve(ctx.currentRoot.path)
  ordered.push([cur, true])
  seen.add(cur)
  for (const p of cfg.recentRoots) {
    const abs = nodePath.resolve(p)
    if (!seen.has(abs)) {
      seen.add(abs)
      ordered.push([abs, false])
    }
  }
  const roots = await Promise.all(ordered.map(([p, current]) => rootsOverviewRow(p, current)))
  sendJson(res, 200, { roots })
}

/**
 * POST /api/config：改配置并持久化到 config.json。
 * 四个同构字段（pollMs/host/port/token）走 CONFIG_FIELDS 表驱动；root 是假同构特例——
 * 存在性校验、换目录热切换、收录常用目录副作用——保留独立分支。改动成功即作废
 * /api/state 指纹缓存（下一拍重新盘点，新值立刻可见）。
 */
function handleConfigPost(ctx, req, res) {
  guardPostJson(req, res, (input) => {
    const patch = {}
    const applied = {}
    // ── root：假同构特例（存在性校验 / 热切换 / 收录常用目录是副作用，不进表）──
    if (input.root !== undefined) {
      const raw = String(input.root || '').trim()
      if (!raw) {
        sendErr(res, 400, 'config.root-empty', 'root 不能为空。填一个含 .scratch/ 的项目目录。')
        return
      }
      const resolved = resolveRoot(raw)
      if (!dirExists(resolved)) {
        sendErr(res, 400, 'config.root-missing', '这个目录不存在或不是目录：' + resolved)
        return
      }
      patch.root = resolved
      applied.root = EFFECT.IMMEDIATE
    }
    // ── 同构字段：查表逐个「校验 → patch → applied」（加字段 = 加一行表项）──
    for (const key of Object.keys(CONFIG_FIELDS)) {
      if (input[key] === undefined) continue
      const value = CONFIG_FIELDS[key].normalize(input[key])
      if (value === undefined) {
        sendErr(res, 400, CONFIG_FIELDS[key].code, CONFIG_FIELDS[key].error)
        return
      }
      patch[key] = value
      applied[key] = CONFIG_FIELDS[key].effect
    }
    if (!Object.keys(patch).length) {
      sendErr(res, 400, 'config.no-fields', '没有可保存的字段（支持 root / pollMs / pollMode / host / port / token / guides / guidesPrefix）。')
      return
    }
    try {
      // 收录与换目录合并为一次写盘（读-改-写整文件，多标签页并发后写者胜——与既有换目录语义一致）。
      if (patch.root !== undefined) {
        patch.recentRoots = touchRecentRoot(loadConfig(ctx.configPath).recentRoots, patch.root)
      }
      saveConfig(patch, ctx.configPath)
    } catch (e) {
      sendSaveFailed(res, 'config.save-failed', e)
      return
    }
    if (patch.root !== undefined) ctx.currentRoot.path = patch.root
    // 令牌即时接管：旧令牌即刻失效、新令牌即刻可用。响应不含令牌值（令牌只进请求头，不进任何载荷）。
    if (patch.token !== undefined) ctx.runtime.token = patch.token
    ctx.cache.state = null // 改配置必作废指纹缓存：下一拍重新盘点，新值立刻可见
    sendJson(res, 200, { ok: true, root: ctx.currentRoot.path, configPath: ctx.configPath, applied })
  })
}

/** POST /api/recent-roots：删一条常用目录并写回 config.json（防护同 POST /api/config；删未知条目幂等成功）。 */
function handleRecentRootsPost(ctx, req, res) {
  guardPostJson(req, res, (input) => {
    const raw = String(input.remove || '').trim()
    if (!raw) {
      sendErr(res, 400, 'roots.remove-empty', 'remove 不能为空。填要删掉的那条常用目录路径。')
      return
    }
    const target = resolveRoot(raw)
    try {
      const next = loadConfig(ctx.configPath).recentRoots.filter((p) => p !== target)
      saveConfig({ recentRoots: next }, ctx.configPath)
      sendJson(res, 200, { ok: true, recentRoots: withExists(next) })
    } catch (e) {
      sendSaveFailed(res, 'roots.save-failed', e)
    }
  })
}

/**
 * 启动 HTTP 服务。
 * @param {object} [opts] root/port/host/configPath/token —— 全部可省；省略时读 config.json。
 * @returns {Promise<{server: import('node:http').Server, url: string, port: number,
 *                     root: string, configPath: string, pollMs: number, token: string}>}
 */
export async function startServer(opts = {}) {
  const cfg = loadConfig(opts.configPath)
  const configPath = cfg.configPath
  const host = opts.host || cfg.host || DEFAULT_CONFIG.host
  const basePort =
    opts.port !== undefined && opts.port !== null
      ? Number(opts.port)
      : Number(cfg.port) || DEFAULT_CONFIG.port
  const pollMs = normalizePollMs(opts.pollMs !== undefined && opts.pollMs !== null ? opts.pollMs : cfg.pollMs)
  // 访问令牌：非空即启用（命令行 > config.json > 默认空）。主要用于 0.0.0.0 等非回环暴露场景。
  let rawToken = opts.token
  if (rawToken === undefined) rawToken = cfg.token
  const apiToken = String(rawToken === undefined || rawToken === null ? '' : rawToken).trim()
  const currentRoot = { path: resolveRoot(opts.root !== undefined ? opts.root : cfg.root) }
  // 运行时可变状态：token 经 POST /api/config 改后立即接管校验（旧令牌即刻失效，不用重启）；
  // host/port 是本次启动的运行值，/api/state 带给设置表单当初值（新值写盘后重启才接管）。
  const runtime = { host, port: basePort, token: apiToken }
  // 路由上下文：处理函数按端点拆在模块顶层，共享可变状态集中在这里传递。
  // cache.state 是 /api/state 的指纹缓存（{ fp, body, etag, cfg }）：指纹命中整拍复用 body
  // （连序列化都不重跑）；POST /api/config 成功后置 null——换目录后的树与运行时值都不同，
  // 作废是语义直说，不赌 stat 兜底。
  const ctx = {
    currentRoot,
    runtime,
    configPath,
    cache: { state: null },
  }

  // 分发层：只留跨切关注点（URL 解析、Host 校验、令牌闸门、方法过滤、404）+ 每端点一行派发。
  // 加端点 = 模块顶层加一个处理函数 + 这里一行；不搞路由表（固定端点回不了本，白增间接层）。
  const server = http.createServer((req, res) => {
    // 查询串单独留一份：令牌的兜底携带位就是 ?token=…（首次打开页面时链接里带）。
    // 旧实现 split('?') 永不抛，URL 解析也不能例外——畸形请求行应答 400，不打出未捕获异常。
    let reqUrl
    try {
      reqUrl = new URL(req.url || '/', 'http://localhost')
    } catch {
      sendErr(res, 400, 'url.unparseable', '请求 URL 无法解析。')
      return
    }
    const url = reqUrl.pathname

    // Host 头校验先于一切路由：防 DNS rebinding（重绑定后即同源，X-FlowDeck 头形同虚设）。
    if (!hostAllowed(req.headers.host, host)) {
      sendErr(res, 403, 'host.forbidden', 'Host 头不是本机地址（' + (req.headers.host || '缺失') + '），已拒绝。')
      return
    }

    // 访问令牌只把守 /api/*（数据盘点与全部写操作都在这里）；界面静态壳不设防，
    // 浏览器地址栏打开 ?token=… 后由界面记忆并随 API 请求携带（CSS 链接没法带头）。
    // 校验值取 runtime.token：设置里改令牌后立即按新值校验。
    if (runtime.token && url.startsWith('/api/')) {
      const provided = req.headers['x-flowdeck-token'] !== undefined
        ? String(req.headers['x-flowdeck-token'])
        : reqUrl.searchParams.get('token') || ''
      if (!tokenMatches(runtime.token, provided)) {
        sendErr(res, 401, 'auth.token-required', '需要有效的访问令牌：URL 加 ?token=… 或请求头 X-FlowDeck-Token。')
        return
      }
    }

    if (req.method === 'POST' && url === '/api/config') return handleConfigPost(ctx, req, res)
    if (req.method === 'POST' && url === '/api/recent-roots') return handleRecentRootsPost(ctx, req, res)
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('只支持 GET（写操作用 POST /api/config 换目录、POST /api/recent-roots 删常用目录）')
      return
    }
    if (url === '/api/state') return handleApiState(ctx, req, res)
    if (url === '/api/health') return handleApiHealth(ctx, res)
    if (url === '/api/roots-overview') return handleApiRootsOverview(ctx, res).catch((e) => sendErr(res, 500, 'roots.failed', String((e && e.message) || e)))
    if (url === '/api/issue') return handleApiIssue(ctx, reqUrl, res).catch((e) => sendErr(res, 500, 'issue.failed', String((e && e.message) || e)))
    if (url === '/api/skills') return handleApiSkills(reqUrl, res)
    if (url.startsWith('/api/skills/')) return handleApiSkillDoc(reqUrl, res, url)
    if (url === '/' || url === '/index.html') return sendFile(res, INDEX_HTML, 'text/html; charset=utf-8')
    const asset = STATIC_FILES[url]
    if (asset) return sendFile(res, asset[0], asset[1])
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('没有这个路径：' + url)
  })

  for (let attempt = 0; attempt < 10; attempt++) {
    const port = basePort + attempt
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, resolve)
      })
      // port 传入 0 表示交给操作系统随机分配——真实端口要从 server.address() 读回来。
      const addr = server.address()
      const realPort = addr && typeof addr === 'object' ? addr.port : port
      runtime.port = realPort
      return { server, port: realPort, url: `http://${host}:${realPort}`, root: currentRoot.path, configPath, pollMs, token: runtime.token }
    } catch (e) {
      if (e && e.code === 'EADDRINUSE') continue
      throw e
    }
  }
  throw new Error(`端口 ${basePort} 到 ${basePort + 9} 都被占用。请在 config.json 或 --port 里换一个空闲端口。`)
}

// ── 命令行入口：只有直接运行本文件时才启动服务（被 import 时不启动，方便测试）──
const isDirectRun = process.argv[1] && nodePath.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  function argValue(flag) {
    const i = process.argv.indexOf(flag)
    if (i < 0) return undefined
    const value = process.argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      console.error(
        '用法错误：' + flag + ' 需要跟一个值' +
        (value === undefined ? '，但现在是末尾缺值' : '，但现在跟着的 "' + value + '" 看着是另一个参数') +
        '。例：' + flag + ' <值>'
      )
      process.exit(1)
    }
    return value
  }
  const has = (flag) => process.argv.indexOf(flag) >= 0
  const opts = {}
  if (has('--root')) opts.root = argValue('--root')
  if (has('--port')) opts.port = argValue('--port')
  if (has('--host')) opts.host = argValue('--host')
  if (has('--config')) opts.configPath = argValue('--config')
  if (has('--token')) opts.token = argValue('--token')
  try {
    const started = await startServer(opts)
    const cfg = loadConfig(started.configPath)
    console.log('')
    console.log('  流程板已启动：' + started.url)
    console.log('  追踪目录：' + started.root + nodePath.sep + '.scratch')
    console.log('  配置文件：' + started.configPath + '（追踪目录可在网页右上角直接换，或改这个文件）')
    if (started.token) {
      console.log('  访问令牌：已启用（打开页面时地址带 ?token=你的令牌，之后界面会自动随请求携带；令牌值见 config.json 的 token 字段）')
    }
    if (!String(cfg.root || '').trim() && opts.root === undefined) {
      console.log('  提示：config.json 里还没写 root，现在追踪的是启动时的当前目录。')
      console.log('        想固定追踪别的项目，把目录填进 config.json 的 root 字段即可。')
    }
    console.log('  打开上面的地址，就能看到 grill → to-spec → to-tickets → implement 走到了哪一步。')
    console.log('  停止：Ctrl+C')
    console.log('')
  } catch (e) {
    console.error('启动失败：' + String((e && e.message) || e))
    process.exit(1)
  }
}
