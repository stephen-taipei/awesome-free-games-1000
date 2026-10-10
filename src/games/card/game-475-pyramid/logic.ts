/**
 * Pure rules for Pyramid Solitaire: deal, availability, pairs, stock/waste passes, scoring, hints,
 * win / no-move detection and undo. No DOM or three.js, so tests can import it directly.
 *
 * Cards are numbers 0..51: suit = floor(card / 13) (0 spades, 1 hearts, 2 diamonds, 3 clubs),
 * rank = card % 13 + 1 (A = 1 ... K = 13). Slots 0..27 are pyramid positions in reading order
 * (row 0 is the apex); slot 28 (`WASTE`) is the top of the waste pile.
 */

export const ROWS = 7;
export const PYRAMID_SIZE = 28;
export const DECK_SIZE = 52;
export const TARGET = 13;
/** Passes through the stock: the first deal plus two redeals. */
export const MAX_PASSES = 3;
export const WASTE = PYRAMID_SIZE;

export const PAIR_POINTS = 10;
export const STREAK_POINTS = 5;
export const STREAK_CAP = 6;
export const ROW_BONUS = 25;
export const CLEAR_BONUS = 500;
export const REDEAL_BONUS = 150;
export const TIME_BONUS_SECONDS = 300;
/** Deal numbers the solver proves winnable (checked in the tests); the fallback when a random search finds none. */
export const WINNABLE_DEALS: readonly number[] = [3, 6, 8, 12, 14, 15, 20, 21];

export type Suit = 0 | 1 | 2 | 3;
export const rankOf = (card: number) => (card % 13) + 1;
export const suitOf = (card: number) => Math.floor(card / 13) as Suit;
export const isRed = (card: number) => suitOf(card) === 1 || suitOf(card) === 2;

export interface State {
  /** Card per pyramid slot, or null once removed. */
  readonly pyramid: ReadonlyArray<number | null>;
  /** Face-down stock; the last element is the top. */
  readonly stock: readonly number[];
  /** Face-up waste; the last element is the top and the only available waste card. */
  readonly waste: readonly number[];
  /** Removed cards in removal order. */
  readonly discard: readonly number[];
  /** Current pass through the stock, 1-based. */
  readonly pass: number;
  readonly score: number;
  readonly moves: number;
  /** Removals in a row without drawing or redealing. */
  readonly streak: number;
}

export type Action =
  | { type: 'pair'; a: number; b: number }
  | { type: 'king'; slot: number }
  | { type: 'draw' }
  | { type: 'redeal' };

export const rowOf = (slot: number) => Math.floor((Math.sqrt(8 * slot + 1) - 1) / 2);
export const colOf = (slot: number) => slot - (rowOf(slot) * (rowOf(slot) + 1)) / 2;
export const slotAt = (row: number, col: number) => (row * (row + 1)) / 2 + col;

/** The two slots resting on `slot` (the row below), or null on the bottom row. */
export function coveringSlots(slot: number): [number, number] | null {
  const row = rowOf(slot);
  if (row >= ROWS - 1) return null;
  const below = slotAt(row + 1, colOf(slot));
  return [below, below + 1];
}

