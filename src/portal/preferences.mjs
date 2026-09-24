/** Path IDs avoid collisions between games that share a historical numeric label. */
const memory = new Map();
export const validId = id => typeof id === 'string' && /^[a-z]+\/game-\d+-[a-z0-9-]+$/.test(id);
export function readIds(key) {
  try {
    const raw = localStorage.getItem(`afg:${key}`);
    if (raw === null) return memory.get(key) || [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter(validId))].slice(0, 2000) : [];
  } catch { return memory.get(key) || []; }
}
export function saveIds(key, ids) {
  const value = [...new Set(ids.filter(validId))].slice(0, 2000);
  memory.set(key, value);
  try { localStorage.setItem(`afg:${key}`, JSON.stringify(value)); } catch { /* Keep working without persistence. */ }
  return value;
}
export function toggleFavorite(id) {
  const favorites = readIds('favorites');
  return saveIds('favorites', favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id]);
}
