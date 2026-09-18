/**
 * flowdeck/flowchain.mjs — 流程链推导（纯函数，零依赖）。
 *
 * 它做什么：给定一个 effort（一个 .scratch/<特性名>/ 目录）的产物盘点
 * ——map（地图）、spec（规格）、tickets（票）三样东西各处于什么状态——
 * 推导出 grill → to-spec → to-tickets → implement 四个阶段各自的进度，
 * 以及「现在走到哪一步、下一步该干什么」的备忘指引。
 *
 * 本文件刻意保持零依赖、可独立搬运——不改任何调用方即可整体复用。
 *
 * 设计约束（承接本仓库检查链的第一性原理）：
 *  - 阶段推进只来自对文件产物的重新盘点（重求值），本文件不保存任何状态；
 *  - 指引文字只建议下一步动作，绝不承诺替用户执行；
 *  - 「完成」的判据全部来自文件事实（文件在不在、写了什么），不做版本比较。
 */

/** 四个固定阶段的展示信息（id 是稳定键，title/subtitle 供界面直接展示）。
 *  skills 是该阶段的对应技能（票 05 技能联动）：与指引词同源同漂移——硬编码在这里，
 *  指引卡「查看技能介绍」按它打开技能包弹窗定位该篇（docs/skills/ 已核有这五篇介绍）。 */
export const FLOW_STAGES = [
  { id: 'grill',     title: 'Grill 拷问',    subtitle: '想法 → 地图 map.md',     skills: ['grilling', 'wayfinder'] },
  { id: 'spec',      title: 'To-Spec 规格',  subtitle: '理解 → 规格 spec.md',    skills: ['to-spec'] },
  { id: 'tickets',   title: 'To-Tickets 拆票', subtitle: '规格 → 票 issues/',    skills: ['to-tickets'] },
  { id: 'implement', title: 'Implement 实现', subtitle: '逐票实现 → 全部关闭',   skills: ['implement'] },
]

/** 阶段状态 → 中文标签（界面直接用）。 */
export const STATUS_LABEL = { done: '完成', current: '当前', pending: '待命' }

function effortLabel(slug) {
  return slug === '__root' ? '.scratch/ 根目录' : `.scratch/${slug}/`
}

/** 已关闭票号集合（前沿判定的输入）。 */
export function closedKeySet(tickets) {
  return new Set((Array.isArray(tickets) ? tickets : []).filter((t) => t.state === 'closed').map((t) => t.key))
}

/** 前沿票判定（feature-extensions 票 02）：open、未被认领、Blocked by 所列票全部已关闭
 *  ——「现在就能干什么」的答案。与 counts.blocked 同口径的两半：blocked 看「依赖未全结」，
 *  前沿再加上「未认领」。缺失的依赖票号视为未结（文件事实：那张票不是 resolved）。
 *  注意：index.html 有一份 ES5 镜像实现（零构建单文件没法共享本模块），改这里必须同步那边。 */
export function isFrontierTicket(ticket, closedSet) {
  if (!ticket || ticket.state === 'closed') return false
  if (ticket.claimedBy || ticket.status === 'claimed') return false
  const deps = Array.isArray(ticket.blockedBy) ? ticket.blockedBy : []
  return !deps.some((k) => !closedSet.has(k))
}

/**
 * 推导一个 effort 的流程链。
 *
 * @param {object} input
 * @param {string} [input.slug] effort 目录名（'__root' 表示 .scratch 根目录本身）。
 * @param {object} [input.map]   地图盘点：{ exists, destination, fogCount }。
 * @param {object} [input.spec]  规格盘点：{ exists, contentLength }。
 * @param {Array}  [input.tickets] 票数组，每张至少有 { state, blockedBy }；state 取 'open'|'closed'。
 * @returns {{stages: Array, currentId: string|null, progress: number, complete: boolean,
 *            counts: {tickets: number, closed: number, open: number, blocked: number}}}
 *   counts.blocked 是前沿口径：open 且所列依赖中仍有未关闭者（依赖全结不再计阻塞）。
 *   stages 每项：{ id, title, subtitle, status: 'done'|'current'|'pending', evidence, hint, copyText,
 *                  inferred（完成是否来自后向推定）, inferLabel（推定标注文案，实证完成为空串）,
 *                  skills（本阶段的对应技能名，技能联动用） }。
 *   evidence 是「为什么判成这个状态」的人读证据；hint 是走到这步时下一步该干什么；
 *   copyText 是可直接粘给任意 Agent 的完整指示词。
 */
