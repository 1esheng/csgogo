'use strict';
/**
 * CS2 Dynasty · 单文件启动器（Node SEA）
 * dist 静态资源在构建时被嵌入 exe，运行时从内存读取，不需要外部文件。
 */
const http = require('node:http');
const path = require('node:path');
const { exec, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');

let getAsset = null;
try { ({ getAsset } = require('node:sea')); } catch { /* 非 SEA 运行时回退到磁盘 */ }
const sea = (() => { try { return require('node:sea'); } catch { return null; } })();
const isSea = sea && typeof sea.isSea === 'function' ? sea.isSea() : false;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function readAsset(name) {
  if (isSea) {
    try { return Buffer.from(sea.getAsset(name)); } catch { return null; }
  }
  try { return require('node:fs').readFileSync(path.join(__dirname, 'dist', name)); } catch { return null; }
}

const PORT = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const clean = url === '/' ? '/index.html' : url;
  const key = clean.replace(/^\/+/, '').replace(/^csgogo\//, '');
  let body = readAsset(key);
  if (!body && !path.extname(key)) body = readAsset('index.html');
  if (!body) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }
  const type = MIME[path.extname(key).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
});

const BROWSERS = [
  process.env['PROGRAMFILES(X86)'] && process.env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.PROGRAMFILES && process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.PROGRAMFILES && process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
  process.env['PROGRAMFILES(X86)'] && process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const findBrowser = () => BROWSERS.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;

const tryTab = (url) => {
  try { exec('cmd /c start "" "' + url + '"'); } catch (e) { console.log('  start 失败：' + e.message); }
  try { exec('rundll32 url.dll,FileProtocolHandler "' + url + '"'); } catch (e) {}
};

const openBrowser = (url) => {
  const exe = findBrowser();
  if (!exe) {
    console.log('  未找到 Edge / Chrome，改用系统默认浏览器。');
    tryTab(url);
    return;
  }
  const args = [
    '--app=' + url,
    '--window-size=1400,900',
    '--window-position=100,80',
    '--no-first-run',
    '--no-default-browser-check',
  ];
  const cmdline = '"' + exe + '" ' + args.join(' ');
  console.log('  启动命令：' + cmdline);
  try {
    const child = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    console.log('  已请求应用窗口（' + path.basename(exe) + '），3 秒内未出现将自动打开普通标签页。');
  } catch (e) {
    console.log('  应用窗口打开失败：' + e.message);
    tryTab(url);
    return;
  }
  setTimeout(() => {
    let visible = false;
    try {
      const out = require('node:child_process').execSync('powershell -NoProfile -Command "(Get-Process msedge,chrome -ErrorAction SilentlyContinue | Measure-Object).Count"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      visible = Number(out.trim()) > 0;
    } catch (e) { visible = true; }
    if (!visible) { console.log('  应用窗口未检测到，改用系统默认浏览器打开。'); tryTab(url); }
  }, 3000);
};

const listen = (port, attempt) => {
  const onError = (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < 12) {
      listen(port + 1, attempt + 1);
      return;
    }
    console.error('启动失败：' + (err && err.message ? err.message : err));
    console.error('请手动在浏览器打开 http://127.0.0.1:' + port + '/');
  };
  server.once('error', onError);
  server.listen(port, '127.0.0.1', () => {
    server.removeListener('error', onError);
    const url = 'http://127.0.0.1:' + port + '/';
    console.log('');
    console.log('  CS2 Dynasty 已启动：' + url);
    console.log('  若浏览器未自动打开，请把上面的地址复制到浏览器。');
    console.log('  关闭此窗口即可退出游戏。');
    console.log('');
    openBrowser(url);
  });
};

listen(PORT, 0);

process.on('SIGINT', () => process.exit(0));
