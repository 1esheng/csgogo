
import fs from 'node:fs';

const csv = fs.readFileSync('scripts/valve-ranking.csv', 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
const rank = csv.map((line, i) => {
  const [name, pts] = line.split(',');
  return { rank: i + 1, name: name.trim(), points: Number(pts) };
});
const maxPts = rank[0].points;
const minPts = rank[rank.length - 1].points;
/** Valve 积分 → 游戏内 Elo：第 1 名 ≈1300，末位 ≈800。 */
const toElo = (p) => Math.round(800 + ((p - minPts) / (maxPts - minPts)) * 500);

const aiPath = 'src/data/aiTeams.ts';
let src = fs.readFileSync(aiPath, 'utf8');
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const matched = [];
const unmatched = [];
for (const r of rank) {
  const n = norm(r.name);
  const re = new RegExp("(id: '[a-z0-9]+', name: '[^']+', shortName: '[^']+', tier: \\d+, rating: )(\\d+)");
  // 在文件里找 name 匹配的条目
  const entryRe = /\{\s*id: '([a-z0-9]+)',\s*name: '([^']+)',[^}]*?rating:\s*(\d+)/g;
  let m;
  let hit = null;
  while ((m = entryRe.exec(src))) {
    if (norm(m[2]) === n || norm(m[2]).includes(n) || n.includes(norm(m[2]))) { hit = m; break; }
  }
  if (!hit) { unmatched.push(r.name); continue; }
  const elo = toElo(r.points);
  matched.push({ name: hit[2], from: Number(hit[3]), to: elo, points: r.points, rank: r.rank });
  src = src.replace(hit[0], hit[0].replace(/rating:\s*\d+/, 'rating: ' + elo));
}
fs.writeFileSync(aiPath, src);
console.log('匹配并写入', matched.length, '支战队 | 未匹配', unmatched.length);
console.log('前 8 名映射:');
for (const x of matched.slice(0, 8)) console.log('  #' + x.rank, x.name, x.points + ' pts →', x.from, '⇒', x.to);
console.log('未匹配示例:', unmatched.slice(0, 10).join(', '));
