/**
 * FreeCell Game Logic
 * Game #453 - FreeCell card game
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'won';
  freeCells: (Card | null)[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  selectedCard: Card | null;
  selectedFrom: { type: 'freecell' | 'foundation' | 'tableau'; index: number; cardIndex?: number } | null;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getRankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 1;
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function getSuitIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

export class FreeCellGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, id: `${suit}-${rank}` });
      }
    }
    return deck;
  }

  private shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      freeCells: [null, null, null, null],
      foundations: [[], [], [], []],
      tableau: Array.from({ length: 8 }, () => []),
      moves: 0,
      selectedCard: null,
      selectedFrom: null,
    };
  }

  start(): void {
    const deck = this.shuffle(this.createDeck());
    this.state = {
      ...this.createInitialState(),
      phase: 'playing',
    };

    // Deal all 52 cards to 8 columns (7 cards to first 4, 6 cards to last 4)
    let cardIndex = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 8; col++) {
        if (row === 6 && col >= 4) continue;
        this.state.tableau[col].push(deck[cardIndex++]);
      }
    }

    this.emitState();
  }

  selectCard(type: 'freecell' | 'foundation' | 'tableau', index: number, cardIndex?: number): void {
    if (this.state.phase !== 'playing') return;

    // If clicking on foundation, try to place selected card
    if (type === 'foundation') {
      if (this.state.selectedCard) {
        this.tryMoveToFoundation(index);
      }
      return;
    }

    // If clicking on free cell
    if (type === 'freecell') {
      if (this.state.selectedCard) {
        this.tryMoveToFreeCell(index);
      } else {
        const card = this.state.freeCells[index];
        if (card) {
          this.state.selectedCard = card;
          this.state.selectedFrom = { type: 'freecell', index };
        }
      }
      this.emitState();
      return;
    }

    // Clicking on tableau
    const pile = this.state.tableau[index];

    if (this.state.selectedCard) {
      // Try to move selected card(s) to this column
      this.tryMoveToTableau(index);
    } else {
      // Select card from tableau
      if (cardIndex !== undefined && cardIndex >= 0 && cardIndex < pile.length) {
        const cardsToMove = pile.slice(cardIndex);
        if (this.canMoveSequence(cardsToMove)) {
          this.state.selectedCard = pile[cardIndex];
          this.state.selectedFrom = { type: 'tableau', index, cardIndex };
        }
      }
    }

    this.emitState();
  }

  private canMoveSequence(cards: Card[]): boolean {
    if (cards.length === 0) return false;
    if (cards.length === 1) return true;

    // Check if cards form a valid descending alternating color sequence
    for (let i = 1; i < cards.length; i++) {
      const prev = cards[i - 1];
      const curr = cards[i];
      if (isRed(prev.suit) === isRed(curr.suit)) return false;
      if (getRankValue(prev.rank) !== getRankValue(curr.rank) + 1) return false;
    }

    // Check if we have enough free cells and empty columns to move
    const emptyFreeCells = this.state.freeCells.filter(c => c === null).length;
    const emptyColumns = this.state.tableau.filter(p => p.length === 0).length;
    const maxMovable = (emptyFreeCells + 1) * Math.pow(2, emptyColumns);

    return cards.length <= maxMovable;
  }

  private tryMoveToFreeCell(index: number): void {
    if (this.state.freeCells[index] !== null) {
      this.clearSelection();
      return;
    }

    if (!this.state.selectedFrom) return;

    // Can only move single card to free cell
    if (this.state.selectedFrom.type === 'tableau') {
      const pile = this.state.tableau[this.state.selectedFrom.index];
      const cardIndex = this.state.selectedFrom.cardIndex!;
      if (cardIndex !== pile.length - 1) {
        this.clearSelection();
        return;
      }
      this.state.freeCells[index] = pile.pop()!;
    } else if (this.state.selectedFrom.type === 'freecell') {
      this.state.freeCells[index] = this.state.freeCells[this.state.selectedFrom.index];
      this.state.freeCells[this.state.selectedFrom.index] = null;
    }

    this.state.moves++;
    this.clearSelection();
  }

  private tryMoveToFoundation(index: number): void {
    if (!this.state.selectedCard || !this.state.selectedFrom) return;

    const foundation = this.state.foundations[index];
    const card = this.state.selectedCard;

    // Check suit matches foundation
    if (foundation.length > 0) {
      if (foundation[0].suit !== card.suit) {
        this.clearSelection();
        return;
      }
      if (getRankValue(card.rank) !== foundation.length + 1) {
        this.clearSelection();
        return;
      }
    } else {
      // Empty foundation - must be Ace
      if (card.rank !== 'A') {
        this.clearSelection();
        return;
      }
      // Assign suit to this foundation
      if (getSuitIndex(card.suit) !== index) {
        // Try to find correct foundation
        const correctIndex = getSuitIndex(card.suit);
        if (this.state.foundations[correctIndex].length === 0) {
          this.tryMoveToFoundation(correctIndex);
          return;
        }
        this.clearSelection();
        return;
      }
    }

    // Can only move single card to foundation
    if (this.state.selectedFrom.type === 'tableau') {
      const pile = this.state.tableau[this.state.selectedFrom.index];
      const cardIndex = this.state.selectedFrom.cardIndex!;
      if (cardIndex !== pile.length - 1) {
        this.clearSelection();
        return;
      }
      foundation.push(pile.pop()!);
    } else if (this.state.selectedFrom.type === 'freecell') {
      foundation.push(this.state.freeCells[this.state.selectedFrom.index]!);
      this.state.freeCells[this.state.selectedFrom.index] = null;
    }

    this.state.moves++;
    this.clearSelection();
    this.checkWin();
  }

  private tryMoveToTableau(targetIndex: number): void {
    if (!this.state.selectedCard || !this.state.selectedFrom) return;

    const targetPile = this.state.tableau[targetIndex];
    const card = this.state.selectedCard;

    // Check if move is valid
    if (targetPile.length === 0) {
      // Can move any card to empty column
    } else {
      const topCard = targetPile[targetPile.length - 1];
      // Must be alternating color and one rank lower
      if (isRed(topCard.suit) === isRed(card.suit)) {
        this.clearSelection();
        return;
      }
      if (getRankValue(card.rank) !== getRankValue(topCard.rank) - 1) {
        this.clearSelection();
        return;
      }
    }

    // Execute move
    if (this.state.selectedFrom.type === 'tableau') {
      const sourcePile = this.state.tableau[this.state.selectedFrom.index];
      const cardIndex = this.state.selectedFrom.cardIndex!;
      const cardsToMove = sourcePile.splice(cardIndex);
      targetPile.push(...cardsToMove);
    } else if (this.state.selectedFrom.type === 'freecell') {
      targetPile.push(this.state.freeCells[this.state.selectedFrom.index]!);
      this.state.freeCells[this.state.selectedFrom.index] = null;
    }

    this.state.moves++;
    this.clearSelection();
  }

  autoMoveToFoundation(): boolean {
    // Try to move cards automatically to foundations
    let moved = false;

    // Check free cells
    for (let i = 0; i < 4; i++) {
      const card = this.state.freeCells[i];
      if (card && this.canAutoMove(card)) {
        const foundationIndex = getSuitIndex(card.suit);
        this.state.foundations[foundationIndex].push(card);
        this.state.freeCells[i] = null;
        this.state.moves++;
        moved = true;
      }
    }

    // Check tableau
    for (let col = 0; col < 8; col++) {
      const pile = this.state.tableau[col];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        if (this.canAutoMove(card)) {
          const foundationIndex = getSuitIndex(card.suit);
          this.state.foundations[foundationIndex].push(pile.pop()!);
          this.state.moves++;
          moved = true;
        }
      }
    }

    if (moved) {
      this.checkWin();
      this.emitState();
    }

    return moved;
  }

  private canAutoMove(card: Card): boolean {
    const foundationIndex = getSuitIndex(card.suit);
    const foundation = this.state.foundations[foundationIndex];
    const expectedRank = foundation.length + 1;

    if (getRankValue(card.rank) !== expectedRank) return false;

    // Only auto-move if all lower cards of opposite color are on foundations
    if (expectedRank <= 2) return true;

    const minOpposite = Math.min(
      ...SUITS.filter(s => isRed(s) !== isRed(card.suit))
        .map(s => this.state.foundations[getSuitIndex(s)].length)
    );

    return expectedRank <= minOpposite + 2;
  }

  private clearSelection(): void {
    this.state.selectedCard = null;
    this.state.selectedFrom = null;
  }

  private checkWin(): void {
    const total = this.state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (total === 52) {
      this.state.phase = 'won';
    }
  }

  getState(): GameState {
    return this.state;
  }

  destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
