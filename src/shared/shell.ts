import { readIds, saveIds, toggleFavorite } from '../portal/preferences.mjs';
const match = location.pathname.match(/\/src\/games\/([^/]+\/game-\d+-[^/]+)\/(?:index\.html)?$/);
if (match) {
  const id = match[1];
  saveIds('recent', [id, ...readIds('recent').filter(value => value !== id)].slice(0, 12));
  const host = document.createElement('afg-navigation');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = ':host{position:fixed;bottom:max(12px,env(safe-area-inset-bottom));right:12px;z-index:10000;font:13px/1.4 system-ui;color:#ecf5f2}nav{display:flex;align-items:center;background:#152b29;border:1px solid #4d756c;border-radius:12px;box-shadow:0 3px 15px #0005}a,button{box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:44px;color:inherit;background:transparent;border:0;padding:10px 14px;text-decoration:none;font:inherit;cursor:pointer}button{border-left:1px solid #4d756c;font-size:19px}a:focus-visible,button:focus-visible{outline:3px solid #85eed1;outline-offset:2px;border-radius:8px}button[aria-pressed=true]{color:#f1e6a3}';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Game collection / 遊戲合集');
  const home = document.createElement('a'); home.href = new URL('../../../../index.html', location.href).href; home.textContent = '← 遊戲大廳 / Games';
  const favorite = document.createElement('button'); favorite.type = 'button'; favorite.setAttribute('aria-label', '收藏遊戲 / Favorite game');
  const update = () => { const saved = readIds('favorites').includes(id); favorite.setAttribute('aria-pressed', String(saved)); favorite.textContent = saved ? '★' : '☆'; };
  favorite.addEventListener('click', () => { toggleFavorite(id); update(); });
  window.addEventListener('storage', update);
  root.addEventListener('keydown', event => event.stopPropagation());
  update(); nav.append(home, favorite); root.append(style, nav); document.body.append(host);
}
