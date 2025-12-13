/**
 * Neon Dash Game Logic
 * Game #337 - Dash through neon obstacles at high speed
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  width: number;
  height: number;
}

export interface Obstacle {
  x: number;
  lanes: boolean[];
  passed: boolean;
}

export interface PowerUp {
  x: number;
  lane: number;
  type: "shield" | "slow" | "coin";
  collected: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  player: Player;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  speed: number;
  hasShield: boolean;
  shieldTime: number;
  coins: number;
}

const LANES = 3;
const LANE_WIDTH = 80;
const INITIAL_SPEED = 8;
const MAX_SPEED = 18;

export class NeonDashGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private obstacleTimer: number = 0;
  private powerUpTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("neonDashHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      player: {
        x: 0,
        y: 0,
        lane: 1,
        targetLane: 1,
        width: 40,
        height: 60,
      },
      obstacles: [],
      powerUps: [],
      speed: INITIAL_SPEED,
      hasShield: false,
      shieldTime: 0,
      coins: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.updatePlayerPosition();
  }

  private updatePlayerPosition(): void {
    const laneStart = (this.canvasWidth - LANES * LANE_WIDTH) / 2;
    this.state.player.x = laneStart + this.state.player.lane * LANE_WIDTH + LANE_WIDTH / 2 - this.state.player.width / 2;
    this.state.player.y = this.canvasHeight - 120;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.updatePlayerPosition();
    this.obstacleTimer = 0;
    this.powerUpTimer = 0;
    this.emitState();
  }

  public moveLeft(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane > 0) {
      this.state.player.targetLane = this.state.player.lane - 1;
    }
  }

  public moveRight(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane < LANES - 1) {
      this.state.player.targetLane = this.state.player.lane + 1;
    }
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    // Update player position
    if (this.state.player.lane !== this.state.player.targetLane) {
      this.state.player.lane = this.state.player.targetLane;
      this.updatePlayerPosition();
    }

    // Update score and speed
    this.state.score++;
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.score / 500);

    // Update shield
    if (this.state.hasShield) {
      this.state.shieldTime--;
      if (this.state.shieldTime <= 0) {
        this.state.hasShield = false;
      }
    }

    // Move obstacles
    for (const obs of this.state.obstacles) {
      obs.x += this.state.speed;
    }

    // Move power-ups
    for (const pu of this.state.powerUps) {
      pu.x += this.state.speed;
    }

    // Remove off-screen items
    this.state.obstacles = this.state.obstacles.filter((o) => o.x < this.canvasHeight + 50);
    this.state.powerUps = this.state.powerUps.filter((p) => p.x < this.canvasHeight + 50 && !p.collected);

    // Generate new obstacles
    this.obstacleTimer++;
    if (this.obstacleTimer > 60) {
      this.generateObstacle();
      this.obstacleTimer = 0;
    }

    // Generate power-ups
    this.powerUpTimer++;
    if (this.powerUpTimer > 180) {
      this.generatePowerUp();
      this.powerUpTimer = 0;
    }

    // Check collisions
    this.checkCollisions();

    this.emitState();
  }

  private generateObstacle(): void {
    const lanes = [false, false, false];
    const openLane = Math.floor(Math.random() * LANES);

    for (let i = 0; i < LANES; i++) {
      if (i !== openLane) {
        lanes[i] = Math.random() > 0.3;
      }
    }

    // Ensure at least one obstacle
    if (!lanes.some((l) => l)) {
      lanes[(openLane + 1) % LANES] = true;
    }

    this.state.obstacles.push({
      x: -50,
      lanes,
      passed: false,
    });
  }

  private generatePowerUp(): void {
    const types: ("shield" | "slow" | "coin")[] = ["shield", "slow", "coin", "coin"];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * LANES);

    this.state.powerUps.push({
      x: -50,
      lane,
      type,
      collected: false,
    });
  }

  private checkCollisions(): void {
    const { player } = this.state;
    const laneStart = (this.canvasWidth - LANES * LANE_WIDTH) / 2;

    // Check obstacle collisions
    for (const obs of this.state.obstacles) {
      if (obs.passed) continue;

      const obsY = this.canvasHeight - obs.x - 30;

      if (obsY > player.y - 30 && obsY < player.y + player.height) {
        if (obs.lanes[player.lane]) {
          if (this.state.hasShield) {
            this.state.hasShield = false;
            obs.lanes[player.lane] = false;
          } else {
            this.gameOver();
            return;
          }
        }
        obs.passed = true;
      }
    }

    // Check power-up collisions
    for (const pu of this.state.powerUps) {
      if (pu.collected) continue;

      const puY = this.canvasHeight - pu.x - 30;
      const puX = laneStart + pu.lane * LANE_WIDTH + LANE_WIDTH / 2;

      if (
        pu.lane === player.lane &&
        puY > player.y - 20 &&
        puY < player.y + player.height
      ) {
        pu.collected = true;

        switch (pu.type) {
          case "shield":
            this.state.hasShield = true;
            this.state.shieldTime = 300;
            break;
          case "slow":
            this.state.speed = Math.max(INITIAL_SPEED, this.state.speed - 3);
            break;
          case "coin":
            this.state.coins++;
            this.state.score += 50;
            break;
        }
      }
    }
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("neonDashHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getLaneWidth(): number {
    return LANE_WIDTH;
  }

  public getLaneCount(): number {
    return LANES;
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
