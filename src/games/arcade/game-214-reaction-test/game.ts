/**
 * Reaction Test Game Logic
 * Game #214 - Test your reaction speed
 */

export interface GameState {
  phase: "idle" | "waiting" | "ready" | "clicked" | "tooSoon" | "complete";
  round: number;
  totalRounds: number;
  times: number[];
  startTime: number;
  lastTime: number;
}

const TOTAL_ROUNDS = 5;

export class ReactionTestGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private waitTimeout: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      times: [],
      startTime: 0,
      lastTime: 0,
    };
  }

  public start(): void {
    this.state = {
      phase: "waiting",
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      times: [],
      startTime: 0,
      lastTime: 0,
    };

    this.startWaiting();
    this.emitState();
  }

  private startWaiting(): void {
    this.state.phase = "waiting";
    this.emitState();

    // Random delay between 1-4 seconds
    const delay = 1000 + Math.random() * 3000;

    this.waitTimeout = window.setTimeout(() => {
      this.state.phase = "ready";
      this.state.startTime = performance.now();
      this.emitState();
    }, delay);
  }

  public click(): void {
    if (this.state.phase === "waiting") {
      // Too soon!
      if (this.waitTimeout) {
        clearTimeout(this.waitTimeout);
        this.waitTimeout = null;
      }
      this.state.phase = "tooSoon";
      this.emitState();

      // Restart this round after delay
      setTimeout(() => {
        this.startWaiting();
      }, 1500);
    } else if (this.state.phase === "ready") {
      // Calculate reaction time
      const reactionTime = Math.round(performance.now() - this.state.startTime);
      this.state.lastTime = reactionTime;
      this.state.times.push(reactionTime);
      this.state.phase = "clicked";
      this.emitState();

      // Move to next round or complete
      setTimeout(() => {
        if (this.state.round >= this.state.totalRounds) {
          this.state.phase = "complete";
          this.emitState();
        } else {
          this.state.round++;
          this.startWaiting();
        }
      }, 1500);
    }
  }

  public getAverageTime(): number {
    if (this.state.times.length === 0) return 0;
    const sum = this.state.times.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.state.times.length);
  }

  public getBestTime(): number {
    if (this.state.times.length === 0) return 0;
    return Math.min(...this.state.times);
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.waitTimeout) {
      clearTimeout(this.waitTimeout);
      this.waitTimeout = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
