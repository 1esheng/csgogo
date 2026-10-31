#!/usr/bin/env node
/**
 * 本地数值校准器（不进仓库、不联网、不碰 Cloudflare）
 *
 * 用法：
 *   1) 你自己在浏览器打开 HLTV 选手统计页，人工过验证后把表格复制进 hltv-player-stats.csv
 *   2) node scripts/calibrate.mjs                  # 干跑，只打印 diff 报告
 *      node scripts/calibrate.mjs --write          # 真的写入 src/data/cards.ts
 *      node scripts/calibrate.mjs --retier --write # 同时按新 OVR 重排稀有度
 *
 * CSV 列（表头必须含 nickname + rating，其余可选）：
 *   nickname,rating,kast,adr,impact,maps
 * CSV 文件放在 scripts/ 下，已被 .gitignore 排除，不会提交。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CARDS = path.join(ROOT, 'src/data/cards.ts');
const CSV_DEFAULT = path.join(ROOT, 'scripts/hltv-player-stats.csv');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const RETIER = args.includes('--retier');
const csvPath = args.find((a) => a.endsWith('.csv')) ?? CSV_DEFAULT;

/** HLTV Rating 2.1 → 游戏内 OVR（0.90→60，1.35→92），可用 --min/--max 调整端点。 */
const MIN_OVR = Number(args[args.indexOf('--min') + 1]) || 60;
const MAX_OVR = Number(args[args.indexOf('--max') + 1]) || 92;
const BLEND = Number(args[args.indexOf('--blend') + 1]) || 0.6;
const MAX_SHIFT = Number(args[args.indexOf('--shift') + 1]) || 6;
const R_MIN = 0.85;
const R_MAX = 1.40;

const SHAPE = {
  AWPer:   [1.06, 1.02, 0.93, 0.90, 0.78, 0.85, 0.96, 0.58],
  Entry:   [1.03, 0.99, 0.88, 0.88, 0.76, 0.93, 0.91, 0.60],
  Lurker:  [0.95, 0.90, 0.99, 1.00, 0.82, 0.87, 0.99, 0.66],
  Support: [0.86, 0.84, 0.89, 0.91, 1.00, 0.99, 0.83, 0.68],
  Anchor:  [0.90, 0.87, 1.03, 0.94, 0.87, 0.92, 0.87, 0.70],
  IGL:     [0.78, 0.76, 0.88, 1.00, 0.92, 0.98, 0.80, 1.04],
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  if (!lines.length) return [];
  const head = lines[0].split(',').map((s) => s.trim().toLowerCase());
  const iNick = head.indexOf('nickname');
  const iRating = head.indexOf('rating');
  if (iNick < 0 || iRating < 0) throw new Error('CSV 必须包含 nickname 与 rating 两列');
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((s) => s.trim());
    const rating = Number(cols[iRating]);
    if (!cols[iNick] || !Number.isFinite(rating)) continue;
    rows.push({ nickname: cols[iNick], rating, kast: Number(cols[head.indexOf('kast')]) || 0, adr: Number(cols[head.indexOf('adr')]) || 0, impact: Number(cols[head.indexOf('impact')]) || 0 });
  }
  return rows;
}

function ratingToOvr(rating) {
  // 分段线性：0.90→62、1.05→75（职业中位数）、1.30→92（世界级）
  const r = Math.min(1.45, Math.max(0.80, rating));
  if (r <= 1.05) {
    const t = (r - 0.90) / 0.15;
    return Math.round(62 + Math.max(-1, Math.min(1, t)) * 13);
  }
  const t = (r - 1.05) / 0.25;
  return Math.round(75 + Math.min(1.2, t) * 17);
}
function buildAttrs(role, targetOvr) {
  const shape = SHAPE[role] ?? SHAPE.Anchor;
  let lo = 20;
  let hi = 120;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    const a = shape.map((s) => Math.max(30, Math.min(99, Math.round(mid * s))));
    const ind = a[0] * 0.30 + a[1] * 0.16 + a[2] * 0.16 + a[3] * 0.13 + a[4] * 0.09 + a[5] * 0.11 + a[6] * 0.05;
    const team = a[7] * 0.45 + a[5] * 0.35 + a[4] * 0.20;
    const prof = Math.min(99, Math.round(mid * (role === 'IGL' ? 1.03 : 0.99)));
    const ovr = Math.round(ind * 0.62 + prof * 0.20 + team * 0.18);
    if (ovr < targetOvr) lo = mid; else hi = mid;
  }
  return shape.map((s) => Math.max(30, Math.min(99, Math.round(((lo + hi) / 2) * s))));
}

function buildProf(role, secondary, targetOvr) {
  const base = Math.round(Math.max(55, Math.min(99, targetOvr + 5)));
  const map = { AWPer: 40, Entry: 40, Lurker: 40, Support: 40, Anchor: 40, IGL: 30 };
  map[role] = base;
  if (secondary) map[secondary] = Math.max(map[secondary], Math.max(50, base - 22));
  return ['AWPer', 'Entry', 'Lurker', 'Support', 'Anchor', 'IGL'].map((r) => map[r]);
}

/** 用 8 项属性 + 位置熟练度算回 OVR（与引擎同公式）。 */
function ovrOfAttrs(a, prof) {
  const ind = a[0] * 0.30 + a[1] * 0.16 + a[2] * 0.16 + a[3] * 0.13 + a[4] * 0.09 + a[5] * 0.11 + a[6] * 0.05;
  const team = a[7] * 0.45 + a[5] * 0.35 + a[4] * 0.20;
  return Math.round(ind * 0.62 + Math.max(...prof) * 0.20 + team * 0.18);
}

