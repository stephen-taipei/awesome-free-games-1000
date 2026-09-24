import fs from 'node:fs';
import path from 'node:path';
import { discoverGames, walk } from './catalog.mjs';
const built = process.argv.includes('--dist');
const root = path.resolve(built ? 'dist' : '.');
const games = discoverGames();
const errors = [];
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
const inside = file => file === root || file.startsWith(root + path.sep);
const files = ['index.html', ...games.map(game => game.url)];
if (built) files.push('catalog.html');
for (const relative of files) {
  const file = path.resolve(root, relative);
  if (!fs.existsSync(file)) { errors.push(`Missing page: ${relative}`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<(a|script|link|img|source)\b[^>]*>/gi)) {
    const tag = match[0];
    const attr = tag.match(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/i);
    if (!attr) continue;
    const ref = decode(attr[2]).split(/[?#]/)[0];
    if (!ref || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
    let decoded;
    try { decoded = decodeURIComponent(ref); } catch { errors.push(`Malformed URL: ${relative}: ${ref}`); continue; }
    let target = decoded.startsWith('/') ? path.join(root, decoded) : path.resolve(path.dirname(file), decoded);
    if (!inside(target)) { errors.push(`Path escapes site: ${relative}: ${ref}`); continue; }
    if (!built && !fs.existsSync(target)) {
      const publicTarget = path.resolve('public', decoded.replace(/^\//, ''));
      if (fs.existsSync(publicTarget)) target = publicTarget;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) errors.push(`Broken ${match[1]}: ${relative}: ${ref}`);
    if (built && match[1].toLowerCase() === 'script' && /\.tsx?$/.test(ref)) errors.push(`Uncompiled script: ${relative}: ${ref}`);
    if (!built && relative !== 'index.html' && match[1].toLowerCase() === 'script' && /\/main\.js$|^main\.js$/.test(ref)) errors.push(`Stale JS entry: ${relative}: ${ref}`);
  }
  if (/<meta\b[^>]*user-scalable\s*=\s*no/i.test(html)) errors.push(`Zoom disabled: ${relative}`);
}
const ids = new Set(games.map(game => game.id));
if (ids.size !== games.length) errors.push('Duplicate canonical game IDs');
if (!games.length) errors.push('No game pages found');
const catalogFile = path.join(built ? 'dist' : 'public', 'catalog.json');
if (fs.existsSync(catalogFile)) {
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  if (catalog.total !== games.length || catalog.games.length !== games.length) errors.push('Stale catalog count');
  if (JSON.stringify(catalog.games.map(g => g.id)) !== JSON.stringify(games.map(g => g.id))) errors.push('Stale catalog IDs');
  const sitemap = fs.readFileSync(path.join(built ? 'dist' : 'public', 'sitemap.xml'), 'utf8');
  if ((sitemap.match(/<loc>/g) || []).length !== games.length + 2) errors.push('Sitemap does not cover homepage, directory and every game');
} else errors.push('Missing catalog; run npm run generate:catalog');
if (built) {
  const pages = walk(root).filter(file => file.endsWith('.html'));
  if (pages.length !== games.length + 2) errors.push(`Unexpected built HTML count: ${pages.length}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${games.length} game routes, ${files.length} HTML pages and their local references (${built ? 'production' : 'source'}).`);
