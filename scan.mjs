/**
 * flowdeck/scan.mjs — 工作区扫描（读 .scratch，产出流程板数据）。
 *
 * 文件约定（单一真相，README「它读什么文件」一节同款）：
 *   - effort 目录 = .scratch/<特性名>/，判据是「至少有 map.md、spec.md、issues/ 票 三者之一」；
 *   - 地图   = map.md（编号约定为 '00'）；
 *   - 规格   = spec.md（to-spec 的产物）；
 *   - 票     = issues/<两位编号>-<短名>.md，正文用行内字段（加粗或裸写皆合法、语义相同）：
 *       Status: ready-for-agent | claimed | resolved | completed | closed | done
 *       Type: research | prototype | grilling | task
 *       Blocked by: #02, #03
 *       ## 进度：50%
 *     形似字段行但读不懂的行、Status 多行冲突 → formatWarnings 随票透出，界面标 "!"；
 *   - .scratch/ 根目录自己的 map.md/spec.md/issues/ 也是一个 effort（slug '__root'）。
 *
 * 解析不另写一套：解析器在 ./lib/parse.mjs（零依赖单遍结构解析），map/spec 与票
 * 共用同一套标题与区块规则，行为由 verify 夹具断言钉住。
 */

import fs from 'node:fs/promises'
import nodePath from 'node:path'
import { parseMd, parseDocStructure, parseProgress, normalizeFieldLines, normalizeBody } from './lib/parse.mjs'
import { deriveChain } from './flowchain.mjs'

/** 票文件名：两位（或更多位）数字前缀 + 短名 + .md，与 issues-locate.js 的规则一致。
 *  导出供 server.mjs 的 /api/issue 端点复用——「什么文件算一张票」只有一个真相。 */
export const TICKET_FILE = /^(\d+)-[^/]*\.md$/

/** 读侧护栏（eng-optimizations 票 03）：单文件读取上限 1MB。必须先 stat、超限限长读
 *  （不得读完再切——上限要真拦内存与载荷）。超限返回截断文本与实际大小，调用方经
 *  "!" 格式警告通道透出；打不开（删除竞态 ENOENT、伪装成文件的目录 EISDIR、权限）仍返回 null。 */
const READ_LIMIT = 1024 * 1024

/** 导出供 server.mjs 的 /api/issue 端点复用：读侧护栏（1MB 限长读）与「打不开返回 null」的语义同款。
 *  返回 { text, truncated, mtimeMs }——stat 反正要做，mtime 顺路带出（票 02 的 latestAt 用）。 */
export async function readIfExists(p) {
  let st
  try {
    st = await fs.stat(p)
  } catch {
    return null
  }
  try {
    if (st.size > READ_LIMIT) {
      const fh = await fs.open(p, 'r')
      try {
        const buf = Buffer.alloc(READ_LIMIT)
        const { bytesRead } = await fh.read(buf, 0, READ_LIMIT, 0)
        return { text: buf.subarray(0, bytesRead).toString('utf8'), truncated: st.size, mtimeMs: st.mtimeMs }
      } finally {
        await fh.close()
      }
    }
    const text = await fs.readFile(p, 'utf8')
    return { text, truncated: 0, mtimeMs: st.mtimeMs }
  } catch {
    return null
  }
}

/** 「文件过大，已截断」："!" 徽标通道的文件级警告（与字段行漂移警告同通道、各有 kind）。 */
function oversizedWarning(actualBytes) {
  return { kind: 'oversized', line: '', message: '文件过大，已截断（实际 ' + actualBytes + ' 字节，只读了前 1MB）——内容按截断文本尽力推导' }
}

