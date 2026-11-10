/**
 * 中文界面残留英文的清扫词条（回合原因、角色名、排序、赛制、脚注等）。
 * 结构与其它 areas 一致：命中本区词条就用英文，其余交给全局 tr() 回退。
 * 接线由协调方在 src/i18n/phrases.ts 中统一完成（本分区不自行改 phrases.ts）。
 */
export const PHRASES: { zh: string; en: string }[] = [
  // —— 回合原因：以赛后结算屏的中文写法为准 ——
  { zh: '歼灭', en: 'elimination' },
  { zh: '残局拆包', en: 'clutch defuse' },
  { zh: '五杀', en: 'ace' },

  // —— 阵容 / 图鉴：排序、角色与地图说明 ——
  { zh: '昵称排序 A–Z', en: 'Nickname A–Z' },
  { zh: '昵称排序 Z–A', en: 'Nickname Z–A' },
  { zh: '中路控制、窗户对狙，永恒的路人局路线', en: 'Mid control, window AWP duels — the eternal pug route' },
  { zh: '快速进攻', en: 'Fast rush' },

  // —— 选图 / 赛制 ——
  { zh: '按 BO1 / BO3 顺序推演禁用 / 挑选，结束后自动回填选图。', en: 'Walk a BO1 / BO3 ban-pick order; the decider fills in your map.' },
  { zh: 'BO1 · 一局定胜负', en: 'BO1 · one map' },
  { zh: 'BO3 · 三局两胜', en: 'BO3 · best of three' },

  // —— 赛后数据 ——
  { zh: '对', en: 'v' },
  { zh: '爆头率（爆头只存在于内存中的比赛状态，未写入计分板行）', en: 'headshot rate (headshots only live in the in-memory match state and never reach the scoreboard line)' },
  { zh: '逐回合比分按阵营（T / CT）记录，半场换边时刻由回放里的半场事件还原。', en: 'Round scores are recorded by side (T / CT); the halftime swaps are rebuilt from the halftime events in the replay.' },

  // —— 战绩页脚注 ——
  { zh: '每场比赛仅保存摘要数据。完整回放（含每个回合事件）只在本地数据库中保留最近 20 场，本页面不会加载。', en: 'Only summaries are kept per match. Full replays (every round event) stay in the local database for the last 20 matches and are not loaded here.' },
];
