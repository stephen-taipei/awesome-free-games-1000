import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverGames, escapeHtml, siteUrl } from './catalog.mjs';
export function generateSitemap(games = discoverGames(), root = process.cwd(), base = siteUrl()) {
  const urls = ['', 'catalog.html', ...games.map(game => game.url)].map(p => new URL(p, base).href);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public/sitemap.xml'), xml);
  // Retain the previous URL as a compatibility alias; this is NOT a Google News sitemap.
  fs.writeFileSync(path.join(root, 'public/news-sitemap.xml'), xml);
  fs.writeFileSync(path.join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', base).href}\n`);
  return urls;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(`Generated ${generateSitemap().length} sitemap URLs (no fabricated lastmod dates).`);
