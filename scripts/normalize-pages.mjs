import fs from 'node:fs';
import path from 'node:path';
import { walk } from './catalog.mjs';
// Idempotent source migration. Default is check-only; --write is explicit.
const write = process.argv.includes('--write');
let changes = 0;
for (const file of walk('src/games').filter(p => p.endsWith('/index.html'))) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before.replace(/,?\s*maximum-scale\s*=\s*1(?:\.0)?/gi, '').replace(/,?\s*user-scalable\s*=\s*no/gi, '');
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href === '../../shared/styles.css') return '';
    if (href && /(?:manifest\.json|icon-\d+\.png)$/.test(href)) return '';
    return tag;
  });
  html = html.replace(/href=(["'])\.\.\/\.\.\/index\.html\1/g, 'href="../../../../index.html"')
    .replaceAll('https://github.com/awesome-free-games', 'https://github.com/stephen-taipei/awesome-free-games-1000')
    .replace(/src=(["'])(\.\/)?main\.js\1/g, 'src="./main.ts"')
    .replace(/<a\b[^>]*target=["']_blank["'][^>]*>/gi, tag => {
      const rel = tag.match(/\brel=["']([^"']*)["']/i);
      const values = [...new Set([...(rel?.[1].split(/\s+/) || []), 'noopener', 'noreferrer'])].join(' ');
      return rel ? tag.replace(rel[0], `rel="${values}"`) : tag.replace(/>$/, ` rel="${values}">`);
    })
    .replace(/<select\b[^>]*id=["']language-select["'][^>]*>/gi, tag => /aria-label=|aria-labelledby=/.test(tag) ? tag : tag.replace(/>$/, ' aria-label="Language / 語言">'));
  if (!html.includes('shared/shell.css')) html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="../../../shared/shell.css">\n</head>');
  if (!html.includes('shared/shell.ts')) html = html.replace(/<\/body>/i, '<script type="module" src="../../../shared/shell.ts"></script>\n</body>');
  if (html !== before) { changes++; if (write) fs.writeFileSync(file, html); }
}
console.log(`${changes} game pages ${write ? 'normalized' : 'need normalization'}.`);
if (!write && changes) process.exitCode = 1;
