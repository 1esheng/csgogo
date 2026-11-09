#!/usr/bin/env node
/**
 * 稀有度重分配器：按校准后的 OVR 排名重新切档
 *
 * 用法：
 *   node scripts/reassign-rarity.mjs              # 干跑：打印报告，不写文件（默认）
 *   node scripts/reassign-rarity.mjs --detail     # 干跑 + 逐档明细（每张卡的排名/OVR/旧档→新档）
 *   node scripts/reassign-rarity.mjs --write      # 写回 src/data/cards.ts（先快照到 .tmp/）
 *
 * 红线（脚本只做这件事）：
 *   1) 只改 tpl(...) 里的 rarity 字面量，属性/位置/技能/growth/昵称/头像/国籍/卡数一律不动；
 *   2) OVR 公式从 src/data/config.ts 读取（同 calibrate-hltv.mjs），公式改了脚本自动跟着变；
 *   3) 档位集合与总数固定为 UR 11 / SSR 17 / SR 45 / R 90 / N 142（共 305），只换人；
 *   4) 排序确定性：OVR 降序 → 昵称码点序 → templateId，无随机、无 locale 依赖。
 *
 * OVR 口径 = 引擎 cardOVR(template, level 1, stars 1)：
 *   属性（含 attribute 类技能加成）→ 0.62 个人能力 + 0.20 主位置熟练度 + 0.18 团队贡献。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CARDS_PATH = path.join(ROOT, 'src/data/cards.ts');
const CONFIG_PATH = path.join(ROOT, 'src/data/config.ts');
const SNAPSHOT_PATH = path.join(ROOT, '.tmp/cards-before-rarity.ts');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write') && !argv.includes('--dry-run');
const DETAIL = argv.includes('--detail');

const ATTR_KEYS = ['aim', 'reflex', 'positioning', 'gameSense', 'utility', 'teamwork', 'clutch', 'leadership'];
const PROF_ROLES = ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor', 'IGL'];

/** 固定分布：排名 1-11 UR、12-28 SSR、29-73 SR、74-163 R、164-305 N。 */
const QUOTAS = [['UR', 11], ['SSR', 17], ['SR', 45], ['R', 90], ['N', 142]];
const TOTAL = QUOTAS.reduce((a, [, n]) => a + n, 0);
const TIER_ORDER = QUOTAS.map(([r]) => r);

/* ---------------------------------------------------------------- 公式读取 */

function readFormula(src) {
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

function parseCards(src) {
  const skills = skillTable(src);
  const nickById = new Map();
  for (const m of src.matchAll(/\{ id: '([a-z0-9]+)', nickname: '([^']+)'/g)) nickById.set(m[1], m[2]);

  const re = /tpl\('([a-z0-9]+)', '(\d{4})', '([A-Z]+)', '([A-Za-z]+)', '([A-Za-z]+)', \[([^\]]+)\], \[([^\]]+)\], \[([^\]]+)\], '([a-zA-Z0-9]+)', ([\d.]+)\)/gd;
  const cards = [];
  const edits = [];
  for (const m of src.matchAll(re)) {
    const skill = skills.get(m[9]);
    if (!skill) throw new Error('未知技能: ' + m[9]);
    const roleIdx = PROF_ROLES.indexOf(m[4]);
    if (roleIdx < 0) throw new Error('未知主位置: ' + m[4]);
    const ridx = m.indices[3];
    cards.push({
      templateId: 'tpl-' + m[1] + '-' + m[2],
      playerId: m[1],
      nickname: nickById.get(m[1]) || m[1],
      season: m[2],
      rarity: m[3],
      role: m[4],
      attrs: m[6].split(',').map((x) => Number(x.trim())),
      proficiency: m[7].split(',').map((x) => Number(x.trim())),
      roleIndex: roleIdx,
      skill,
    });
    edits.push({ start: ridx[0], end: ridx[1] });
  }
  return { cards, rarityRanges: edits };
}

/* ------------------------------------------------------------------ OVR */

/** 引擎同款：level 1 / stars 1 时 growth=0、星级加成=0，只剩 attribute 类技能加成。 */
function cardOvr(card, formula) {
  const eff = card.attrs.slice();
  if (card.skill.kind === 'attribute') {
    const i = ATTR_KEYS.indexOf(card.skill.key);
    if (i >= 0) eff[i] += card.skill.value;
  }
  let individual = 0;
  let team = 0;
  for (let i = 0; i < ATTR_KEYS.length; i += 1) {
    const key = ATTR_KEYS[i];
    individual += eff[i] * (formula.combat[key] || 0);
    team += eff[i] * (formula.team[key] || 0);
  }
  const proficiency = card.proficiency[card.roleIndex] ?? 0;
  return Math.round(
    individual * formula.blend.attributes + proficiency * formula.blend.proficiency + team * formula.blend.team,
  );
}

/* ------------------------------------------------------------- 排序与切档 */

