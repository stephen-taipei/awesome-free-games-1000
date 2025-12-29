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
  row: number;
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
  brickBreak?: { x: number; y: number; color: string; row: number };
  ballMove?: { x: number; y: number };
  paddleHit?: { x: number; y: number };
  wallBounce?: { x: number; y: number };
  gameOver?: { x: number; y: number };
  lifeLost?: { x: number; y: number };
  victory?: boolean;
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
  private frameCount = 0;

  private pendingEvents: {
    brickBreak?: { x: number; y: number; color: string; row: number };
    ballMove?: { x: number; y: number };
    paddleHit?: { x: number; y: number };
    wallBounce?: { x: number; y: number };
    gameOver?: { x: number; y: number };
    lifeLost?: { x: number; y: number };
    victory?: boolean;
  } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      const state: GameState = {
        score: this.score,
        lives: this.lives,
        status: this.status,
        ...this.pendingEvents,
      };

      this.onStateChange(state);

      // Clear pending events after emission
      this.pendingEvents = {};
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
          row,
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

  // Expose paddle for keyboard control
  get paddleInfo() {
    return this.paddle;
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
    this.frameCount++;

    // Move ball
    this.ball.x += this.ball.dx * delta;
    this.ball.y += this.ball.dy * delta;

    // Emit ball position for trail (every few frames)
    if (this.frameCount % 3 === 0) {
      this.pendingEvents.ballMove = { x: this.ball.x, y: this.ball.y };
    }

    // Wall collision
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.dx *= -1;
      this.pendingEvents.wallBounce = { x: this.ball.x, y: this.ball.y };
      this.emitState();
    }
    if (this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.x = this.canvas.width - this.ball.radius;
      this.ball.dx *= -1;
      this.pendingEvents.wallBounce = { x: this.ball.x, y: this.ball.y };
      this.emitState();
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.dy *= -1;
      this.pendingEvents.wallBounce = { x: this.ball.x, y: this.ball.y };
      this.emitState();
    }

    // Bottom - lose life
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.lives--;
      this.pendingEvents.lifeLost = { x: this.ball.x, y: this.ball.y };
      this.emitState();
      if (this.lives <= 0) {
        this.pendingEvents.gameOver = { x: this.ball.x, y: this.ball.y };
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

      this.pendingEvents.paddleHit = { x: this.ball.x, y: this.paddle.y };
      this.emitState();
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

        // Emit brick break event with position and color
        this.pendingEvents.brickBreak = {
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          color: brick.color,
          row: brick.row,
        };
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
      this.pendingEvents.victory = true;
      this.status = "won";
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear with transparent for WebGPU background
    ctx.clearRect(0, 0, w, h);

    // Draw bricks
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      // Brick gradient
      const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      grad.addColorStop(0, brick.color);
      grad.addColorStop(1, this.darkenColor(brick.color, 30));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
      ctx.fill();

      // Glow effect
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);

      ctx.shadowBlur = 0;
    }

    // Draw paddle with glow
    ctx.shadowColor = "#a29bfe";
    ctx.shadowBlur = 15;

    const paddleGrad = ctx.createLinearGradient(0, this.paddle.y, 0, this.paddle.y + this.paddle.height);
    paddleGrad.addColorStop(0, "#dfe6e9");
    paddleGrad.addColorStop(1, "#b2bec3");
    ctx.fillStyle = paddleGrad;
    ctx.beginPath();
    ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Draw ball with glow
    ctx.shadowColor = "#74b9ff";
    ctx.shadowBlur = 20;

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
    ballGrad.addColorStop(1, "#74b9ff");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
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
