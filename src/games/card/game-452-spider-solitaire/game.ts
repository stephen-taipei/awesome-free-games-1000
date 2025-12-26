/**
 * Spider Solitaire Game Logic
 * Game #452 - Spider Solitaire card game
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
  tableau: Card[][];
  completed: number;
  moves: number;
  score: number;
  selectedCards: Card[];
  selectedColumn: number;
  difficulty: 1 | 2 | 4; // Number of suits
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getRankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 1;
}

export class SpiderSolitaireGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createDeck(numSuits: 1 | 2 | 4): Card[] {
    const deck: Card[] = [];
    const suitsToUse = SUITS.slice(0, numSuits);
    const decksNeeded = 8 / numSuits;

    for (let d = 0; d < decksNeeded; d++) {
      for (const suit of suitsToUse) {
        for (const rank of RANKS) {
          deck.push({ suit, rank, faceUp: false, id: `${suit}-${rank}-${d}-${deck.length}` });
        }
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
      tableau: Array.from({ length: 10 }, () => []),
      completed: 0,
      moves: 0,
      score: 500,
      selectedCards: [],
      selectedColumn: -1,
      difficulty: 1,
    };
  }

  start(difficulty: 1 | 2 | 4 = 1): void {
    const deck = this.shuffle(this.createDeck(difficulty));
    this.state = {
      ...this.createInitialState(),
      difficulty,
    };

    // Deal 54 cards to tableau (6 to first 4 columns, 5 to rest)
    let cardIndex = 0;
    for (let col = 0; col < 10; col++) {
      const numCards = col < 4 ? 6 : 5;
      for (let row = 0; row < numCards; row++) {
        const card = deck[cardIndex++];
        card.faceUp = row === numCards - 1;
        this.state.tableau[col].push(card);
      }
    }

    // Rest goes to stock (50 cards for 5 deals)
    this.state.stock = deck.slice(cardIndex);
    this.emitState();
  }

  dealFromStock(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.stock.length === 0) return;

    // Check if all columns have at least one card
    for (let col = 0; col < 10; col++) {
      if (this.state.tableau[col].length === 0) {
        return; // Can't deal if any column is empty
      }
    }

    this.clearSelection();

    // Deal one card to each column
    for (let col = 0; col < 10; col++) {
      if (this.state.stock.length > 0) {
        const card = this.state.stock.pop()!;
        card.faceUp = true;
        this.state.tableau[col].push(card);
      }
    }

    this.state.moves++;
    this.checkForCompleteSequences();
    this.emitState();
  }

  selectCards(column: number, cardIndex: number): void {
    if (this.state.phase !== 'playing') return;

    const pile = this.state.tableau[column];
    if (cardIndex < 0 || cardIndex >= pile.length) {
      this.clearSelection();
      this.emitState();
      return;
    }

    const card = pile[cardIndex];
    if (!card.faceUp) {
      this.clearSelection();
      this.emitState();
      return;
    }

    // Check if cards form a valid sequence (same suit, descending)
    const cardsToSelect = pile.slice(cardIndex);
    if (!this.isValidSequence(cardsToSelect)) {
      this.clearSelection();
      this.emitState();
      return;
    }

    // If clicking same selection, try to move
    if (this.state.selectedColumn === column && this.state.selectedCards.length > 0) {
      this.clearSelection();
      this.emitState();
      return;
    }

    // If we have a selection, try to move to this column
    if (this.state.selectedCards.length > 0) {
      this.tryMove(column);
      return;
    }

    // Make new selection
    this.state.selectedCards = cardsToSelect;
    this.state.selectedColumn = column;
    this.emitState();
  }

  tryMove(targetColumn: number): void {
    if (this.state.selectedColumn === -1) return;
    if (this.state.selectedColumn === targetColumn) {
      this.clearSelection();
      this.emitState();
      return;
    }

    const targetPile = this.state.tableau[targetColumn];
    const movingCards = this.state.selectedCards;

    // Check if move is valid
    if (targetPile.length === 0) {
      // Can always move to empty column
      this.executeMove(targetColumn);
    } else {
      const topCard = targetPile[targetPile.length - 1];
      const bottomMovingCard = movingCards[0];

      // Check if it's one rank lower
      if (getRankValue(bottomMovingCard.rank) === getRankValue(topCard.rank) - 1) {
        this.executeMove(targetColumn);
      } else {
        this.clearSelection();
      }
    }
    this.emitState();
  }

  private executeMove(targetColumn: number): void {
    const sourcePile = this.state.tableau[this.state.selectedColumn];
    const targetPile = this.state.tableau[targetColumn];
    const numCards = this.state.selectedCards.length;

    // Remove cards from source
    sourcePile.splice(-numCards, numCards);

    // Flip new top card
    if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
      sourcePile[sourcePile.length - 1].faceUp = true;
    }

    // Add to target
    targetPile.push(...this.state.selectedCards);

    this.state.moves++;
    this.state.score--;

    this.clearSelection();
    this.checkForCompleteSequences();
  }

  private isValidSequence(cards: Card[]): boolean {
    if (cards.length === 0) return false;

    for (let i = 1; i < cards.length; i++) {
      const prev = cards[i - 1];
      const curr = cards[i];

      // Must be same suit and descending rank
      if (prev.suit !== curr.suit) return false;
      if (getRankValue(prev.rank) !== getRankValue(curr.rank) + 1) return false;
    }
    return true;
  }

  private checkForCompleteSequences(): void {
    for (let col = 0; col < 10; col++) {
      const pile = this.state.tableau[col];
      if (pile.length < 13) continue;

      // Check for K to A sequence of same suit at the end
      const last13 = pile.slice(-13);
      if (last13[0].rank !== 'K') continue;

      let valid = true;
      const suit = last13[0].suit;
      for (let i = 0; i < 13; i++) {
        if (last13[i].suit !== suit || getRankValue(last13[i].rank) !== 13 - i) {
          valid = false;
          break;
        }
      }

      if (valid) {
        // Remove completed sequence
        pile.splice(-13, 13);
        this.state.completed++;
        this.state.score += 100;

        // Flip new top card
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1].faceUp = true;
        }

        // Check for win
        if (this.state.completed === 8) {
          this.state.phase = 'won';
        }
      }
    }
  }

  private clearSelection(): void {
    this.state.selectedCards = [];
    this.state.selectedColumn = -1;
  }

  canDeal(): boolean {
    if (this.state.stock.length === 0) return false;
    for (let col = 0; col < 10; col++) {
      if (this.state.tableau[col].length === 0) return false;
    }
    return true;
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
