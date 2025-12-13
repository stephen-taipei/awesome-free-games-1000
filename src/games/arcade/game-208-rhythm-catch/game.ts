/**
 * Rhythm Catch Game Logic
 * Game #208 - Catch balls with rhythm timing
 */

export interface Ball {
  id: number;
  x: number;
  y: number;
  speed: number;
  color: string;
  targetTime: number;
}

export interface GameState {
  balls: Ball[];
  score: number;
  combo: number;
  maxCombo: number;
  lives: number;
  status: "idle" | "playing" | "gameOver";
  lastResult: "perfect" | "good" | "miss" | null;
  catcherY: number;
  bpm: number;
}

const COLORS = ["#e74c3c", "#3498db", "#27ae60", "#f1c40f", "#9b59b6", "#e67e22"];
const CATCHER_Y = 380;
const PERFECT_THRESHOLD = 20;
const GOOD_THRESHOLD = 50;

export class RhythmCatchGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private nextBallTime: number = 0;
  private ballIdCounter: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      balls: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: 5,
      status: "idle",
      lastResult: null,
      catcherY: CATCHER_Y,
      bpm: 100,
    };
  }

  public start(): void {
    this.state = {
      balls: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: 5,
      status: "playing",
      lastResult: null,
      catcherY: CATCHER_Y,
      bpm: 100,
    };

    this.ballIdCounter = 0;
    this.lastTime = performance.now();
    this.nextBallTime = this.lastTime + this.getBeatInterval();

    this.startGameLoop();
    this.emitState();
  }

  private getBeatInterval(): number {
    return (60 / this.state.bpm) * 1000;
  }

  private startGameLoop(): void {
    const loop = (currentTime: number) => {
      if (this.state.status !== "playing") return;

      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime, currentTime);
      this.emitState();

      this.gameLoop = requestAnimationFrame(loop);
    };

    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(deltaTime: number, currentTime: number): void {
    // Spawn new balls on beat
    if (currentTime >= this.nextBallTime) {
      this.spawnBall(currentTime);
      this.nextBallTime = currentTime + this.getBeatInterval();

      // Gradually increase BPM
      if (this.state.score > 0 && this.state.score % 500 === 0) {
        this.state.bpm = Math.min(160, this.state.bpm + 5);
      }
    }

    // Update ball positions
    this.state.balls.forEach((ball) => {
      ball.y += ball.speed * (deltaTime / 16);
    });

    // Check for missed balls
    const missedBalls = this.state.balls.filter((ball) => ball.y > CATCHER_Y + 100);
    if (missedBalls.length > 0) {
      missedBalls.forEach(() => {
        this.state.lives--;
        this.state.combo = 0;
        this.state.lastResult = "miss";
      });
      this.state.balls = this.state.balls.filter((ball) => ball.y <= CATCHER_Y + 100);

      if (this.state.lives <= 0) {
        this.endGame();
      }
    }
  }

  private spawnBall(currentTime: number): void {
    const x = 50 + Math.random() * 300;
    const travelTime = 2000; // Time for ball to reach catcher
    const speed = CATCHER_Y / (travelTime / 16);

    this.state.balls.push({
      id: this.ballIdCounter++,
      x,
      y: 0,
      speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      targetTime: currentTime + travelTime,
    });
  }

  public catch(): void {
    if (this.state.status !== "playing") return;

    // Find the ball closest to the catcher
    let closestBall: Ball | null = null;
    let closestDistance = Infinity;

    this.state.balls.forEach((ball) => {
      const distance = Math.abs(ball.y - CATCHER_Y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestBall = ball;
      }
    });

    if (!closestBall) return;

    if (closestDistance <= PERFECT_THRESHOLD) {
      // Perfect catch
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      this.state.score += 100 + this.state.combo * 10;
      this.state.lastResult = "perfect";
      this.state.balls = this.state.balls.filter((b) => b.id !== closestBall!.id);
    } else if (closestDistance <= GOOD_THRESHOLD) {
      // Good catch
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      this.state.score += 50 + this.state.combo * 5;
      this.state.lastResult = "good";
      this.state.balls = this.state.balls.filter((b) => b.id !== closestBall!.id);
    } else {
      // Too early or too late
      this.state.combo = 0;
      this.state.lastResult = "miss";
    }

    this.emitState();
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getCatcherY(): number {
    return CATCHER_Y;
  }

  public destroy(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
