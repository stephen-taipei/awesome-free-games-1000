/**
 * Ball Bounce Game Logic
 * Game #339 - Bounce the ball on platforms
 */

export interface Ball {
  x: number;
  y: number;
  vy: number;
  radius: number;
  bounceCount: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "boost" | "fragile" | "moving";
  movingDir?: number;
  broken?: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  ball: Ball;
  platforms: Platform[];
  cameraY: number;
  maxHeight: number;
}

const GRAVITY = 0.3;
const BOUNCE_FORCE = -12;
const BOOST_FORCE = -18;

export class BallBounceGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("ballBounceHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      ball: {
        x: 200,
        y: 400,
        vy: 0,
        radius: 15,
        bounceCount: 0,
      },
      platforms: [],
      cameraY: 0,
      maxHeight: 0,
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
    this.state.ball.x = this.canvasWidth / 2;
    this.state.ball.y = this.canvasHeight - 100;
    this.generateInitialPlatforms();
    this.emitState();
  }

  private generateInitialPlatforms(): void {
    this.state.platforms = [];

    // Starting platform
    this.state.platforms.push({
      x: this.canvasWidth / 2 - 40,
      y: this.canvasHeight - 50,
      width: 80,
      type: "normal",
    });

    // Generate platforms going up
    for (let y = this.canvasHeight - 120; y > -500; y -= 70 + Math.random() * 40) {
      this.generatePlatform(y);
    }
  }

  private generatePlatform(y: number): void {
    const width = 60 + Math.random() * 40;
    const x = Math.random() * (this.canvasWidth - width);

    const rand = Math.random();
    let type: Platform["type"] = "normal";

    if (rand > 0.85) {
      type = "boost";
    } else if (rand > 0.7) {
      type = "fragile";
    } else if (rand > 0.5) {
      type = "moving";
    }

    this.state.platforms.push({
      x,
      y,
      width,
      type,
      movingDir: type === "moving" ? (Math.random() > 0.5 ? 1 : -1) : undefined,
      broken: false,
    });
  }

  public moveBall(targetX: number): void {
    if (this.state.phase !== "playing") return;

    // Move ball towards target
    const dx = targetX - this.state.ball.x;
    this.state.ball.x += dx * 0.15;

    // Clamp to canvas bounds
    this.state.ball.x = Math.max(
      this.state.ball.radius,
      Math.min(this.canvasWidth - this.state.ball.radius, this.state.ball.x)
    );
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { ball } = this.state;

    // Apply gravity
    ball.vy += GRAVITY;
    ball.y += ball.vy;

    // Update moving platforms
    for (const platform of this.state.platforms) {
      if (platform.type === "moving" && platform.movingDir) {
        platform.x += platform.movingDir * 2;

        if (platform.x <= 0 || platform.x + platform.width >= this.canvasWidth) {
          platform.movingDir *= -1;
        }
      }
    }

    // Check platform collisions (only when falling)
    if (ball.vy > 0) {
      for (const platform of this.state.platforms) {
        if (platform.broken) continue;

        const platformY = platform.y - this.state.cameraY;

        if (
          ball.x >= platform.x - ball.radius &&
          ball.x <= platform.x + platform.width + ball.radius &&
          ball.y + ball.radius >= platformY &&
          ball.y + ball.radius <= platformY + 15 &&
          ball.vy > 0
        ) {
          if (platform.type === "fragile") {
            platform.broken = true;
            ball.vy = BOUNCE_FORCE;
          } else if (platform.type === "boost") {
            ball.vy = BOOST_FORCE;
          } else {
            ball.vy = BOUNCE_FORCE;
          }

          ball.bounceCount++;
          break;
        }
      }
    }

    // Update camera and score
    const ballWorldY = ball.y + this.state.cameraY;

    if (ballWorldY < this.state.maxHeight) {
      this.state.maxHeight = ballWorldY;
      this.state.score = Math.floor(-this.state.maxHeight / 10);
    }

    // Scroll camera
    const targetCameraY = -this.state.maxHeight - this.canvasHeight / 3;
    if (targetCameraY > this.state.cameraY) {
      this.state.cameraY += (targetCameraY - this.state.cameraY) * 0.1;
    }

    // Generate new platforms
    const topY = -this.state.cameraY - 200;
    const highestPlatform = Math.min(...this.state.platforms.map((p) => p.y));

    if (highestPlatform > topY) {
      for (let y = highestPlatform - 70; y > topY - 300; y -= 70 + Math.random() * 40) {
        this.generatePlatform(y);
      }
    }

    // Remove platforms below screen
    const bottomY = -this.state.cameraY + this.canvasHeight + 100;
    this.state.platforms = this.state.platforms.filter((p) => p.y < bottomY);

    // Check game over
    if (ball.y > this.canvasHeight + 50) {
      this.gameOver();
      return;
    }

    this.emitState();
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("ballBounceHighScore", this.state.highScore.toString());
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
