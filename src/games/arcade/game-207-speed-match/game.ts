/**
 * Speed Match Game Logic
 * Game #207 - Fast-paced memory matching game
 */

export interface Card {
  id: number;
  symbol: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface GameState {
  cards: Card[];
  score: number;
  matches: number;
  level: number;
  timeLeft: number;
  status: "idle" | "playing" | "gameOver";
  selectedCards: number[];
  lastResult: "correct" | "wrong" | null;
}

const SYMBOLS = ["★", "♦", "♠", "♣", "♥", "●", "▲", "■", "◆", "✦", "☀", "☽"];
const COLORS = ["#e74c3c", "#3498db", "#27ae60", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c", "#fd79a8"];

const GAME_TIME = 45;
const GRID_SIZES: { cols: number; rows: number }[] = [
  { cols: 4, rows: 3 }, // 12 cards, 6 pairs
  { cols: 4, rows: 4 }, // 16 cards, 8 pairs
  { cols: 5, rows: 4 }, // 20 cards, 10 pairs
  { cols: 6, rows: 4 }, // 24 cards, 12 pairs
  { cols: 6, rows: 5 }, // 30 cards, 15 pairs
];

export class SpeedMatchGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private timerInterval: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      cards: [],
      score: 0,
      matches: 0,
      level: 1,
      timeLeft: GAME_TIME,
      status: "idle",
      selectedCards: [],
      lastResult: null,
    };
  }

  private createCards(level: number): Card[] {
    const gridIndex = Math.min(level - 1, GRID_SIZES.length - 1);
    const { cols, rows } = GRID_SIZES[gridIndex];
    const pairCount = (cols * rows) / 2;

    const pairs: { symbol: string; color: string }[] = [];
    for (let i = 0; i < pairCount; i++) {
      pairs.push({
        symbol: SYMBOLS[i % SYMBOLS.length],
        color: COLORS[i % COLORS.length],
      });
    }

    const cards: Card[] = [];
    pairs.forEach((pair, index) => {
      cards.push({
        id: index * 2,
        symbol: pair.symbol,
        color: pair.color,
        isFlipped: false,
        isMatched: false,
      });
      cards.push({
        id: index * 2 + 1,
        symbol: pair.symbol,
        color: pair.color,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
  }

  public start(): void {
    this.state = {
      cards: this.createCards(1),
      score: 0,
      matches: 0,
      level: 1,
      timeLeft: GAME_TIME,
      status: "playing",
      selectedCards: [],
      lastResult: null,
    };

    this.startTimer();
    this.emitState();
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      if (this.state.status !== "playing") return;

      this.state.timeLeft--;

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }

      this.emitState();
    }, 1000);
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public getGridSize(): { cols: number; rows: number } {
    const gridIndex = Math.min(this.state.level - 1, GRID_SIZES.length - 1);
    return GRID_SIZES[gridIndex];
  }

  public selectCard(cardId: number): boolean {
    if (this.state.status !== "playing") return false;
    if (this.state.selectedCards.length >= 2) return false;

    const card = this.state.cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return false;
    if (this.state.selectedCards.includes(cardId)) return false;

    card.isFlipped = true;
    this.state.selectedCards.push(cardId);
    this.state.lastResult = null;

    if (this.state.selectedCards.length === 2) {
      const [id1, id2] = this.state.selectedCards;
      const card1 = this.state.cards.find((c) => c.id === id1)!;
      const card2 = this.state.cards.find((c) => c.id === id2)!;

      if (card1.symbol === card2.symbol && card1.color === card2.color) {
        // Match found
        card1.isMatched = true;
        card2.isMatched = true;
        this.state.matches++;
        this.state.score += 100 + Math.floor(this.state.timeLeft * 2);
        this.state.lastResult = "correct";
        this.state.selectedCards = [];

        // Check if level complete
        if (this.state.cards.every((c) => c.isMatched)) {
          this.nextLevel();
        }
      } else {
        // No match
        this.state.lastResult = "wrong";
        this.state.score = Math.max(0, this.state.score - 10);

        // Flip cards back after delay
        setTimeout(() => {
          card1.isFlipped = false;
          card2.isFlipped = false;
          this.state.selectedCards = [];
          this.state.lastResult = null;
          this.emitState();
        }, 500);
      }
    }

    this.emitState();
    return true;
  }

  private nextLevel(): void {
    if (this.state.level >= GRID_SIZES.length) {
      // Restart with bonus time
      this.state.level = 1;
      this.state.timeLeft += 30;
    } else {
      this.state.level++;
      this.state.timeLeft += 15;
    }

    this.state.cards = this.createCards(this.state.level);
    this.state.selectedCards = [];
    this.state.lastResult = null;
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
