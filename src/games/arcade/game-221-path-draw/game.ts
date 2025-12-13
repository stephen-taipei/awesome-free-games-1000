/**
 * Path Draw Game Logic
 * Game #221 - Draw a path to guide the ball to the goal
 */

export interface Point {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Level {
  start: Point;
  goal: Point;
  obstacles: Obstacle[];
  stars: Point[];
}

export interface GameState {
  phase: "idle" | "drawing" | "simulating" | "success" | "failed";
  level: number;
  score: number;
  ball: Ball;
  path: Point[];
  starsCollected: number;
  currentLevel: Level | null;
  inkRemaining: number;
}

const GRAVITY = 0.3;
const BALL_RADIUS = 12;
const GOAL_RADIUS = 25;
const MAX_INK = 500;

export class PathDrawGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      level: 1,
      score: 0,
      ball: { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS },
      path: [],
      starsCollected: 0,
      currentLevel: null,
      inkRemaining: MAX_INK,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "drawing",
    };
    this.loadLevel(1);
    this.emitState();
  }

  private loadLevel(level: number): void {
    const levels: Level[] = [
      {
        start: { x: 50, y: 100 },
        goal: { x: this.canvasWidth - 50, y: this.canvasHeight - 100 },
        obstacles: [],
        stars: [{ x: this.canvasWidth / 2, y: this.canvasHeight / 2 }],
      },
      {
        start: { x: 50, y: 80 },
        goal: { x: this.canvasWidth - 50, y: this.canvasHeight - 80 },
        obstacles: [
          { x: 100, y: 200, width: 150, height: 20 },
          { x: this.canvasWidth - 200, y: 300, width: 150, height: 20 },
        ],
        stars: [
          { x: 100, y: 150 },
          { x: this.canvasWidth - 100, y: 350 },
        ],
      },
      {
        start: { x: this.canvasWidth / 2, y: 60 },
        goal: { x: this.canvasWidth / 2, y: this.canvasHeight - 60 },
        obstacles: [
          { x: 50, y: 150, width: 120, height: 20 },
          { x: this.canvasWidth - 170, y: 150, width: 120, height: 20 },
          { x: this.canvasWidth / 2 - 60, y: 280, width: 120, height: 20 },
        ],
        stars: [
          { x: 80, y: 220 },
          { x: this.canvasWidth - 80, y: 220 },
          { x: this.canvasWidth / 2, y: 350 },
        ],
      },
    ];

    const lvl = levels[(level - 1) % levels.length];
    this.state.currentLevel = lvl;
    this.state.ball = {
      x: lvl.start.x,
      y: lvl.start.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
    };
    this.state.path = [];
    this.state.inkRemaining = MAX_INK;
    this.state.starsCollected = 0;
    this.state.level = level;
  }

  public addPathPoint(x: number, y: number): void {
    if (this.state.phase !== "drawing") return;
    if (this.state.inkRemaining <= 0) return;

    const lastPoint = this.state.path[this.state.path.length - 1];

    if (lastPoint) {
      const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
      if (dist < 5) return;

      this.state.inkRemaining -= dist * 0.5;
      if (this.state.inkRemaining < 0) this.state.inkRemaining = 0;
    }

    this.state.path.push({ x, y });
    this.emitState();
  }

  public startSimulation(): void {
    if (this.state.phase !== "drawing" || this.state.path.length < 2) return;

    this.state.phase = "simulating";
    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "simulating") return;

    const { ball, path, currentLevel } = this.state;
    if (!currentLevel) return;

    // Apply gravity
    ball.vy += GRAVITY;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Check path collision
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];

      if (this.ballIntersectsLine(ball, p1, p2)) {
        // Calculate normal direction
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Reflect velocity
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 1.8 * dot * nx;
        ball.vy -= 1.8 * dot * ny;

        // Add friction
        ball.vx *= 0.9;
        ball.vy *= 0.9;

        // Push ball out of line
        ball.x += nx * 2;
        ball.y += ny * 2;
      }
    }

    // Check obstacle collision
    for (const obs of currentLevel.obstacles) {
      if (this.ballIntersectsRect(ball, obs)) {
        // Simple bounce
        if (ball.vy > 0) {
          ball.y = obs.y - ball.radius;
          ball.vy = -ball.vy * 0.6;
        }
      }
    }

    // Check star collection
    for (let i = currentLevel.stars.length - 1; i >= 0; i--) {
      const star = currentLevel.stars[i];
      const dist = Math.sqrt((ball.x - star.x) ** 2 + (ball.y - star.y) ** 2);
      if (dist < ball.radius + 15) {
        currentLevel.stars.splice(i, 1);
        this.state.starsCollected++;
        this.state.score += 100;
      }
    }

    // Check goal
    const goalDist = Math.sqrt(
      (ball.x - currentLevel.goal.x) ** 2 + (ball.y - currentLevel.goal.y) ** 2
    );
    if (goalDist < GOAL_RADIUS) {
      this.state.phase = "success";
      this.state.score += 500 + this.state.inkRemaining;
      this.emitState();
      return;
    }

    // Check bounds
    if (ball.y > this.canvasHeight + 50 || ball.x < -50 || ball.x > this.canvasWidth + 50) {
      this.state.phase = "failed";
      this.emitState();
      return;
    }

    // Wall bounce
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx * 0.7;
    } else if (ball.x + ball.radius > this.canvasWidth) {
      ball.x = this.canvasWidth - ball.radius;
      ball.vx = -ball.vx * 0.7;
    }

    this.emitState();
  }

  private ballIntersectsLine(ball: Ball, p1: Point, p2: Point): boolean {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return false;

    const t = Math.max(
      0,
      Math.min(1, ((ball.x - p1.x) * dx + (ball.y - p1.y) * dy) / (len * len))
    );

    const nearestX = p1.x + t * dx;
    const nearestY = p1.y + t * dy;

    const dist = Math.sqrt((ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2);

    return dist < ball.radius + 3;
  }

  private ballIntersectsRect(ball: Ball, rect: Obstacle): boolean {
    const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));

    const dist = Math.sqrt((ball.x - closestX) ** 2 + (ball.y - closestY) ** 2);

    return dist < ball.radius;
  }

  public nextLevel(): void {
    this.state.phase = "drawing";
    this.loadLevel(this.state.level + 1);
    this.emitState();
  }

  public retry(): void {
    this.state.phase = "drawing";
    this.loadLevel(this.state.level);
    this.emitState();
  }

  public getMaxInk(): number {
    return MAX_INK;
  }

  public getGoalRadius(): number {
    return GOAL_RADIUS;
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
