/**
 * flowdeck/lib/parse.mjs — 流程板自带的解析器（零依赖，单遍结构解析）。
 *
 * 为什么自带：本目录要能整体拷到任何地方独立运行，解析器必须随行。
 * 标题规则与地图区块规则收进 parseDocStructure 的单遍实现，
 * parseMd 与 parseMapBody 消费它、输出形状稳定。
 *
 * 改这里之前先想清楚：这里的规则就是「流程板读得懂什么文件」——
 * verify-standalone.mjs 的夹具断言钉住它的行为，改规则 = 改约定，要过一遍全量验证。
 *
 * 2026-09 判准补记：字段行（Status / Blocked by / Type / Labels）加粗或裸写皆为
 * 合法形态、语义相同——to-tickets 模板发加粗（**Status:**），约定文档发裸写
 * （Status:），两类声部是既定事实。parseMd 本体只认裸写；加粗归一与 "!" 漂移
 * 警告在文件末尾的「字段行格式层」，属 flowdeck 单侧扩展层。
 */

/** 归一化票状态。 */
export const STATE = Object.freeze({ OPEN: 'open', CLOSED: 'closed' })
/** 票类型。 */
export const ISSUE_TYPE = Object.freeze({ ISSUE: 'issue', MAP: 'map' })

function slugify(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]+/g, '-').replace(/\-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'untitled'
}

// 调色盘：票里只写名、色在总表（index.html 的 TRIAGE_TIERS 与此互指钉住）
const PALETTE = {
  'bug': 'd73a4a',
  'needs-triage': 'fbca04',
  'needs-info': '5319e7',
  'ready-for-agent': '0e8a16',
  'ready-for-human': 'b60205',
  'wontfix': 'ffffff',
  'wayfinder:map': '8b5cf6',
  'wayfinder:research': '0ea5e9',
  'wayfinder:prototype': 'f59e0b',
  'wayfinder:grilling': '9d7cd8',
  'wayfinder:task': '10b981',
}

/**
 * 单遍结构解析（eng-optimizations 票 02）：一次行扫描同出——
 *   - 标题：parseMd 的取标题规则（首个任意级别 `#`-标题行；整篇没有则首个非空行
 *     剥掉行首 # 记号）。标题规则的全库唯一实现在这里，parseMd 与盘点端（map/spec）都消费它；
 *   - 地图五区块：parseMapBody 的区块规则（`## 名字` 分节收行 → Destination /
 *     Notes / Decisions so far / Not yet specified / Out of scope）。
 * 输入按原串处理（不做 normalizeBody——那是 parseMapBody 的正文预处理，保留在其调用侧，
 * 保证 parseMd 的标题语义对任意输入逐字不变）。
 */
