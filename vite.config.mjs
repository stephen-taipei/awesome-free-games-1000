import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { discoverGames, siteUrl, escapeHtml } from './scripts/catalog.mjs';
export default defineConfig({
  base: './',
  // TypeScript is canonical; historical adjacent JS files must never shadow it.
  resolve: { extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx', '.json'] },
  server: { host: '127.0.0.1' },
  build: {
    target: 'es2022',
    rolldownOptions: { input: ['index.html', ...discoverGames().map(game => game.url)].map(file => resolve(file)) },
  },
  plugins: [{
    name: 'canonical-site-url',
    transformIndexHtml: { order: 'pre', handler(html, context) {
      const relative = context.path.replace(/^\//, '');
      const url = escapeHtml(new URL(relative === 'index.html' ? '' : relative, siteUrl()).href);
      html = html.replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, '');
      return html.replace('</head>', `<link rel="canonical" href="${url}"></head>`);
    } },
  }],
});