/** 码点序，不依赖 locale，跨机器稳定。 */
function cpCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function rankCards(cards) {
  return cards.slice().sort(
    (a, b) => b.ovr - a.ovr || cpCompare(a.nickname, b.nickname) || cpCompare(a.templateId, b.templateId),
  );
}

function assignTiers(ranked) {
  const tierOf = new Map();
  let i = 0;
  for (const [rarity, count] of QUOTAS) {
    for (let k = 0; k < count; k += 1) {
      tierOf.set(ranked[i].templateId, rarity);
      i += 1;
    }
  }
  if (i !== ranked.length) throw new Error('配额与卡数不符');
  return tierOf;
}

/* ------------------------------------------------------------------ 自检 */

function distribution(cards) {
  const out = {};
  for (const c of cards) out[c.rarity] = (out[c.rarity] || 0) + 1;
  return out;
}

/** 跨档倒挂：低档存在 OVR 高于高档最小值的卡 → 返回违例清单。 */
function inversions(cards) {
  const bounds = TIER_ORDER.map((r) => {
    const v = cards.filter((c) => c.rarity === r).map((c) => c.ovr);
    return { rarity: r, n: v.length, min: Math.min(...v), max: Math.max(...v) };
  });
  const bad = [];
  for (let t = 0; t + 1 < bounds.length; t += 1) {
    const hi = bounds[t];
    const lo = bounds[t + 1];
    for (const c of cards) {
      if (c.rarity === lo.rarity && c.ovr > hi.min) bad.push({ card: c, hi, lo });
    }
  }
  return { bounds, bad };
}

function tierIndex(r) {
  return TIER_ORDER.indexOf(r);
}

/* ------------------------------------------------------------------ 主流程 */

const formula = readFormula(fs.readFileSync(CONFIG_PATH, 'utf8'));
const source = fs.readFileSync(CARDS_PATH, 'utf8');
const parsed = parseCards(source);
const cards = parsed.cards.map((c) => ({ ...c, ovr: cardOvr(c, formula) }));

if (cards.length !== TOTAL) {
  throw new Error('卡数 ' + cards.length + ' 与固定分布总数 ' + TOTAL + ' 不符（红线：不改卡数）');
}
const before = distribution(cards);
const quotaMismatch = QUOTAS.filter(([r, n]) => before[r] !== n);
if (quotaMismatch.length > 0) {
  throw new Error('现有分布 ' + JSON.stringify(before) + ' 与固定分布不符，请先人工核对');
}

const ranked = rankCards(cards);
const tierOf = assignTiers(ranked);
const after = cards.map((c) => ({ ...c, rarity: tierOf.get(c.templateId) }));

/* 变更统计 */
let up = 0;
let down = 0;
let same = 0;
const movers = [];
const oldRarity = new Map(cards.map((c) => [c.templateId, c.rarity]));
for (const c of cards) {
  const from = c.rarity;
  const to = tierOf.get(c.templateId);
  if (from === to) { same += 1; continue; }
  /* 索引越小档位越高：from - to 为正 = 升档。 */
  const step = tierIndex(from) - tierIndex(to);
  if (step > 0) up += 1; else down += 1;
  movers.push({ ...c, from, to, step });
}

/* 一致性自检（目标分布） */
const check = inversions(after);
const rankOf = new Map(ranked.map((c, i) => [c.templateId, i + 1]));

/* 逐档明细 */
function tierRows(rarity) {
  return ranked
    .map((c, i) => ({ ...c, rank: i + 1 }))
    .filter((c) => tierOf.get(c.templateId) === rarity);
}

function printDetail() {
  for (const [rarity] of QUOTAS) {
    const rows = tierRows(rarity);
    console.log('\n[' + rarity + '] ' + rows.length + ' 张，OVR ' + rows[0].ovr + ' .. ' + rows[rows.length - 1].ovr);
    for (const c of rows) {
      const from = oldRarity.get(c.templateId);
      const mark = from === rarity ? '  ' : ' *';
      console.log(
        '  #' + String(c.rank).padStart(3) + mark + ' ' + String(c.ovr).padStart(3) + '  ' +
        c.nickname + ' (' + c.season + ', ' + c.role + ') ' + from + '→' + rarity,
      );
    }
  }
}

/* 报告 */
console.log('=== 稀有度重分配（按校准后 OVR 排名切档）===');
console.log('卡片数 ' + cards.length + '；固定分布 ' + QUOTAS.map(([r, n]) => r + ' ' + n).join(' / '));
console.log('OVR 口径：cardOVR(level 1, stars 1) = ' + formula.blend.attributes + '×个人 + ' +
  formula.blend.proficiency + '×主位置熟练度 + ' + formula.blend.team + '×团队（权重来自 src/data/config.ts）');
console.log('\n--- 变更统计 ---');
console.log('升档 ' + up + ' 张 / 降档 ' + down + ' 张 / 不变 ' + same + ' 张（合计 ' + (up + down + same) + '）');

