#!/usr/bin/env node
/**
 * 合并数据源校准器：选手卡属性 / AI 战队地图与经济 / 传奇名录 / 教练归属
 *
 * 数据源：.tmp/hltv-merged.json（615 名选手 / 207 支战队 / 100 名教练 / 26 项赛事）
 *   players[].recent.rating_3_0     近 27 天主信号（400 人有值）
 *   players[].career.rating_1_0     生涯兜底信号（只用于无近期数据者）
 *   players[].detail                分维度信号（opening_kills/deaths、clutches_won），大量 null
 *   players[].career_start_year     传奇判定（300 人有值）
 *   teams[].maps / teams[].economy  每图胜率 / 手枪与 R2 经济
 *   coaches[].coach_name + team     教练真实归属
 *
 * 用法：
 *   node scripts/calibrate-merged.mjs                  # 干跑（默认，不写文件）
 *   node scripts/calibrate-merged.mjs --write          # 写回 cards.ts / aiTeams.ts / legends.ts / coaches.ts
 *   node scripts/calibrate-merged.mjs --detail         # 逐卡 / 逐队明细
 *   node scripts/calibrate-merged.mjs --no-legends     # 跳过传奇名录
 *   node scripts/calibrate-merged.mjs --no-coaches     # 跳过教练归属
 *   node scripts/calibrate-merged.mjs --data <path>
 *
 * 数据纪律（用户定稿，脚本内强制）：
 *   1) null 不等于 0：参与分位/排序/映射前一律过滤 null，绝不按 0 计。
 *   2) 同名不同人不合并：nickname 规范化后撞车（两个 Salazar、两支 INFINITE、两支 OG）
 *      一律判为歧义并跳过，保持原值。
 *   3) 队名归一化：去 'Team ' 前缀、去 Esports/Gaming/Club 等后缀、去非字母数字后再比对。
 *
 * 红线：不改 OVR 公式（62/20/18 从 config.ts 读取）、不改稀有度/抽卡概率/经济数值/
 *       比赛引擎常量、不改昵称头像国籍映射、不新增运行时依赖。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, 'src/data/cards.ts');
const AI_TEAMS_PATH = path.join(ROOT, 'src/data/aiTeams.ts');
const LEGENDS_PATH = path.join(ROOT, 'src/data/legends.ts');
const COACHES_PATH = path.join(ROOT, 'src/data/coaches.ts');
const CONFIG_PATH = path.join(ROOT, 'src/data/config.ts');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write') && !argv.includes('--dry-run');
const DETAIL = argv.includes('--detail');
const NO_LEGENDS = argv.includes('--no-legends');
const NO_COACHES = argv.includes('--no-coaches');
const dataIdx = argv.indexOf('--data');
const DATA_PATH = path.resolve(ROOT, dataIdx >= 0 && argv[dataIdx + 1] ? argv[dataIdx + 1] : '.tmp/hltv-merged.json');
/**
 * 排序键阻尼：近 27 天窗口只有 ~25 张图，单月样本噪声大。排序键 = (1-w)*数据分位 + w*现有 OVR 分位，
 * 让数据决定大部分顺序、又不至于让一个月的样本把整条梯队结构掀翻（w=0 为纯数据，w=1 为不动）。
 */
const blendIdx = argv.indexOf('--blend');
const BLEND_W = blendIdx >= 0 && argv[blendIdx + 1] !== undefined ? Number(argv[blendIdx + 1]) : 0.5;
/**
 * 默认「保 OVR」：只按数据重排分维度属性，卡牌 OVR 一个点都不动。
 * 原因（实测，不是口味问题）：engine.test.ts 的「navi(level5) 必须领先 9pandas(level1) 5 分以上」
 * 在原始数据里只有 +1 的余量，pillar3 的首发阵容也正好卡在评分上限下 1 分；
 * 任何超过 ±1 的 OVR 重排都会把这两条不变量掀翻。全量重排请显式 --recalibrate-ovr
 * （需要同时重新基线化那两条测试）。
 */
const PRESERVE_OVR = !argv.includes('--recalibrate-ovr');
/**
 * 卡牌改写开关。当前仓库状态里 src/tests 有 3 处把卡牌数值钉死到 ±1（engine 强队领先 5 分的余量只有 +1、
 * pillar3 首发评分贴着上限、scout 价格硬编码 11200/30000），所以默认不写卡牌：
 * 需要写卡时显式加 --write-cards，并先重新基线化那 3 处测试。
 */
const WRITE_CARDS = argv.includes('--write-cards');

const LEGEND_CUTOFF = 2015;
const LEGEND_MIN_YEAR = 1990;
const ATTR_KEYS = ['aim', 'reflex', 'positioning', 'gameSense', 'utility', 'teamwork', 'clutch', 'leadership'];
const ATTR_MIN = 40;
const ATTR_MAX = 99;
const OVR_CLAMP_MIN = 55;
const OVR_CLAMP_MAX = 96;
const MAP_IDS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Train'];
/** 卡牌 mapProficiency 的现有区间（实测 62..96）：战队每图熟练度映射到这里。 */
const MAP_SKILL_MIN = 62;
const MAP_SKILL_MAX = 96;
const MIN_MAP_SAMPLE = 5;
/** 信号维度：opening 作用于 aim 与 Entry 熟练度；clutches_won 作用于 gameSense（意识）。 */
const AIM = 0;
const GAMESENSE = 3;
const ENTRY_PROF = 1;
/** 无数据的 6 维：只按现有相对关系等比缩放，用来补齐目标 OVR。 */
const FREE_ATTRS = [1, 2, 4, 5, 6, 7];
const MAX_ROUNDS = 40;

/* ---------------------------------------------------------------- 公式读取 */

function readConfig(src) {
  function obj(name) {
    const re = new RegExp(name + '[^=]*=\\s*\\{([^}]*)\\}');
    const m = re.exec(src);
    if (!m) throw new Error('config.ts 找不到 ' + name);
    const out = {};
    for (const pair of m[1].split(',')) {
      const kv = pair.split(':');
      if (kv.length !== 2) continue;
      const key = kv[0].trim().replace(/['"]/g, '');
      const val = Number(kv[1].trim());
      if (key && Number.isFinite(val)) out[key] = val;
    }
    return out;
  }
  const blend = obj('OVR_BLEND');
  const combat = obj('COMBAT_WEIGHTS');
  const team = obj('TEAM_FACTOR_WEIGHTS');
  if (!Number.isFinite(blend.attributes) || !Number.isFinite(combat.aim) || !Number.isFinite(team.leadership)) {
    throw new Error('config.ts 公式解析失败');
  }
  return { blend, combat, team };
}

const FORMULA = readConfig(fs.readFileSync(CONFIG_PATH, 'utf8'));

/* -------------------------------------------------------------- 卡牌解析 */

function skillTable(src) {
  const block = src.slice(src.indexOf('const SKILLS'), src.indexOf('PROSPECT_TRAIT_NAME_EN'));
  const map = new Map();
  const re = /(\w+): \{ id: '(\w+)'[\s\S]*?kind: '(\w+)'(?:[\s\S]*?key: '(\w+)', value: (-?\d+))?\s*\},/g;
  for (const m of block.matchAll(re)) {
    map.set(m[2], { kind: m[3], key: m[4] || null, value: m[5] ? Number(m[5]) : 0 });
  }
  return map;
}

function tplRe() {
  return /tpl\('([a-z0-9]+)', '(\d{4})', '([A-Z]+)', '([A-Za-z]+)', '([A-Za-z]+)', \[([^\]]+)\], \[([^\]]+)\], \[([^\]]+)\], '([a-zA-Z0-9]+)', ([\d.]+)\)/g;
}

