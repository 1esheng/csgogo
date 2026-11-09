#!/usr/bin/env node
/**
 * HLTV 真实数据校准器（选手卡属性 + AI 战队评分）
 *
 * 数据源：.tmp/hltv-data.json（用户抓取，见 meta 字段）
 *   players[]: rank/nickname/maps/rounds/kd_diff/kd/rating_1_0/team/also_in_rosters/hltv_id
 *   teams[]:   rank/team/points/region/roster/hltv_id（Valve Regional Standings 积分）
 *
 * 用法：
 *   node scripts/calibrate-hltv.mjs             # 干跑：只打印报告，不写文件（默认）
 *   node scripts/calibrate-hltv.mjs --write     # 写回 src/data/cards.ts + src/data/aiTeams.ts
 *   node scripts/calibrate-hltv.mjs --no-teams  # 只校准选手卡
 *   node scripts/calibrate-hltv.mjs --data .tmp/hltv-data.json
 *
 * 红线（脚本只做这件事）：
 *   1) 只改卡牌的 8 项属性数值，以及 AI 战队的 rating 数值；
 *   2) 不改 OVR 公式（公式从 src/data/config.ts 读取，改公式脚本会跟着变）；
 *   3) 不改稀有度、抽卡概率、经济、比赛引擎常量、昵称、头像、国籍、战队归属。
 *
 * 方法：
 *   · 匹配：nickname 大小写不敏感 + 去除非字母数字后比较；also_in_rosters 作为别名一起尝试。
 *   · 目标 OVR：把「已匹配卡牌」现有的 OVR 基数多重集合（先扣掉次级微调）按 rating_1_0 逆序重排
 *     （保序映射），因此均值/四分位保持不变，只是“同一批分数按真实强弱重新分配”。
 *   · 次级微调：经验（生涯 maps 分位）±2 分、kd 分位 ±1 分，逐卡叠加到目标 OVR（均值不变，极值最多 ±3）；
 *     构造多重集合时先扣掉、分配后再加回，保证重复运行结果逐字节不变（幂等）。
 *   · 反解属性：对现有属性向量做等比缩放 → 二分/枚举取最接近目标 OVR 的缩放系数 →
 *     贪心整数微调命中目标 → 夹在 [ATTR_MIN, ATTR_MAX]，四舍五入到整数。
 *   · 战队：把已匹配战队的 rating 多重集合按 VRS points 逆序重排（保序映射）。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, 'src/data/cards.ts');
const TEAMS_PATH = path.join(ROOT, 'src/data/aiTeams.ts');
const CONFIG_PATH = path.join(ROOT, 'src/data/config.ts');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write') && !argv.includes('--dry-run');
const SKIP_TEAMS = argv.includes('--no-teams');
const DETAIL = argv.includes('--detail');
const dataIdx = argv.indexOf('--data');
const DATA_PATH = path.resolve(ROOT, dataIdx >= 0 && argv[dataIdx + 1] ? argv[dataIdx + 1] : '.tmp/hltv-data.json');

const ATTR_KEYS = ['aim', 'reflex', 'positioning', 'gameSense', 'utility', 'teamwork', 'clutch', 'leadership'];
const ATTR_MIN = 40;
const ATTR_MAX = 99;
/** 安全夹（2026-11 这次运行没有一张卡被夹住，仅作兜底）。 */
const OVR_CLAMP_MIN = 55;
const OVR_CLAMP_MAX = 96;

/* ---------------------------------------------------------------- 公式读取 */

function readBlend(src) {
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

const FORMULA = readBlend(fs.readFileSync(CONFIG_PATH, 'utf8'));

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
    const attrs = m[6].split(',').map((x) => Number(x.trim()));
    const prof = m[7].split(',').map((x) => Number(x.trim()));
    const skill = skills.get(m[9]);
    if (!skill) throw new Error('未知技能: ' + m[9]);
    cards.push({
      templateId: 'tpl-' + m[1] + '-' + m[2],
      playerId: m[1],
      season: m[2],
      rarity: m[3],
      role: m[4],
      secondary: m[5],
      attrsText: m[6],
      attrs,
      prof,
      profMax: Math.max.apply(null, prof),
      maps: m[8],
      skill,
      skillId: m[9],
      growth: m[10],
      full: m[0],
    });
  }
  return { cards, nickById };
}