const matrix = {};
for (const m of movers) { const k = m.from + '→' + m.to; matrix[k] = (matrix[k] || 0) + 1; }
console.log('\n--- 档位迁移矩阵 ---');
for (const k of Object.keys(matrix).sort()) console.log('  ' + k + ': ' + matrix[k]);

const bigUp = movers.filter((m) => m.step > 0).sort((a, b) => b.step - a.step || b.ovr - a.ovr);
const bigDown = movers.filter((m) => m.step < 0).sort((a, b) => a.step - b.step || b.ovr - a.ovr);
const show = (list, n) => list.slice(0, n).map((m) =>
  '  ' + m.nickname + ' (' + m.season + ', ' + m.role + ') OVR ' + m.ovr + '  #' + rankOf.get(m.templateId) + '  ' + m.from + '→' + m.to).join('\n');
console.log('\n--- 最大升档（前 8）---');
console.log(bigUp.length ? show(bigUp, 8) : '  （无）');
console.log('\n--- 最大降档（前 8）---');
console.log(bigDown.length ? show(bigDown, 8) : '  （无）');

const spotlight = (pred, label) => {
  const hits = movers.filter(pred);
  console.log('\n--- ' + label + '（' + hits.length + '）---');
  console.log(hits.length ? hits.sort((a, b) => b.ovr - a.ovr).slice(0, 10).map((m) =>
    '  ' + m.nickname + ' (' + m.season + ') OVR ' + m.ovr + '  ' + m.from + '→' + m.to + '  #' + rankOf.get(m.templateId)).join('\n') : '  （无）');
  if (hits.length > 10) console.log('  … 其余 ' + (hits.length - 10) + ' 张（--detail 看全量）');
};
spotlight((m) => m.from === 'UR' && tierIndex(m.to) <= tierIndex('SR'), 'UR 直接跌出 SSR 档');
spotlight((m) => m.from === 'SR' && tierIndex(m.to) <= tierIndex('SSR'), 'SR 及以下升进 SSR/UR');
spotlight((m) => m.from === 'N' && tierIndex(m.to) >= tierIndex('SR'), 'N 连跳两档以上');

console.log('\n--- 重分配后各档 OVR 区间 ---');
for (const b of check.bounds) {
  console.log('  ' + b.rarity.padEnd(3) + ' n=' + String(b.n).padStart(3) + '  min ' + b.min + ' / max ' + b.max);
}

console.log('\n--- 一致性自检（跨档倒挂）---');
console.log('  违例数 ' + check.bad.length + (check.bad.length === 0 ? '（通过：任意 UR ≥ 任意 SSR ≥ 任意 SR ≥ 任意 R ≥ 任意 N）' : '（失败）'));
for (const b of check.bad.slice(0, 10)) {
  console.log('    ' + b.card.nickname + ' OVR ' + b.card.ovr + ' 在 ' + b.lo.rarity + ' 高于 ' + b.hi.rarity + ' 最小 ' + b.hi.min);
}

/* 写回：只替换 rarity 字面量 */
function applyRarity(src, ranges, cards, tierOf) {
  let out = src;
  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const to = tierOf.get(cards[i].templateId);
    out = out.slice(0, ranges[i].start) + to + out.slice(ranges[i].end);
  }
  return out;
}

const nextSource = applyRarity(source, parsed.rarityRanges, cards, tierOf);

/* 幂等自检：对新内容再跑一遍全流程，必须 0 改动 */
const recheck = parseCards(nextSource);
const recheckCards = recheck.cards.map((c) => ({ ...c, ovr: cardOvr(c, formula) }));
const recheckTier = assignTiers(rankCards(recheckCards));
const idempotentDrift = recheckCards.filter((c) => recheckTier.get(c.templateId) !== c.rarity);
console.log('\n--- 幂等自检 ---');
console.log('  二次运行改动 ' + idempotentDrift.length + ' 张' + (idempotentDrift.length === 0 ? '（通过）' : '（失败）'));

if (DETAIL) printDetail();

if (check.bad.length > 0 || idempotentDrift.length > 0) {
  console.error('\n自检失败，未写回。');
  process.exit(1);
}

if (!WRITE) {
  const changed = nextSource === source ? 0 : movers.length;
  console.log('\n[干跑] 未写文件；将改动 ' + changed + ' 张卡的 rarity。加 --write 写回，加 --detail 看逐档明细。');
  process.exit(0);
}

if (movers.length === 0) {
  console.log('\n[写入] 无需改动（0 张），文件与 .tmp 快照均保持原样。');
  process.exit(0);
}

fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
fs.writeFileSync(SNAPSHOT_PATH, source);
fs.writeFileSync(CARDS_PATH, nextSource);
console.log('\n[写入] ' + path.relative(ROOT, CARDS_PATH) + ' 改动 ' + movers.length + ' 张卡的 rarity。');
console.log('[快照] ' + path.relative(ROOT, SNAPSHOT_PATH) + '（校准后 / 本脚本执行前的原样副本）');
