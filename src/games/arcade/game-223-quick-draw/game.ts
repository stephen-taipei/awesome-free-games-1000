/**
 * Quick Draw Game Logic
 * Game #223 - Western duel quick draw game
 */

export interface GameState {
  phase: "idle" | "waiting" | "ready" | "draw" | "won" | "lost" | "tooEarly";
  round: number;
  wins: number;
  bestTime: number;
  reactionTime: number;
  drawStartTime: number;
  countdown: number;
}

const MAX_ROUNDS = 5;

export class QuickDrawGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private countdownInterval: number | null = null;
  private drawTimeout: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedBest = localStorage.getItem("quickDrawBest");
    return {
      phase: "idle",
      round: 1,
      wins: 0,
      bestTime: savedBest ? parseInt(savedBest) : 0,
      reactionTime: 0,
      drawStartTime: 0,
      countdown: 3,
    };
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "waiting",
      countdown: 3,
    };
    this.startCountdown();
    this.emitState();
  }

  private startCountdown(): void {
    this.countdownInterval = window.setInterval(() => {
      this.state.countdown--;

      if (this.state.countdown <= 0) {
        this.clearCountdown();
        this.startWaiting();
      }

      this.emitState();
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startWaiting(): void {
    this.state.phase = "ready";
    this.emitState();

    // Random delay between 1-4 seconds
    const delay = 1000 + Math.random() * 3000;

    this.drawTimeout = window.setTimeout(() => {
      this.state.phase = "draw";
      this.state.drawStartTime = performance.now();
      this.emitState();

      // Auto-lose after 1 second
      this.drawTimeout = window.setTimeout(() => {
        if (this.state.phase === "draw") {
          this.state.phase = "lost";
          this.state.reactionTime = 1000;
          this.emitState();
        }
      }, 1000);
    }, delay);
  }

  public shoot(): void {
    if (this.state.phase === "ready") {
      // Shot too early
      this.clearTimeouts();
      this.state.phase = "tooEarly";
      this.emitState();
      return;
    }

    if (this.state.phase === "draw") {
      // Calculate reaction time
      this.clearTimeouts();
      const reactionTime = Math.round(performance.now() - this.state.drawStartTime);
      this.state.reactionTime = reactionTime;

      // Win if reaction time is under 500ms
      if (reactionTime < 500) {
        this.state.phase = "won";
        this.state.wins++;

        // Update best time
        if (this.state.bestTime === 0 || reactionTime < this.state.bestTime) {
          this.state.bestTime = reactionTime;
          localStorage.setItem("quickDrawBest", reactionTime.toString());
        }
      } else {
        this.state.phase = "lost";
      }

      this.emitState();
    }
  }

  public nextRound(): void {
    if (this.state.round >= MAX_ROUNDS) {
      return;
    }

    this.state.round++;
    this.state.phase = "waiting";
    this.state.countdown = 3;
    this.state.reactionTime = 0;
    this.startCountdown();
    this.emitState();
  }

  public isGameComplete(): boolean {
    return this.state.round >= MAX_ROUNDS;
  }

  public getMaxRounds(): number {
    return MAX_ROUNDS;
  }

  private clearTimeouts(): void {
    if (this.drawTimeout) {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = null;
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    this.clearCountdown();
    this.clearTimeouts();
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
