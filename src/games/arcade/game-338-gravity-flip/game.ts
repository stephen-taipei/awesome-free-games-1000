/**
 * Gravity Flip Game Logic
 * Game #338 - Flip gravity to avoid obstacles
 */

export interface Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  gravityDirection: 1 | -1;
}

export interface Obstacle {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  passed: boolean;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  player: Player;
  obstacles: Obstacle[];
  coins: Coin[];
  speed: number;
  coinsCollected: number;
}

const GRAVITY = 0.5;
const FLIP_FORCE = 12;
const INITIAL_SPEED = 4;
const MAX_SPEED = 10;

export class GravityFlipGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private obstacleTimer: number = 0;
  private coinTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("gravityFlipHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      player: {
        x: 80,
        y: 0,
        vy: 0,
        width: 30,
        height: 30,
        gravityDirection: 1,
      },
      obstacles: [],
      coins: [],
      speed: INITIAL_SPEED,
      coinsCollected: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.player.y = height / 2;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.state.player.y = this.canvasHeight / 2;
    this.obstacleTimer = 0;
    this.coinTimer = 0;
    this.emitState();
  }

  public flipGravity(): void {
    if (this.state.phase !== "playing") return;

    this.state.player.gravityDirection *= -1;
    this.state.player.vy = FLIP_FORCE * this.state.player.gravityDirection * -1;
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { player } = this.state;

    // Apply gravity
    player.vy += GRAVITY * player.gravityDirection;
    player.y += player.vy;

    // Clamp velocity
    player.vy = Math.max(-15, Math.min(15, player.vy));

    // Check bounds
    if (player.y < 0 || player.y + player.height > this.canvasHeight) {
      this.gameOver();
      return;
    }

    // Update speed
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.score / 20);

    // Move obstacles
    for (const obs of this.state.obstacles) {
      obs.x -= this.state.speed;

      // Check if passed
      if (!obs.passed && obs.x + 40 < player.x) {
        obs.passed = true;
        this.state.score++;
      }
    }

    // Move coins
    for (const coin of this.state.coins) {
      coin.x -= this.state.speed;
    }

    // Remove off-screen items
    this.state.obstacles = this.state.obstacles.filter((o) => o.x > -60);
    this.state.coins = this.state.coins.filter((c) => c.x > -30 && !c.collected);

    // Generate obstacles
    this.obstacleTimer++;
    if (this.obstacleTimer > 100) {
      this.generateObstacle();
      this.obstacleTimer = 0;
    }

    // Generate coins
    this.coinTimer++;
    if (this.coinTimer > 50) {
      this.generateCoin();
      this.coinTimer = 0;
    }

    // Check collisions
    this.checkCollisions();

    this.emitState();
  }

  private generateObstacle(): void {
    const gap = 120 + Math.random() * 40;
    const minHeight = 50;
    const maxHeight = this.canvasHeight - gap - minHeight;
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

    this.state.obstacles.push({
      x: this.canvasWidth + 50,
      topHeight,
      bottomHeight: this.canvasHeight - topHeight - gap,
      gap,
      passed: false,
    });
  }

  private generateCoin(): void {
    if (Math.random() > 0.5) return;

    this.state.coins.push({
      x: this.canvasWidth + 50,
      y: 50 + Math.random() * (this.canvasHeight - 100),
      collected: false,
    });
  }

  private checkCollisions(): void {
    const { player, obstacles, coins } = this.state;

    // Check obstacle collisions
    for (const obs of obstacles) {
      if (
        player.x + player.width > obs.x &&
        player.x < obs.x + 40
      ) {
        if (player.y < obs.topHeight || player.y + player.height > this.canvasHeight - obs.bottomHeight) {
          this.gameOver();
          return;
        }
      }
    }

    // Check coin collisions
    for (const coin of coins) {
      if (coin.collected) continue;

      const dx = player.x + player.width / 2 - coin.x;
      const dy = player.y + player.height / 2 - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 25) {
        coin.collected = true;
        this.state.coinsCollected++;
        this.state.score += 5;
      }
    }
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("gravityFlipHighScore", this.state.highScore.toString());
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
