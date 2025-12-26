/**
 * Blackjack Game Logic
 * Game #454 - Blackjack (21) card game
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export type GamePhase = 'betting' | 'playing' | 'dealer' | 'result';
export type Result = 'win' | 'lose' | 'push' | 'blackjack' | null;

export interface GameState {
  phase: GamePhase;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  playerScore: number;
  dealerScore: number;
  chips: number;
  bet: number;
  result: Result;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  message: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

export function calculateScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    if (card.rank === 'A') aces++;
    score += getCardValue(card.rank);
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  const score = calculateScore(cards);
  return score === 21;
}

export class BlackjackGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: true, id: `${suit}-${rank}-${deck.length}` });
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
      phase: 'betting',
      deck: [],
      playerHand: [],
      dealerHand: [],
      playerScore: 0,
      dealerScore: 0,
      chips: 1000,
      bet: 0,
      result: null,
      canHit: false,
      canStand: false,
      canDouble: false,
      message: '',
    };
  }

  start(): void {
    this.state = {
      ...this.createInitialState(),
      chips: this.state.chips > 0 ? this.state.chips : 1000,
    };
    this.emitState();
  }

  placeBet(amount: number): void {
    if (this.state.phase !== 'betting') return;
    if (amount > this.state.chips) return;
    if (amount < 10) return;

    this.state.bet = amount;
    this.state.chips -= amount;
    this.deal();
  }

  private deal(): void {
    this.state.deck = this.shuffle(this.createDeck());
    this.state.playerHand = [];
    this.state.dealerHand = [];

    // Deal 2 cards each
    this.state.playerHand.push(this.drawCard(true));
    this.state.dealerHand.push(this.drawCard(true));
    this.state.playerHand.push(this.drawCard(true));
    this.state.dealerHand.push(this.drawCard(false)); // Face down

    this.updateScores();
    this.state.phase = 'playing';

    // Check for blackjacks
    if (isBlackjack(this.state.playerHand)) {
      this.state.dealerHand[1].faceUp = true;
      this.updateScores();
      if (isBlackjack(this.state.dealerHand)) {
        this.endRound('push');
      } else {
        this.endRound('blackjack');
      }
      return;
    }

    this.updateActions();
    this.emitState();
  }

  private drawCard(faceUp: boolean): Card {
    const card = this.state.deck.pop()!;
    card.faceUp = faceUp;
    return card;
  }

  private updateScores(): void {
    this.state.playerScore = calculateScore(this.state.playerHand);
    this.state.dealerScore = calculateScore(this.state.dealerHand);
  }

  private updateActions(): void {
    const canAct = this.state.phase === 'playing' && this.state.playerScore < 21;
    this.state.canHit = canAct;
    this.state.canStand = canAct;
    this.state.canDouble = canAct && this.state.playerHand.length === 2 && this.state.chips >= this.state.bet;
  }

  hit(): void {
    if (!this.state.canHit) return;

    this.state.playerHand.push(this.drawCard(true));
    this.updateScores();

    if (this.state.playerScore > 21) {
      this.endRound('lose');
      return;
    }

    if (this.state.playerScore === 21) {
      this.stand();
      return;
    }

    this.state.canDouble = false;
    this.emitState();
  }

  stand(): void {
    if (!this.state.canStand) return;

    this.state.phase = 'dealer';
    this.state.canHit = false;
    this.state.canStand = false;
    this.state.canDouble = false;

    // Reveal dealer's card
    this.state.dealerHand[1].faceUp = true;
    this.updateScores();
    this.emitState();

    // Dealer draws
    this.dealerPlay();
  }

  double(): void {
    if (!this.state.canDouble) return;

    this.state.chips -= this.state.bet;
    this.state.bet *= 2;

    this.state.playerHand.push(this.drawCard(true));
    this.updateScores();

    if (this.state.playerScore > 21) {
      this.endRound('lose');
      return;
    }

    this.stand();
  }

  private dealerPlay(): void {
    const playDealer = () => {
      if (this.state.dealerScore < 17) {
        this.state.dealerHand.push(this.drawCard(true));
        this.updateScores();
        this.emitState();
        setTimeout(playDealer, 500);
      } else {
        this.determineWinner();
      }
    };

    setTimeout(playDealer, 500);
  }

  private determineWinner(): void {
    const playerScore = this.state.playerScore;
    const dealerScore = this.state.dealerScore;

    if (dealerScore > 21) {
      this.endRound('win');
    } else if (playerScore > dealerScore) {
      this.endRound('win');
    } else if (playerScore < dealerScore) {
      this.endRound('lose');
    } else {
      this.endRound('push');
    }
  }

  private endRound(result: Result): void {
    this.state.phase = 'result';
    this.state.result = result;
    this.state.canHit = false;
    this.state.canStand = false;
    this.state.canDouble = false;

    // Reveal dealer's card if hidden
    if (!this.state.dealerHand[1].faceUp) {
      this.state.dealerHand[1].faceUp = true;
      this.updateScores();
    }

    switch (result) {
      case 'blackjack':
        this.state.chips += Math.floor(this.state.bet * 2.5);
        break;
      case 'win':
        this.state.chips += this.state.bet * 2;
        break;
      case 'push':
        this.state.chips += this.state.bet;
        break;
      // lose: bet already deducted
    }

    this.emitState();
  }

  newRound(): void {
    if (this.state.chips < 10) {
      this.state.chips = 1000;
    }
    this.state.phase = 'betting';
    this.state.bet = 0;
    this.state.result = null;
    this.state.playerHand = [];
    this.state.dealerHand = [];
    this.state.playerScore = 0;
    this.state.dealerScore = 0;
    this.state.message = '';
    this.emitState();
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