/** Fisher-Yates shuffle of a fresh deck with an injected PRNG (the game passes the kit's seeded `rng`). */
export function shuffleDeck(random: () => number): number[] {
  const deck = Array.from({ length: DECK_SIZE }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Deals the first 28 cards into the pyramid row by row; the other 24 form the stock (first undealt card on top). */
export function newGame(deck: readonly number[]): State {
  return {
    pyramid: deck.slice(0, PYRAMID_SIZE),
    stock: deck.slice(PYRAMID_SIZE).reverse(),
    waste: [],
    discard: [],
    pass: 1,
    score: 0,
    moves: 0,
    streak: 0,
  };
}

export function cardAt(state: State, slot: number): number | null {
  if (slot === WASTE) return state.waste.length ? state.waste[state.waste.length - 1] : null;
  return state.pyramid[slot] ?? null;
}

/** A pyramid card is available when both cards resting on it are gone; the waste top is always available. */
export function isAvailable(state: State, slot: number): boolean {
  if (slot === WASTE) return state.waste.length > 0;
  if (slot < 0 || slot >= PYRAMID_SIZE || state.pyramid[slot] === null) return false;
  const cover = coveringSlots(slot);
  return !cover || (state.pyramid[cover[0]] === null && state.pyramid[cover[1]] === null);
}

export function availableSlots(state: State): number[] {
  const slots: number[] = [];
  for (let slot = 0; slot < PYRAMID_SIZE; slot++) if (isAvailable(state, slot)) slots.push(slot);
  if (state.waste.length) slots.push(WASTE);
  return slots;
}

export function canPair(state: State, a: number, b: number): boolean {
  if (a === b || !isAvailable(state, a) || !isAvailable(state, b)) return false;
  return rankOf(cardAt(state, a)!) + rankOf(cardAt(state, b)!) === TARGET;
}

export const canRemoveKing = (state: State, slot: number) => isAvailable(state, slot) && rankOf(cardAt(state, slot)!) === TARGET;
export const canDraw = (state: State) => state.stock.length > 0;
export const canRedeal = (state: State) => state.stock.length === 0 && state.waste.length > 0 && state.pass < MAX_PASSES;
export const redealsLeft = (state: State) => MAX_PASSES - state.pass;
export const pyramidLeft = (state: State) => state.pyramid.reduce((n, card) => n + (card === null ? 0 : 1), 0);
export const isWon = (state: State) => state.pyramid.every(card => card === null);

/** Number of pyramid rows with no card left. */
export function rowsEmpty(pyramid: ReadonlyArray<number | null>): number {
  let rows = 0;
  for (let row = 0; row < ROWS; row++) {
    let empty = true;
    for (let col = 0; col <= row; col++) if (pyramid[slotAt(row, col)] !== null) { empty = false; break; }
    if (empty) rows++;
  }
  return rows;
}

/** Points for one removal at the given streak, before row bonuses. */
export const removalPoints = (streak: number) => PAIR_POINTS + STREAK_POINTS * Math.min(streak, STREAK_CAP);

function remove(state: State, slots: number[]): State {
  const pyramid = state.pyramid.slice();
  const waste = state.waste.slice();
  const removed: number[] = [];
  for (const slot of slots) {
    if (slot === WASTE) removed.push(waste.pop()!);
    else { removed.push(pyramid[slot]!); pyramid[slot] = null; }
  }
  const rowsCleared = rowsEmpty(pyramid) - rowsEmpty(state.pyramid);
  return {
    ...state,
    pyramid,
    waste,
    discard: [...state.discard, ...removed],
    score: state.score + removalPoints(state.streak) + rowsCleared * ROW_BONUS,
    moves: state.moves + 1,
    streak: state.streak + 1,
  };
}

/** Applies a move, or returns null when the rules forbid it. Never mutates `state`. */
export function apply(state: State, action: Action): State | null {
  switch (action.type) {
    case 'pair':
      return canPair(state, action.a, action.b) ? remove(state, [action.a, action.b]) : null;
    case 'king':
      return canRemoveKing(state, action.slot) ? remove(state, [action.slot]) : null;
    case 'draw':
      if (!canDraw(state)) return null;
      return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, state.stock[state.stock.length - 1]], moves: state.moves + 1, streak: 0 };
    case 'redeal':
      if (!canRedeal(state)) return null;
      return { ...state, stock: state.waste.slice().reverse(), waste: [], pass: state.pass + 1, moves: state.moves + 1, streak: 0 };
  }
}

