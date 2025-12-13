/**
 * Breakout Game Engine
 * Game #153
 *
 * Classic brick breaker - destroy all bricks!
 */

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alive: boolean;
  points: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  score: number;
  lives: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"];

export class BreakoutGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bricks: Brick[] = [];
  private ball: Ball = { x: 0, y: 0, dx: 0, dy: 0, radius: 8 };
  private paddle: Paddle = { x: 0, y: 0, width: 80, height: 12 };
  private score = 0;
  private lives = 3;
  private status: "idle" | "playing" | "won" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastUpdate = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Update paddle
    this.paddle.y = this.canvas.height - 40;
    this.paddle.width = Math.min(this.canvas.width * 0.2, 100);

    this.createBricks();
    this.draw();
  }

  private createBricks() {
    this.bricks = [];
    const brickWidth = (this.canvas.width - 40) / BRICK_COLS;
    const brickHeight = 20;
    const startY = 60;

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        this.bricks.push({
          x: 20 + col * brickWidth,
          y: startY + row * (brickHeight + 4),
          width: brickWidth - 4,
          height: brickHeight,
          color: BRICK_COLORS[row % BRICK_COLORS.length],
          alive: true,
          points: (BRICK_ROWS - row) * 10,
        });
      }
    }
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.createBricks();
    this.resetBall();
    this.status = "playing";
    this.emitState();
    this.lastUpdate = performance.now();
    this.gameLoop();
  }

  private resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.paddle.y - 20;
    const angle = (Math.random() * 0.5 + 0.25) * Math.PI; // 45-135 degrees upward
    const speed = 5;
    this.ball.dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    this.ball.dy = -Math.abs(Math.sin(angle) * speed);
  }

  setPaddlePosition(x: number) {
    if (this.status !== "playing") return;
    this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, x - this.paddle.width / 2));
  }

  private gameLoop() {
    const now = performance.now();
    const delta = (now - this.lastUpdate) / 16.67; // Normalize to ~60fps
    this.lastUpdate = now;

    this.update(delta);
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update(delta: number) {
    // Move ball
    this.ball.x += this.ball.dx * delta;
    this.ball.y += this.ball.dy * delta;

    // Wall collision
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.dx *= -1;
    }
    if (this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.x = this.canvas.width - this.ball.radius;
      this.ball.dx *= -1;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.dy *= -1;
    }

    // Bottom - lose life
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.lives--;
      this.emitState();
      if (this.lives <= 0) {
        this.status = "over";
        this.emitState();
        return;
      }
      this.resetBall();
    }

    // Paddle collision
    if (
      this.ball.y + this.ball.radius > this.paddle.y &&
      this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
      this.ball.x > this.paddle.x &&
      this.ball.x < this.paddle.x + this.paddle.width
    ) {
      // Calculate bounce angle based on where ball hits paddle
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.7; // -63 to +63 degrees

      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = Math.sin(angle) * speed;
      this.ball.dy = -Math.abs(Math.cos(angle) * speed);

      this.ball.y = this.paddle.y - this.ball.radius;
    }

    // Brick collision
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      if (
        this.ball.x + this.ball.radius > brick.x &&
        this.ball.x - this.ball.radius < brick.x + brick.width &&
        this.ball.y + this.ball.radius > brick.y &&
        this.ball.y - this.ball.radius < brick.y + brick.height
      ) {
        brick.alive = false;
        this.score += brick.points;
        this.emitState();

        // Determine bounce direction
        const overlapLeft = this.ball.x + this.ball.radius - brick.x;
        const overlapRight = brick.x + brick.width - (this.ball.x - this.ball.radius);
        const overlapTop = this.ball.y + this.ball.radius - brick.y;
        const overlapBottom = brick.y + brick.height - (this.ball.y - this.ball.radius);

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          this.ball.dx *= -1;
        } else {
          this.ball.dy *= -1;
        }

        break;
      }
    }

    // Check win
    if (this.bricks.every((b) => !b.alive)) {
      this.status = "won";
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, w, h);

    // Draw bricks
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      // Brick gradient
      const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      grad.addColorStop(0, brick.color);
      grad.addColorStop(1, this.darkenColor(brick.color, 30));

      ctx.fillStyle = grad;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(brick.x, brick.y, brick.width, 3);

      // Border
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    }

    // Draw paddle
    const paddleGrad = ctx.createLinearGradient(0, this.paddle.y, 0, this.paddle.y + this.paddle.height);
    paddleGrad.addColorStop(0, "#dfe6e9");
    paddleGrad.addColorStop(1, "#b2bec3");
    ctx.fillStyle = paddleGrad;
    ctx.beginPath();
    ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 6);
    ctx.fill();

    // Draw ball
    const ballGrad = ctx.createRadialGradient(
      this.ball.x - 2,
      this.ball.y - 2,
      0,
      this.ball.x,
      this.ball.y,
      this.ball.radius
    );
    ballGrad.addColorStop(0, "#fff");
    ballGrad.addColorStop(0.3, "#dfe6e9");
    ballGrad.addColorStop(1, "#b2bec3");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball trail effect
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(this.ball.x - this.ball.dx, this.ball.y - this.ball.dy, this.ball.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
