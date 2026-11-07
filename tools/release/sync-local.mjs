import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const v = process.env.VERSION || pkg.version;
const dir = 'v' + v;
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
// 1) 桌面版目录
const desktopSrc = 'desktop-out/CS2 Dynasty-win32-x64';
const desktopDest = dir + '/CS2Dynasty-Desktop-v' + v;
if (fs.existsSync(desktopSrc)) { fs.rmSync(desktopDest, { recursive: true, force: true }); fs.cpSync(desktopSrc, desktopDest, { recursive: true }); }
// 2) 单文件 exe
if (fs.existsSync('CS2Dynasty.exe')) fs.copyFileSync('CS2Dynasty.exe', dir + '/CS2Dynasty-v' + v + '.exe');
// 3) 压缩包
if (fs.existsSync('.tmp/desktop.zip')) fs.copyFileSync('.tmp/desktop.zip', dir + '/CS2Dynasty-Desktop-v' + v + '.zip');
// 4) 版本说明
fs.writeFileSync(dir + '/VERSION.txt', ['CS2 Dynasty v' + v, '构建时间 ' + stamp + ' UTC', '', 'CS2Dynasty-Desktop-v' + v + '/  解压后的桌面程序，双击 CS2 Dynasty.exe', 'CS2Dynasty-v' + v + '.exe        单文件版（需浏览器打开页面）', 'CS2Dynasty-Desktop-v' + v + '.zip  桌面版压缩包（GitHub Release 同款）', '', '在线试玩 https://1esheng.github.io/csgogo/', 'Release https://github.com/1esheng/csgogo/releases/tag/v' + v, ''].join('\n'), 'utf8');
// 5) 校验和
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lines = [];
for (const f of ['CS2Dynasty-v' + v + '.exe', 'CS2Dynasty-Desktop-v' + v + '.zip']) {
  const p = dir + '/' + f;
  if (fs.existsSync(p)) lines.push(sha(p) + '  ' + f);
}
const deskExe = desktopDest + '/CS2 Dynasty.exe';
if (fs.existsSync(deskExe)) lines.push(sha(deskExe) + '  CS2Dynasty-Desktop-v' + v + '/CS2 Dynasty.exe');
fs.writeFileSync(dir + '/SHA256SUMS.txt', lines.join('\n') + '\n', 'utf8');
console.log('归档目录:', dir);
for (const e of fs.readdirSync(dir)) {
  const p = dir + '/' + e;
  const st = fs.statSync(p);
  console.log(' ', e, st.isDirectory() ? '(目录)' : Math.round(st.size / 1048576) + 'MB');
}
if (fs.existsSync('release')) { fs.rmSync('release', { recursive: true, force: true }); console.log('已删除旧 release/ 目录'); }