/** 引擎同款：skill 为 attribute 类时把加成加进对应属性（effectiveAttributes）。 */
function effective(card, attrs) {
  const out = attrs.slice();
  const s = card.skill;
  if (s.kind === 'attribute') {
    const i = ATTR_KEYS.indexOf(s.key);
    if (i >= 0) out[i] += s.value;
  }
  return out;
}

/** 引擎同款 OVR：0.62 个人 + 0.20 位置熟练 + 0.18 团队（权重来自 config.ts）。 */
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

function ovrOfCard(card, attrs) {
  return ovrOf(effective(card, attrs), card.profMax);
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

function percentileOf(values, v) {
  let below = 0;
  let equal = 0;
  for (const x of values) {
    if (x < v) below += 1;
    else if (x === v) equal += 1;
  }
  return (below + equal / 2) / values.length;
}

function normNick(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* --------------------------------------------------------------- 匹配层 */

function buildPlayerIndex(players) {
  const index = new Map();
  for (const p of players) {
    const keys = [p.nickname].concat(p.also_in_rosters || []);
    for (const k of keys) {
      const n = normNick(k);
      if (n && !index.has(n)) index.set(n, p);
    }
  }
  return index;
}

/* -------------------------------------------------- 属性反解（只改数值） */

function marginal(i) {
  const key = ATTR_KEYS[i];
  return FORMULA.blend.attributes * (FORMULA.combat[key] || 0) + FORMULA.blend.team * (FORMULA.team[key] || 0);
}

function scaled(card, base, k) {
  return base.map((v) => Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round(v * k))));
}

function attrsForTarget(card, base, target) {
  let best = null;
  for (let step = 0; step <= 950; step += 1) {
    const k = 0.55 + step * 0.001;
    const cand = scaled(card, base, k);
    const ovr = ovrOfCard(card, cand);
    const diff = Math.abs(ovr - target);
    const moved = cand.reduce((acc, v, i) => acc + Math.abs(v - base[i]), 0);
    if (!best || diff < best.diff || (diff === best.diff && moved < best.moved)) best = { diff, moved, cand };
  }
  const attrs = best.cand.slice();
  let cur = ovrOfCard(card, attrs);
  for (let guard = 0; guard < 400 && cur !== target; guard += 1) {
    const dir = cur < target ? 1 : -1;
    let pick = -1;
    let pickScore = -1;
    for (let i = 0; i < ATTR_KEYS.length; i += 1) {
      const next = attrs[i] + dir;
      if (next < ATTR_MIN || next > ATTR_MAX) continue;
      const score = marginal(i);
      if (score > pickScore) { pickScore = score; pick = i; }
    }
    if (pick < 0) break;
    attrs[pick] += dir;
    cur = ovrOfCard(card, attrs);
  }
  return { attrs, achieved: cur, moved: best.moved };
}

function achievableRange(card, base) {
  const lo = ovrOfCard(card, base.map(() => ATTR_MIN));
  const hi = ovrOfCard(card, base.map(() => ATTR_MAX));
  return { lo, hi };
}