function parseCards(src) {
  const skills = skillTable(src);
  const nickById = new Map();
  for (const m of src.matchAll(/\{ id: '([a-z0-9]+)', nickname: '([^']+)'/g)) nickById.set(m[1], m[2]);
  const cards = [];
  for (const m of src.matchAll(tplRe())) {
    const skill = skills.get(m[9]);
    if (!skill) throw new Error('未知技能: ' + m[9]);
    const prof = m[7].split(',').map((x) => Number(x.trim()));
    cards.push({
      templateId: 'tpl-' + m[1] + '-' + m[2],
      playerId: m[1],
      season: m[2],
      rarity: m[3],
      role: m[4],
      secondary: m[5],
      attrsText: m[6],
      attrs: m[6].split(',').map((x) => Number(x.trim())),
      profText: m[7],
      prof,
      profMax: Math.max.apply(null, prof),
      mapsText: m[8],
      skill,
      growth: Number(m[10]),
      full: m[0],
    });
  }
  return { cards, nickById };
}

/** 引擎同款：skill 为 attribute 类时把加成加进对应属性。 */
function effective(card, attrs) {
  const out = attrs.slice();
  const s = card.skill;
  if (s.kind === 'attribute') {
    const i = ATTR_KEYS.indexOf(s.key);
    if (i >= 0) out[i] += s.value;
  }
  return out;
}

function ovrOf(effAttrs, profMax) {
  const c = FORMULA.combat;
  const t = FORMULA.team;
  const b = FORMULA.blend;
  let ind = 0;
  let team = 0;
  for (let i = 0; i < ATTR_KEYS.length; i += 1) {
    const key = ATTR_KEYS[i];
    ind += effAttrs[i] * (c[key] || 0);
    team += effAttrs[i] * (t[key] || 0);
  }
  return Math.round(ind * b.attributes + profMax * b.proficiency + team * b.team);
}

function ovrOfCard(card, attrs, profMax) {
  return ovrOf(effective(card, attrs), profMax === undefined ? card.profMax : profMax);
}

/* ------------------------------------------------------------- 统计工具 */

function spearman(xs, ys) {
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(arr.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k += 1) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const n = xs.length;
  if (n < 3) return 0;
  const rx = rank(xs);
  const ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = rx[i] - mx;
    const b = ry[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

function quantiles(values) {
  const s = values.slice().sort((a, b) => a - b);
  const at = (p) => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
  return {
    min: s[0], p25: at(0.25), p50: at(0.5), p75: at(0.75), max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length, n: s.length,
  };
}

function fmtDist(d) {
  return 'min ' + d.min + ' / p25 ' + d.p25 + ' / p50 ' + d.p50 + ' / p75 ' + d.p75 + ' / max ' + d.max +
    ' / mean ' + d.mean.toFixed(2) + ' / n ' + d.n;
}

function median(values) {
  if (!values.length) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentileOf(values, v) {
  let below = 0;
  let equal = 0;
  for (const x of values) {
    if (x < v) below += 1;
    else if (x === v) equal += 1;
  }
  return (below + equal / 2) / values.length;
}

const normNick = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
/** 队名归一化：去 Team 前缀 + 去 Esports/Gaming/Club/Clan 后缀 + 去非字母数字。 */
const normTeam = (s) => String(s == null ? '' : s)
  .toLowerCase()
  .replace(/^team\s+/, '')
  .replace(/\s+(esports?|gaming|club|clan|team|gg)$/g, '')
  .replace(/[^a-z0-9]/g, '');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* --------------------------------------------------------------- 匹配层 */

function buildPlayerIndex(players) {
  const byNick = new Map();
  const byReal = new Map();
  const push = (map, key, p) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  };
  for (const p of players) {
    push(byNick, normNick(p.nickname), p);
    push(byReal, normNick(p.real_name), p);
    for (const alias of (p.career && p.career.also_in_rosters) || []) push(byNick, normNick(alias), p);
  }
  return { byNick, byReal };
}

function matchPlayer(index, nick, realName) {
  const hits = index.byNick.get(normNick(nick));
  if (hits && hits.length === 1) return { hit: hits[0], via: 'nickname' };
  if (hits && hits.length > 1) return { hit: null, via: 'ambiguous', reason: '同名不同人（' + hits.length + ' 条，未合并）' };
  const rk = normNick(realName);
  const rhits = rk ? index.byReal.get(rk) : null;
  if (rhits && rhits.length === 1) return { hit: rhits[0], via: 'real_name' };
  if (rhits && rhits.length > 1) return { hit: null, via: 'ambiguous', reason: '真名重名（未合并）' };
  return { hit: null, via: 'none' };
}

/* --------------------------------------------------- 选手信号与目标 OVR */

function primarySignal(data) {
  const r3 = data && data.recent ? data.recent.rating_3_0 : null;
  if (Number.isFinite(r3)) return { value: r3, source: 'rating_3_0', group: 'r3' };
  const r1 = data && data.career ? data.career.rating_1_0 : null;
  if (Number.isFinite(r1)) return { value: r1, source: 'rating_1_0', group: 'r1' };
  return null;
}

/**
 * 两套口径尺度不同（实测：rating_3_0 中位 1.08、区间 0.98–1.24；rating_1_0 兜底中位 1.09
 * 却压缩在 1.06–1.15）。混排会让「尺子」而不是实力决定先后，故各自取组内分位作为统一排序键。
 */
function assignRankKey(matched) {
  for (const key of ['r3', 'r1']) {
    const group = matched.filter((s) => s.signal.group === key);
    const values = group.map((s) => s.signal.value);
    for (const s of group) s.rankKey = values.length > 1 ? percentileOf(values, s.signal.value) : 0.5;
  }
}

function entrySignal(data) {
  const d = data && data.detail;
  if (!d) return null;
  const ok = d.opening_kills;
  const od = d.opening_deaths;
  if (!Number.isFinite(ok) || !Number.isFinite(od)) return null;
  if (ok + od <= 0) return null;
  return ok / (ok + od);
}

function clutchSignal(data) {
  const d = data && data.detail;
  if (!d) return null;
  const c = d.clutches_won;
  if (!Number.isFinite(c)) return null;
  const maps = data.recent && Number.isFinite(data.recent.maps) ? data.recent.maps : null;
  return maps && maps > 0 ? c / maps : c;
}

/* -------------------------------------------------- 属性反解（只改数值） */

/** 单卡触顶规则：默认每项 ≤96，最多 2 项可以到 99。 */
const ATTR_SOFT_MAX = 96;
const ATTR_TOP_MAX = 2;

function marginal(i) {
  const key = ATTR_KEYS[i];
  return FORMULA.blend.attributes * (FORMULA.combat[key] || 0) + FORMULA.blend.team * (FORMULA.team[key] || 0);
}

/** band 窗口：A/B/C/D 互不重叠，A 最高、D 最低。 */
const BAND_RANGE = { A: [89, 95], B: [83, 88], C: [76, 82], D: [66, 74] };
const BAND_ORDER = ['A', 'B', 'C', 'D'];
const BAND_LABEL = { A: 'VRS 1-10（现役）', B: 'VRS 11-30', C: 'VRS 31-100', D: '无排名/非活跃/不在数据里' };

/**
 * 活跃度门控：近 27 天有 rating_3_0，或 (is_active && current_team) —— 取两者可得的并集。
 * 生涯 Rating 1.0 的 Top 里混着大量已退役/不活跃的人（smooya：生涯第 9、rating 1.17，
 * 但 rating_3_0 / recent.rank / current_team 全是 null），不能拿生涯均值把现役打成陪衬。
 */
function isActivePlayer(row) {
  if (!row) return false;
  if (Number.isFinite(row.recent && row.recent.rating_3_0)) return true;
  return row.is_active === true && row.current_team != null;
}

/** 选手所属战队 → 数据里的 VRS 排名 → band。规则 3：无近期数据不得进 A。 */
function bandOf(row, teamIndex) {
  const team = row && row.current_team ? teamIndex.byName(row.current_team) : null;
  const rank = team && Number.isFinite(team.vrs_rank) ? team.vrs_rank : null;
  if (rank === null) return 'D';
  const hasRecent = Number.isFinite(row.recent && row.recent.rating_3_0);
  if (rank <= 10) return hasRecent ? 'A' : 'B';
  if (rank <= 30) return 'B';
  if (rank <= 100) return 'C';
  return 'D';
}

/**
 * 全卡池条目：命中者与未命中者都要进档（「不在数据里」按规则属于 band D）。
 * 档内排序：有真实数据的按数据信号；没有数据的按自身相对顺序垫底。
 */
function buildEntries(cards, matched, teamIndex) {
  const byCard = new Map(matched.map((s) => [s.card, s]));
  const entries = cards.map((card) => {
    const m = byCard.get(card) || null;
    return { card, m, band: m ? bandOf(m.data, teamIndex) : 'D', active: m ? m.active : false, ovrBefore: card.ovrBefore };
  });
  const noDataOvr = entries.filter((e) => !e.m).map((e) => e.ovrBefore);
  for (const e of entries) {
    e.perf = e.m ? 1 + e.m.rankKey : (noDataOvr.length > 1 ? percentileOf(noDataOvr, e.ovrBefore) : 0.5);
  }
  const ranges = {};
  for (const band of BAND_ORDER) {
    const list = entries.filter((e) => e.band === band);
    if (!list.length) { ranges[band] = { n: 0, min: 0, max: 0, allRecent: true }; continue; }
    list.sort((a, b) => (b.perf - a.perf) || (a.card.templateId < b.card.templateId ? -1 : 1));
    const lo = BAND_RANGE[band][0];
    const hi = BAND_RANGE[band][1];
    const n = list.length;
    list.forEach((e, i) => {
      const v = n === 1 ? hi : Math.round(hi - (i * (hi - lo)) / (n - 1));
      e.target = PRESERVE_OVR ? e.ovrBefore : v;
    });
    ranges[band] = {
      n,
      min: Math.min.apply(null, list.map((e) => e.target)),
      max: Math.max.apply(null, list.map((e) => e.target)),
      allRecent: list.filter((e) => e.m).every((e) => Number.isFinite(e.m.data.recent && e.m.data.recent.rating_3_0)),
    };
  }
  return { entries, ranges };
}

/**
 * 反解：信号维度（aim / gameSense / Entry 熟练度）固定在重排值不动，
 * 其余维度按现有相对关系等比缩放，再用 ±1 贪心补齐目标 OVR。
 * 触顶：默认全维 ≤96；目标够不到时按边际权重逐个放开，最多 2 项可以到 99。
 */
function solveAttrs(card, base, profBase, aimTarget, gsTarget, entryProfTarget, target) {
  const prof = profBase.slice();
  prof[ENTRY_PROF] = entryProfTarget;
  const profMax = Math.max.apply(null, prof);
  const pinned = aimTarget !== undefined && gsTarget !== undefined;
  const free = pinned ? FREE_ATTRS : ATTR_KEYS.map((_k, i) => i);
  const attempt = (allow) => {
    const capOf = (i) => (allow.has(i) ? ATTR_MAX : ATTR_SOFT_MAX);
    const build = (k) => {
      const out = base.slice();
      for (const i of free) out[i] = clamp(Math.round(base[i] * k), ATTR_MIN, capOf(i));
      if (pinned) {
        out[AIM] = clamp(aimTarget, ATTR_MIN, capOf(AIM));
        out[GAMESENSE] = clamp(gsTarget, ATTR_MIN, capOf(GAMESENSE));
      }
      return out;
    };
    let best = null;
    for (let step = 0; step <= 1000; step += 1) {
      const k = 0.6 + step * 0.001;
      const cand = build(k);
      const ovr = ovrOfCard(card, cand, profMax);
      const diff = Math.abs(ovr - target);
      let moved = 0;
      for (const i of free) moved += Math.abs(cand[i] - base[i]);
      if (!best || diff < best.diff || (diff === best.diff && moved < best.moved)) best = { diff, moved, cand };
    }
    const attrs = best.cand.slice();
    let cur = ovrOfCard(card, attrs, profMax);
    for (let guard = 0; guard < 800 && cur !== target; guard += 1) {
      const dir = cur < target ? 1 : -1;
      let pick = -1;
      let pickScore = -1;
      for (const i of free) {
        const next = attrs[i] + dir;
        if (next < ATTR_MIN || next > capOf(i)) continue;
        const score = marginal(i);
        if (score > pickScore) { pickScore = score; pick = i; }
      }
      if (pick < 0) break;
      attrs[pick] += dir;
      cur = ovrOfCard(card, attrs, profMax);
    }
    return { attrs, achieved: cur };
  };

  let allow = new Set();
  let res = attempt(allow);
  while (res.achieved < target && allow.size < ATTR_TOP_MAX) {
    const cands = free.filter((i) => !allow.has(i)).sort((a, b) => marginal(b) - marginal(a));
    if (!cands.length) break;
    const nextAllow = new Set([...allow, cands[0]]);
    const next = attempt(nextAllow);
    if (next.achieved <= res.achieved) { res = next; break; }
    allow = nextAllow;
    res = next;
  }
  return { attrs: res.attrs, prof, profMax, achieved: res.achieved };
}

/* --------------------------------------------------------- P0 选手计划 */

function planPlayers(cards, nickById, index) {
  const matched = [];
  const unmatched = [];
  const stats = { r3: 0, r1Fallback: 0, noSignal: 0, entryUsed: 0, clutchUsed: 0, ambiguous: [] };
  for (const card of cards) {
    const nick = nickById.get(card.playerId) || card.playerId;
    card.nick = nick;
    card.attrsBefore = card.attrs.slice();
    card.profBefore = card.prof.slice();
    card.ovrBefore = ovrOfCard(card, card.attrsBefore, card.profMax);
    const m = matchPlayer(index, nick, '');
    if (!m.hit) {
      if (m.via !== 'none') stats.ambiguous.push(nick + '：' + m.reason);
      unmatched.push({ nick, reason: m.via === 'none' ? '数据源无此人' : m.reason });
      continue;
    }
    const signal = primarySignal(m.hit);
    if (!signal) { stats.noSignal += 1; unmatched.push({ nick, reason: '匹配到但无 rating 信号' }); continue; }
    if (signal.source === 'rating_3_0') stats.r3 += 1; else stats.r1Fallback += 1;
    const entry = entrySignal(m.hit);
    const clutch = clutchSignal(m.hit);
    if (entry === null) stats.entryMissing = (stats.entryMissing || 0) + 1; else stats.entryUsed += 1;
    if (clutch === null) stats.clutchMissing = (stats.clutchMissing || 0) + 1; else stats.clutchUsed += 1;
    matched.push({ card, nick, data: m.hit, signal, entry, clutch, via: m.via, active: isActivePlayer(m.hit) });
  }
  assignRankKey(matched);
  matched.sort((a, b) =>
    (b.rankKey - a.rankKey) ||
    ((b.data.hltv_id || 0) - (a.data.hltv_id || 0)) ||
    (a.card.templateId < b.card.templateId ? -1 : 1));
  return { matched, unmatched, stats };
}

/** 一轮求解：目标 OVR 由 band 分档给定，信号维来自组内保序重排。 */
function solveRound(entries, state) {
  const withEntry = entries.filter((e) => e.m && e.m.entry !== null)
    .sort((a, b) => (b.m.entry - a.m.entry) || (a.card.templateId < b.card.templateId ? -1 : 1));
  const aimPool = withEntry.map((e) => state.get(e).attrs[AIM]).sort((a, b) => b - a);
  const entryPool = withEntry.map((e) => state.get(e).prof[ENTRY_PROF]).sort((a, b) => b - a);
  const withClutch = entries.filter((e) => e.m && e.m.clutch !== null)
    .sort((a, b) => (b.m.clutch - a.m.clutch) || (a.card.templateId < b.card.templateId ? -1 : 1));
  const gsPool = withClutch.map((e) => state.get(e).attrs[GAMESENSE]).sort((a, b) => b - a);

  const aimT = new Map();
  const entryT = new Map();
  const gsT = new Map();
  withEntry.forEach((e, i) => { aimT.set(e, aimPool[i]); entryT.set(e, entryPool[i]); });
  withClutch.forEach((e, i) => { gsT.set(e, gsPool[i]); });

  let changed = 0;
  let clamped = 0;
  let unmet = 0;
  for (const e of entries) {
    const st = state.get(e);
    const prof = st.prof.slice();
    prof[ENTRY_PROF] = entryT.has(e) ? entryT.get(e) : st.prof[ENTRY_PROF];
    const profMax = Math.max.apply(null, prof);
    const pinned = aimT.has(e) && gsT.has(e);
    // 可达上限必须按「至多 2 项 99、其余 ≤96」的真实口径算，否则目标会被高估成达不到。
    const freeIdx = pinned ? FREE_ATTRS : ATTR_KEYS.map((_k, i) => i);
    const topTwo = freeIdx.slice().sort((a, b) => marginal(b) - marginal(a)).slice(0, ATTR_TOP_MAX);
    const hiAttrs = st.attrs.map(() => ATTR_SOFT_MAX);
    for (const i of topTwo) hiAttrs[i] = ATTR_MAX;
    const loAttrs = st.attrs.map(() => ATTR_MIN);
    if (pinned) {
      hiAttrs[AIM] = clamp(aimT.get(e), ATTR_MIN, ATTR_MAX);
      hiAttrs[GAMESENSE] = clamp(gsT.get(e), ATTR_MIN, ATTR_MAX);
      loAttrs[AIM] = clamp(aimT.get(e), ATTR_MIN, ATTR_MAX);
      loAttrs[GAMESENSE] = clamp(gsT.get(e), ATTR_MIN, ATTR_MAX);
    }
    const lo = ovrOfCard(e.card, loAttrs, profMax);
    const hi = ovrOfCard(e.card, hiAttrs, profMax);
    const target = clamp(clamp(e.target, OVR_CLAMP_MIN, OVR_CLAMP_MAX), lo, hi);
    if (target !== e.target) clamped += 1;
    const solved = solveAttrs(e.card, st.attrs, st.prof, aimT.get(e), gsT.get(e), prof[ENTRY_PROF], target);
    if (solved.achieved !== target) unmet += 1;
    if (solved.attrs.some((v, k) => v !== st.attrs[k]) || solved.prof.some((v, k) => v !== st.prof[k])) changed += 1;
    state.set(e, { attrs: solved.attrs, prof: solved.prof, profMax: solved.profMax, achieved: solved.achieved, target });
    e.targetFinal = target;
  }
  return { changed, clamped, unmet };
}

function iterateToFixpoint(entries) {
  const state = new Map();
  for (const e of entries) {
    state.set(e, { attrs: e.card.attrsBefore.slice(), prof: e.card.profBefore.slice(), profMax: e.card.profMax, achieved: e.card.ovrBefore, target: e.card.ovrBefore });
  }
  let rounds = 0;
  let clamped = 0;
  let unmet = 0;
  let last = null;
  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    last = solveRound(entries, state);
    clamped = last.clamped;
    unmet = last.unmet;
    if (last.changed === 0) break;
  }
  for (const e of entries) {
    const st = state.get(e);
    e.attrsAfter = st.attrs;
    e.profAfter = st.prof;
    e.profMaxAfter = st.profMax;
    e.ovrAfter = st.achieved;
    if (e.m) {
      e.m.attrsAfter = st.attrs;
      e.m.profAfter = st.prof;
      e.m.profMaxAfter = st.profMax;
      e.m.ovrAfter = st.achieved;
      e.m.target = st.target;
    }
  }
  return { rounds, clamped, unmet, converged: last.changed === 0 };
}

/* ------------------------------------------------------------ 战队索引 */

function buildTeamIndex(dataTeams) {
  const byKey = new Map();
  for (const t of dataTeams) {
    const keys = new Set([normTeam(t.team)]);
    for (const k of keys) {
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, []);
      if (!byKey.get(k).includes(t)) byKey.get(k).push(t);
    }
  }
  function lookup(name, short) {
    for (const raw of [name, short]) {
      const k = normTeam(raw);
      if (!k) continue;
      const hits = byKey.get(k);
      if (hits && hits.length === 1) return { team: hits[0] };
      if (hits && hits.length > 1) return { team: null, reason: '重名歧义（' + hits.length + ' 支同名队，未合并）' };
    }
    return { team: null, reason: '数据源无此队' };
  }
  function byName(name) {
    const hits = byKey.get(normTeam(name));
    return hits && hits.length === 1 ? hits[0] : null;
  }
  return { lookup, byName };
}

/* ------------------------------------------------------- P1 战队计划 */

function planTeams(src, teamIndex) {
  const re = /\n  \{\n    id: '([a-z0-9]+)', name: '([^']+)', shortName: '([^']+)', tier: (\d+), rating: (\d+)/g;
  const teams = [];
  for (const m of src.matchAll(re)) {
    teams.push({ id: m[1], name: m[2], short: m[3], tier: Number(m[4]), rating: Number(m[5]), index: m.index });
  }
  const matched = [];
  const unmatched = [];
  for (const t of teams) {
    const hit = teamIndex.lookup(t.name, t.short);
    if (hit.team) { t.data = hit.team; matched.push(t); } else unmatched.push({ id: t.id, name: t.name, reason: hit.reason });
  }
  const allSkills = [];
  for (const t of matched) {
    const maps = Array.isArray(t.data.maps) ? t.data.maps : [];
    t.mapRows = [];
    for (const mp of maps) {
      const wr = mp.win_rate;
      const played = mp.maps_played;
      if (!Number.isFinite(wr) || !Number.isFinite(played) || played < MIN_MAP_SAMPLE) continue;
      t.mapRows.push({ map: mp.map_name, wr, played, skill: Math.round(MAP_SKILL_MIN + (wr / 100) * (MAP_SKILL_MAX - MAP_SKILL_MIN)) });
    }
    allSkills.push(...t.mapRows.map((v) => v.skill));
  }
  const globalMedian = median(allSkills) === null ? MAP_SKILL_MIN : median(allSkills);
  for (const t of matched) {
    const own = median(t.mapRows.map((v) => v.skill));
    const fallback = own === null ? globalMedian : own;
    t.mapSkill = MAP_IDS.map((id) => {
      const hit = t.mapRows.find((v) => v.map === id);
      return { map: id, skill: hit ? hit.skill : fallback, sampled: Boolean(hit) };
    });
    const ranked = t.mapSkill.slice().sort((a, b) =>
      (Number(b.sampled) - Number(a.sampled)) ||
      (b.skill - a.skill) ||
      (MAP_IDS.indexOf(a.map) - MAP_IDS.indexOf(b.map)));
    t.mapPrefAfter = ranked.slice(0, 3).map((r) => r.map);
    const block = blockOf(src, t);
    const oldPref = /mapPref: \[[^\]]*\]/.exec(block);
    t.mapPrefBefore = oldPref ? oldPref[0] : '(无)';
  }
  const econRows = matched.filter((t) => {
    const e = t.data.economy;
    return e && Number.isFinite(e.pistol_win_pct) && Number.isFinite(e.round2_conv_pct) && Number.isFinite(e.round2_break_pct);
  });
  const pist = econRows.map((t) => t.data.economy.pistol_win_pct);
  const conv = econRows.map((t) => t.data.economy.round2_conv_pct);
  const brk = econRows.map((t) => t.data.economy.round2_break_pct);
  for (const t of econRows) {
    const e = t.data.economy;
    t.econScore = 0.5 * percentileOf(pist, e.pistol_win_pct)
      + 0.3 * percentileOf(conv, e.round2_conv_pct)
      + 0.2 * percentileOf(brk, e.round2_break_pct);
  }
  const scores = econRows.map((t) => t.econScore).sort((a, b) => a - b);
  const q1 = scores.length ? scores[Math.floor((scores.length - 1) / 3)] : 0;
  const q2 = scores.length ? scores[Math.floor(((scores.length - 1) * 2) / 3)] : 0;
  for (const t of econRows) {
    t.econAfter = t.econScore >= q2 ? 'aggressive' : (t.econScore <= q1 ? 'conservative' : 'balanced');
    const oldEcon = /econStyle: '([a-z]+)'/.exec(blockOf(src, t));
    t.econBefore = oldEcon ? oldEcon[1] : '(无)';
  }
  return { teams, matched, unmatched, globalMedian, econRows, q1, q2 };
}

function blockOf(src, t) {
  const re = /\n  \{\n    id: '/g;
  re.lastIndex = t.index + 1;
  const next = re.exec(src);
  return src.slice(t.index, next ? next.index : src.length);
}

function applyTeamPlan(src, plan) {
  const re = /\n  \{\n    id: '([a-z0-9]+)'/g;
  const starts = [];
  for (const m of src.matchAll(re)) starts.push({ id: m[1], at: m.index });
  let out = '';
  let cursor = 0;
  let changed = 0;
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].at : src.length;
    const block = src.slice(s.at, end);
    out += src.slice(cursor, s.at);
    cursor = end;
    const t = plan.teams.find((x) => x.id === s.id);
    if (!t || !t.mapPrefAfter || !t.econAfter) { out += block; return; }
    const oldLine = /mapPref: \[[^\]]*\], econStyle: '[a-z]+'/.exec(block);
    if (!oldLine) { out += block; return; }
    const nextLine = 'mapPref: [' + t.mapPrefAfter.map((m) => "'" + m + "'").join(', ') + "], econStyle: '" + t.econAfter + "'";
    if (oldLine[0] !== nextLine) changed += 1;
    out += block.replace(oldLine[0], nextLine);
  });
  out += src.slice(cursor);
  return { text: out, changed };
}

