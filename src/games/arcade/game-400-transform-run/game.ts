/**
 * Transform Run Game Logic
 * Game #400 - Shape-shifting endless runner
 */

export type ShapeForm = "human" | "ball" | "bird";

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  form: ShapeForm;
  energy: number; // Energy for transformations
  isGrounded: boolean;
  isFlying: boolean;
  flyTime: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "low" | "high" | "ceiling"; // low=ball needed, high=jump needed, ceiling=duck needed
  requiredForm?: ShapeForm;
  passed: boolean;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  distance: number;
  player: Player;
  obstacles: Obstacle[];
  coins: Coin[];
  gameSpeed: number;
  groundY: number;
  cameraX: number;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const FLY_FORCE = -0.8;
const MAX_FLY_TIME = 120; // 2 seconds at 60fps
const ENERGY_MAX = 100;
const ENERGY_REGEN = 0.3;
const ENERGY_COST_TRANSFORM = 10;
const ENERGY_COST_FLY = 0.8; // per frame

export class TransformRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private obstacleId: number = 0;
  private coinId: number = 0;
  private spawnTimer: number = 0;
  private gameTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("transformRunHighScore");
    const groundY = 400;

    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      player: {
        x: 100,
        y: groundY - 50,
        width: 30,
        height: 50,
        velocityY: 0,
        form: "human",
        energy: ENERGY_MAX,
        isGrounded: true,
        isFlying: false,
        flyTime: 0,
      },
      obstacles: [],
      coins: [],
      gameSpeed: 5,
      groundY,
      cameraX: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.groundY = height - 100;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      groundY: this.canvasHeight - 100,
    };
    this.state.player.y = this.state.groundY - 50;
    this.obstacleId = 0;
    this.coinId = 0;
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.emitState();
  }

  public jump(): void {
    if (this.state.phase !== "playing") return;
    const player = this.state.player;

    if (player.form === "human" && player.isGrounded) {
      player.velocityY = JUMP_FORCE;
      player.isGrounded = false;
    } else if (player.form === "bird" && player.energy > 0) {
      // Bird can fly
      if (!player.isFlying && player.flyTime < MAX_FLY_TIME) {
        player.isFlying = true;
      }
    }

    this.emitState();
  }

  public stopFlying(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.isFlying = false;
    this.emitState();
  }

  public transform(form: ShapeForm): void {
    if (this.state.phase !== "playing") return;
    const player = this.state.player;

    if (player.form === form) return;
    if (player.energy < ENERGY_COST_TRANSFORM) return;

    player.form = form;
    player.energy -= ENERGY_COST_TRANSFORM;

    // Update player dimensions based on form
    switch (form) {
      case "human":
        player.width = 30;
        player.height = 50;
        player.isFlying = false;
        player.flyTime = 0;
        break;
      case "ball":
        player.width = 35;
        player.height = 35;
        player.isFlying = false;
        player.flyTime = 0;
        // Ball form is lower to the ground
        if (player.isGrounded) {
          player.y = this.state.groundY - player.height;
        }
        break;
      case "bird":
        player.width = 40;
        player.height = 25;
        player.flyTime = 0;
        break;
    }

    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    this.gameTime++;
    const player = this.state.player;

    // Increase speed over time
    this.state.gameSpeed = 5 + Math.floor(this.gameTime / 600) * 0.5;

    // Update camera
    this.state.cameraX += this.state.gameSpeed;
    this.state.distance = Math.floor(this.state.cameraX / 10);

    // Physics
    this.updatePlayerPhysics();

    // Energy regeneration
    if (player.energy < ENERGY_MAX) {
      player.energy = Math.min(ENERGY_MAX, player.energy + ENERGY_REGEN);
    }

    // Update obstacles
    this.updateObstacles();

    // Update coins
    this.updateCoins();

    // Spawn new obstacles and coins
    this.spawnTimer++;
    if (this.spawnTimer >= 80) {
      this.spawnObstacle();
      if (Math.random() > 0.5) {
        this.spawnCoin();
      }
      this.spawnTimer = 0;
    }

    // Check collisions
    this.checkCollisions();

    this.emitState();
  }

  private updatePlayerPhysics(): void {
    const player = this.state.player;

    // Flying logic
    if (player.form === "bird" && player.isFlying && player.energy > 0) {
      player.velocityY += FLY_FORCE;
      player.energy -= ENERGY_COST_FLY;
      player.flyTime++;
      player.isGrounded = false;

      if (player.flyTime >= MAX_FLY_TIME || player.energy <= 0) {
        player.isFlying = false;
      }
    } else {
      // Normal gravity
      player.velocityY += GRAVITY;
      if (player.isFlying) {
        player.isFlying = false;
      }
    }

    // Apply velocity
    player.y += player.velocityY;

    // Ground collision
    const groundLevel = this.state.groundY - player.height;
    if (player.y >= groundLevel) {
      player.y = groundLevel;
      player.velocityY = 0;
      player.isGrounded = true;
      if (player.form === "bird") {
        player.flyTime = 0;
      }
    } else {
      player.isGrounded = false;
    }

    // Ceiling collision
    if (player.y < 0) {
      player.y = 0;
      player.velocityY = 0;
    }

    // Ball form rolling effect - slight bounce
    if (player.form === "ball" && player.isGrounded) {
      const bounceEffect = Math.sin(this.gameTime * 0.3) * 3;
      player.y = groundLevel + bounceEffect;
    }
  }

  private updateObstacles(): void {
    this.state.obstacles = this.state.obstacles.filter((obstacle) => {
      obstacle.x -= this.state.gameSpeed;

      // Remove if off screen
      if (obstacle.x + obstacle.width < this.state.cameraX - 100) {
        return false;
      }

      // Mark as passed for scoring
      if (!obstacle.passed && obstacle.x + obstacle.width < this.state.player.x) {
        obstacle.passed = true;
        this.state.score += 10;
      }

      return true;
    });
  }

  private updateCoins(): void {
    this.state.coins = this.state.coins.filter((coin) => {
      coin.x -= this.state.gameSpeed;

      // Remove if off screen
      if (coin.x + coin.radius < this.state.cameraX - 100) {
        return false;
      }

      return !coin.collected;
    });
  }

  private spawnObstacle(): void {
    const spawnX = this.state.cameraX + this.canvasWidth + 50;
    const groundY = this.state.groundY;
    const rand = Math.random();

    let obstacle: Obstacle;

    if (rand > 0.66) {
      // Low obstacle - requires ball form
      obstacle = {
        id: this.obstacleId++,
        x: spawnX,
        y: groundY - 40,
        width: 60,
        height: 40,
        type: "low",
        requiredForm: "ball",
        passed: false,
      };
    } else if (rand > 0.33) {
      // High obstacle - requires jump or bird form
      obstacle = {
        id: this.obstacleId++,
        x: spawnX,
        y: groundY - 70,
        width: 30,
        height: 70,
        type: "high",
        passed: false,
      };
    } else {
      // Ceiling obstacle - requires staying low (ball or duck)
      const ceilingHeight = 80;
      obstacle = {
        id: this.obstacleId++,
        x: spawnX,
        y: 0,
        width: 80,
        height: ceilingHeight,
        type: "ceiling",
        passed: false,
      };
    }

    this.state.obstacles.push(obstacle);
  }

  private spawnCoin(): void {
    const spawnX = this.state.cameraX + this.canvasWidth + 50;
    const groundY = this.state.groundY;
    const heights = [
      groundY - 30,
      groundY - 80,
      groundY - 130,
      groundY - 180,
    ];

    const coin: Coin = {
      id: this.coinId++,
      x: spawnX,
      y: heights[Math.floor(Math.random() * heights.length)],
      radius: 10,
      collected: false,
    };

    this.state.coins.push(coin);
  }

  private checkCollisions(): void {
    const player = this.state.player;

    // Check obstacle collisions
    for (const obstacle of this.state.obstacles) {
      if (this.isColliding(player, obstacle)) {
        // Check if player is in correct form
        if (obstacle.type === "low" && player.form === "ball") {
          // Ball can pass through low obstacles
          continue;
        }
        if (obstacle.type === "ceiling" && (player.form === "ball" || player.y > obstacle.height)) {
          // Can pass if ducked or in ball form
          continue;
        }

        // Collision detected - game over
        this.gameOver();
        return;
      }
    }

    // Check coin collisions
    for (const coin of this.state.coins) {
      if (coin.collected) continue;

      const dx = (player.x + player.width / 2) - coin.x;
      const dy = (player.y + player.height / 2) - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < coin.radius + Math.min(player.width, player.height) / 2) {
        coin.collected = true;
        this.state.score += 5;
        this.state.player.energy = Math.min(ENERGY_MAX, this.state.player.energy + 10);
      }
    }
  }

  private isColliding(
    player: Player,
    obstacle: Obstacle
  ): boolean {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("transformRunHighScore", this.state.highScore.toString());
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