/* --------------------------------------------------------------- 主流程 */

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('找不到真实数据: ' + DATA_PATH);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const players = data.players || [];
  const teams = data.teams || [];
  const cardsSrc = fs.readFileSync(CARDS_PATH, 'utf8');
  const { cards, nickById } = parseCards(cardsSrc);
  const index = buildPlayerIndex(players);

  const rarityBefore = {};
  for (const c of cards) rarityBefore[c.rarity] = (rarityBefore[c.rarity] || 0) + 1;

  const poolBefore = [];
  const matched = [];
  const unmatched = [];
  for (const card of cards) {
    const nick = nickById.get(card.playerId);
    const hit = index.get(normNick(nick));
    card.ovrBefore = ovrOfCard(card, card.attrs);
    card.nick = nick;
    poolBefore.push(card.ovrBefore);
    if (hit) {
      card.hltv = hit;
      matched.push(card);
    } else {
      unmatched.push(card);
    }
  }

  /* ---- 目标 OVR：保序映射 + 次级微调（先扣后加，保证幂等） ---- */
  const mapsList = matched.map((c) => c.hltv.maps);
  const kdList = matched.map((c) => c.hltv.kd);
  for (const c of matched) {
    const expP = percentileOf(mapsList, c.hltv.maps);
    const kdP = percentileOf(kdList, c.hltv.kd);
    c.expTweak = Math.round((expP - 0.5) * 4);
    c.kdTweak = Math.round((kdP - 0.5) * 2);
    c.tweak = c.expTweak + c.kdTweak;
  }
  const order = matched.slice().sort((a, b) =>
    (b.hltv.rating_1_0 - a.hltv.rating_1_0) ||
    (b.hltv.kd - a.hltv.kd) ||
    (b.hltv.maps - a.hltv.maps) ||
    (a.templateId < b.templateId ? -1 : 1));
  const bases = matched.map((c) => c.ovrBefore - c.tweak).sort((a, b) => b - a);
  order.forEach((c, i) => { c.targetRaw = bases[i] + c.tweak; });

  for (const c of matched) {
    const range = achievableRange(c, c.attrs);
    let target = Math.max(OVR_CLAMP_MIN, Math.min(OVR_CLAMP_MAX, c.targetRaw));
    target = Math.max(range.lo, Math.min(range.hi, target));
    c.target = target;
    c.capped = target !== c.targetRaw;
    const solved = attrsForTarget(c, c.attrs, target);
    c.attrsAfter = solved.attrs;
    c.ovrAfter = solved.achieved;
    c.moved = solved.moved;
  }

  /* ---- 幂等自检：用校准后的数值再算一遍，目标必须完全一致 ---- */
  const basesAfter = matched.map((c) => c.ovrAfter - c.tweak).sort((a, b) => b - a);
  let driftCount = 0;
  const orderAfter = matched.slice().sort((a, b) =>
    (b.hltv.rating_1_0 - a.hltv.rating_1_0) ||
    (b.hltv.kd - a.hltv.kd) ||
    (b.hltv.maps - a.hltv.maps) ||
    (a.templateId < b.templateId ? -1 : 1));
  orderAfter.forEach((c, i) => { if (basesAfter[i] + c.tweak !== c.target) driftCount += 1; });

  /* ---- 战队 ---- */
  const teamPlan = SKIP_TEAMS ? null : planTeams(fs.readFileSync(TEAMS_PATH, 'utf8'), teams);

  /* ---- 写回 ---- */
  let cardsWritten = 0;
  let cardsOut = cardsSrc;
  const replaced = new Map(matched.map((c) => [c.full, '[' + c.attrsAfter.join(', ') + ']']));
  cardsOut = cardsSrc.replace(tplRe(), (full, id, season, rarity, role, secondary, attrsText, profText, mapsText, skillId, growth) => {
    const arr = replaced.get(full);
    if (!arr) return full;
    if (arr === '[' + attrsText + ']') return full; // 数值未变，保持原样（保证重复运行不改文件）
    cardsWritten += 1;
    return full.replace('[' + attrsText + ']', arr);
  });
  const cardsChanged = cardsWritten > 0 && cardsOut !== cardsSrc;

  if (WRITE) {
    if (cardsChanged) fs.writeFileSync(CARDS_PATH, cardsOut);
    if (teamPlan && teamPlan.changed) fs.writeFileSync(TEAMS_PATH, teamPlan.text);
  }

  /* ---- 报告 ---- */
  const poolAfter = cards.map((c) => (c.ovrAfter === undefined ? c.ovrBefore : c.ovrAfter));
  const matchedBefore = matched.map((c) => c.ovrBefore);
  const matchedAfter = matched.map((c) => c.ovrAfter);
  const rhoBefore = spearman(matched.map((c) => c.hltv.rating_1_0), matchedBefore);
  const rhoAfter = spearman(matched.map((c) => c.hltv.rating_1_0), matchedAfter);

  const moves = matched.map((c) => ({ nick: c.nick, rating: c.hltv.rating_1_0, before: c.ovrBefore, after: c.ovrAfter, delta: c.ovrAfter - c.ovrBefore }))
    .sort((a, b) => b.delta - a.delta || (a.nick < b.nick ? -1 : 1));

  const line = (s) => console.log(s);
  line('=== HLTV 真实数据校准报告 ===');
  line('数据: ' + path.relative(ROOT, DATA_PATH) + (data.meta && data.meta.fetched_at ? '（抓取于 ' + data.meta.fetched_at + '）' : ''));
  line('公式(读取自 src/data/config.ts): OVR = ' + FORMULA.blend.attributes + '*个人 + ' + FORMULA.blend.proficiency + '*位置熟练 + ' + FORMULA.blend.team + '*团队');
  line('模式: ' + (WRITE ? '写回文件' : '干跑（--dry-run，不写文件）'));
  line('');
  line('[1] 匹配覆盖率');
  line('  卡牌 ' + cards.length + ' 张（选手 ' + nickById.size + ' 人）');
  line('  命中 ' + matched.length + ' 张 (' + ((matched.length / cards.length) * 100).toFixed(1) + '%)，未命中 ' + unmatched.length + ' 张（保持原值）');
  line('  未命中昵称: ' + unmatched.map((c) => c.nick).join(', '));
  line('');
  line('[2] 校准方法与参数');
  line('  · 主信号 rating_1_0（生涯 Rating 1.0）× 保序映射：把命中卡现有 OVR 基数多重集合');
  line('    （先扣掉次级微调）按 rating 逆序重排 → 均值/四分位/极值不变，只是“同一批分数按真实强弱重新分配”');
  line('  · 次级微调（逐卡叠加，整体均值不变，极值最多 ±3）：experience(maps 分位) ' + (matched.length ? Math.min.apply(null, matched.map((c) => c.expTweak)) : 0) + '..' + (matched.length ? Math.max.apply(null, matched.map((c) => c.expTweak)) : 0) +
    ' 分，kd 分位 ' + (matched.length ? Math.min.apply(null, matched.map((c) => c.kdTweak)) : 0) + '..' + (matched.length ? Math.max.apply(null, matched.map((c) => c.kdTweak)) : 0) + ' 分');
  line('  · 排序键: rating_1_0 降序 → kd 降序 → maps 降序 → templateId');
  line('  · 反解: 现有 8 属性向量整体缩放（枚举 0.55–1.50）+ 贪心整数微调，夹在 [' + ATTR_MIN + ', ' + ATTR_MAX + ']');
  line('  · 未命中卡牌、稀有度、技能、熟练度、地图适应度一律不动');
  line('');
  line('[3] Spearman（OVR vs rating_1_0，命中卡）');
  line('  校准前: ' + rhoBefore.toFixed(4));
  line('  校准后: ' + rhoAfter.toFixed(4));
  line('  提升: ' + (rhoAfter - rhoBefore >= 0 ? '+' : '') + (rhoAfter - rhoBefore).toFixed(4) + '（目标 ≥ 0.80）');
  line('');
  line('[4] OVR 分布（多重集合形状）');
  line('  全体卡牌 校准前: ' + fmtDist(quantiles(poolBefore)));
  line('  全体卡牌 校准后: ' + fmtDist(quantiles(poolAfter)));
  line('  命中子集 校准前: ' + fmtDist(quantiles(matchedBefore)));
  line('  命中子集 校准后: ' + fmtDist(quantiles(matchedAfter)));
  line('');
  line('[5] Top 10 提升');
  for (const m of moves.slice(0, 10)) {
    line('  ' + m.nick.padEnd(13) + ' rating ' + m.rating.toFixed(2) + '  ' + m.before + ' → ' + m.after + '  (' + (m.delta >= 0 ? '+' : '') + m.delta + ')');
  }
  line('[5] Top 10 下降');
  for (const m of moves.slice(-10).reverse()) {
    line('  ' + m.nick.padEnd(13) + ' rating ' + m.rating.toFixed(2) + '  ' + m.before + ' → ' + m.after + '  (' + (m.delta >= 0 ? '+' : '') + m.delta + ')');
  }
  line('');
  if (DETAIL) {
    line('[5b] 逐卡明细（nick / rating / OVR before → after / 属性 before → after）');
    const detailRows = matched.slice().sort((a, b) => b.ovrAfter - a.ovrAfter);
    for (const c of detailRows) {
      line('  ' + c.nick.padEnd(13) + ' r' + c.hltv.rating_1_0.toFixed(2) + '  ' + String(c.ovrBefore).padStart(2) + ' → ' + String(c.ovrAfter).padStart(2)
        + '  [' + c.attrs.join(', ') + '] → [' + c.attrsAfter.join(', ') + ']');
    }
    line('');
  }
  line('[6] 稀有度分布（未改动）');
  line('  前: ' + JSON.stringify(rarityBefore));
  line('  后: ' + JSON.stringify(rarityBefore));
  line('');
  line('[7] 数据自检');
  line('  未命中目标 OVR 的卡: ' + matched.filter((c) => c.ovrAfter !== c.target).length);
  line('  被区间夹住的卡: ' + matched.filter((c) => c.capped).length);
  line('  幂等自检: 用校准后数值重算，目标差异 ' + driftCount + ' 条（应为 0）');
  line('  属性改动: ' + matched.filter((c) => c.moved > 0).length + ' 张卡，平均移动 ' + (matched.length ? (matched.reduce((a, c) => a + c.moved, 0) / matched.length).toFixed(1) : '0') + ' 点/卡');
  line('');
  if (teamPlan) {
    line('[8] AI 战队 rating 校准（VRS points 保序重排）');
    line('  战队 ' + teamPlan.total + ' 支，命中 ' + teamPlan.rows.length + ' 支，未命中 ' + teamPlan.unmatched.length + ' 支（保持原值）');
    line('  未命中: ' + teamPlan.unmatched.map((t) => t.id + '(' + t.name + ')').join(', '));
    line('  rating 分布 前: ' + fmtDist(quantiles(teamPlan.before)) + ' | 后: ' + fmtDist(quantiles(teamPlan.after)));
    line('  变更最大的 12 支:');
    const teamMoves = teamPlan.rows.slice().sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
    for (const t of teamMoves.slice(0, 12)) {
      line('  ' + (t.id + '').padEnd(14) + 'VRS ' + String(t.points).padStart(4) + ' (# ' + String(t.vrsRank).padStart(3) + ')  rating ' + t.before + ' → ' + t.after + '  (tier ' + t.tier + ' 未改)');
    }
    line('');
  }
  line('[9] 写入');
  line('  卡片属性: ' + (WRITE ? (cardsChanged ? '已写入 src/data/cards.ts（' + cardsWritten + ' 张）' : '无变化，未写入') : '干跑，未写入' + '（将改写 ' + cardsWritten + ' 张卡）'));
  if (teamPlan) line('  战队 rating: ' + (WRITE ? (teamPlan.changed ? '已写入 src/data/aiTeams.ts（' + teamPlan.changedCount + ' 支）' : '无变化，未写入') : '干跑，未写入' + '（将改写 ' + teamPlan.changedCount + ' 支）'));
  line('');
  line(WRITE ? '完成。下一步: tsc / eslint / vitest / vite build。' : '干跑结束；确认无误后加 --write 才会修改数据文件。');
}

