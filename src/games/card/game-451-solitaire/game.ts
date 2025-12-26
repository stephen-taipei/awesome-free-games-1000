/**
 * Solitaire (Klondike) Game Logic
 * Game #451 - Classic single-player card game
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export interface GameState {
  phase: 'playing' | 'won';
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  time: number;
  score: number;
  selectedCards: Card[];
  selectedSource: { type: 'waste' | 'foundation' | 'tableau'; index: number } | null;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function getRankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 1;
}

export class SolitaireGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private timerInterval: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: false, id: `${suit}-${rank}` });
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
      phase: 'playing',
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      moves: 0,
      time: 0,
      score: 0,
      selectedCards: [],
      selectedSource: null,
    };
  }

  start(): void {
    const deck = this.shuffle(this.createDeck());
    this.state = this.createInitialState();

    // Deal to tableau
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[cardIndex++];
        card.faceUp = row === col;
        this.state.tableau[col].push(card);
      }
    }

    // Rest goes to stock
    this.state.stock = deck.slice(cardIndex);

    // Start timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.state.phase === 'playing') {
        this.state.time++;
        this.emitState();
      }
    }, 1000);

    this.emitState();
  }

  drawFromStock(): void {
    if (this.state.phase !== 'playing') return;
    this.clearSelection();

    if (this.state.stock.length === 0) {
      // Reset stock from waste
      this.state.stock = this.state.waste.reverse().map(c => ({ ...c, faceUp: false }));
      this.state.waste = [];
      this.state.score = Math.max(0, this.state.score - 100);
    } else {
      // Draw 1 card (classic mode)
      const card = this.state.stock.pop()!;
      card.faceUp = true;
      this.state.waste.push(card);
    }

    this.state.moves++;
    this.emitState();
  }

  selectCard(source: 'waste' | 'foundation' | 'tableau', index: number, cardIndex?: number): void {
    if (this.state.phase !== 'playing') return;

    if (source === 'waste') {
      if (this.state.waste.length === 0) return;
      const card = this.state.waste[this.state.waste.length - 1];
      if (this.state.selectedCards.length > 0 && this.state.selectedCards[0].id === card.id) {
        this.clearSelection();
      } else {
        this.state.selectedCards = [card];
        this.state.selectedSource = { type: 'waste', index: 0 };
      }
    } else if (source === 'foundation') {
      if (this.state.selectedCards.length > 0) {
        this.tryMoveToFoundation(index);
      } else if (this.state.foundations[index].length > 0) {
        const card = this.state.foundations[index][this.state.foundations[index].length - 1];
        this.state.selectedCards = [card];
        this.state.selectedSource = { type: 'foundation', index };
      }
    } else if (source === 'tableau') {
      if (this.state.selectedCards.length > 0) {
        this.tryMoveToTableau(index);
      } else if (cardIndex !== undefined && this.state.tableau[index].length > 0) {
        const pile = this.state.tableau[index];
        if (cardIndex >= 0 && cardIndex < pile.length && pile[cardIndex].faceUp) {
          this.state.selectedCards = pile.slice(cardIndex);
          this.state.selectedSource = { type: 'tableau', index };
        }
      }
    }

    this.emitState();
  }

  private tryMoveToFoundation(foundationIndex: number): void {
    if (this.state.selectedCards.length !== 1) {
      this.clearSelection();
      return;
    }

    const card = this.state.selectedCards[0];
    const foundation = this.state.foundations[foundationIndex];

    if (this.canPlaceOnFoundation(card, foundation)) {
      this.moveToFoundation(foundationIndex);
    } else {
      this.clearSelection();
    }
  }

  private tryMoveToTableau(tableauIndex: number): void {
    const cards = this.state.selectedCards;
    const pile = this.state.tableau[tableauIndex];

    if (this.canPlaceOnTableau(cards[0], pile)) {
      this.moveToTableau(tableauIndex);
    } else {
      this.clearSelection();
    }
  }

  private canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
    if (foundation.length === 0) {
      return card.rank === 'A';
    }
    const top = foundation[foundation.length - 1];
    return card.suit === top.suit && getRankValue(card.rank) === getRankValue(top.rank) + 1;
  }

  private canPlaceOnTableau(card: Card, pile: Card[]): boolean {
    if (pile.length === 0) {
      return card.rank === 'K';
    }
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return isRed(card.suit) !== isRed(top.suit) && getRankValue(card.rank) === getRankValue(top.rank) - 1;
  }

  private moveToFoundation(foundationIndex: number): void {
    if (!this.state.selectedSource) return;

    const card = this.state.selectedCards[0];
    const source = this.state.selectedSource;

    if (source.type === 'waste') {
      this.state.waste.pop();
    } else if (source.type === 'tableau') {
      this.state.tableau[source.index].pop();
      this.flipTopCard(source.index);
    } else if (source.type === 'foundation') {
      this.state.foundations[source.index].pop();
    }

    this.state.foundations[foundationIndex].push(card);
    this.state.moves++;
    this.state.score += 10;

    this.clearSelection();
    this.checkWin();
  }

  private moveToTableau(tableauIndex: number): void {
    if (!this.state.selectedSource) return;

    const cards = this.state.selectedCards;
    const source = this.state.selectedSource;

    if (source.type === 'waste') {
      this.state.waste.pop();
    } else if (source.type === 'tableau') {
      this.state.tableau[source.index] = this.state.tableau[source.index].slice(0, -cards.length);
      this.flipTopCard(source.index);
    } else if (source.type === 'foundation') {
      this.state.foundations[source.index].pop();
      this.state.score -= 15;
    }

    this.state.tableau[tableauIndex].push(...cards);
    this.state.moves++;
    if (source.type === 'waste') {
      this.state.score += 5;
    }

    this.clearSelection();
  }

  private flipTopCard(tableauIndex: number): void {
    const pile = this.state.tableau[tableauIndex];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
      this.state.score += 5;
    }
  }

  autoMoveToFoundation(): boolean {
    // Try to auto-move cards to foundation
    // Check waste
    if (this.state.waste.length > 0) {
      const card = this.state.waste[this.state.waste.length - 1];
      for (let i = 0; i < 4; i++) {
        if (this.canPlaceOnFoundation(card, this.state.foundations[i])) {
          this.state.selectedCards = [card];
          this.state.selectedSource = { type: 'waste', index: 0 };
          this.moveToFoundation(i);
          return true;
        }
      }
    }

    // Check tableau
    for (let col = 0; col < 7; col++) {
      const pile = this.state.tableau[col];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        if (card.faceUp) {
          for (let i = 0; i < 4; i++) {
            if (this.canPlaceOnFoundation(card, this.state.foundations[i])) {
              this.state.selectedCards = [card];
              this.state.selectedSource = { type: 'tableau', index: col };
              this.moveToFoundation(i);
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private clearSelection(): void {
    this.state.selectedCards = [];
    this.state.selectedSource = null;
  }

  private checkWin(): void {
    const totalInFoundations = this.state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalInFoundations === 52) {
      this.state.phase = 'won';
      this.state.score += Math.max(0, 700000 / this.state.time);
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
    this.emitState();
  }

  getState(): GameState {
    return this.state;
  }

  destroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