export function parseDocStructure(rawText) {
  const out = { title: '', destination: '', notes: '', decisions: [], fog: [], outOfScope: [] }
  const lines = String(rawText || '').split(/\r?\n/)
  let headingTitle = null
  let firstNonEmpty = null
  const sec = {}
  let cur = null
  for (const line of lines) {
    if (headingTitle === null) {
      const m = /^#+\s+(.+)$/.exec(line)
      if (m) headingTitle = m[1]
    }
    if (firstNonEmpty === null && line.trim().length > 0) firstNonEmpty = line
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) { cur = m[1]; sec[cur] = sec[cur] || []; continue }
    if (cur) sec[cur].push(line)
  }
  out.title = headingTitle !== null
    ? headingTitle.trim()
    : (firstNonEmpty === null ? '' : firstNonEmpty.replace(/^#+\s*/, '').trim())
  const clean = function (arr) { return (arr || []).map(function (s) { return s.trim() }).filter(Boolean) }
  out.destination = clean(sec['Destination']).join(' ')
  out.notes = clean(sec['Notes']).join(' ')
  out.decisions = clean(sec['Decisions so far']).filter(function (l) { return l.indexOf('- [') === 0 }).map(function (l) {
    const t = l.match(/\[(.+?)\]\((.+?)\)/)
    const g = l.replace(/^-\s*\[.+?\]\(.+?\)\s*[-–—]?\s*/, '')
    return { title: t ? t[1] : l, url: t ? t[2] : '', gist: g }
  })
  out.fog = clean(sec['Not yet specified']).filter(function (l) { return l.indexOf('<!--') !== 0 })
  out.outOfScope = clean(sec['Out of scope']).filter(function (l) { return l.indexOf('<!--') !== 0 })
  return out
}

/** 解析一张票（或地图）的 markdown 原文 → 契约形状。 */
export function parseMd(text, meta) {
  const raw = String(text || '')
  const statusRaw = (/^\s*Status\s*[:\uFF1A]\s*([^\n]+)/im.exec(raw)?.[1]?.trim() || '')
  const statusNorm = statusRaw.toLowerCase().replace(/\s+/g, '-')
  const closedSet = new Set(['resolved', 'completed', 'closed', 'done'])
  const state = closedSet.has(statusNorm) ? STATE.CLOSED : STATE.OPEN
  const title = parseDocStructure(raw).title
  const typeRaw = (/^\s*Type\s*[:\uFF1A]\s*([^\n]+)/im.exec(raw)?.[1]?.trim().toLowerCase() || '')
  let customFields
  if (typeRaw) {
    customFields = [{ name: 'Type', value: typeRaw, type: 'single', options: ['research', 'prototype', 'grilling', 'task'] }]
  }
  const blockedRaw = (/^\s*Blocked\s+by\s*[:\uFF1A]\s*(.+)$/im.exec(raw)?.[1]?.trim() || '')
  let blockedBy = []
  if (blockedRaw) {
    const parts = blockedRaw.split(/[,,\s]+/).map((s) => s.trim()).filter(Boolean)
    // above split uses comma, fullwidth comma, whitespace
    const realParts = blockedRaw.split(/[,\uFF0C\s]+/).map((s) => s.trim()).filter(Boolean)
    const useParts = realParts.length ? realParts : parts
    for (const p of useParts) {
      const m = /#?(\d+)/.exec(p)
      if (m) {
        const k = String(m[1]).padStart(2, '0')
        blockedBy.push({ key: k, title: '', state: STATE.OPEN })
      }
    }
  }
  // Labels: 调色盘模型——票只写名，色在总表，缺行按空、非法段丢弃、没冒号视为缺行；兼容历史单数 Label:
  let labels = []
  const labelsMatch = /^\s*Labels?\s*[:\uFF1A][ \t]*([^\n]*)/im.exec(raw)
  if (labelsMatch) {
    const rawNames = labelsMatch[1] || ''
    // 逗号（含全角）分隔，仅名字
    const parts = rawNames.split(/[,\uFF0C]+/).map((s) => s.trim()).filter(Boolean)
    for (const name of parts) {
      if (!name) continue
      const color = PALETTE[name] || 'cccccc'
      labels.push({ name, color, description: '' })
    }
  } else {
    // 缺行按空（不抛、空数组）
    labels = []
  }
  let comments = []
  const cmAnchor = /^\s*##\s*Comments\s*$/im
  const cmExec = cmAnchor.exec(raw)
  if (cmExec) {
    const start = cmExec.index + cmExec[0].length
    const after = raw.slice(start)
    const nextH2 = /^\s*##\s+/m.exec(after)
    const segment = nextH2 ? after.slice(0, nextH2.index) : after
    const blocks = segment.split(/^###\s+/m).map((s) => s.trim()).filter(Boolean)
    for (const b of blocks) {
      if (!b) continue
      const lines = b.split('\n')
      const header = lines[0]?.trim() || ''
      let login = 'local'
      let createdAt = ''
      const dashIdx = header.indexOf('\u2014')
      const dashIdx2 = header.indexOf('-')
      let sep = -1
      if (dashIdx >= 0) sep = dashIdx
      else if (dashIdx2 >= 0) sep = dashIdx2
      if (sep >= 0) {
        login = header.slice(0, sep).trim() || 'local'
        const datePart = header.slice(sep + 1).trim()
        const iso = /\d{4}-\d{2}-\d{2}T/.exec(datePart) ? datePart.match(/\d{4}-\d{2}-\d{2}T[^ \n]+/)?.[0] : ''
        if (iso) createdAt = iso
      } else if (header) {
        login = header.split(/\s+/)[0] || 'local'
      }
      const bodyPart = lines.slice(1).join('\n').trim()
      const body = bodyPart.split(/^---\s*$/m)[0]?.trim() || bodyPart
      if (!body && !header) continue
      comments.push({
        author: { login },
        authorAssociation: '',
        body: body || '',
        createdAt: createdAt || (meta && meta.createdAt) || '',
        updatedAt: createdAt || (meta && meta.updatedAt) || '',
      })
    }
  }
  const key = String((meta && meta.key) || '00')
  const type = meta && meta.isMap ? ISSUE_TYPE.MAP : ISSUE_TYPE.ISSUE
  const parentKey = meta && meta.parentKey !== undefined ? meta.parentKey : null
  const createdAt = (meta && typeof meta.createdAt === 'string' ? meta.createdAt : '') || ''
  const updatedAt = (meta && typeof meta.updatedAt === 'string' ? meta.updatedAt : '') || ''
  const closedAt = state === STATE.CLOSED ? (updatedAt || createdAt || '') : null
  const issue = {
    key,
    type,
    title,
    state,
    body: raw,
    url: '',
    createdAt,
    updatedAt,
    closedAt,
    parentKey,
    blockedBy,
    comments,
    labels,
  }
  if (customFields) issue.customFields = customFields
  if (statusRaw) {
    const s = statusNorm
    if (s === 'claimed') {
      issue.assignees = [{ login: '@me', kind: 'user' }]
    } else {
      issue.assignees = []
    }
  }
  if (state === STATE.CLOSED) issue.reason = 'completed'
  else issue.reason = ''
  return issue
}

// ── 字段行格式层（flowdeck 自有扩展层）──
//
// "!" 警告不标任何一种合法形态，只标两件事：
//   - unrecognizedField：形似已知字段行（标签对得上、紧跟冒号或破折号）但解析器
//     读不懂的行——那是未来的新漂移（如 *Status:* done、Status - done、
//     列表项里的 - Status: done）；
//   - multiStatus：Status 行出现多次，以第一行为准。

/** 已知字段行标签（与 parseMd 消费的四个字段一致；Labels 兼容历史单数）。 */
const FIELD_LABEL = /^(status|blocked[ \t-]+by|type|labels|label)\b/i

/** 顶层裸字段行（归一化后的合法形态，parseMd 一定消费；Blocked by 严格空格，与 parseMd 同款）。 */
const BARE_FIELD = /^[ \t]*(status|blocked[ \t]+by|type|labels|label)[ \t]*[:\uFF1A]/i

/** 加粗字段行：冒号可在加粗内（**Status:** x，to-tickets 模板形式）或外（**Status**: x）。 */
const BOLD_FIELD = /^([ \t]*)\*\*[ \t]*(status|blocked[ \t]+by|type|labels|label)\b[ \t]*([:\uFF1A])?[ \t]*\*\*[ \t]*([:\uFF1A])?[ \t]*(.*)$/i

/**
 * 字段行归一 + 格式警告探测。加粗字段行改写为等价的裸写法（parseMd 即可消费），
 * 同时盘点两类写法漂移。纯函数：不改判断语义，只改写法表示。
 *
 * @param {string} text 工单原文。
 * @returns {{ text: string, warnings: Array<{kind: string, line: string, message: string}> }}
 */
export function normalizeFieldLines(text) {
  const out = String(text || '').split('\n').map(function (line) {
    const bold = BOLD_FIELD.exec(line)
    if (bold && (bold[3] || bold[4])) {
      return bold[1] + bold[2].replace(/[ \t]+/g, ' ') + ': ' + bold[5].replace(/[ \t]+$/, '')
    }
    return line
  })
  const warnings = []
  const statusValues = []
  for (const line of out) {
    if (BARE_FIELD.test(line)) {
      if (/^[ \t]*status[ \t]*[:\uFF1A]/i.test(line)) {
        statusValues.push(line.replace(/^[ \t]*status[ \t]*[:\uFF1A][ \t]*/i, '').trim())
      }
      continue
    }
    // 不是顶层裸字段行：剥掉列表记号与强调记号后仍形如「已知标签: 值」→ 漂移。
    const stripped = line.replace(/^[ \t]*(?:[-*+][ \t]+)?/, '').replace(/[*_]/g, '')
    if (FIELD_LABEL.test(stripped) && /^(?:status|blocked[ \t-]+by|type|labels|label)\b[ \t]*(?:[:\uFF1A][ \t]*\S|[-\u2013\u2014][ \t]*\S)/i.test(stripped)) {
      warnings.push({
        kind: 'unrecognizedField',
        line: line.trim(),
        message: '有一行像是字段行但没读懂（原文：' + line.trim() + '），对应字段未生效——请写成 Status: 值 或 **Status:** 值',
      })
    }
  }
  if (statusValues.length > 1) {
    warnings.push({
      kind: 'multiStatus',
      line: '',
      message: 'Status 行出现 ' + statusValues.length + ' 次（' + statusValues.join(' / ') + '），以第一行为准',
    })
  }
  return { text: out.join('\n'), warnings }
}

// ── 地图正文解析（区块规则的唯一实现 = parseDocStructure；本层只做正文预处理与取区块）──

/** 正文预处理：剥 BOM + 字面 \n 还原为真实换行（历史坏格式 body 也能解析）。 */
export function normalizeBody(raw) {
  let s = String(raw || '').replace(/^\uFEFF/, '')
  const realNL = (s.match(/\n/g) || []).length
  const literalNL = (s.match(/\\n/g) || []).length
  if (realNL < 2 && literalNL > 0) {
    s = s.replace(/\\n/g, '\n')
  }
  return s
}

/** 地图正文五区块解析：Destination / Notes / Decisions so far / Not yet specified / Out of scope。
 *  输出形状稳定；区块结果出自 parseDocStructure 的单遍实现。 */
export function parseMapBody(body) {
  const doc = parseDocStructure(normalizeBody(body))
  return { destination: doc.destination, notes: doc.notes, decisions: doc.decisions, fog: doc.fog, outOfScope: doc.outOfScope }
}

/**
 * 进度块解析三级锚定：进度区 = 契约固定章节「## 进度：N%」，先锚定标题行，
 * 防正文示例/规则文本劫持；行首变体与全文兜底依次降级。
 */
export function parseProgress(body) {
  if (!body) return null
  const s = String(body)
  const m = s.match(/^\s*#{1,6}\s*(?:进度|Progress)\s*[：:]\s*(\d{1,3})\s*%/im)
    || s.match(/^\s*(?:进度|Progress)\s*[：:]\s*(\d{1,3})\s*%/im)
    || s.match(/(?:进度|Progress)\s*[：:]\s*(\d{1,3})\s*%/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (isNaN(n)) return null
  return Math.max(0, Math.min(100, n))
}

export default parseMd
export { slugify }