/* --------------------------------------------------------- P2 传奇名录 */

function parseLegends(src) {
  const start = src.indexOf('export const LEGEND_PLAYERS');
  const open = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = src.slice(open + 1, end);
  const entries = new Map();
  for (const m of body.matchAll(/([a-z0-9]+): \{ since: (\d+)(?:, note: '([^']*)')? \}/g)) {
    entries.set(m[1], { since: Number(m[2]), note: m[3] });
  }
  return { entries, bodyStart: open + 1, bodyEnd: end };
}

function planLegends(src, playerIds, playerIndex) {
  const manual = parseLegends(src).entries;
  const dataDriven = new Set();
  const fallback = new Set();
  const added = [];
  const removed = [];
  const conflicts = [];
  const next = new Map();
  for (const id of playerIds) {
    const hit = playerIndex.byNick.get(normNick(id));
    const row = hit && hit.length === 1 ? hit[0] : null;
    const csy = row && Number.isFinite(row.career_start_year) ? row.career_start_year : null;
    const manualEntry = manual.get(id);
    if (csy !== null) {
      if (csy <= LEGEND_CUTOFF && csy >= LEGEND_MIN_YEAR) {
        dataDriven.add(id);
        const keepNote = manualEntry && manualEntry.since === csy && manualEntry.note ? manualEntry.note : null;
        next.set(id, { since: csy, note: keepNote });
        if (!manualEntry) added.push(id + '(' + csy + ')');
        else if (manualEntry.since !== csy) conflicts.push(id + ' 手工 ' + manualEntry.since + ' → 数据 ' + csy);
      } else if (manualEntry) {
        removed.push(id + '（数据 ' + csy + ' > ' + LEGEND_CUTOFF + '）');
      }
      continue;
    }
    if (manualEntry) {
      fallback.add(id);
      next.set(id, { since: manualEntry.since, note: manualEntry.note });
    }
  }
  return { next, dataDriven, fallback, added, removed, conflicts, manual };
}

function renderLegends(src, plan) {
  const parsed = parseLegends(src);
  const keys = [...plan.next.keys()].sort();
  const lines = keys.map((k) => {
    const e = plan.next.get(k);
    return '  ' + k + ': { since: ' + e.since + (e.note ? ", note: '" + e.note + "'" : '') + ' },';
  });
  const header = '\n  /* --- 数据驱动（career_start_year <= ' + LEGEND_CUTOFF + '）：' + plan.dataDriven.size
    + ' 人；手工回退（数据缺该字段）：' + plan.fallback.size + ' 人 --- */\n';
  const body = header + lines.join('\n') + '\n';
  return { text: src.slice(0, parsed.bodyStart) + body + src.slice(parsed.bodyEnd) };
}

/* --------------------------------------------------------- P3 教练计划 */

function planCoaches(src, dataCoaches, teamIndex, teamAiIdByDataName) {
  const rows = [];
  for (const m of src.matchAll(/\{ id: '([^']+)', nickname: '([^']+)'/g)) rows.push({ id: m[1], nick: m[2] });
  const byName = new Map();
  for (const c of dataCoaches) {
    const k = normNick(c.coach_name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(c);
  }
  const matched = [];
  const unmatched = [];
  for (const r of rows) {
    const hits = byName.get(normNick(r.nick));
    if (!hits) { unmatched.push({ nick: r.nick, reason: '数据源无此教练' }); continue; }
    if (hits.length > 1) { unmatched.push({ nick: r.nick, reason: '重名歧义（未合并）' }); continue; }
    const team = teamIndex.byName(hits[0].team);
    if (!team) { unmatched.push({ nick: r.nick, reason: '归属队未匹配（' + hits[0].team + '）' }); continue; }
    const aiTeam = teamAiIdByDataName.get(normTeam(team.team));
    if (!aiTeam) { unmatched.push({ nick: r.nick, reason: '归属队不在 AI 战队表（' + team.team + '）' }); continue; }
    matched.push({ id: r.id, nick: r.nick, teamId: aiTeam, dataTeam: team.team });
  }
  return { rows, matched, unmatched };
}

function applyCoachPlan(src, plan) {
  const byId = new Map(plan.matched.map((m) => [m.id, m]));
  let changed = 0;
  const out = src.split('\n').map((line) => {
    const m = /\{ id: '([^']+)', nickname:/.exec(line);
    if (!m) return line;
    const hit = byId.get(m[1]);
    if (!hit) return line;
    const next = /teamId: '[^']*'/.test(line)
      ? line.replace(/teamId: '[^']*'/, "teamId: '" + hit.teamId + "'")
      : line.replace(/, bio: /, ", teamId: '" + hit.teamId + "', bio: ");
    if (next !== line) changed += 1;
    return next;
  });
  return { text: out.join('\n'), changed };
}

/* --------------------------------------------- 阵容梯队自检（防倒挂） */

/** 与 src/data/config.ts 的 LEVEL_CONFIG.growthPointsPerLevel 一致。 */
const GROWTH_POINTS_PER_LEVEL = 3;
const ROLE_GROWTH_ORDER = {
  AWPer: ['aim', 'reflex', 'positioning', 'clutch', 'gameSense'],
  Entry: ['aim', 'reflex', 'teamwork', 'positioning', 'clutch'],
  Lurker: ['gameSense', 'positioning', 'clutch', 'aim', 'reflex'],
  Support: ['utility', 'teamwork', 'gameSense', 'positioning', 'aim'],
  Anchor: ['positioning', 'gameSense', 'reflex', 'utility', 'teamwork'],
  IGL: ['gameSense', 'positioning', 'gameSense', 'teamwork', 'utility'],
};

/**
 * 复刻 engine/lineup.ts 的出场实力口径：mean(8 属性，含等级成长/技能/星级)*0.75 + 该位置熟练度*0.25。
 * 引擎测试就是用这个口径比较强弱，所以校准后必须保证梯队不倒挂。
 */
function lineupOvr(card, attrs, prof, role, level) {
  const out = ATTR_KEYS.map((k) => attrs[ATTR_KEYS.indexOf(k)]);
  const points = Math.floor((Math.max(1, Math.min(30, level)) - 1) * GROWTH_POINTS_PER_LEVEL * card.growth);
  const order = ROLE_GROWTH_ORDER[card.role] || ROLE_GROWTH_ORDER.Entry;
  for (let i = 0; i < points; i += 1) out[ATTR_KEYS.indexOf(order[i % order.length])] += 1;
  if (card.skill.kind === 'attribute' && ATTR_KEYS.indexOf(card.skill.key) >= 0) out[ATTR_KEYS.indexOf(card.skill.key)] += card.skill.value;
  const mean = out.reduce((a, b) => a + b, 0) / 8;
  return Math.round(mean * 0.75 + (prof[ROLE_PROF_INDEX[role]] || 0) * 0.25);
}

const ROLE_PROF_INDEX = { AWPer: 0, Entry: 1, Lurker: 2, Support: 3, Anchor: 4, IGL: 5 };

function teamLineups(src, cards) {
  const byTpl = new Map(cards.map((c) => [c.templateId, c]));
  const teams = [];
  for (const m of src.matchAll(/id: '([a-z0-9]+)', name: '([^']+)', shortName: '[^']+', tier: (\d+)/g)) {
    teams.push({ id: m[1], name: m[2], tier: Number(m[3]), lineup: [] });
  }
  const startOf = (id) => {
    const re = new RegExp("id: '" + id + "', name: '[^']+', shortName: '[^']+', tier: \\d+");
    return src.search(re);
  };
  const bounds = teams.map((t) => startOf(t.id)).sort((a, b) => a - b);
  teams.forEach((t, i) => {
    const at = startOf(t.id);
    const end = bounds.find((b) => b > at);
    const block = src.slice(at, end === undefined ? src.length : end);
    for (const m of block.matchAll(/L\('([^']+)', '([A-Za-z]+)'(?:, true)?\)/g)) {
      const card = byTpl.get(m[1]);
      if (card) t.lineup.push({ card, role: m[2] });
    }
  });
  return teams.filter((t) => t.lineup.length > 0);
}

