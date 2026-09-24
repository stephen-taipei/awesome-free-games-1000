/** Strict static test server: exercise project-subpath deployment without SPA fallbacks. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const prefix = '/awesome-free-games-1000/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.jpg': 'image/jpeg', '.png': 'image/png' };
http.createServer((req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith(prefix)) pathname = pathname.slice(prefix.length);
    let file = path.resolve(root, '.' + (pathname.startsWith('/') ? pathname : '/' + pathname));
    if (!file.startsWith(root + path.sep) && file !== root) throw Error('Invalid path');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(4174, '127.0.0.1', () => console.log('Static test site: http://127.0.0.1:4174' + prefix));