export function deriveChain(input = {}) {
  const slug = input.slug || ''
  const map = input.map || {}
  const spec = input.spec || {}
  const tickets = Array.isArray(input.tickets) ? input.tickets : []

  const closed = tickets.filter((t) => t.state === 'closed').length
  const open = tickets.length - closed
  // 阻塞计数 = 前沿口径（票 02 统一）：open 且所列依赖中仍有未关闭者才算阻塞。
  // 旧口径「有 Blocked by 行就算」在依赖全部 resolved 后仍计阻塞，与前沿面板两处数字打架——有意修正。
  const closedSet = closedKeySet(tickets)
  const blocked = tickets.filter((t) =>
    t.state !== 'closed' && (Array.isArray(t.blockedBy) ? t.blockedBy : []).some((k) => !closedSet.has(k))
  ).length

  // ── 各阶段「实证完成」判据（全部来自文件事实）──
  const grillBaseDone = !!(map.exists && String(map.destination || '').trim() && (map.fogCount || 0) === 0)
  const specBaseDone = !!(spec.exists && (spec.contentLength || 0) > 0)
  const ticketsDone = tickets.length > 0
  const implementDone = ticketsDone && closed === tickets.length

  // ── 后向推定：链是序贯的，更晚阶段已有产物 ⇒ 前面的阶段必然走过。grill-with-docs
  // 这类路线把拷问共识收进 CONTEXT.md / ADR 或纯对话、不留 map.md——文件层面不存在
  // 「拷问发生过」的直接信号，只能由下游产物推定。推定完成与实证完成在链上地位相同
  // （当前步后移、计入进度），界面以 inferLabel 标注区分。tickets / implement 不可能
  // 被推定：implement 完成必含票，而有票本身即是 tickets 的实证。──
  const specDone = specBaseDone || ticketsDone
  const grillDone = grillBaseDone || specDone

  const where = effortLabel(slug)

  // ── 各阶段的证据与指引 ──
  const grillFog = map.fogCount || 0
  const grillStage = {
    id: 'grill',
    status: grillDone ? 'done' : 'pending',
    inferred: grillDone && !grillBaseDone,
    inferLabel: grillDone && !grillBaseDone ? (!map.exists ? '推定 · 无 map' : '推定') : '',
    evidence: !map.exists
      ? (grillDone ? '没有 map.md —— 后续阶段已有产物，推定拷问已完成' : '还没有 map.md')
      : grillBaseDone
        ? 'map.md 就绪 · Destination 已写明 · 迷雾已清空'
        : grillDone
          ? `map.md 未走完（${grillFog > 0 ? `迷雾还有 ${grillFog} 条` : 'Destination 未写'}），但后续阶段已有产物，推定已完成`
          : grillFog > 0
            ? `map.md 已有，但迷雾还有 ${grillFog} 条（Not yet specified）`
            : 'map.md 已有，但 Destination 还是空的',
    hint: grillDone
      ? (grillBaseDone
        ? '拷问阶段完成：地图就绪、迷雾清空。'
        : '后续阶段已有产物，推定拷问已完成；本 effort 未留 map.md（共识可能在对话 / CONTEXT.md / ADR）。')
      : !map.exists
        ? `还没有 map.md。请运行 grilling（或 wayfinder）技能，把想法拷问成一张地图，落到 ${where}map.md。`
        : grillFog > 0
          ? `map.md（${where}）还有 ${grillFog} 条未定项。请继续 grilling，把 Not yet specified 逐条拷问清空；迷雾清空后本阶段才算完成。`
          : `map.md（${where}）还没写 Destination。请用 grilling 把终点拷问清楚，写进 Destination 一节。`,
  }
  const specStage = {
    id: 'spec',
    status: specDone ? 'done' : 'pending',
    inferred: specDone && !specBaseDone,
    inferLabel: specDone && !specBaseDone ? '推定 · 无 spec' : '',
    evidence: specBaseDone
      ? `spec.md 已落盘（${spec.contentLength} 个非空白字符）`
      : specDone
        ? '没有 spec.md —— 已有票，推定规格阶段已完成'
        : '还没有 spec.md',
    hint: specBaseDone
      ? '规格已落盘，规格阶段完成。'
      : specDone
        ? '已有票，推定规格阶段已完成；本 effort 未留 spec.md。'
        : `还没有 spec.md。请运行 to-spec 技能，把当前理解沉淀为规格，写到 ${where}spec.md。`,
  }
  const ticketsStage = {
    id: 'tickets',
    status: ticketsDone ? 'done' : 'pending',
    inferred: false,
    inferLabel: '',
    evidence: ticketsDone ? `已有 ${tickets.length} 张票（已关 ${closed} 张）` : 'issues/ 里还没有票',
    hint: ticketsDone
      ? `已拆出 ${tickets.length} 张票。`
      : `issues/ 里还没有票。请运行 to-tickets 技能，把 ${where}spec.md 拆成一张张票，写到 ${where}issues/<两位编号>-<短名>.md。`,
  }
  const implementStage = {
    id: 'implement',
    status: implementDone ? 'done' : 'pending',
    inferred: false,
    inferLabel: '',
    evidence: !ticketsDone
      ? '还没有票可实现'
      : implementDone
        ? `${tickets.length} 张票全部关闭`
        : `已关 ${closed}/${tickets.length} 张，还剩 ${open} 张` + (blocked > 0 ? `（其中 ${blocked} 张被阻塞）` : ''),
    hint: !ticketsDone
      ? '还没有票可实现（先把前面的阶段走完）。'
      : implementDone
        ? `${where}的票已全部关闭，四个阶段完成。可以收尾归档，或开下一个 effort。`
        : `${where} 有 ${tickets.length} 张票、已关 ${closed} 张。请从 Blocked by 为空的票开始逐张实现，每完成一张就把该票文件里的 Status 行改为 resolved。` +
          (blocked > 0 ? ` 当前有 ${blocked} 张票被依赖阻塞，先做它们所依赖的票。` : ''),
  }

  // ── 定状态：第一个没完成的阶段是「当前」，其余未完成的是「待命」──
  const stagesRaw = [grillStage, specStage, ticketsStage, implementStage]
  const current = stagesRaw.find((s) => s.status !== 'done') || null
  const stages = stagesRaw.map((s) => {
    const def = FLOW_STAGES.find((f) => f.id === s.id)
    return {
      ...s,
      status: s.status === 'done' ? 'done' : s === current ? 'current' : 'pending',
      title: def.title,
      subtitle: def.subtitle,
      skills: def.skills,
      // copyText = 指引原文，界面提供「点一下复制」，用户粘给任意 Agent 都能接上。
      copyText: s.hint,
    }
  })

  const doneCount = stages.filter((s) => s.status === 'done').length
  return {
    stages,
    currentId: current ? current.id : null,
    progress: Math.round((doneCount / FLOW_STAGES.length) * 100),
    complete: doneCount === FLOW_STAGES.length,
    counts: { tickets: tickets.length, closed, open, blocked },
  }
}
