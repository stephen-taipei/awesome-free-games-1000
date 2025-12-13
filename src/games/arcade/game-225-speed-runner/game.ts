/**
 * Speed Runner Game Logic
 * Game #225 - Run and jump through obstacles at high speed
 */

export interface Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSliding: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "block" | "spike" | "gap" | "low" | "coin";
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  player: Player;
  obstacles: Obstacle[];
  speed: number;
  groundY: number;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const INITIAL_SPEED = 6;
const MAX_SPEED = 15;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const SLIDE_HEIGHT = 25;

export class SpeedRunnerGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private obstacleTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("speedRunnerHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      coins: 0,
      player: {
        x: 80,
        y: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        isJumping: false,
        isSliding: false,
      },
      obstacles: [],
      speed: INITIAL_SPEED,
      groundY: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.groundY = height - 80;
    this.state.player.y = this.state.groundY - PLAYER_HEIGHT;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      groundY: this.canvasHeight - 80,
    };
    this.state.player.y = this.state.groundY - PLAYER_HEIGHT;
    this.obstacleTimer = 0;
    this.emitState();
  }

  public jump(): void {
    if (this.state.phase !== "playing") return;

    if (!this.state.player.isJumping && !this.state.player.isSliding) {
      this.state.player.vy = JUMP_FORCE;
      this.state.player.isJumping = true;
    }
  }

  public startSlide(): void {
    if (this.state.phase !== "playing") return;

    if (!this.state.player.isJumping) {
      this.state.player.isSliding = true;
      this.state.player.height = SLIDE_HEIGHT;
      this.state.player.y = this.state.groundY - SLIDE_HEIGHT;
    }
  }

  public endSlide(): void {
    if (this.state.player.isSliding) {
      this.state.player.isSliding = false;
      this.state.player.height = PLAYER_HEIGHT;
      this.state.player.y = this.state.groundY - PLAYER_HEIGHT;
    }
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { player, obstacles } = this.state;

    // Apply gravity
    if (player.isJumping) {
      player.vy += GRAVITY;
      player.y += player.vy;

      // Land on ground
      if (player.y >= this.state.groundY - player.height) {
        player.y = this.state.groundY - player.height;
        player.vy = 0;
        player.isJumping = false;
      }
    }

    // Update speed and distance
    this.state.distance += this.state.speed;
    this.state.score = Math.floor(this.state.distance / 10) + this.state.coins * 10;
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.distance / 2000);

    // Move obstacles
    for (const obs of obstacles) {
      obs.x -= this.state.speed;
    }

    // Remove off-screen obstacles
    this.state.obstacles = obstacles.filter((o) => o.x + o.width > -50);

    // Generate new obstacles
    this.obstacleTimer++;
    if (this.obstacleTimer > 60 + Math.random() * 60) {
      this.generateObstacle();
      this.obstacleTimer = 0;
    }

    // Check collisions
    for (const obs of this.state.obstacles) {
      if (obs.type === "coin") {
        if (this.checkCollision(player, obs)) {
          obs.x = -100; // Remove coin
          this.state.coins++;
        }
        continue;
      }

      if (this.checkCollision(player, obs)) {
        this.gameOver();
        return;
      }
    }

    this.emitState();
  }

  private generateObstacle(): void {
    const rand = Math.random();
    let obs: Obstacle;

    if (rand < 0.25) {
      // Block obstacle (jump over)
      obs = {
        x: this.canvasWidth + 50,
        y: this.state.groundY - 40,
        width: 30,
        height: 40,
        type: "block",
      };
    } else if (rand < 0.45) {
      // Spike (jump over)
      obs = {
        x: this.canvasWidth + 50,
        y: this.state.groundY - 30,
        width: 25,
        height: 30,
        type: "spike",
      };
    } else if (rand < 0.65) {
      // Low obstacle (slide under)
      obs = {
        x: this.canvasWidth + 50,
        y: this.state.groundY - 80,
        width: 60,
        height: 35,
        type: "low",
      };
    } else if (rand < 0.8) {
      // Coin
      obs = {
        x: this.canvasWidth + 50,
        y: this.state.groundY - 80 - Math.random() * 60,
        width: 25,
        height: 25,
        type: "coin",
      };
    } else {
      // Double obstacle
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        y: this.state.groundY - 40,
        width: 30,
        height: 40,
        type: "block",
      });
      obs = {
        x: this.canvasWidth + 130,
        y: this.state.groundY - 40,
        width: 30,
        height: 40,
        type: "block",
      };
    }

    this.state.obstacles.push(obs);
  }

  private checkCollision(player: Player, obs: Obstacle): boolean {
    return (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    );
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("speedRunnerHighScore", this.state.highScore.toString());
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