async function isDirectory(p) {
  try {
    return (await fs.stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** 文件 mtimeMs → ISO 串；空值（文件没读到）给空串。 */
function isoFromMtime(ms) {
  return ms ? new Date(ms).toISOString() : ''
}

/** 列出一个 issues/ 目录里的全部票（解析字段 + 文件 mtime 当时间戳）。
 *  轮询热路径：各票读文件互不依赖，Promise.all 并行（Promise.all 保序，输出顺序稳定）；
 *  mtime 由 readIfExists 顺路带出（它内部本就 stat），不再二次 stat。 */
async function listTickets(issuesDir) {
  if (!(await isDirectory(issuesDir))) return []
  let names
  try {
    names = await fs.readdir(issuesDir)
  } catch {
    return []
  }
  const matches = names.sort().map((name) => ({ name, m: TICKET_FILE.exec(name) })).filter((x) => x.m)
  const found = await Promise.all(matches.map(async ({ name, m }) => {
    const full = nodePath.join(issuesDir, name)
    const file = await readIfExists(full)
    if (file === null) return null
    const key = m[1].padStart(2, '0')
    const updatedAt = isoFromMtime(file.mtimeMs)
    // 字段行格式层：加粗归一为裸再喂解析器（parseMd 本体只认裸写），
    // 同时拿到 "!" 漂移警告（读不懂的疑似字段行 / 多行 Status）；超大截断的文件级警告同通道追加。
    const { text: fieldText, warnings } = normalizeFieldLines(file.text)
    const issue = parseMd(fieldText, { key, parentKey: '00' })
    const typeField = (issue.customFields || []).find((f) => f.name === 'Type')
    // Status 行原值（如 ready-for-agent / claimed / resolved）：与 parseMd 归一出的 state/claimedBy
    // 是两个消费面——state 进链推导，status 供界面档位过滤；正则与 parseMd 同款（读的是同份归一文本）。
    const statusRaw = (/^\s*Status\s*[:\uFF1A]\s*([^\n]+)/im.exec(fieldText)?.[1]?.trim() || '')
    const formatWarnings = warnings.slice()
    if (file.truncated) formatWarnings.push(oversizedWarning(file.truncated))
    return {
      key,
      fileName: name,
      title: issue.title,
      state: issue.state, // 'open' | 'closed'（parseMd 已按 Status 行归一）
      status: statusRaw, // Status 行原值（triage 档位过滤的输入；缺行为空串）
      claimedBy: (issue.assignees && issue.assignees[0] && issue.assignees[0].login) || '',
      type: typeField ? typeField.value : '',
      blockedBy: (issue.blockedBy || []).map((b) => b.key),
      progress: parseProgress(fieldText), // null = 未表达
      formatWarnings,
      updatedAt,
    }
  }))
  const tickets = found.filter(Boolean)
  // 数字比较：文件名正则本就接受任意位数编号，字符串比较会在三位数时把 '100' 排到 '99' 前面。
  tickets.sort((a, b) => Number(a.key) - Number(b.key))
  return tickets
}

/** 解析一个 effort 目录；三样产物一样都没有 → 返回 null（不算 effort）。
 *  map/spec/票三路读互不依赖，并行。标题不另写规则：与票同源——都出自
 *  parseDocStructure 的单遍实现（一次扫描同出标题与五区块，不再第二遍完整解析）。 */
async function parseEffort(scratchDir, slug) {
  const [mapText, specText, tickets] = await Promise.all([
    readIfExists(nodePath.join(scratchDir, 'map.md')),
    readIfExists(nodePath.join(scratchDir, 'spec.md')),
    listTickets(nodePath.join(scratchDir, 'issues')),
  ])
  if (mapText === null && specText === null && tickets.length === 0) return null

  const map = {
    exists: false, title: '', destination: '', fog: [], decisions: [], outOfScope: [],
    fogCount: 0, progress: null, formatWarnings: [],
  }
  if (mapText !== null) {
    // normalizeBody 与 parseMapBody 的预处理同款（BOM/字面换行的历史坏格式照旧能读），一遍出全部。
    const doc = parseDocStructure(normalizeBody(mapText.text))
    Object.assign(map, {
      exists: true,
      title: doc.title,
      destination: doc.destination,
      fog: doc.fog,
      decisions: doc.decisions,
      outOfScope: doc.outOfScope,
      fogCount: doc.fog.length,
      progress: parseProgress(mapText.text),
      formatWarnings: mapText.truncated ? [oversizedWarning(mapText.truncated)] : [],
    })
  }

  const spec = { exists: false, title: '', contentLength: 0, content: '', formatWarnings: [] }
  if (specText !== null) {
    const trimmed = specText.text.trim()
    Object.assign(spec, {
      exists: true,
      title: parseDocStructure(normalizeBody(specText.text)).title,
      contentLength: trimmed.length,
      content: trimmed,
      formatWarnings: specText.truncated ? [oversizedWarning(specText.truncated)] : [],
    })
  }

  const chain = deriveChain({ slug, map: { exists: map.exists, destination: map.destination, fogCount: map.fogCount }, spec: { exists: spec.exists, contentLength: spec.contentLength }, tickets })
  const title = map.title || spec.title || slug
  // 最近活跃（票 02 全部视图的排序键）：本 effort 全部产物文件 mtime 的最大值。ISO 串字典序即时间序。
  const latestAt = [mapText ? isoFromMtime(mapText.mtimeMs) : '', specText ? isoFromMtime(specText.mtimeMs) : '', ...tickets.map((t) => t.updatedAt)]
    .filter(Boolean).sort().pop() || ''
  return { slug, title, map, spec, tickets, chain, latestAt }
}

/**
 * 扫描一个工作区根目录下的 .scratch，产出流程板完整数据。
 * 不缓存：每次调用都是对文件的一次重新盘点（推进只来自重求值）。
 *
 * @param {string} root 工作区根目录（含 .scratch 的那个目录）。
 */
export async function scanWorkspace(root) {
  const absRoot = nodePath.resolve(root)
  const scratch = nodePath.join(absRoot, '.scratch')
  const out = {
    root: absRoot,
    rootName: nodePath.basename(absRoot),
    generatedAt: new Date().toISOString(),
    scratchExists: await isDirectory(scratch),
    efforts: [],
  }
  if (!out.scratchExists) return out

  const rootEffort = await parseEffort(scratch, '__root')
  if (rootEffort) out.efforts.push(rootEffort)

  let entries
  try {
    entries = await fs.readdir(scratch, { withFileTypes: true })
  } catch {
    entries = []
  }
  // 各 effort 目录互不依赖：并行解析（Promise.all 保序），轮询热路径不再逐目录串行等盘。
  const dirs = entries.filter((ent) => ent.isDirectory() && !ent.name.startsWith('.'))
  const found = await Promise.all(dirs.map((ent) => parseEffort(nodePath.join(scratch, ent.name), ent.name)))
  for (const effort of found) {
    if (effort) out.efforts.push(effort)
  }
  out.efforts.sort((a, b) => {
    if (a.slug === '__root') return -1
    if (b.slug === '__root') return 1
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
  })
  return out
}
