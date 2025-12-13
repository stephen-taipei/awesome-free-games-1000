/**
 * Tap Master Game Logic
 * Game #345 - Tap targets as fast as you can
 */

export interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: "normal" | "bonus" | "danger";
  createdAt: number;
  lifetime: number;
  tapped: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  targets: Target[];
  timeLeft: number;
  taps: number;
  hits: number;
  misses: number;
  combo: number;
  maxCombo: number;
}

const GAME_DURATION = 30000; // 30 seconds
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"];

export class TapMasterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private targetId: number = 0;
  private spawnTimer: number = 0;
  private startTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("tapMasterHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      targets: [],
      timeLeft: GAME_DURATION,
      taps: 0,
      hits: 0,
      misses: 0,
      combo: 0,
      maxCombo: 0,
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
      timeLeft: GAME_DURATION,
    };
    this.targetId = 0;
    this.spawnTimer = 0;
    this.startTime = Date.now();
    this.emitState();
  }

  public tap(x: number, y: number): void {
    if (this.state.phase !== "playing") return;

    this.state.taps++;
    let hitSomething = false;

    // Check if any target was hit
    for (const target of this.state.targets) {
      if (target.tapped) continue;

      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= target.radius) {
        target.tapped = true;
        hitSomething = true;

        if (target.type === "danger") {
          this.state.combo = 0;
          this.state.score = Math.max(0, this.state.score - 50);
          this.state.misses++;
        } else {
          this.state.hits++;
          this.state.combo++;
          this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

          const baseScore = target.type === "bonus" ? 20 : 10;
          const comboBonus = Math.floor(this.state.combo / 5);
          this.state.score += baseScore * (1 + comboBonus);
        }

        break;
      }
    }

    if (!hitSomething) {
      this.state.misses++;
      this.state.combo = 0;
    }

    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const now = Date.now();
    this.state.timeLeft = Math.max(0, GAME_DURATION - (now - this.startTime));

    // Check game over
    if (this.state.timeLeft <= 0) {
      this.gameOver();
      return;
    }

    // Remove expired or tapped targets
    this.state.targets = this.state.targets.filter((t) => {
      if (t.tapped) return false;

      const age = now - t.createdAt;
      if (age > t.lifetime) {
        if (t.type !== "danger") {
          this.state.misses++;
          this.state.combo = 0;
        }
        return false;
      }
      return true;
    });

    // Spawn new targets
    this.spawnTimer++;
    const spawnRate = Math.max(15, 30 - Math.floor(this.state.score / 100));

    if (this.spawnTimer >= spawnRate) {
      this.spawnTarget();
      this.spawnTimer = 0;
    }

    this.emitState();
  }

  private spawnTarget(): void {
    const padding = 50;
    const radius = 25 + Math.random() * 20;
    const x = padding + Math.random() * (this.canvasWidth - padding * 2);
    const y = padding + Math.random() * (this.canvasHeight - padding * 2);

    // Check for overlap with existing targets
    for (const target of this.state.targets) {
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + target.radius + 10) {
        return; // Skip spawning if too close
      }
    }

    const rand = Math.random();
    let type: Target["type"] = "normal";
    let lifetime = 2000;

    if (rand > 0.9) {
      type = "bonus";
      lifetime = 1500;
    } else if (rand > 0.8) {
      type = "danger";
      lifetime = 2500;
    }

    // Decrease lifetime as game progresses
    const timeProgress = 1 - this.state.timeLeft / GAME_DURATION;
    lifetime = lifetime * (1 - timeProgress * 0.3);

    this.state.targets.push({
      id: this.targetId++,
      x,
      y,
      radius,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      type,
      createdAt: Date.now(),
      lifetime,
      tapped: false,
    });
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("tapMasterHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