/** All removals currently allowed, in the order a hint prefers them. */
export function removals(state: State): Action[] {
  const slots = availableSlots(state);
  const pyramidKings: Action[] = [];
  const wasteKings: Action[] = [];
  const pyramidPairs: Action[] = [];
  const wastePairs: Action[] = [];
  for (const slot of slots) {
    if (rankOf(cardAt(state, slot)!) === TARGET) (slot === WASTE ? wasteKings : pyramidKings).push({ type: 'king', slot });
  }
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (!canPair(state, slots[i], slots[j])) continue;
      (slots[j] === WASTE ? wastePairs : pyramidPairs).push({ type: 'pair', a: slots[i], b: slots[j] });
    }
  }
  // Pyramid kings first; the waste king last among removals, since it frees nothing in the pyramid.
  return [...pyramidKings, ...pyramidPairs, ...wastePairs, ...wasteKings];
}

/** The move a hint suggests: a removal, else drawing, else redealing; null when no move is left. */
export function findHint(state: State): Action | null {
  if (isWon(state)) return null;
  const options = removals(state);
  if (options.length) return options[0];
  if (canDraw(state)) return { type: 'draw' };
  if (canRedeal(state)) return { type: 'redeal' };
  return null;
}

export const hasMoves = (state: State) => findHint(state) !== null;
/** No removal, draw or redeal is possible and the pyramid still has cards. */
export const isStuck = (state: State) => !isWon(state) && !hasMoves(state);

export interface FinalScore { base: number; clear: number; redeals: number; time: number; total: number; }

export function finalScore(state: State, seconds: number): FinalScore {
  const won = isWon(state);
  const clear = won ? CLEAR_BONUS : 0;
  const redeals = won ? redealsLeft(state) * REDEAL_BONUS : 0;
  const time = won ? Math.max(0, TIME_BONUS_SECONDS - Math.floor(seconds)) : 0;
  return { base: state.score, clear, redeals, time, total: state.score + clear + redeals + time };
}

/** A game plus its undo history. Each step stores the previous immutable state. */
export interface Session { readonly state: State; readonly history: readonly State[]; }

export const startSession = (state: State): Session => ({ state, history: [] });

export function play(session: Session, action: Action): Session | null {
  const next = apply(session.state, action);
  return next ? { state: next, history: [...session.history, session.state] } : null;
}

export function undo(session: Session): Session | null {
  if (!session.history.length) return null;
  return { state: session.history[session.history.length - 1], history: session.history.slice(0, -1) };
}

export interface Solution { result: 'win' | 'lose' | 'unknown'; /** The winning moves when result is 'win'. */ line: Action[]; }

/**
 * Depth-first search for a winning line, used to pick winnable random deals and to give smart
 * hints. Result is 'win', 'lose' (search space exhausted) or 'unknown' (node budget spent).
 */
export function solve(state: State, budget = 20000): Solution {
  const seen = new Set<string>();
  const line: Action[] = [];
  let nodes = 0;
  let exhausted = true;
  const key = (s: State) => `${s.pyramid.map(c => (c === null ? '.' : 'x')).join('')}|${s.stock.join(',')}|${s.waste.join(',')}|${s.pass}`;
  const step = (s: State, action: Action): boolean => {
    line.push(action);
    if (search(apply(s, action)!)) return true;
    line.pop();
    return false;
  };
  const search = (s: State): boolean => {
    if (isWon(s)) return true;
    if (++nodes > budget) { exhausted = false; return false; }
    const k = key(s);
    if (seen.has(k)) return false;
    seen.add(k);
    const options = removals(s);
    // Removing an available king never costs anything, so it is forced.
    const king = options.find(o => o.type === 'king');
    if (king) return step(s, king);
    for (const option of options) if (step(s, option)) return true;
    if (canDraw(s)) return step(s, { type: 'draw' });
    if (canRedeal(s)) return step(s, { type: 'redeal' });
    return false;
  };
  if (search(state)) return { result: 'win', line };
  return { result: exhausted ? 'lose' : 'unknown', line: [] };
}
