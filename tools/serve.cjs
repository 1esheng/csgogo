'use strict';
// 极简静态服务器：直接服务 dist，启动后立即打开浏览器（比 vite dev 快一个数量级）
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const DIST = path.join(__dirname, '..', 'dist');
const START_PORT = Number(process.env.PORT || 5173);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const key = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  let file = path.join(DIST, key);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  try {
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('404');
  }
});

const open = (url) => {
  try { exec('cmd /c start "" "' + url + '"', () => {}); } catch (e) {}
};

const listen = (port, attempt) => {
  const onError = (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < 20) return listen(port + 1, attempt + 1);
    console.error('启动失败：' + (err && err.message));
    console.error('请手动打开 http://127.0.0.1:' + port + '/');
  };
  server.once('error', onError);
  server.listen(port, '127.0.0.1', () => {
    server.removeListener('error', onError);
    const url = 'http://127.0.0.1:' + port + '/';
    console.log('');
    console.log('  CS2 Dynasty 已就绪：' + url);
    console.log('  浏览器已打开。关闭此窗口即可退出。');
    console.log('');
    open(url);
  });
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('缺少 dist/index.html —— 请先运行「构建并预览.bat」或 npm run build');
  process.exit(1);
}
listen(START_PORT, 0);