const TPL_RE = /tpl\('([a-z0-9]+)'\s*,\s*'(\d{4})'\s*,\s*'([A-Z]+)'\s*,\s*'([A-Za-z]+)'\s*,\s*'([A-Za-z]+)'\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*,\s*'([a-zA-Z0-9]+)'\s*,\s*([\d.]+)\)/g;

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('找不到 CSV：' + csvPath);
    console.error('请把 HLTV 统计导出为 CSV，表头至少包含 nickname,rating');
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  if (!rows.length) { console.error('CSV 里没有有效数据行'); process.exit(1); }

  const src = fs.readFileSync(CARDS, 'utf8');
  const byNick = new Map();
  for (const m of src.matchAll(TPL_RE)) {
    const [full, id, season, rarity, role, secondary, attrs, prof, maps, skill, growth] = m;
    byNick.set(id, { full, id, season, rarity, role, secondary, attrs, prof, maps, skill, growth });
  }
  // 昵称映射：cards.ts 里的 id 就是选手 id，CSV 用昵称，这里用 PLAYERS 表做对照
  const playersSrc = src.slice(0, src.indexOf('export const CARD_TEMPLATES'));
  const nickById = new Map();
  for (const m of playersSrc.matchAll(/\{ id: '([a-z0-9]+)', nickname: '([^']+)'/g)) nickById.set(m[1], m[2]);
  const idByNick = new Map([...nickById.entries()].map(([id, nick]) => [nick.toLowerCase(), id]));

  const report = [];
  let out = src;
  for (const row of rows) {
    const id = idByNick.get(row.nickname.toLowerCase());
    if (!id) { report.push({ nickname: row.nickname, status: '跳过（卡片里没有该选手）' }); continue; }
    const card = byNick.get(id);
    const rawTarget = ratingToOvr(row.rating);
    const oldAttrsArr = card.attrs.split(',').map(Number);
    const oldOvr = ovrOfAttrs(oldAttrsArr, card.prof.split(',').map(Number));
    let blended = Math.round(rawTarget * BLEND + oldOvr * (1 - BLEND));
    blended = Math.max(oldOvr - MAX_SHIFT, Math.min(oldOvr + MAX_SHIFT, blended));
    blended = Math.max(62, Math.min(95, blended));
    const target = blended;
    const attrs = buildAttrs(card.role, target);
    if (card.role === 'IGL') attrs[7] = Math.max(attrs[7], oldAttrsArr[7] - 3);
    const prof = buildProf(card.role, card.secondary, target);
    const next = "tpl('" + card.id + "', '" + card.season + "', '" + card.rarity + "', '" + card.role + "', '" + card.secondary + "', [" + attrs.join(', ') + "], [" + prof.join(', ') + "], [" + card.maps + "], '" + card.skill + "', " + card.growth + ")";
    out = out.replace(card.full, next);
    report.push({ nickname: row.nickname, id, rating: row.rating, target, oldAttrs: card.attrs, newAttrs: attrs.join(', ') });
  }

  console.log('校准条目：' + report.length);
  for (const r of report) {
    if (r.status) { console.log('  · ' + r.nickname + ' → ' + r.status); continue; }
    console.log('  · ' + r.nickname + '  rating ' + r.rating.toFixed(2) + ' → 目标 OVR ' + r.target);
    console.log('      旧属性: ' + r.oldAttrs.trim());
    console.log('      新属性: ' + r.newAttrs);
  }

  if (RETIER) {
    // 按新 OVR 排序后按固定名额重排稀有度
    const entries = [...out.matchAll(TPL_RE)].map((m) => ({ full: m[0], id: m[1] }));
    const ovrOf = (full) => {
      const m = full.match(/\[([^\]]+)\], \[([^\]]+)\], \[([^\]]+)\], '([a-zA-Z0-9]+)', ([\d.]+)\)/);
      if (!m) return 0;
      const a = m[1].split(',').map(Number);
      const prof = m[2].split(',').map(Number);
      const ind = a[0] * 0.30 + a[1] * 0.16 + a[2] * 0.16 + a[3] * 0.13 + a[4] * 0.09 + a[5] * 0.11 + a[6] * 0.05;
      const team = a[7] * 0.45 + a[5] * 0.35 + a[4] * 0.20;
      return ind * 0.62 + Math.max(...prof) * 0.20 + team * 0.18;
    };
    const sorted = entries.map((e) => ({ ...e, ovr: ovrOf(e.full) })).sort((a, b) => b.ovr - a.ovr);
    const quota = [['UR', 8], ['SSR', 20], ['SR', 45], ['R', 90]];
    let i = 0;
    for (const [rarity, count] of quota) {
      for (let k = 0; k < count && i < sorted.length; k += 1, i += 1) {
        const cur = sorted[i].full;
        const replaced = cur.replace(/tpl\('([a-z0-9]+)', '(\d{4})', '[A-Z]+'/, (mm, id, season) => "tpl('" + id + "', '" + season + "', '" + rarity + "'");
        out = out.replace(cur, replaced);
      }
    }
    for (; i < sorted.length; i += 1) {
      const cur = sorted[i].full;
      out = out.replace(cur, cur.replace(/tpl\('([a-z0-9]+)', '(\d{4})', '[A-Z]+'/, (mm, id, season) => "tpl('" + id + "', '" + season + "', 'N'"));
    }
    console.log('稀有度已按新 OVR 重排（UR 8 / SSR 20 / SR 45 / R 90 / N 其余）');
  }

  if (WRITE) {
    fs.writeFileSync(CARDS, out);
    console.log('已写入 ' + path.relative(ROOT, CARDS));
    console.log('下一步：npm test && npm run build，然后刷新页面看排行榜');
  } else {
    console.log('（干跑模式，未写入。确认无误后加 --write 才会修改 cards.ts）');
  }
}

main();
