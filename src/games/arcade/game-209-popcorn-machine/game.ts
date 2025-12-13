/**
 * Popcorn Machine Game Logic
 * Game #209 - Catch falling popcorn with a bucket
 */

export interface Popcorn {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  type: "normal" | "golden" | "burnt";
}

export interface GameState {
  popcorns: Popcorn[];
  bucketX: number;
  score: number;
  caught: number;
  missed: number;
  timeLeft: number;
  status: "idle" | "playing" | "gameOver";
}

const BUCKET_WIDTH = 80;
const BUCKET_Y = 400;
const GAME_TIME = 45;
const SPAWN_INTERVAL = 600;

export class PopcornMachineGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private timerInterval: number | null = null;
  private lastTime: number = 0;
  private lastSpawnTime: number = 0;
  private popcornId: number = 0;
  private canvasWidth: number = 400;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      popcorns: [],
      bucketX: 200,
      score: 0,
      caught: 0,
      missed: 0,
      timeLeft: GAME_TIME,
      status: "idle",
    };
  }

  public setCanvasWidth(width: number): void {
    this.canvasWidth = width;
  }

  public start(): void {
    this.state = {
      popcorns: [],
      bucketX: this.canvasWidth / 2,
      score: 0,
      caught: 0,
      missed: 0,
      timeLeft: GAME_TIME,
      status: "playing",
    };

    this.popcornId = 0;
    this.lastTime = performance.now();
    this.lastSpawnTime = this.lastTime;

    this.startTimer();
    this.startGameLoop();
    this.emitState();
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = window.setInterval(() => {
      if (this.state.status !== "playing") return;

      this.state.timeLeft--;

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }

      this.emitState();
    }, 1000);
  }

  private startGameLoop(): void {
    const loop = (currentTime: number) => {
      if (this.state.status !== "playing") return;

      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime, currentTime);

      this.gameLoop = requestAnimationFrame(loop);
    };

    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(deltaTime: number, currentTime: number): void {
    // Spawn popcorn
    const spawnRate = Math.max(200, SPAWN_INTERVAL - this.state.score * 2);
    if (currentTime - this.lastSpawnTime > spawnRate) {
      this.spawnPopcorn();
      this.lastSpawnTime = currentTime;
    }

    // Update popcorn physics
    const gravity = 0.3;
    this.state.popcorns.forEach((p) => {
      p.vy += gravity;
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      p.rotation += p.rotationSpeed * (deltaTime / 16);

      // Bounce off walls
      if (p.x < 20 || p.x > this.canvasWidth - 20) {
        p.vx *= -0.8;
        p.x = Math.max(20, Math.min(this.canvasWidth - 20, p.x));
      }
    });

    // Check catches and misses
    this.state.popcorns = this.state.popcorns.filter((p) => {
      // Check if caught by bucket
      if (
        p.y >= BUCKET_Y - 20 &&
        p.y <= BUCKET_Y + 20 &&
        Math.abs(p.x - this.state.bucketX) < BUCKET_WIDTH / 2
      ) {
        if (p.type === "golden") {
          this.state.score += 50;
        } else if (p.type === "burnt") {
          this.state.score = Math.max(0, this.state.score - 20);
        } else {
          this.state.score += 10;
        }
        this.state.caught++;
        return false;
      }

      // Check if missed (fell below screen)
      if (p.y > 500) {
        if (p.type !== "burnt") {
          this.state.missed++;
        }
        return false;
      }

      return true;
    });

    this.emitState();
  }

  private spawnPopcorn(): void {
    const machineX = this.canvasWidth / 2;
    const machineY = 50;

    // Random type
    const rand = Math.random();
    let type: "normal" | "golden" | "burnt" = "normal";
    if (rand < 0.1) type = "golden";
    else if (rand < 0.2) type = "burnt";

    this.state.popcorns.push({
      id: this.popcornId++,
      x: machineX + (Math.random() - 0.5) * 60,
      y: machineY,
      vx: (Math.random() - 0.5) * 8,
      vy: -5 - Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      size: 15 + Math.random() * 10,
      type,
    });
  }

  public moveBucket(x: number): void {
    if (this.state.status !== "playing") return;

    this.state.bucketX = Math.max(
      BUCKET_WIDTH / 2,
      Math.min(this.canvasWidth - BUCKET_WIDTH / 2, x)
    );
  }

  public getBucketWidth(): number {
    return BUCKET_WIDTH;
  }

  public getBucketY(): number {
    return BUCKET_Y;
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