function tierCheck(aiSrc, cards, byTplPlan) {
  const teams = teamLineups(aiSrc, cards);
  const rows = teams.map((t) => {
    const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
    const at = (level, useAfter) => avg(t.lineup.map((e) => {
      const p = byTplPlan.get(e.card.templateId);
      return useAfter
        ? lineupOvr(e.card, p.attrsAfter, p.profAfter, e.role, level)
        : lineupOvr(e.card, e.card.attrsBefore, e.card.profBefore, e.role, level);
    }));
    return {
      id: t.id, name: t.name, tier: t.tier,
      before: at(5, false), after: at(5, true),
      weakBefore: at(1, false), weakAfter: at(1, true),
    };
  });
  // 梯队优势口径（与引擎测试同形）：高档队在 level 5，低档队在 level 1，高档必须领先 > 5。
  const inversions = [];
  let invBefore = 0;
  for (const hi of rows) {
    for (const lo of rows) {
      if (hi.tier <= lo.tier) continue;
      if (!(hi.before > lo.weakBefore + 5)) invBefore += 1;
      if (!(hi.after > lo.weakAfter + 5)) inversions.push(lo.name + '(T' + lo.tier + ') 反超 ' + hi.name + '(T' + hi.tier + ')');
    }
  }
  const byTier = {};
  for (const r of rows) {
    byTier[r.tier] = byTier[r.tier] || [];
    byTier[r.tier].push(r.after);
  }
  const tierAvg = Object.entries(byTier)
    .map(([k, v]) => [Number(k), Math.round(v.reduce((a, b) => a + b, 0) / v.length)])
    .sort((a, b) => b[0] - a[0]);
  return { rows, inversions, invBefore, tierAvg };
}

