/**
 * Texas Hold'em Game Logic
 * Game #455 - Texas Hold'em poker game (vs AI)
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'waiting';
export type HandRank = 'high-card' | 'pair' | 'two-pair' | 'three-kind' | 'straight' | 'flush' | 'full-house' | 'four-kind' | 'straight-flush' | 'royal-flush';

export interface Player {
  name: string;
  chips: number;
  hand: Card[];
  bet: number;
  folded: boolean;
  isAI: boolean;
  isDealer: boolean;
}

export interface GameState {
  phase: GamePhase;
  deck: Card[];
  communityCards: Card[];
  players: Player[];
  pot: number;
  currentBet: number;
  currentPlayer: number;
  smallBlind: number;
  bigBlind: number;
  winner: number | null;
  winningHand: string;
  message: string;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  callAmount: number;
  minRaise: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function getRankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2;
}

export class TexasHoldemGame {
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
      phase: 'waiting',
      deck: [],
      communityCards: [],
      players: [
        { name: 'You', chips: 1000, hand: [], bet: 0, folded: false, isAI: false, isDealer: true },
        { name: 'AI', chips: 1000, hand: [], bet: 0, folded: false, isAI: true, isDealer: false },
      ],
      pot: 0,
      currentBet: 0,
      currentPlayer: 0,
      smallBlind: 10,
      bigBlind: 20,
      winner: null,
      winningHand: '',
      message: '',
      canCheck: false,
      canCall: false,
      canRaise: false,
      canFold: false,
      callAmount: 0,
      minRaise: 20,
    };
  }

  start(): void {
    this.state = {
      ...this.createInitialState(),
      players: this.state.players.map(p => ({
        ...p,
        chips: p.chips > 0 ? p.chips : 1000,
        hand: [],
        bet: 0,
        folded: false,
      })),
    };
    this.startHand();
  }

  private startHand(): void {
    this.state.deck = this.shuffle(this.createDeck());
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.currentBet = 0;
    this.state.winner = null;
    this.state.winningHand = '';
    this.state.message = '';

    // Reset players
    this.state.players.forEach(p => {
      p.hand = [];
      p.bet = 0;
      p.folded = false;
    });

    // Rotate dealer
    const dealerIndex = this.state.players.findIndex(p => p.isDealer);
    this.state.players[dealerIndex].isDealer = false;
    this.state.players[(dealerIndex + 1) % 2].isDealer = true;

    // Post blinds (in heads-up, dealer posts small blind)
    const sbIndex = this.state.players.findIndex(p => p.isDealer);
    const bbIndex = (sbIndex + 1) % 2;

    this.state.players[sbIndex].chips -= this.state.smallBlind;
    this.state.players[sbIndex].bet = this.state.smallBlind;
    this.state.players[bbIndex].chips -= this.state.bigBlind;
    this.state.players[bbIndex].bet = this.state.bigBlind;

    this.state.pot = this.state.smallBlind + this.state.bigBlind;
    this.state.currentBet = this.state.bigBlind;

    // Deal hole cards
    for (let i = 0; i < 2; i++) {
      this.state.players.forEach(p => {
        p.hand.push(this.state.deck.pop()!);
      });
    }

    this.state.phase = 'preflop';
    this.state.currentPlayer = sbIndex; // Small blind acts first preflop in heads-up
    this.updateActions();
    this.emitState();

    if (this.state.players[this.state.currentPlayer].isAI) {
      setTimeout(() => this.aiAction(), 1000);
    }
  }

  private updateActions(): void {
    const player = this.state.players[this.state.currentPlayer];
    const toCall = this.state.currentBet - player.bet;

    this.state.callAmount = toCall;
    this.state.canCheck = toCall === 0;
    this.state.canCall = toCall > 0 && player.chips >= toCall;
    this.state.canRaise = player.chips > toCall;
    this.state.canFold = true;
    this.state.minRaise = Math.min(this.state.bigBlind, player.chips - toCall);
  }

  check(): void {
    if (!this.state.canCheck) return;
    this.nextAction();
  }

  call(): void {
    if (!this.state.canCall) return;
    const player = this.state.players[this.state.currentPlayer];
    const toCall = this.state.currentBet - player.bet;
    player.chips -= toCall;
    player.bet += toCall;
    this.state.pot += toCall;
    this.nextAction();
  }

  raise(amount: number): void {
    if (!this.state.canRaise) return;
    const player = this.state.players[this.state.currentPlayer];
    const toCall = this.state.currentBet - player.bet;
    const totalBet = toCall + amount;

    if (totalBet > player.chips) return;

    player.chips -= totalBet;
    player.bet += totalBet;
    this.state.pot += totalBet;
    this.state.currentBet = player.bet;

    this.nextAction();
  }

  fold(): void {
    if (!this.state.canFold) return;
    const player = this.state.players[this.state.currentPlayer];
    player.folded = true;

    // Other player wins
    const winner = this.state.players.findIndex(p => !p.folded);
    this.endHand(winner, 'fold');
  }

  allIn(): void {
    const player = this.state.players[this.state.currentPlayer];
    const amount = player.chips;
    player.bet += amount;
    this.state.pot += amount;
    player.chips = 0;
    if (player.bet > this.state.currentBet) {
      this.state.currentBet = player.bet;
    }
    this.nextAction();
  }

  private nextAction(): void {
    // Check if betting round is complete
    const activePlayers = this.state.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      const winner = this.state.players.findIndex(p => !p.folded);
      this.endHand(winner, 'fold');
      return;
    }

    const allBetsEqual = activePlayers.every(p => p.bet === this.state.currentBet || p.chips === 0);
    const allActed = this.state.currentPlayer !== (this.state.players.findIndex(p => p.isDealer) + 1) % 2;

    if (allBetsEqual && allActed) {
      this.nextPhase();
      return;
    }

    // Move to next player
    this.state.currentPlayer = (this.state.currentPlayer + 1) % 2;
    while (this.state.players[this.state.currentPlayer].folded) {
      this.state.currentPlayer = (this.state.currentPlayer + 1) % 2;
    }

    this.updateActions();
    this.emitState();

    if (this.state.players[this.state.currentPlayer].isAI) {
      setTimeout(() => this.aiAction(), 1000);
    }
  }

  private nextPhase(): void {
    // Reset bets for new round
    this.state.players.forEach(p => p.bet = 0);
    this.state.currentBet = 0;

    switch (this.state.phase) {
      case 'preflop':
        this.state.phase = 'flop';
        this.state.communityCards.push(this.state.deck.pop()!);
        this.state.communityCards.push(this.state.deck.pop()!);
        this.state.communityCards.push(this.state.deck.pop()!);
        break;
      case 'flop':
        this.state.phase = 'turn';
        this.state.communityCards.push(this.state.deck.pop()!);
        break;
      case 'turn':
        this.state.phase = 'river';
        this.state.communityCards.push(this.state.deck.pop()!);
        break;
      case 'river':
        this.showdown();
        return;
    }

    // In heads-up, non-dealer acts first post-flop
    this.state.currentPlayer = this.state.players.findIndex(p => !p.isDealer);
    this.updateActions();
    this.emitState();

    if (this.state.players[this.state.currentPlayer].isAI) {
      setTimeout(() => this.aiAction(), 1000);
    }
  }

  private aiAction(): void {
    const player = this.state.players[this.state.currentPlayer];
    if (!player.isAI) return;

    const handStrength = this.evaluateHandStrength(player.hand);
    const toCall = this.state.currentBet - player.bet;

    // Simple AI logic
    if (toCall === 0) {
      // Can check
      if (handStrength > 0.6 && Math.random() > 0.5) {
        this.raise(this.state.bigBlind * 2);
      } else {
        this.check();
      }
    } else {
      // Must call or fold
      if (handStrength > 0.7) {
        if (Math.random() > 0.5 && this.state.canRaise) {
          this.raise(Math.min(this.state.bigBlind * 2, player.chips - toCall));
        } else {
          this.call();
        }
      } else if (handStrength > 0.4) {
        this.call();
      } else if (handStrength > 0.2 && toCall <= this.state.bigBlind * 2) {
        this.call();
      } else {
        this.fold();
      }
    }
  }

  private evaluateHandStrength(hand: Card[]): number {
    // Simple hand strength evaluation (0-1)
    const allCards = [...hand, ...this.state.communityCards];
    const ranks = allCards.map(c => getRankValue(c.rank));
    const suits = allCards.map(c => c.suit);

    // Check for pairs
    const rankCounts: { [key: number]: number } = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts);

    if (counts.includes(4)) return 0.95;
    if (counts.includes(3) && counts.includes(2)) return 0.9;

    // Check for flush
    const suitCounts: { [key: string]: number } = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    const hasFlush = Object.values(suitCounts).some(c => c >= 5);
    if (hasFlush) return 0.85;

    // Check for straight
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    let hasStright = false;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) hasStright = true;
    }
    if (hasStright) return 0.8;

    if (counts.includes(3)) return 0.7;
    if (counts.filter(c => c === 2).length >= 2) return 0.6;
    if (counts.includes(2)) return 0.5;

    // High card strength
    const maxRank = Math.max(...ranks);
    return 0.2 + (maxRank / 14) * 0.3;
  }

  private showdown(): void {
    this.state.phase = 'showdown';

    const player0Score = this.evaluateFinalHand(0);
    const player1Score = this.evaluateFinalHand(1);

    let winner: number;
    if (player0Score.score > player1Score.score) {
      winner = 0;
    } else if (player1Score.score > player0Score.score) {
      winner = 1;
    } else {
      // Tie - split pot
      this.state.players[0].chips += this.state.pot / 2;
      this.state.players[1].chips += this.state.pot / 2;
      this.state.message = 'Tie!';
      this.state.winner = null;
      this.emitState();
      return;
    }

    this.endHand(winner, player0Score.score > player1Score.score ? player0Score.name : player1Score.name);
  }

  private evaluateFinalHand(playerIndex: number): { score: number; name: string } {
    const player = this.state.players[playerIndex];
    const allCards = [...player.hand, ...this.state.communityCards];

    // Simple scoring (higher is better)
    const ranks = allCards.map(c => getRankValue(c.rank));
    const suits = allCards.map(c => c.suit);

    const rankCounts: { [key: number]: number } = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    const suitCounts: { [key: string]: number } = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    const hasFlush = Object.values(suitCounts).some(c => c >= 5);

    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    let hasStraight = false;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) hasStraight = true;
    }
    // Check A-2-3-4-5
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
      hasStraight = true;
    }

    const maxRank = Math.max(...ranks);

    if (hasStraight && hasFlush && maxRank === 14) return { score: 1000, name: 'Royal Flush' };
    if (hasStraight && hasFlush) return { score: 900, name: 'Straight Flush' };
    if (counts[0] === 4) return { score: 800 + maxRank, name: 'Four of a Kind' };
    if (counts[0] === 3 && counts[1] === 2) return { score: 700 + maxRank, name: 'Full House' };
    if (hasFlush) return { score: 600 + maxRank, name: 'Flush' };
    if (hasStraight) return { score: 500 + maxRank, name: 'Straight' };
    if (counts[0] === 3) return { score: 400 + maxRank, name: 'Three of a Kind' };
    if (counts[0] === 2 && counts[1] === 2) return { score: 300 + maxRank, name: 'Two Pair' };
    if (counts[0] === 2) return { score: 200 + maxRank, name: 'Pair' };
    return { score: 100 + maxRank, name: 'High Card' };
  }

  private endHand(winner: number, reason: string): void {
    this.state.phase = 'showdown';
    this.state.winner = winner;
    this.state.winningHand = reason;
    this.state.players[winner].chips += this.state.pot;
    this.state.message = `${this.state.players[winner].name} wins with ${reason}!`;

    this.state.canCheck = false;
    this.state.canCall = false;
    this.state.canRaise = false;
    this.state.canFold = false;

    this.emitState();
  }

  newHand(): void {
    if (this.state.players.some(p => p.chips <= 0)) {
      // Reset chips if someone is broke
      this.state.players.forEach(p => {
        if (p.chips <= 0) p.chips = 1000;
      });
    }
    this.startHand();
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
