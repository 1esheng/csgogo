'use strict';
/**
 * CS2 Dynasty · 单文件启动器（Node SEA）
 * dist 静态资源在构建时被嵌入 exe，运行时从内存读取，不需要外部文件。
 */
const http = require('node:http');
const path = require('node:path');
const { exec } = require('node:child_process');

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

const openBrowser = (url) => {
  const quirk = (cmd) => {
    try { exec(cmd, (err) => { if (err) console.log('浏览器自动打开失败：' + err.message); }); }
    catch (e) { console.log('浏览器自动打开失败：' + e.message); }
  };
  quirk('cmd /c start "" "' + url + '"');
  setTimeout(() => quirk('rundll32 url.dll,FileProtocolHandler "' + url + '"'), 400);
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
