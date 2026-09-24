import './styles.css';
import { readState, stateSearch, filterGames, paginate } from './catalog.mjs';
import { readIds, toggleFavorite } from './preferences.mjs';
const $ = selector => document.querySelector(selector);
let catalog;
let state;
let debounceTimer;
const node = (tag, className, value) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
};
function setState(patch, push = false) {
  clearTimeout(debounceTimer);
  state = { ...state, page: 1, ...patch };
  render(push ? 'push' : 'replace');
}
function syncUrl(mode) {
  const query = stateSearch(state);
  const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  if (`${location.pathname}${location.search}${location.hash}` !== url) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}
function render(mode = 'replace') {
  const saved = readIds('favorites');
  const matches = filterGames(catalog.games, state, saved);
  const result = paginate(matches, state.page);
  state.page = result.page;
  syncUrl(mode);
  $('#search').value = state.q;
  $('#order').value = state.order;
  $('#favorites-filter').setAttribute('aria-pressed', String(state.favorites));
  $('#favorite-count').textContent = String(saved.filter(id => catalog.games.some(g => g.id === id)).length);
  document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === state.category)));
  const category = catalog.categories.find(c => c.id === state.category);
  $('#results-title').textContent = state.favorites ? '我的收藏' : category ? category.name : '探索遊戲';
  $('#results-note').textContent = `${matches.length.toLocaleString()} 個結果${state.q ? ` ·「${state.q}」` : ''} · 第 ${result.page} / ${result.pages} 頁`;
  $('#empty').hidden = matches.length !== 0;
  $('#grid').replaceChildren(...result.items.map(game => {
    const info = catalog.categories.find(c => c.id === game.category);
    const article = node('article', `game-card theme-${game.category}`);
    const link = node('a', 'game-link');
    link.href = game.url;
    const art = node('div', 'game-art');
    art.setAttribute('aria-hidden', 'true');
    art.append(node('span', 'game-mark', info.mark), node('span', 'game-number', `#${String(game.number).padStart(3, '0')}`));
    const copy = node('div', 'game-copy');
    copy.append(node('span', 'game-category', `${info.name} / ${info.en}`), node('h3', '', game.titles['zh-TW'] || game.title), node('p', 'game-subtitle', game.title));
    link.append(art, copy);
    const favorite = node('button', 'favorite-button', saved.includes(game.id) ? '★' : '☆');
    favorite.type = 'button';
    favorite.setAttribute('aria-label', `收藏 ${game.titles['zh-TW'] || game.title}`);
    favorite.setAttribute('aria-pressed', String(saved.includes(game.id)));
    favorite.addEventListener('click', () => {
      const updated = toggleFavorite(game.id);
      if (state.favorites) { render(); $('#favorites-filter').focus(); }
      else {
        favorite.textContent = updated.includes(game.id) ? '★' : '☆';
        favorite.setAttribute('aria-pressed', String(updated.includes(game.id)));
        $('#favorite-count').textContent = String(updated.filter(id => catalog.games.some(g => g.id === id)).length);
      }
    });
    article.append(link, favorite);
    return article;
  }));
  $('#prev').disabled = result.page === 1;
  $('#next').disabled = result.page === result.pages;
  $('#page-label').textContent = `${result.page} / ${result.pages}`;
  $('#pagination').hidden = matches.length === 0;
}
async function loadCatalog() {
  $('#retry').hidden = true;
  $('#load-status').textContent = '正在載入遊戲目錄…';
  try {
    const response = await fetch('./catalog.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    catalog = await response.json();
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.games) || !Array.isArray(catalog.categories) || catalog.total !== catalog.games.length) throw new Error('Invalid catalogue');
    state = readState(location.search, catalog.categories.map(c => c.id));
    const all = node('button', 'category-tab', `全部 ${catalog.total}`);
    all.type = 'button'; all.dataset.category = 'all';
    const categories = catalog.categories.map(c => {
      const button = node('button', `category-tab theme-${c.id}`);
      button.type = 'button'; button.dataset.category = c.id;
      button.append(node('span', 'category-symbol', c.mark), node('span', '', c.name), node('span', 'count', String(c.count)));
      return button;
    });
    $('#categories').replaceChildren(all, ...categories);
    [all, ...categories].forEach(button => button.addEventListener('click', () => setState({ category: button.dataset.category }, true)));
    $('#game-count').textContent = catalog.total.toLocaleString();
    $('#category-count').textContent = String(catalog.categories.length);
    $('#load-status').textContent = '';
    $('#catalog-controls').hidden = false;
    $('#results').hidden = false;
    render();
  } catch {
    $('#load-status').textContent = '遊戲目錄暫時無法載入。請重試，或使用完整文字目錄。';
    $('#retry').hidden = false;
  }
}
$('#search').addEventListener('input', event => {
  clearTimeout(debounceTimer);
  const q = event.target.value.slice(0, 200).trim();
  debounceTimer = setTimeout(() => setState({ q }), 150);
});
$('#order').addEventListener('change', event => setState({ order: event.target.value }, true));
$('#favorites-filter').addEventListener('click', () => setState({ favorites: !state.favorites }, true));
$('#reset').addEventListener('click', () => { setState({ q: '', category: 'all', favorites: false, order: 'number' }, true); $('#search').focus(); });
$('#retry').addEventListener('click', loadCatalog);
for (const [id, delta] of [['prev', -1], ['next', 1]]) $( `#${id}`).addEventListener('click', () => {
  setState({ page: state.page + delta }, true);
  $('#results-title').focus({ preventScroll: true });
  $('#results').scrollIntoView({ block: 'start' });
});
window.addEventListener('popstate', () => {
  if (!catalog) return;
  clearTimeout(debounceTimer);
  state = readState(location.search, catalog.categories.map(c => c.id));
  render();
});
window.addEventListener('storage', event => { if (catalog && (event.key === 'afg:favorites' || event.key === null)) render(); });
loadCatalog();
