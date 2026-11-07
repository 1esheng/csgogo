import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = process.env.VERSION || pkg.version;
const desktopSrc = 'desktop-out/CS2 Dynasty-win32-x64';
const dest = process.env.USERPROFILE + '\\Desktop\\CS2 Dynasty v' + version;
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
if (!fs.existsSync(desktopSrc)) { console.error('缺少桌面打包产物：先跑 npm run desktop:build'); process.exit(1); }
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(desktopSrc, dest, { recursive: true });
const info = ['CS2 Dynasty v' + version, '构建时间 ' + stamp + ' UTC', '双击 CS2 Dynasty.exe 启动', '网页版 https://1esheng.github.io/csgogo/', 'Release https://github.com/1esheng/csgogo/releases/tag/v' + version, ''].join('\n');
fs.writeFileSync(dest + '\\VERSION.txt', info, 'utf8');
console.log('本地副本:', dest);
console.log('VERSION.txt:', info.split('\n')[0], '|', info.split('\n')[1]);
console.log('exe 存在:', fs.existsSync(dest + '\\CS2 Dynasty.exe'));