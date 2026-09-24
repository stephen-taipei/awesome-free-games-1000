export const PAGE_SIZE = 36;
export function readState(search, categories) {
  const params = new URLSearchParams(search);
  return {
    q: (params.get('q') || '').trim().slice(0, 200),
    category: categories.includes(params.get('category')) ? params.get('category') : 'all',
    order: params.get('order') === 'title' ? 'title' : 'number',
    favorites: params.get('favorites') === '1',
    page: /^\d{1,6}$/.test(params.get('page') || '') ? Math.max(1, Number(params.get('page'))) : 1,
  };
}
export function stateSearch(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category !== 'all') params.set('category', state.category);
  if (state.order !== 'number') params.set('order', state.order);
  if (state.favorites) params.set('favorites', '1');
  if (state.page > 1) params.set('page', String(state.page));
  return params.toString();
}
export function filterGames(games, state, favorites = []) {
  const words = state.q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const saved = new Set(favorites);
  return games.filter(game => {
    if (state.category !== 'all' && game.category !== state.category) return false;
    if (state.favorites && !saved.has(game.id)) return false;
    const haystack = [game.id, game.title, ...Object.values(game.titles || {}), game.description].join(' ').toLocaleLowerCase();
    return words.every(word => haystack.includes(word));
  }).sort((a, b) => state.order === 'title' ? a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en') : a.number - b.number || a.id.localeCompare(b.id, 'en'));
}
export function paginate(games, page, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(games.length / size));
  const current = Math.min(pages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  return { page: current, pages, items: games.slice((current - 1) * size, current * size) };
}