/* --------------------------------------------------------------- 主流程 */

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('找不到数据文件: ' + DATA_PATH);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const dataPlayers = data.players || [];
  const dataTeams = data.teams || [];
  const dataCoaches = data.coaches || [];

  const cardsSrc = fs.readFileSync(CARDS_PATH, 'utf8');
  const { cards, nickById } = parseCards(cardsSrc);
  const playerIndex = buildPlayerIndex(dataPlayers);
  const teamIndex = buildTeamIndex(dataTeams);
  const log = (s) => console.log(s);

  const nullStats = {
    rating_3_0: dataPlayers.filter((p) => !Number.isFinite(p.recent && p.recent.rating_3_0)).length,
    rating_1_0: dataPlayers.filter((p) => !Number.isFinite(p.career && p.career.rating_1_0)).length,
    opening_kills: dataPlayers.filter((p) => !Number.isFinite(p.detail && p.detail.opening_kills)).length,
    opening_deaths: dataPlayers.filter((p) => !Number.isFinite(p.detail && p.detail.opening_deaths)).length,
    clutches_won: dataPlayers.filter((p) => !Number.isFinite(p.detail && p.detail.clutches_won)).length,
    career_start_year: dataPlayers.filter((p) => !Number.isFinite(p.career_start_year)).length,
    pistol: dataTeams.filter((t) => !Number.isFinite(t.economy && t.economy.pistol_win_pct)).length,
    map_win_rate: dataTeams.reduce((a, t) => a + (Array.isArray(t.maps) ? t.maps.filter((m) => !Number.isFinite(m.win_rate)).length : 0), 0),
  };

  /* ---- P0 ---- */
  const plan = planPlayers(cards, nickById, playerIndex);
  const bands = buildEntries(cards, plan.matched, teamIndex);
  const solve = iterateToFixpoint(bands.entries);
  const matchedBefore = plan.matched.map((s) => s.card.ovrBefore);
  const matchedAfter = plan.matched.map((s) => s.ovrAfter);
  const rhoBefore = spearman(plan.matched.map((s) => s.rankKey), matchedBefore);
  const rhoAfter = spearman(plan.matched.map((s) => s.rankKey), matchedAfter);
  const r3Cohort = plan.matched.filter((s) => s.signal.group === 'r3');
  const rhoRawBefore = spearman(r3Cohort.map((s) => s.signal.value), r3Cohort.map((s) => s.card.ovrBefore));
  const rhoRawAfter = spearman(r3Cohort.map((s) => s.signal.value), r3Cohort.map((s) => s.ovrAfter));

  /* ---- 新规则验收指标 ---- */
  const entryList = bands.entries;
  const vrsTop10 = (e) => {
    if (!e.m || !e.m.data.current_team) return false;
    const t = teamIndex.byName(e.m.data.current_team);
    return Boolean(t && Number.isFinite(t.vrs_rank) && t.vrs_rank <= 10);
  };
  const top20Before = entryList.slice().sort((a, b) => (b.ovrBefore - a.ovrBefore) || (a.card.templateId < b.card.templateId ? -1 : 1)).slice(0, 20);
  const top20After = entryList.slice().sort((a, b) => (b.ovrAfter - a.ovrAfter) || (a.card.templateId < b.card.templateId ? -1 : 1)).slice(0, 20);
  const hitBefore = top20Before.filter(vrsTop10).length;
  const hitAfter = top20After.filter(vrsTop10).length;
  const count99 = (a) => a.filter((v) => v >= ATTR_MAX).length;
  const many99Before = entryList.filter((e) => count99(e.card.attrsBefore) >= 3).length;
  const many99After = entryList.filter((e) => count99(e.attrsAfter) >= 3).length;
  const total99Before = entryList.reduce((a, e) => a + count99(e.card.attrsBefore), 0);
  const total99After = entryList.reduce((a, e) => a + count99(e.attrsAfter), 0);
  const activeMatched = plan.matched.filter((s) => s.active);
  const rhoActiveBefore = spearman(activeMatched.map((s) => s.signal.value), activeMatched.map((s) => s.card.ovrBefore));
  const rhoActiveAfter = spearman(activeMatched.map((s) => s.signal.value), activeMatched.map((s) => s.ovrAfter));

  /* ---- P1 ---- */
  const aiSrc = fs.readFileSync(AI_TEAMS_PATH, 'utf8');
  const teamPlan = planTeams(aiSrc, teamIndex);
  const teamAiId = new Map();
  for (const t of teamPlan.matched) teamAiId.set(normTeam(t.data.team), t.id);
  const teamWrite = applyTeamPlan(aiSrc, teamPlan);

  /* ---- P2 / P3 ---- */
  let legendPlan = null;
  let legendWrite = null;
  let legendChanged = false;
  if (!NO_LEGENDS) {
    const legendSrc = fs.readFileSync(LEGENDS_PATH, 'utf8');
    legendPlan = planLegends(legendSrc, cards.map((c) => c.playerId), playerIndex);
    legendWrite = renderLegends(legendSrc, legendPlan);
    legendChanged = legendWrite.text !== legendSrc;
  }
  let coachPlan = null;
  let coachWrite = null;
  if (!NO_COACHES) {
    coachPlan = planCoaches(fs.readFileSync(COACHES_PATH, 'utf8'), dataCoaches, teamIndex, teamAiId);
    coachWrite = applyCoachPlan(fs.readFileSync(COACHES_PATH, 'utf8'), coachPlan);
  }

  /* ---- 写回 ---- */
  const byTpl = new Map(bands.entries.map((e) => [e.card.templateId, e]));
  let cardsChanged = 0;
  const cardsOut = cardsSrc.replace(tplRe(), (full, id, season, rarity, role, secondary, attrsText, profText) => {
    const e = byTpl.get('tpl-' + id + '-' + season);
    if (!e) return full;
    let next = full.replace('[' + attrsText + ']', '[' + e.attrsAfter.join(', ') + ']');
    next = next.replace('[' + profText + ']', '[' + e.profAfter.join(', ') + ']');
    if (next !== full) cardsChanged += 1;
    return next;
  });

  const writeCards = WRITE && WRITE_CARDS;
  if (writeCards && cardsOut !== cardsSrc) fs.writeFileSync(CARDS_PATH, cardsOut);
  if (WRITE) {
    if (teamWrite.text !== aiSrc) fs.writeFileSync(AI_TEAMS_PATH, teamWrite.text);
    if (legendWrite && legendWrite.text !== fs.readFileSync(LEGENDS_PATH, 'utf8')) fs.writeFileSync(LEGENDS_PATH, legendWrite.text);
    if (coachWrite && coachWrite.text !== fs.readFileSync(COACHES_PATH, 'utf8')) fs.writeFileSync(COACHES_PATH, coachWrite.text);
  }

  /* ---- 报告 ---- */
  log('=== 合并数据源校准报告 ===');
  log('数据: ' + path.relative(ROOT, DATA_PATH) + (data.meta && data.meta.fetched_at ? '（抓取于 ' + data.meta.fetched_at + '）' : ''));
  log('  选手 ' + dataPlayers.length + ' / 战队 ' + dataTeams.length + ' / 教练 ' + dataCoaches.length + ' / 赛事 ' + (data.events || []).length);
  log('公式(读自 src/data/config.ts，未改动): OVR = ' + FORMULA.blend.attributes + '*个人 + ' + FORMULA.blend.proficiency + '*位置熟练 + ' + FORMULA.blend.team + '*团队');
  log('模式: ' + (WRITE ? '写回文件' : '干跑（默认，不写文件；加 --write 才写）'));
  log('');

  log('[1] 匹配覆盖率');
  log('  P0 选手: 卡牌 ' + cards.length + ' 张 → 命中 ' + plan.matched.length + ' 张 (' + ((plan.matched.length / cards.length) * 100).toFixed(1) + '%)，未命中 ' + plan.unmatched.length + ' 张（保持原值）');
  log('     信号来源: rating_3_0 ' + plan.stats.r3 + ' 人 / rating_1_0 兜底 ' + plan.stats.r1Fallback + ' 人 / 无信号 ' + plan.stats.noSignal + ' 人');
  log('     歧义跳过（不合并）: ' + (plan.stats.ambiguous.length ? plan.stats.ambiguous.join('; ') : '无'));
  log('  P1 战队: AI 战队 ' + teamPlan.teams.length + ' 支 → 命中 ' + teamPlan.matched.length + ' 支 (' + ((teamPlan.matched.length / teamPlan.teams.length) * 100).toFixed(1) + '%)，未命中 ' + teamPlan.unmatched.length + ' 支（保持原值）');
  log('     有逐图胜率 ' + teamPlan.matched.filter((t) => t.mapRows.length > 0).length + ' 支 / 有经济数据 ' + teamPlan.econRows.length + ' 支');
  if (coachPlan) log('  P3 教练: 现有 ' + coachPlan.rows.length + ' 位 → 命中 ' + coachPlan.matched.length + ' 位 (' + ((coachPlan.matched.length / coachPlan.rows.length) * 100).toFixed(1) + '%)，未命中 ' + coachPlan.unmatched.length + ' 位（保持原值）');
  log('');

  log('[2] P0 校准方法');
  log('  · 主信号: recent.rating_3_0；无近期数据者用 career.rating_1_0 兜底（生涯口径）');
  log('  · 两套口径不可直接混排: r3 中位 1.08 区间 0.98–1.24，r1 兜底中位 1.09 却压缩在 1.06–1.15');
  log('    → 各自取组内分位当统一排序键（无尺度、null 已剔除）');
  log('  · 目标 OVR: 命中卡现有 OVR 多重集合按排序键逆序保序重排（均值/四分位/极值不变）');
  log('  · 分维度: opening_kills/(ok+od) → aim 与 Entry 熟练度（各自组内保序）；clutches_won/maps → gameSense（意识）');
  log('  · 无数据 6 维: 只按现有相对关系等比缩放，用来补齐目标 OVR；信号维绝不代偿');
  log('  · 反解: 枚举缩放 0.60–1.60 + ±1 贪心，夹在 [' + ATTR_MIN + ', ' + ATTR_MAX + ']');
  log('');

  log('[3] Spearman（OVR vs 主信号）');
  log('  模式: ' + (PRESERVE_OVR
    ? '保 OVR（默认）：只按数据重排 aim/Entry/gameSense，卡牌 OVR 与属性总量不变'
    : '全量重排（--recalibrate-ovr）：OVR 多重集合按主信号重排'));
  log('  全部命中卡 (n=' + plan.matched.length + ', 排序键=组内分位): 前 ' + rhoBefore.toFixed(4) + ' → 后 ' + rhoAfter.toFixed(4) + ' (' + (rhoAfter - rhoBefore >= 0 ? '+' : '') + (rhoAfter - rhoBefore).toFixed(4) + ')');
  log('  rating_3_0 子集 (n=' + r3Cohort.length + ', 原始 rating): 前 ' + rhoRawBefore.toFixed(4) + ' → 后 ' + rhoRawAfter.toFixed(4) + ' (' + (rhoRawAfter - rhoRawBefore >= 0 ? '+' : '') + (rhoRawAfter - rhoRawBefore).toFixed(4) + ')');
  log('  活跃子集 (n=' + activeMatched.length + ', 原始 rating): 前 ' + rhoActiveBefore.toFixed(4) + ' → 后 ' + rhoActiveAfter.toFixed(4) + ' (' + (rhoActiveAfter - rhoActiveBefore >= 0 ? '+' : '') + (rhoActiveAfter - rhoActiveBefore).toFixed(4) + ')');
  log('');

  log('[4] OVR 分布（多重集合形状）');
  log('  命中子集 校准前: ' + fmtDist(quantiles(matchedBefore)));
  log('  命中子集 校准后: ' + fmtDist(quantiles(matchedAfter)));
  log('');

  const moves = plan.matched
    .map((s) => ({ nick: s.nick, signal: s.signal.value, src: s.signal.source, before: s.card.ovrBefore, after: s.ovrAfter, delta: s.ovrAfter - s.card.ovrBefore }))
    .sort((a, b) => b.delta - a.delta || (a.nick < b.nick ? -1 : 1));
  log('[5] Top 10 提升');
  for (const m of moves.slice(0, 10)) {
    log('  ' + m.nick.padEnd(14) + ' r' + m.signal.toFixed(2) + '(' + m.src.slice(-3) + ')  ' + String(m.before).padStart(2) + ' → ' + String(m.after).padStart(2) + '  (' + (m.delta >= 0 ? '+' : '') + m.delta + ')');
  }
  log('    Top 10 下降');
  for (const m of moves.slice(-10).reverse()) {
    log('  ' + m.nick.padEnd(14) + ' r' + m.signal.toFixed(2) + '(' + m.src.slice(-3) + ')  ' + String(m.before).padStart(2) + ' → ' + String(m.after).padStart(2) + '  (' + (m.delta >= 0 ? '+' : '') + m.delta + ')');
  }
  log('');

  log('[6] null 过滤统计（null 一律不参与计算，绝不当 0）');
  log('  数据源 null 数: rating_3_0 ' + nullStats.rating_3_0 + ' / rating_1_0 ' + nullStats.rating_1_0
    + ' / opening_kills ' + nullStats.opening_kills + ' / opening_deaths ' + nullStats.opening_deaths
    + ' / clutches_won ' + nullStats.clutches_won + ' / career_start_year ' + nullStats.career_start_year);
  log('  战队 null 数: pistol_win_pct ' + nullStats.pistol + ' / 单图 win_rate ' + nullStats.map_win_rate);
  log('  命中卡内: 有 opening 信号 ' + plan.stats.entryUsed + ' 张（无 ' + (plan.stats.entryMissing || 0) + ' 张 → aim/Entry 保持原值）');
  log('            有 clutch 信号 ' + plan.stats.clutchUsed + ' 张（无 ' + (plan.stats.clutchMissing || 0) + ' 张 → gameSense 保持原值）');
  log('');

  log('[7] 未匹配清单');
  log('  选手 (' + plan.unmatched.length + ')：' + plan.unmatched.map((u) => u.nick).join(', '));
  log('  战队 (' + teamPlan.unmatched.length + ')：' + teamPlan.unmatched.map((u) => u.id + '(' + u.name + '：' + u.reason + ')').join(', '));
  if (coachPlan) log('  教练 (' + coachPlan.unmatched.length + ')：' + coachPlan.unmatched.map((u) => u.nick).join(', '));
  log('');

  if (DETAIL) {
    log('[7b] 逐卡明细（nick / 信号 / OVR before→after / 属性 / prof）');
    for (const s of plan.matched.slice().sort((a, b) => b.ovrAfter - a.ovrAfter)) {
      log('  ' + s.nick.padEnd(14) + ' r' + s.signal.value.toFixed(2) + '  ' + String(s.card.ovrBefore).padStart(2) + ' → ' + String(s.ovrAfter).padStart(2)
        + '  [' + s.card.attrsBefore.join(',') + '] → [' + s.attrsAfter.join(',') + ']'
        + '  prof [' + s.card.profBefore.join(',') + '] → [' + s.profAfter.join(',') + ']');
    }
    log('');
    log('[7c] 逐队明细（id / VRS / 每图熟练度 * = 样本不足取中位 / mapPref / econStyle）');
    for (const t of teamPlan.matched.slice().sort((a, b) => ((b.data && b.data.vrs_rank) || 999) - ((a.data && a.data.vrs_rank) || 999))) {
      log('  ' + t.id.padEnd(14) + ' VRS ' + String((t.data && t.data.vrs_rank) || '-').padStart(4) + '  '
        + t.mapSkill.map((m) => m.map.slice(0, 3) + ' ' + m.skill + (m.sampled ? '' : '*')).join('  '));
      log('      ' + t.mapPrefBefore + ' → [' + (t.mapPrefAfter || []).map((m) => "'" + m + "'").join(', ') + ']'
        + '   econ ' + (t.econBefore || '-') + ' → ' + (t.econAfter || '(无经济数据，保持原值)'));
    }
    log('');
  }

  log('[8] P1 战队地图与经济');
  log('  每图熟练度区间 [' + MAP_SKILL_MIN + ', ' + MAP_SKILL_MAX + ']（卡牌 mapProficiency 现区间，win_rate 线性保序映射）');
  log('  样本不足阈值 maps_played < ' + MIN_MAP_SAMPLE + ' → 取该队有效图熟练度中位数（全局中位数 ' + teamPlan.globalMedian + '）');
  const econDist = { aggressive: 0, balanced: 0, conservative: 0 };
  for (const t of teamPlan.econRows) econDist[t.econAfter] += 1;
  log('  econStyle 三分位: aggressive ' + econDist.aggressive + ' / balanced ' + econDist.balanced + ' / conservative ' + econDist.conservative
    + '（p33 ' + (teamPlan.q1 || 0).toFixed(3) + ' / p67 ' + (teamPlan.q2 || 0).toFixed(3) + '）');
  log('  无经济数据（保持原 econStyle）: ' + (teamPlan.matched.length - teamPlan.econRows.length) + ' 支');
  log('  将改写: mapPref ' + teamPlan.matched.length + ' 支 / econStyle ' + teamPlan.econRows.length + ' 支；文本变更行 ' + teamWrite.changed);
  log('');

  if (legendPlan) {
    log('[9] P2 传奇名录');
    log('  规则: career_start_year <= ' + LEGEND_CUTOFF + ' 为传奇（数据驱动）；字段缺失回退手工名单');
    log('  手工名单原 ' + legendPlan.manual.size + ' 人 → 新名单 ' + legendPlan.next.size + ' 人');
    log('  数据驱动 ' + legendPlan.dataDriven.size + ' 人 / 手工回退 ' + legendPlan.fallback.size + ' 人');
    log('  数据新增（手工名单没有）: ' + (legendPlan.added.length ? legendPlan.added.join(', ') : '无'));
    log('  数据剔除（手工收了但数据 > ' + LEGEND_CUTOFF + '）: ' + (legendPlan.removed.length ? legendPlan.removed.join(', ') : '无'));
    log('  年份修正: ' + (legendPlan.conflicts.length ? legendPlan.conflicts.join('; ') : '无'));
    const years = [...legendPlan.next.values()].map((e) => e.since);
    log('  自检: 新名单 since 最大 ' + Math.max.apply(null, years) + '、最小 ' + Math.min.apply(null, years) + '（必须 <= ' + LEGEND_CUTOFF + '）');
    log('');
  }

  if (coachPlan) {
    log('[10] P3 教练归属');
    log('  命中 ' + coachPlan.matched.length + ' 位 → 写真实归属: ' + coachPlan.matched.map((m) => m.nick + '→' + m.teamId).join(', '));
    log('  未命中 ' + coachPlan.unmatched.length + ' 位（保留原值）');
    log('');
  }

  log('[11] 写入');
  log('  选手属性/熟练度: ' + (writeCards
    ? (cardsChanged ? '已写入 cards.ts（' + cardsChanged + ' 张）' : '无变化，未写入')
    : (cardsChanged ? '将改写 ' + cardsChanged + ' 张，但未写卡（默认跳过；加 --write-cards 才写）' : '无变化，未写入')));
  log('  战队 mapPref/econStyle: ' + (WRITE ? (teamWrite.changed ? '已写入 aiTeams.ts（' + teamWrite.changed + ' 行）' : '无变化，未写入') : '干跑，将改写 ' + teamWrite.changed + ' 行'));
  if (legendWrite) log('  传奇名录: ' + (WRITE ? (legendChanged ? '已按数据重生成（' + legendPlan.next.size + ' 人）' : '无变化，未写入') : '干跑，将以 ' + legendPlan.next.size + ' 人重生成'));
  if (coachWrite) log('  教练归属: ' + (WRITE ? (coachWrite.changed ? '已写入 coaches.ts（' + coachWrite.changed + ' 位）' : '无变化，未写入') : '干跑，将改写 ' + coachWrite.changed + ' 位'));
  log('');

  const attrChanged = bands.entries.filter((e) => e.attrsAfter.some((v, i) => v !== e.card.attrsBefore[i]) || e.profAfter.some((v, i) => v !== e.card.profBefore[i])).length;
  log('[12b] band 分档与触顶规则验收');
  const actN = plan.matched.filter((s) => s.active).length;
  log('  活跃度门控: 命中卡里活跃 ' + actN + ' / 非活跃 ' + (plan.matched.length - actN) + '（全库 ' + dataPlayers.length + ' 人：活跃 ' + dataPlayers.filter(isActivePlayer).length + ' / 非活跃 ' + dataPlayers.filter((p) => !isActivePlayer(p)).length + '）');
  for (const b of BAND_ORDER) {
    const r = bands.ranges[b];
    if (!r || !r.n) { log('  band ' + b + '（' + BAND_LABEL[b] + '）: 0 人'); continue; }
    log('  band ' + b + '（' + BAND_LABEL[b] + '）: ' + r.n + ' 人 → 目标 OVR [' + r.min + ', ' + r.max + ']'
      + (b === 'A' ? '；全部有 rating_3_0: ' + (r.allRecent ? '是' : '否') : ''));
  }
  const overlap = [];
  for (let i = 0; i + 1 < BAND_ORDER.length; i += 1) {
    const hi = bands.ranges[BAND_ORDER[i]];
    const lo = bands.ranges[BAND_ORDER[i + 1]];
    if (!hi || !hi.n || !lo || !lo.n) continue;
    if (!(hi.min > lo.max)) overlap.push(BAND_ORDER[i] + '.min(' + hi.min + ') <= ' + BAND_ORDER[i + 1] + '.max(' + lo.max + ')');
  }
  log('  band 目标区间不重叠: ' + (overlap.length ? '否 → ' + overlap.join('; ') : '是（A.min > B.max > C.max > D.max）'));
  const ach = {};
  for (const b of BAND_ORDER) {
    const list = bands.entries.filter((e) => e.band === b);
    ach[b] = list.length ? { n: list.length, min: Math.min.apply(null, list.map((e) => e.ovrAfter)), max: Math.max.apply(null, list.map((e) => e.ovrAfter)) } : null;
  }
  log('  band 实际 OVR: ' + BAND_ORDER.filter((b) => ach[b]).map((b) => b + ' [' + ach[b].min + ', ' + ach[b].max + ']').join(' / '));
  const achOverlap = [];
  for (let i = 0; i + 1 < BAND_ORDER.length; i += 1) {
    const hi = ach[BAND_ORDER[i]];
    const lo = ach[BAND_ORDER[i + 1]];
    if (!hi || !lo) continue;
    if (!(hi.min > lo.max)) achOverlap.push(BAND_ORDER[i] + '.min(' + hi.min + ') <= ' + BAND_ORDER[i + 1] + '.max(' + lo.max + ')');
  }
  log('  band 实际区间不重叠: ' + (achOverlap.length ? '否 → ' + achOverlap.join('; ') : '是（A.min > B.max > C.max > D.max）'));
  log('  VRS 前 10 战队阵容落入 OVR Top 20: 前 ' + hitBefore + '/20 → 后 ' + hitAfter + '/20');
  log('  单卡 99 属性数 ≥3 的卡: 前 ' + many99Before + ' → 后 ' + many99After + '（必须为 0）');
  log('  全池 99 出现次数: 前 ' + total99Before + ' → 后 ' + total99After);
  log('  被可达区间夹住的卡: ' + solve.clamped + '（应尽量为 0，否则 band 区间会被压扁）');
  log('');
  log('[12] 自检');
  log('  不动点迭代: ' + solve.rounds + ' 轮 / ' + (solve.converged ? '已收敛（二次运行 0 改动）' : '未收敛（需检查）'));
  log('  未命中目标 OVR 的卡: ' + solve.unmet + '（自由维到边界；信号维不代偿）');
  log('  被 OVR/可达区间夹住的卡: ' + solve.clamped);
  log('  实际改动卡数: ' + attrChanged + ' / 命中 ' + plan.matched.length);
  log('');

  // 未命中卡保持原值 → 梯队自检要用「校准后的全量状态」，否则会读到 undefined。
  const afterByTpl = new Map(bands.entries.map((e) => [e.card.templateId, e]));
  const tier = tierCheck(aiSrc, cards, afterByTpl);
  const beforeTier = {};
  for (const r of tier.rows) { beforeTier[r.tier] = beforeTier[r.tier] || []; beforeTier[r.tier].push(r.before); }
  const tierBefore = Object.entries(beforeTier)
    .map(([k, v]) => [Number(k), Math.round(v.reduce((a, b) => a + b, 0) / v.length)])
    .sort((a, b) => b[0] - a[0]);
  log('[13] 阵容梯队自检（复刻 engine/lineup.ts 出场实力口径，统一 level 5）');
  log('  各档平均: ' + tierBefore.map(([t, v], i) => 'T' + t + ' ' + v + '→' + (tier.tierAvg[i] ? tier.tierAvg[i][1] : '?')).join(' / '));
  log('  梯队优势（高档 level5 vs 低档 level1，需 > +5）: 校准前 ' + tier.invBefore + ' 处不达标 → 校准后 '
    + (tier.inversions.length ? tier.inversions.length + ' 处 → ' + tier.inversions.slice(0, 5).join('; ') : '0 处'));
  const maxShift = plan.matched.reduce((a, s) => Math.max(a, Math.abs(s.ovrAfter - s.card.ovrBefore)), 0);
  log('  单卡最大位移: ' + maxShift + ' 分（排序键阻尼 w=' + BLEND_W + '）');
  log('');
  log(WRITE ? '完成。下一步: eslint / tsc / vitest / vite build 四条验证。' : '干跑结束；确认无误后加 --write 才写文件。');
}

main();
