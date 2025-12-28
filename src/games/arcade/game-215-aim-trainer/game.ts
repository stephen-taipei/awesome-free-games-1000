/**
 * Aim Trainer Game Logic
 * Game #215 - Click targets as fast as you can
 */

export interface Target {
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
  color: string;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  hits: number;
  misses: number;
  target: Target | null;
  reactionTimes: number[];
  timeLeft: number;
  totalTime: number;
}

export interface PendingEvents {
  spawn: { x: number; y: number; radius: number }[];
  hit: { x: number; y: number; reactionTime: number; score: number }[];
  miss: { isTarget: boolean }[];
  start: boolean;
  gameOver: { score: number; hits: number; misses: number; accuracy: number; avgTime: number }[];
}

const GAME_DURATION = 30; // seconds
const TARGET_LIFETIME = 1500; // ms - target disappears if not clicked
const MIN_RADIUS = 25;
const MAX_RADIUS = 45;
const PADDING = 60;

const TARGET_COLORS = [
  "#e74c3c",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#ff9800",
];

export class AimTrainerGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameInterval: number | null = null;
  private targetTimeout: number | null = null;
  private canvasWidth: number = 450;
  private canvasHeight: number = 400;

  public pendingEvents: PendingEvents = {
    spawn: [],
    hit: [],
    miss: [],
    start: false,
    gameOver: [],
  };

  constructor() {
    this.state = this.createInitialState();
  }

  public clearPendingEvents(): void {
    this.pendingEvents = {
      spawn: [],
      hit: [],
      miss: [],
      start: false,
      gameOver: [],
    };
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      score: 0,
      hits: 0,
      misses: 0,
      target: null,
      reactionTimes: [],
      timeLeft: GAME_DURATION,
      totalTime: GAME_DURATION,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };

    this.pendingEvents.start = true;
    this.spawnTarget();
    this.startTimer();
    this.emitState();
  }

  private startTimer(): void {
    this.gameInterval = window.setInterval(() => {
      this.state.timeLeft--;

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }

      this.emitState();
    }, 1000);
  }

  private spawnTarget(): void {
    if (this.state.phase !== "playing") return;

    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const x = PADDING + Math.random() * (this.canvasWidth - PADDING * 2);
    const y = PADDING + Math.random() * (this.canvasHeight - PADDING * 2);
    const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];

    this.state.target = {
      x,
      y,
      radius,
      spawnTime: performance.now(),
      color,
    };
    this.pendingEvents.spawn.push({ x, y, radius });

    // Target expires after lifetime
    this.targetTimeout = window.setTimeout(() => {
      if (this.state.target) {
        this.state.misses++;
        this.pendingEvents.miss.push({ isTarget: true });
        this.spawnTarget();
        this.emitState();
      }
    }, TARGET_LIFETIME);

    this.emitState();
  }

  public click(x: number, y: number): void {
    if (this.state.phase !== "playing") return;

    const { target } = this.state;

    if (target) {
      const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);

      if (dist <= target.radius) {
        // Hit!
        const reactionTime = Math.round(performance.now() - target.spawnTime);
        this.state.reactionTimes.push(reactionTime);
        this.state.hits++;

        // Score based on reaction time and target size
        const timeBonus = Math.max(0, 500 - reactionTime);
        const sizeBonus = Math.round((MAX_RADIUS - target.radius + MIN_RADIUS) * 2);
        const hitScore = 100 + timeBonus + sizeBonus;
        this.state.score += hitScore;
        this.pendingEvents.hit.push({ x: target.x, y: target.y, reactionTime, score: hitScore });

        if (this.targetTimeout) {
          clearTimeout(this.targetTimeout);
          this.targetTimeout = null;
        }

        this.state.target = null;
        this.spawnTarget();
      } else {
        // Miss - clicked outside target
        this.state.misses++;
        this.state.score = Math.max(0, this.state.score - 25);
        this.pendingEvents.miss.push({ isTarget: false });
      }

      this.emitState();
    }
  }

  public getAccuracy(): number {
    const total = this.state.hits + this.state.misses;
    if (total === 0) return 0;
    return Math.round((this.state.hits / total) * 100);
  }

  public getAverageTime(): number {
    if (this.state.reactionTimes.length === 0) return 0;
    const sum = this.state.reactionTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.state.reactionTimes.length);
  }

  private endGame(): void {
    this.state.phase = "gameOver";
    this.state.target = null;
    this.pendingEvents.gameOver.push({
      score: this.state.score,
      hits: this.state.hits,
      misses: this.state.misses,
      accuracy: this.getAccuracy(),
      avgTime: this.getAverageTime(),
    });

    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    if (this.targetTimeout) {
      clearTimeout(this.targetTimeout);
      this.targetTimeout = null;
    }

    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    if (this.targetTimeout) {
      clearTimeout(this.targetTimeout);
      this.targetTimeout = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
