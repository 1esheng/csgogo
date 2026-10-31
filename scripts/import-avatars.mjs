#!/usr/bin/env node
// 头像导入工具：把本地图片按选手匹配进 src/assets/avatars/，并登记来源。
//
// 用法：
//   npm run avatars                  # 从 avatars-inbox/ 目录自动匹配
//   npm run avatars -- --from D:/pics --source HLTV
//   npm run avatars -- --urls my-urls.txt --source HLTV   # 每行: <playerId 或昵称> <图片URL>
//   npm run avatars -- --list        # 查看当前已有哪些选手头像
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const AVATAR_DIR = path.join(ROOT, 'src/assets/avatars');
const CARDS_FILE = path.join(ROOT, 'src/data/cards.ts');
const CREDITS_FILE = path.join(AVATAR_DIR, 'credits.json');
const EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'];

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const inbox = flag('from', 'avatars-inbox');
const source = flag('source', '本地导入');
const urlsFile = flag('urls', null);
const listOnly = args.includes('--list');

const cardsSrc = fs.readFileSync(CARDS_FILE, 'utf8');
const players = [...cardsSrc.matchAll(/\{ id: '([a-z0-9]+)', nickname: '([^']+)'/g)].map((m) => ({
  id: m[1], nickname: m[2],
}));
if (!players.length) { console.error('无法从 src/data/cards.ts 解析选手表'); process.exit(1); }

fs.mkdirSync(AVATAR_DIR, { recursive: true });
const credits = fs.existsSync(CREDITS_FILE) ? JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8')) : {};
const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function matchPlayer(rawName) {
  const n = clean(rawName);
  if (!n) return null;
  const exact = players.find((p) => clean(p.id) === n || clean(p.nickname) === n);
  if (exact) return exact;
  const partial = players.filter((p) => {
    const id = clean(p.id); const nick = clean(p.nickname);
    return (id && n.includes(id)) || (nick && n.includes(nick));
  });
  return partial.length === 1 ? partial[0] : null;
}

if (listOnly) {
  const have = fs.readdirSync(AVATAR_DIR).filter((f) => EXTS.includes(path.extname(f).toLowerCase()));
  console.log('已有头像 ' + have.length + ' / ' + players.length + ' 名选手：');
  players.forEach((p) => console.log((have.includes(p.id) ? '  [有] ' : '  [  ] ') + p.id.padEnd(12) + p.nickname));
  process.exit(0);
}

const imported = [];
const unmatched = [];

if (urlsFile) {
  const lines = fs.readFileSync(urlsFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const line of lines) {
    const [who, url] = line.split(/\s+/);
    const player = matchPlayer(who || '');
    if (!player || !url) { unmatched.push(who || line); continue; }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      const ext = ct.includes('png') ? '.png' : ct.includes('jpeg') ? '.jpg' : ct.includes('webp') ? '.webp' : ct.includes('svg') ? '.svg' : '.png';
      fs.writeFileSync(path.join(AVATAR_DIR, player.id + ext), Buffer.from(await res.arrayBuffer()));
      credits[player.id] = { file: player.id + ext, source, note: url };
      imported.push(player.id);
      console.log('  + ' + player.id + ' <- ' + url.slice(0, 60));
    } catch (err) {
      console.log('  ! ' + player.id + ' 下载失败: ' + err.message);
      unmatched.push(player.id);
    }
  }
} else if (fs.existsSync(inbox)) {
  const files = fs.readdirSync(inbox).filter((f) => EXTS.includes(path.extname(f).toLowerCase()));
  for (const file of files) {
    const player = matchPlayer(path.basename(file, path.extname(file)));
    if (!player) { unmatched.push(file); continue; }
    const ext = path.extname(file).toLowerCase();
    fs.copyFileSync(path.join(inbox, file), path.join(AVATAR_DIR, player.id + ext));
    credits[player.id] = { file: player.id + ext, source, note: file };
    imported.push(player.id);
    console.log('  + ' + player.id + ' <- ' + file);
  }
} else {
  console.log('没有找到目录 ' + inbox + '。请把选手图片放进去，或用 --from/--urls 指定来源。');
}

fs.writeFileSync(CREDITS_FILE, JSON.stringify(credits, null, 2) + '\n');
console.log('\n导入 ' + imported.length + ' 张，未匹配 ' + unmatched.length + ' 个。');
if (unmatched.length) console.log('未匹配：' + unmatched.slice(0, 12).join(', '));
console.log('提示：图片放在 src/assets/avatars/<playerId>.<ext>，构建时打包进本地资源，断网也能显示。');