/**
 * Spin Maze Game Engine
 * Game #258
 *
 * Rotate the maze to guide a ball through obstacles to the goal!
 */

interface Point {
  x: number;
  y: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Level {
  walls: Wall[];
  start: Point;
  goal: Point;
}

interface GameState {
  level: number;
  time: number;
  status: "idle" | "playing" | "complete" | "victory";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 400;
const FRICTION = 0.98;
const BALL_RADIUS = 12;
const GOAL_RADIUS = 20;
const ROTATION_SPEED = 1.5;
const MAX_LEVELS = 5;

// Level definitions
const LEVELS: Level[] = [
  // Level 1 - Simple
  {
    start: { x: 0.15, y: 0.15 },
    goal: { x: 0.85, y: 0.85 },
    walls: [
      { x1: 0.3, y1: 0, x2: 0.3, y2: 0.6 },
      { x1: 0.6, y1: 0.4, x2: 0.6, y2: 1 },
    ],
  },
  // Level 2
  {
    start: { x: 0.1, y: 0.1 },
    goal: { x: 0.9, y: 0.9 },
    walls: [
      { x1: 0.25, y1: 0, x2: 0.25, y2: 0.5 },
      { x1: 0.5, y1: 0.3, x2: 0.5, y2: 0.8 },
      { x1: 0.75, y1: 0.5, x2: 0.75, y2: 1 },
    ],
  },
  // Level 3
  {
    start: { x: 0.5, y: 0.1 },
    goal: { x: 0.5, y: 0.9 },
    walls: [
      { x1: 0, y1: 0.3, x2: 0.7, y2: 0.3 },
      { x1: 0.3, y1: 0.5, x2: 1, y2: 0.5 },
      { x1: 0, y1: 0.7, x2: 0.7, y2: 0.7 },
    ],
  },
  // Level 4
  {
    start: { x: 0.1, y: 0.5 },
    goal: { x: 0.9, y: 0.5 },
    walls: [
      { x1: 0.2, y1: 0.2, x2: 0.2, y2: 0.8 },
      { x1: 0.4, y1: 0, x2: 0.4, y2: 0.6 },
      { x1: 0.6, y1: 0.4, x2: 0.6, y2: 1 },
      { x1: 0.8, y1: 0.2, x2: 0.8, y2: 0.8 },
    ],
  },
  // Level 5 - Complex
  {
    start: { x: 0.1, y: 0.1 },
    goal: { x: 0.9, y: 0.1 },
    walls: [
      { x1: 0.2, y1: 0, x2: 0.2, y2: 0.7 },
      { x1: 0.4, y1: 0.3, x2: 0.4, y2: 1 },
      { x1: 0.6, y1: 0, x2: 0.6, y2: 0.7 },
      { x1: 0.8, y1: 0.3, x2: 0.8, y2: 1 },
      { x1: 0.2, y1: 0.7, x2: 0.6, y2: 0.7 },
    ],
  },
];

export class SpinMazeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ball: Ball;
  private walls: Wall[] = [];
  private goal: Point = { x: 0, y: 0 };
  private rotation = 0;
  private rotationInput = 0;
  private level = 1;
  private time = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private size = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS };
    this.setupEvents();
  }

  private setupEvents() {
    document.addEventListener("keydown", (e) => {
      if (this.status !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.rotationInput = -1;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.rotationInput = 1;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "a" ||
        e.key === "A" ||
        e.key === "ArrowRight" ||
        e.key === "d" ||
        e.key === "D"
      ) {
        this.rotationInput = 0;
      }
    });
  }

  setRotationInput(dir: number) {
    this.rotationInput = dir;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        time: this.time,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.draw();
  }

  start() {
    this.level = 1;
    this.time = 0;
    this.rotation = 0;
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    this.time = 0;
    this.rotation = 0;
    if (this.level > MAX_LEVELS) {
      this.status = "victory";
      this.emitState();
      return;
    }
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private loadLevel() {
    const levelData = LEVELS[this.level - 1];
    const s = this.size;
    const padding = 40;
    const area = s - padding * 2;

    // Convert normalized coordinates to actual
    this.ball.x = padding + levelData.start.x * area;
    this.ball.y = padding + levelData.start.y * area;
    this.ball.vx = 0;
    this.ball.vy = 0;

    this.goal = {
      x: padding + levelData.goal.x * area,
      y: padding + levelData.goal.y * area,
    };

    this.walls = levelData.walls.map((w) => ({
      x1: padding + w.x1 * area,
      y1: padding + w.y1 * area,
      x2: padding + w.x2 * area,
      y2: padding + w.y2 * area,
    }));
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    this.time += dt;

    // Update rotation
    this.rotation += this.rotationInput * ROTATION_SPEED * dt;

    // Apply gravity in rotated reference frame
    const gravityAngle = -this.rotation;
    const gx = Math.sin(gravityAngle) * GRAVITY;
    const gy = Math.cos(gravityAngle) * GRAVITY;

    this.ball.vx += gx * dt;
    this.ball.vy += gy * dt;

    // Apply friction
    this.ball.vx *= FRICTION;
    this.ball.vy *= FRICTION;

    // Update position
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Collision with outer walls
    const padding = 40;
    const minX = padding + this.ball.radius;
    const maxX = this.size - padding - this.ball.radius;
    const minY = padding + this.ball.radius;
    const maxY = this.size - padding - this.ball.radius;

    if (this.ball.x < minX) {
      this.ball.x = minX;
      this.ball.vx *= -0.5;
    }
    if (this.ball.x > maxX) {
      this.ball.x = maxX;
      this.ball.vx *= -0.5;
    }
    if (this.ball.y < minY) {
      this.ball.y = minY;
      this.ball.vy *= -0.5;
    }
    if (this.ball.y > maxY) {
      this.ball.y = maxY;
      this.ball.vy *= -0.5;
    }

    // Collision with internal walls
    for (const wall of this.walls) {
      this.handleWallCollision(wall);
    }

    // Check goal
    const distToGoal = Math.hypot(
      this.ball.x - this.goal.x,
      this.ball.y - this.goal.y
    );
    if (distToGoal < this.ball.radius + GOAL_RADIUS) {
      this.levelComplete();
    }

    this.emitState();
  }

  private handleWallCollision(wall: Wall) {
    // Line segment collision
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;

    // Vector from wall start to ball
    const bx = this.ball.x - wall.x1;
    const by = this.ball.y - wall.y1;

    // Project ball onto line
    const proj = (bx * dx + by * dy) / len;
    const clampedProj = Math.max(0, Math.min(len, proj));

    // Closest point on wall
    const closestX = wall.x1 + (dx / len) * clampedProj;
    const closestY = wall.y1 + (dy / len) * clampedProj;

    // Distance to closest point
    const distX = this.ball.x - closestX;
    const distY = this.ball.y - closestY;
    const dist = Math.hypot(distX, distY);

    if (dist < this.ball.radius + 3) {
      // Push ball out
      const overlap = this.ball.radius + 3 - dist;
      const pushX = (distX / dist) * overlap;
      const pushY = (distY / dist) * overlap;
      this.ball.x += pushX;
      this.ball.y += pushY;

      // Reflect velocity
      const dot = this.ball.vx * (distX / dist) + this.ball.vy * (distY / dist);
      if (dot < 0) {
        this.ball.vx -= 1.5 * dot * (distX / dist);
        this.ball.vy -= 1.5 * dot * (distY / dist);
      }
    }
  }

  private levelComplete() {
    this.status = "complete";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.size;

    // Background
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, s, s);

    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(this.rotation);
    ctx.translate(-s / 2, -s / 2);

    // Draw maze area
    const padding = 40;
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(padding, padding, s - padding * 2, s - padding * 2);

    // Draw walls
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (const wall of this.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }

    // Draw goal
    const gradient = ctx.createRadialGradient(
      this.goal.x,
      this.goal.y,
      0,
      this.goal.x,
      this.goal.y,
      GOAL_RADIUS
    );
    gradient.addColorStop(0, "#00b894");
    gradient.addColorStop(1, "#00cec9");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.goal.x, this.goal.y, GOAL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Goal ring animation
    const time = performance.now() / 1000;
    ctx.strokeStyle = "rgba(0, 184, 148, 0.5)";
    ctx.lineWidth = 2;
    const ringSize = GOAL_RADIUS + 5 + Math.sin(time * 3) * 5;
    ctx.beginPath();
    ctx.arc(this.goal.x, this.goal.y, ringSize, 0, Math.PI * 2);
    ctx.stroke();

    // Draw ball
    this.drawBall();

    ctx.restore();

    // Draw border (not rotated)
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 4;
    ctx.strokeRect(padding, padding, s - padding * 2, s - padding * 2);

    // Draw rotation indicator
    this.drawRotationIndicator();
  }

  private drawBall() {
    const ctx = this.ctx;
    const { x, y, radius } = this.ball;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, "#ff7675");
    gradient.addColorStop(1, "#d63031");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawRotationIndicator() {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size - 20;

    // Arrow showing current gravity direction
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.rotation);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
