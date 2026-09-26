/**
 * flowdeck/src/notify.mjs — 盘点事件推导（纯函数，只引 flowchain.mjs 的阶段表）。
 *
 * 它做什么：给定前后两拍盘点（/api/state 的载荷或同构扫描快照），推导出「值得告诉用户」
 * 的变化事件——票开关态、各 effort 迷雾数、链当前步推进、新 effort 出现——各成一条人话。
 * 输出是结构化事件（kind + effort + 人话 text），发不发、怎么聚合是界面层的策略，这里不管。
 *
 * 红线（feature-extensions 票 04 的测试决策逐条对应）：
 *  - 仅文件时间戳变化（updatedAt / latestAt / git 旁证 / generatedAt）不出事件——比较面
 *    只有开关态、迷雾数、当前步、slug 存在性，其余字段天然进不了事件；
 *  - effort 消失（目录被删/改名）不出事件也不误报——事件只从「下一拍还在的 effort」推导；
 *  - 换目录的两拍不可比（不同项目的 effort 同名会误报新 effort 等），root 不同直接零事件。
 *
 * 阶段的人话标签与先后序都派生自 FLOW_STAGES 单一阶段表（加阶段/改标题只动 flowchain 一处；
 * 同 scan.mjs 引 flowchain 先例）。index.html 有一份 ES5 镜像实现（零构建单文件没法共享本
 * 模块，两处靠注释互指钉住，同 isFrontierTicket / frontierOf 先例）——改这里必须同步那边。
 */
import { FLOW_STAGES } from './flowchain.mjs'

/** 事件文案里的 effort 名：__root 显示为根目录，其余即 slug。 */
function effortNameOf(slug) {
  return slug === '__root' ? '.scratch 根目录' : String(slug)
}

/** 当前步的人话标签：null = 四格全绿（链完成）。 */
function stageLabel(id) {
  if (id === null || id === undefined) return '四阶段完成'
  const hit = FLOW_STAGES.find((f) => f.id === id)
  return hit ? hit.title : String(id)
}

/** 当前步的序（判定「推进」还是「回落」用）：表序即流程序，完成 = 越过最后一个阶段，未知 id 最低（保守）。 */
function stageRank(id) {
  if (id === null || id === undefined) return FLOW_STAGES.length
  const i = FLOW_STAGES.findIndex((f) => f.id === id)
  return i >= 0 ? i : -1
}

/**
 * 前后两拍盘点的结构化 diff。
 * @param {object} prev 上一拍 /api/state 载荷（efforts 各含 map.fogCount / tickets[].state / chain.currentId）。
 * @param {object} next 下一拍同构载荷。
 * @returns {Array<{kind: string, effort: string, text: string, ...}>} 事件数组（下一拍 effort 顺序 ×
 *   票开关 → 迷雾 → 当前步的固定次序，确定性输出）；无可比性或无变化时为空数组。
 */
export function deriveEvents(prev, next) {
  if (!prev || !next || !Array.isArray(prev.efforts) || !Array.isArray(next.efforts)) return []
  if (String(prev.root || '') !== String(next.root || '')) return []
  const prevBySlug = new Map()
  for (const e of prev.efforts) prevBySlug.set(e.slug, e)
  const events = []
  for (const ne of next.efforts) {
    const name = effortNameOf(ne.slug)
    const pe = prevBySlug.get(ne.slug)
    if (!pe) {
      events.push({ kind: 'effort-new', effort: ne.slug, text: '新 effort：' + name })
      continue
    }
    // 票开关态：按票号配对；新票出现不算事件（spec 只列四类，新 effort 已有自己的事件）
    const prevTickets = new Map()
    for (const t of pe.tickets || []) prevTickets.set(t.key, t)
    for (const t of ne.tickets || []) {
      const pt = prevTickets.get(t.key)
      if (!pt) continue
      if (pt.state !== 'closed' && t.state === 'closed') {
        events.push({ kind: 'ticket-closed', effort: ne.slug, key: t.key, text: name + '：票 #' + t.key + ' 已关闭' })
      } else if (pt.state === 'closed' && t.state !== 'closed') {
        events.push({ kind: 'ticket-reopened', effort: ne.slug, key: t.key, text: name + '：票 #' + t.key + ' 重新打开' })
      }
    }
    // 迷雾数：增减都是事件（清零与新增迷雾同样值得知道）
    const fogPrev = (pe.map && pe.map.fogCount) || 0
    const fogNext = (ne.map && ne.map.fogCount) || 0
    if (fogPrev !== fogNext) {
      events.push({ kind: 'fog', effort: ne.slug, from: fogPrev, to: fogNext, text: name + '：迷雾 ' + fogPrev + '→' + fogNext })
    }
    // 链当前步：推进为主，回退（如完工后重开一张票）如实说「回落」
    const prevStep = pe.chain && pe.chain.currentId != null ? pe.chain.currentId : null
    const nextStep = ne.chain && ne.chain.currentId != null ? ne.chain.currentId : null
    if (prevStep !== nextStep) {
      const forward = stageRank(nextStep) > stageRank(prevStep)
      events.push({
        kind: 'stage',
        effort: ne.slug,
        from: prevStep,
        to: nextStep,
        text: name + '：阶段' + (forward ? '推进' : '回落') + ' ' + stageLabel(prevStep) + ' → ' + stageLabel(nextStep),
      })
    }
  }
  return events
}