/* ------------------------------------------------------------ 战队校准 */

const TEAM_ALIAS = {
  'natus vincere': 'Natus Vincere',
  'team vitality': 'Vitality',
  'team spirit': 'Spirit',
  'faze clan': 'FaZe',
  'g2 esports': 'G2',
  'team falcons': 'Falcons',
  'furia esports': 'FURIA',
  'team liquid': 'Liquid',
  'pain gaming': 'paiN',
  'betboom team': 'BETBOOM',
  'b8 esports': 'B8',
  'nemiga gaming': 'Nemiga',
  'aurora gaming': 'Aurora',
  '9 pandas': '9 Pandas',
  '9z team': '9z',
};

function normTeam(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function planTeams(src, hltvTeams) {
  const re = /id: '([a-z0-9]+)', name: '([^']+)', shortName: '([^']+)', tier: (\d+), rating: (\d+)/g;
  const rows = [];
  const unmatched = [];
  const byNorm = new Map();
  for (const t of hltvTeams) byNorm.set(normTeam(t.team), t);
  let total = 0;
  for (const m of src.matchAll(re)) {
    total += 1;
    const row = { id: m[1], name: m[2], short: m[3], tier: Number(m[4]), rating: Number(m[5]), full: m[0] };
    row.before = row.rating;
    const lowered = row.name.toLowerCase();
    const stripped = lowered.replace(/\b(team|esports|gaming|clan|academy)\b/g, '').trim();
    const cands = [row.name, TEAM_ALIAS[lowered], stripped, row.short].filter(Boolean);
    let hit = null;
    for (const c of cands) {
      const h = byNorm.get(normTeam(c));
      if (h) { hit = h; break; }
    }
    if (!hit) { unmatched.push(row); continue; }
    row.points = hit.points;
    row.vrsRank = hit.rank;
    row.vrsName = hit.team;
    rows.push(row);
  }
  // 保序重排：rating 多重集合按 VRS points 逆序分配
  const sorted = rows.slice().sort((a, b) => (b.points - a.points) || (a.id < b.id ? -1 : 1));
  const values = rows.map((r) => r.rating).sort((a, b) => b - a);
  sorted.forEach((r, i) => { r.after = values[i]; });
  let text = src;
  let changedCount = 0;
  for (const r of rows) {
    if (r.after === r.rating) continue;
    const next = r.full.replace('rating: ' + r.rating, 'rating: ' + r.after);
    text = text.replace(r.full, next);
    changedCount += 1;
  }
  return {
    text,
    rows,
    total,
    unmatched,
    before: rows.map((r) => r.rating),
    after: rows.map((r) => r.after),
    changed: changedCount > 0 && text !== src,
    changedCount,
  };
}

main();
