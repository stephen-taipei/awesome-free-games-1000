/**
 * Obstacle Run Game Logic
 * Game #399 - Navigate through obstacles across three lanes
 */

export interface Player {
  lane: number; // 0 = left, 1 = middle, 2 = right
  y: number;
  vy: number;
  isJumping: boolean;
  isSliding: boolean;
  height: number;
}

export interface Obstacle {
  x: number;
  lane: number;
  type: "low" | "high" | "moving" | "double" | "triple" | "coin";
  y?: number;
  movingOffset?: number;
  movingDirection?: number;
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

const GRAVITY = 0.9;
const JUMP_FORCE = -16;
const INITIAL_SPEED = 7;
const MAX_SPEED = 14;
const PLAYER_HEIGHT = 50;
const SLIDE_HEIGHT = 25;
const LANE_WIDTH = 100;

export class ObstacleRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private obstacleTimer: number = 0;
  private laneChangeTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("obstacleRunHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      coins: 0,
      player: {
        lane: 1, // Start in middle lane
        y: 0,
        vy: 0,
        isJumping: false,
        isSliding: false,
        height: PLAYER_HEIGHT,
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
    this.laneChangeTimer = 0;
    this.emitState();
  }

  public moveLeft(): void {
    if (this.state.phase !== "playing") return;
    if (this.laneChangeTimer > 0) return;

    if (this.state.player.lane > 0) {
      this.state.player.lane--;
      this.laneChangeTimer = 10;
    }
  }

  public moveRight(): void {
    if (this.state.phase !== "playing") return;
    if (this.laneChangeTimer > 0) return;

    if (this.state.player.lane < 2) {
      this.state.player.lane++;
      this.laneChangeTimer = 10;
    }
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

    // Update lane change timer
    if (this.laneChangeTimer > 0) {
      this.laneChangeTimer--;
    }

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
    this.state.score = Math.floor(this.state.distance / 10) + this.state.coins * 15;
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.distance / 2500);

    // Move obstacles
    for (const obs of obstacles) {
      obs.x -= this.state.speed;

      // Update moving obstacles
      if (obs.type === "moving" && obs.movingOffset !== undefined && obs.movingDirection !== undefined) {
        obs.movingOffset += obs.movingDirection * 0.5;
        if (Math.abs(obs.movingOffset) > 30) {
          obs.movingDirection *= -1;
        }
      }
    }

    // Remove off-screen obstacles
    this.state.obstacles = obstacles.filter((o) => o.x > -100);

    // Generate new obstacles
    this.obstacleTimer++;
    const spawnInterval = Math.max(40, 80 - Math.floor(this.state.distance / 1000));
    if (this.obstacleTimer > spawnInterval) {
      this.generateObstacle();
      this.obstacleTimer = 0;
    }

    // Check collisions
    const playerLaneX = this.getPlayerLaneX(player.lane);
    const playerWidth = 40;

    for (const obs of this.state.obstacles) {
      if (obs.type === "coin") {
        const coinLaneX = this.getPlayerLaneX(obs.lane) + (obs.movingOffset || 0);
        if (
          obs.x < playerLaneX + playerWidth &&
          obs.x + 30 > playerLaneX &&
          obs.y !== undefined &&
          player.y < obs.y + 30 &&
          player.y + player.height > obs.y
        ) {
          obs.x = -200; // Remove coin
          this.state.coins++;
        }
        continue;
      }

      if (this.checkObstacleCollision(player, obs)) {
        this.gameOver();
        return;
      }
    }

    this.emitState();
  }

  private getPlayerLaneX(lane: number): number {
    const centerX = this.canvasWidth / 2;
    return centerX - LANE_WIDTH + lane * LANE_WIDTH - 20;
  }

  private generateObstacle(): void {
    const rand = Math.random();
    const lanes = [0, 1, 2];
    const randomLane = lanes[Math.floor(Math.random() * lanes.length)];

    if (rand < 0.15) {
      // Coin
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: randomLane,
        type: "coin",
        y: this.state.groundY - 80 - Math.random() * 60,
      });
    } else if (rand < 0.35) {
      // Low obstacle (jump over)
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: randomLane,
        type: "low",
      });
    } else if (rand < 0.55) {
      // High obstacle (slide under)
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: randomLane,
        type: "high",
      });
    } else if (rand < 0.70) {
      // Moving obstacle
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: randomLane,
        type: "moving",
        movingOffset: 0,
        movingDirection: Math.random() > 0.5 ? 1 : -1,
      });
    } else if (rand < 0.85) {
      // Double obstacles (two lanes)
      const lane1 = Math.floor(Math.random() * 3);
      let lane2 = Math.floor(Math.random() * 3);
      while (lane2 === lane1) {
        lane2 = Math.floor(Math.random() * 3);
      }

      const obsType = Math.random() > 0.5 ? "low" : "high";
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: lane1,
        type: obsType,
      });
      this.state.obstacles.push({
        x: this.canvasWidth + 50,
        lane: lane2,
        type: obsType,
      });
    } else {
      // Triple obstacles (all lanes) - must jump or slide
      const obsType = Math.random() > 0.5 ? "low" : "high";
      for (let i = 0; i < 3; i++) {
        this.state.obstacles.push({
          x: this.canvasWidth + 50,
          lane: i,
          type: obsType,
        });
      }
    }
  }

  private checkObstacleCollision(player: Player, obs: Obstacle): boolean {
    const playerLaneX = this.getPlayerLaneX(player.lane);
    const playerWidth = 40;
    const obsLaneX = this.getPlayerLaneX(obs.lane) + (obs.movingOffset || 0);

    // Check if in same lane (horizontally)
    const horizontalCollision =
      obs.x < playerLaneX + playerWidth &&
      obs.x + 50 > playerLaneX;

    if (!horizontalCollision) return false;

    // Check vertical collision based on obstacle type
    if (obs.type === "low") {
      const obsY = this.state.groundY - 40;
      const obsHeight = 40;
      return (
        player.y < obsY + obsHeight &&
        player.y + player.height > obsY
      );
    } else if (obs.type === "high") {
      const obsY = this.state.groundY - 100;
      const obsHeight = 60;
      return (
        player.y < obsY + obsHeight &&
        player.y + player.height > obsY
      );
    } else if (obs.type === "moving") {
      const obsY = this.state.groundY - 50;
      const obsHeight = 50;
      return (
        player.y < obsY + obsHeight &&
        player.y + player.height > obsY
      );
    }

    return false;
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("obstacleRunHighScore", this.state.highScore.toString());
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
