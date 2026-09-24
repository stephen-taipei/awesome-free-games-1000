import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const CATEGORIES = {
  puzzle: { name: '益智解謎', en: 'Puzzle', mark: '◈', description: '讓每一步，都有新發現。' },
  arcade: { name: '經典街機', en: 'Arcade', mark: '✦', description: '反應、節奏，再挑戰一次。' },
  action: { name: '動作冒險', en: 'Action', mark: '↗', description: '準備好，踏上你的冒險。' },
  runner: { name: '跑酷挑戰', en: 'Runner', mark: '»', description: '向前衝，突破自己的紀錄。' },
  card: { name: '卡牌策略', en: 'Card', mark: '♠', description: '下一張牌，下一個可能。' },
  horror: { name: '驚悚探索', en: 'Horror', mark: '☾', description: '探索未知；部分遊戲含驚嚇元素。' },
};
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function siteUrl(value = process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://stephen-taipei.github.io/awesome-free-games-1000/') {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('SITE_URL must be an HTTP(S) URL without credentials, query or fragment');
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url.href;
}
export function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
}
const text = value => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
// Read only literal translation properties. Never execute game modules during discovery.
export function translatedTitles(file) {
  if (!fs.existsSync(file)) return {};
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : '';
  const result = {};
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
      const locale = name(node.name);
      if (/^(?:zh-TW|zh-CN|en|ja|ko|es|fr|de|pt|ru|it|th|vi|id|ar|hi)$/.test(locale)) {
        for (const prop of node.initializer.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          if (name(prop.name) === 'game.title' && ts.isStringLiteral(prop.initializer)) result[locale] = prop.initializer.text;
          if (name(prop.name) === 'game' && ts.isObjectLiteralExpression(prop.initializer)) {
            const title = prop.initializer.properties.find(p => ts.isPropertyAssignment(p) && name(p.name) === 'title');
            if (title && ts.isStringLiteral(title.initializer)) result[locale] = title.initializer.text;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return result;
}
export function discoverGames(root = process.cwd()) {
  return walk(path.join(root, 'src/games')).filter(file => path.basename(file) === 'index.html').map(file => {
    const url = path.relative(root, file).split(path.sep).join('/');
    const [, , category, slug] = url.split('/');
    if (!CATEGORIES[category] || !/^game-\d+-[a-z0-9-]+$/.test(slug)) throw new Error(`Unrecognized game path: ${url}`);
    const html = fs.readFileSync(file, 'utf8');
    const titles = translatedTitles(path.join(path.dirname(file), 'i18n.ts'));
    const title = text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || slug).replace(/\s*[-|]\s*Awesome Free Games(?: 1000)?\s*$/i, '');
    const description = text(html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)/i)?.[1] || CATEGORIES[category].description);
    return { id: `${category}/${slug}`, number: Number(slug.match(/^game-(\d+)/)[1]), category, title, titles, description, url };
  }).sort((a, b) => a.number - b.number || a.id.localeCompare(b.id, 'en'));
}
