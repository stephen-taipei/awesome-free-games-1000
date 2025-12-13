/**
 * Bounce Maze Game Logic
 * Game #180 - Physics Maze
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Level {
  walls: Wall[];
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
}

interface GameState {
  level: number;
  status: "idle" | "aiming" | "playing" | "won" | "complete";
  bounces: number;
}

type StateChangeCallback = (state: GameState) => void;

const BALL_RADIUS = 12;
const GOAL_RADIUS = 20;
const FRICTION = 0.995;
const BOUNCE_DAMPING = 0.85;

const LEVELS: Level[] = [
  {
    startX: 50, startY: 200,
    goalX: 450, goalY: 200,
    walls: [
      { x: 150, y: 100, width: 20, height: 200 },
      { x: 300, y: 100, width: 20, height: 200 },
    ],
  },
  {
    startX: 50, startY: 350,
    goalX: 450, goalY: 50,
    walls: [
      { x: 0, y: 280, width: 350, height: 20 },
      { x: 150, y: 130, width: 350, height: 20 },
    ],
  },
  {
    startX: 50, startY: 50,
    goalX: 450, goalY: 350,
    walls: [
      { x: 100, y: 0, width: 20, height: 150 },
      { x: 200, y: 100, width: 20, height: 200 },
      { x: 300, y: 0, width: 20, height: 200 },
      { x: 100, y: 250, width: 200, height: 20 },
    ],
  },
  {
    startX: 250, startY: 350,
    goalX: 250, goalY: 50,
    walls: [
      { x: 50, y: 280, width: 150, height: 20 },
      { x: 300, y: 280, width: 150, height: 20 },
      { x: 100, y: 180, width: 300, height: 20 },
      { x: 50, y: 80, width: 150, height: 20 },
      { x: 300, y: 80, width: 150, height: 20 },
    ],
  },
  {
    startX: 50, startY: 200,
    goalX: 450, goalY: 200,
    walls: [
      { x: 120, y: 50, width: 20, height: 150 },
      { x: 120, y: 250, width: 20, height: 150 },
      { x: 240, y: 100, width: 20, height: 200 },
      { x: 360, y: 50, width: 20, height: 150 },
      { x: 360, y: 250, width: 20, height: 150 },
    ],
  },
  {
    startX: 50, startY: 50,
    goalX: 450, goalY: 350,
    walls: [
      { x: 0, y: 100, width: 400, height: 15 },
      { x: 100, y: 200, width: 400, height: 15 },
      { x: 0, y: 300, width: 400, height: 15 },
    ],
  },
];

export class BounceMazeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private ball: Ball;
  private walls: Wall[] = [];
  private goalX: number = 0;
  private goalY: number = 0;
  private bounces: number = 0;
  private isAiming: boolean = false;
  private isMoving: boolean = false;
  private aimX: number = 0;
  private aimY: number = 0;
  private animationId: number = 0;

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS };
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.draw();
  }

  private initLevel() {
    const level = LEVELS[this.currentLevel];
    this.ball = {
      x: level.startX,
      y: level.startY,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
    };
    this.walls = level.walls.map(w => ({ ...w }));
    this.goalX = level.goalX;
    this.goalY = level.goalY;
    this.bounces = 0;
    this.isAiming = true;
    this.isMoving = false;
    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        bounces: this.bounces,
      });
    }
  }

  private getStatus(): "idle" | "aiming" | "playing" | "won" | "complete" {
    if (!this.isAiming && !this.isMoving) return "idle";
    if (this.isAiming) return "aiming";
    return "playing";
  }

  start() {
    this.initLevel();
    this.draw();
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.initLevel();
    this.draw();
  }

  restart() {
    cancelAnimationFrame(this.animationId);
    this.currentLevel = 0;
    this.isAiming = false;
    this.isMoving = false;
    this.draw();
    this.emitState();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.draw();
    }
  }

  handleMouseMove(x: number, y: number) {
    if (!this.isAiming) return;
    this.aimX = x;
    this.aimY = y;
    this.draw();
  }

  handleClick(x: number, y: number) {
    if (!this.isAiming) return;

    const dx = x - this.ball.x;
    const dy = y - this.ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist / 20, 15);

    this.ball.vx = (dx / dist) * power;
    this.ball.vy = (dy / dist) * power;
    this.isAiming = false;
    this.isMoving = true;
    this.gameLoop();
  }

  private gameLoop() {
    if (!this.isMoving) return;

    this.update();
    this.draw();
    this.emitState();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Apply friction
    this.ball.vx *= FRICTION;
    this.ball.vy *= FRICTION;

    // Check wall collisions
    for (const wall of this.walls) {
      if (this.ballWallCollision(wall)) {
        this.bounces++;
      }
    }

    // Check boundary collisions
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx *= -BOUNCE_DAMPING;
      this.bounces++;
    }
    if (this.ball.x + this.ball.radius > this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx *= -BOUNCE_DAMPING;
      this.bounces++;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -BOUNCE_DAMPING;
      this.bounces++;
    }
    if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.vy *= -BOUNCE_DAMPING;
      this.bounces++;
    }

    // Check goal
    const goalDist = Math.sqrt((this.ball.x - this.goalX) ** 2 + (this.ball.y - this.goalY) ** 2);
    if (goalDist < GOAL_RADIUS + this.ball.radius) {
      this.isMoving = false;
      cancelAnimationFrame(this.animationId);

      if (this.currentLevel >= LEVELS.length - 1) {
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            status: "complete",
            bounces: this.bounces,
          });
        }
      } else {
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            status: "won",
            bounces: this.bounces,
          });
        }
      }
      return;
    }

    // Check if stopped
    const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (speed < 0.1) {
      this.isMoving = false;
      this.isAiming = true;
      cancelAnimationFrame(this.animationId);
    }
  }

  private ballWallCollision(wall: Wall): boolean {
    const closestX = Math.max(wall.x, Math.min(this.ball.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(this.ball.y, wall.y + wall.height));

    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.ball.radius) {
      // Push ball out
      const overlap = this.ball.radius - dist;
      if (dist > 0) {
        this.ball.x += (dx / dist) * overlap;
        this.ball.y += (dy / dist) * overlap;
      }

      // Reflect velocity
      if (Math.abs(dx) > Math.abs(dy)) {
        this.ball.vx *= -BOUNCE_DAMPING;
      } else {
        this.ball.vy *= -BOUNCE_DAMPING;
      }

      return true;
    }
    return false;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw walls
    ctx.fillStyle = "#34495e";
    for (const wall of this.walls) {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    // Draw goal
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.arc(this.goalX, this.goalY, GOAL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(this.goalX, this.goalY, GOAL_RADIUS - 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw aim line
    if (this.isAiming && this.aimX && this.aimY) {
      ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.ball.x, this.ball.y);
      ctx.lineTo(this.aimX, this.aimY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      const angle = Math.atan2(this.aimY - this.ball.y, this.aimX - this.ball.x);
      ctx.fillStyle = "rgba(231, 76, 60, 0.7)";
      ctx.beginPath();
      ctx.moveTo(this.aimX, this.aimY);
      ctx.lineTo(this.aimX - 15 * Math.cos(angle - 0.3), this.aimY - 15 * Math.sin(angle - 0.3));
      ctx.lineTo(this.aimX - 15 * Math.cos(angle + 0.3), this.aimY - 15 * Math.sin(angle + 0.3));
      ctx.closePath();
      ctx.fill();
    }

    // Draw ball
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(this.ball.x - 3, this.ball.y - 3, this.ball.radius / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
