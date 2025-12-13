/**
 * Color Switch Game Logic
 * Game #218 - Jump through matching colored obstacles
 */

export interface Ball {
  x: number;
  y: number;
  vy: number;
  color: string;
  colorIndex: number;
}

export interface Obstacle {
  y: number;
  type: "ring" | "bar" | "triangle";
  rotation: number;
  colors: string[];
  passed: boolean;
}

export interface Star {
  y: number;
  collected: boolean;
}

export interface ColorSwitcher {
  y: number;
  passed: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  ball: Ball;
  obstacles: Obstacle[];
  stars: Star[];
  colorSwitchers: ColorSwitcher[];
  cameraY: number;
}

const COLORS = ["#f1c40f", "#9b59b6", "#e74c3c", "#2ecc71"];
const GRAVITY = 0.4;
const JUMP_FORCE = -10;
const ROTATION_SPEED = 0.02;

export class ColorSwitchGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasHeight: number = 600;
  private canvasWidth: number = 300;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("colorSwitchHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      ball: {
        x: 150,
        y: 500,
        vy: 0,
        color: COLORS[0],
        colorIndex: 0,
      },
      obstacles: [],
      stars: [],
      colorSwitchers: [],
      cameraY: 0,
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
      ball: {
        x: this.canvasWidth / 2,
        y: this.canvasHeight - 100,
        vy: 0,
        color: COLORS[0],
        colorIndex: 0,
      },
    };

    this.generateInitialObstacles();
    this.emitState();
  }

  private generateInitialObstacles(): void {
    let y = this.canvasHeight - 250;

    for (let i = 0; i < 5; i++) {
      this.addObstacle(y);
      y -= 200;
    }
  }

  private addObstacle(y: number): void {
    const types: ("ring" | "bar" | "triangle")[] = ["ring", "bar", "triangle"];
    const type = types[Math.floor(Math.random() * types.length)];

    this.state.obstacles.push({
      y,
      type,
      rotation: 0,
      colors: [...COLORS],
      passed: false,
    });

    // Add star above obstacle
    this.state.stars.push({
      y: y - 50,
      collected: false,
    });

    // Add color switcher below obstacle
    this.state.colorSwitchers.push({
      y: y + 80,
      passed: false,
    });
  }

  public jump(): void {
    if (this.state.phase !== "playing") return;

    this.state.ball.vy = JUMP_FORCE;
    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { ball, obstacles, stars, colorSwitchers } = this.state;

    // Apply gravity
    ball.vy += GRAVITY;
    ball.y += ball.vy;

    // Update camera to follow ball
    const targetCameraY = Math.max(0, ball.y - this.canvasHeight / 2);
    this.state.cameraY += (targetCameraY - this.state.cameraY) * 0.1;

    // Rotate obstacles
    for (const obstacle of obstacles) {
      obstacle.rotation += ROTATION_SPEED;
    }

    // Check star collection
    for (const star of stars) {
      if (!star.collected) {
        const dist = Math.abs(ball.y - star.y);
        if (dist < 30 && Math.abs(ball.x - this.canvasWidth / 2) < 30) {
          star.collected = true;
          this.state.score++;
        }
      }
    }

    // Check color switcher
    for (const switcher of colorSwitchers) {
      if (!switcher.passed) {
        const dist = Math.abs(ball.y - switcher.y);
        if (dist < 20) {
          switcher.passed = true;
          // Switch to random different color
          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * COLORS.length);
          } while (newIndex === ball.colorIndex);
          ball.colorIndex = newIndex;
          ball.color = COLORS[newIndex];
        }
      }
    }

    // Check collision with obstacles
    for (const obstacle of obstacles) {
      if (this.checkObstacleCollision(ball, obstacle)) {
        this.gameOver();
        return;
      }

      // Mark as passed
      if (!obstacle.passed && ball.y < obstacle.y - 50) {
        obstacle.passed = true;
      }
    }

    // Generate new obstacles
    const topObstacle = obstacles[obstacles.length - 1];
    if (topObstacle && ball.y < topObstacle.y + 300) {
      this.addObstacle(topObstacle.y - 200);
    }

    // Remove off-screen obstacles
    this.state.obstacles = obstacles.filter((o) => o.y < ball.y + this.canvasHeight);
    this.state.stars = stars.filter((s) => s.y < ball.y + this.canvasHeight);
    this.state.colorSwitchers = colorSwitchers.filter((c) => c.y < ball.y + this.canvasHeight);

    // Check bottom boundary
    if (ball.y > this.canvasHeight + 50) {
      this.gameOver();
      return;
    }

    this.emitState();
  }

  private checkObstacleCollision(ball: Ball, obstacle: Obstacle): boolean {
    const centerX = this.canvasWidth / 2;
    const ballRadius = 12;

    if (obstacle.type === "ring") {
      const ringRadius = 60;
      const thickness = 15;
      const dist = Math.sqrt((ball.x - centerX) ** 2 + (ball.y - obstacle.y) ** 2);

      if (dist > ringRadius - thickness && dist < ringRadius + thickness) {
        // Check if ball color matches the ring segment
        const angle = Math.atan2(ball.y - obstacle.y, ball.x - centerX);
        const adjustedAngle = (angle + obstacle.rotation + Math.PI * 2) % (Math.PI * 2);
        const segmentIndex = Math.floor((adjustedAngle / (Math.PI * 2)) * 4);

        if (obstacle.colors[segmentIndex] !== ball.color) {
          return true;
        }
      }
    } else if (obstacle.type === "bar") {
      const barWidth = 120;
      const barHeight = 20;
      const barY = obstacle.y - barHeight / 2;

      if (
        ball.y + ballRadius > barY &&
        ball.y - ballRadius < barY + barHeight &&
        ball.x + ballRadius > centerX - barWidth / 2 &&
        ball.x - ballRadius < centerX + barWidth / 2
      ) {
        // Determine which half the ball is in
        const rotation = obstacle.rotation % (Math.PI * 2);
        const leftColor = rotation < Math.PI ? obstacle.colors[0] : obstacle.colors[2];
        const rightColor = rotation < Math.PI ? obstacle.colors[2] : obstacle.colors[0];

        const hitColor = ball.x < centerX ? leftColor : rightColor;
        if (hitColor !== ball.color) {
          return true;
        }
      }
    } else if (obstacle.type === "triangle") {
      const size = 80;
      const dist = Math.sqrt((ball.x - centerX) ** 2 + (ball.y - obstacle.y) ** 2);

      if (dist < size && dist > size - 20) {
        const angle = Math.atan2(ball.y - obstacle.y, ball.x - centerX);
        const adjustedAngle = (angle + obstacle.rotation + Math.PI * 2) % (Math.PI * 2);
        const segmentIndex = Math.floor((adjustedAngle / (Math.PI * 2)) * 3);

        if (obstacle.colors[segmentIndex % 4] !== ball.color) {
          return true;
        }
      }
    }

    return false;
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("colorSwitchHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getColors(): string[] {
    return COLORS;
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
