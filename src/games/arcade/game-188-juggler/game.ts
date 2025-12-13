/**
 * Juggler Game Engine
 * Game #188
 *
 * Keep all balls in the air by clicking/tapping them!
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
}

interface GameState {
  score: number;
  balls: number;
  combo: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const BALL_COLORS = [
  { main: "#e74c3c", glow: "#ff6b6b" },
  { main: "#3498db", glow: "#5dade2" },
  { main: "#f39c12", glow: "#f5b041" },
  { main: "#2ecc71", glow: "#58d68d" },
  { main: "#9b59b6", glow: "#bb8fce" },
];

export class JugglerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private balls: Ball[] = [];
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private addBallTimer = 0;
  private addBallInterval = 300;
  private maxBalls = 7;
  private gravity = 0.15;

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
        balls: this.balls.length,
        combo: this.combo,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.draw();
  }

  start() {
    this.balls = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.addBallTimer = 0;
    this.addBallInterval = 300;

    // Start with 3 balls
    for (let i = 0; i < 3; i++) {
      this.addBall();
    }

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private addBall() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const colorSet = BALL_COLORS[this.balls.length % BALL_COLORS.length];

    this.balls.push({
      x: w * 0.2 + Math.random() * w * 0.6,
      y: h * 0.3,
      vx: (Math.random() - 0.5) * 4,
      vy: -5 - Math.random() * 3,
      radius: w * 0.05,
      color: colorSet.main,
      glowColor: colorSet.glow,
    });

    this.emitState();
  }

  handleClick(clientX: number, clientY: number) {
    if (this.status !== "playing") return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Check if clicked on a ball
    for (const ball of this.balls) {
      const dx = x - ball.x;
      const dy = y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= ball.radius * 1.5) {
        // Bounce the ball
        ball.vy = -8 - Math.random() * 3;
        ball.vx = (Math.random() - 0.5) * 6;

        // Score
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 10 * this.combo;
        this.emitState();

        return;
      }
    }

    // Missed - reset combo
    this.combo = 0;
    this.emitState();
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Add new ball periodically
    if (this.balls.length < this.maxBalls) {
      this.addBallTimer++;
      if (this.addBallTimer >= this.addBallInterval) {
        this.addBallTimer = 0;
        this.addBall();
        this.addBallInterval = Math.max(150, this.addBallInterval - 20);
      }
    }

    // Update balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];

      // Apply gravity
      ball.vy += this.gravity;

      // Move
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bounce off walls
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -0.8;
      } else if (ball.x + ball.radius > w) {
        ball.x = w - ball.radius;
        ball.vx *= -0.8;
      }

      // Bounce off ceiling
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.5;
      }

      // Check if ball fell
      if (ball.y - ball.radius > h) {
        this.balls.splice(i, 1);
        this.combo = 0;
        this.emitState();

        if (this.balls.length === 0) {
          this.status = "over";
          this.emitState();
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#16213e");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 30; i++) {
      const x = (i * 137) % w;
      const y = (i * 251) % (h * 0.7);
      const size = (i % 3) + 1;
      const alpha = 0.3 + Math.sin(Date.now() / 500 + i) * 0.2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Spotlight effect
    const spotlightGradient = ctx.createRadialGradient(
      w / 2,
      h,
      0,
      w / 2,
      h,
      h
    );
    spotlightGradient.addColorStop(0, "rgba(155, 89, 182, 0.3)");
    spotlightGradient.addColorStop(0.5, "rgba(155, 89, 182, 0.1)");
    spotlightGradient.addColorStop(1, "transparent");
    ctx.fillStyle = spotlightGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw juggler (simple)
    this.drawJuggler();

    // Draw balls
    for (const ball of this.balls) {
      this.drawBall(ball);
    }

    // Draw danger zone indicator
    ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, h - 50);
    ctx.lineTo(w, h - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Combo display
    if (this.combo > 1) {
      ctx.fillStyle = "#f39c12";
      ctx.font = `bold ${w * 0.08}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${this.combo}x COMBO!`, w / 2, h * 0.15);
    }
  }

  private drawJuggler() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const x = w / 2;
    const y = h - 30;

    // Body
    ctx.fillStyle = "#9b59b6";
    ctx.beginPath();
    ctx.ellipse(x, y - 30, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#ffd5a3";
    ctx.beginPath();
    ctx.arc(x, y - 70, 15, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = "#8e44ad";
    ctx.beginPath();
    ctx.ellipse(x, y - 80, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 10, y - 95, 20, 15);

    // Arms (animated)
    const armWave = Math.sin(Date.now() / 200) * 0.3;
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x - 15, y - 40);
    ctx.quadraticCurveTo(x - 40, y - 60 + armWave * 20, x - 50, y - 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 15, y - 40);
    ctx.quadraticCurveTo(x + 40, y - 60 - armWave * 20, x + 50, y - 80);
    ctx.stroke();
  }

  private drawBall(ball: Ball) {
    const ctx = this.ctx;

    // Glow effect
    const glowGradient = ctx.createRadialGradient(
      ball.x,
      ball.y,
      0,
      ball.x,
      ball.y,
      ball.radius * 2
    );
    glowGradient.addColorStop(0, ball.glowColor);
    glowGradient.addColorStop(0.5, `${ball.color}88`);
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    const ballGradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      0,
      ball.x,
      ball.y,
      ball.radius
    );
    ballGradient.addColorStop(0, ball.glowColor);
    ballGradient.addColorStop(0.7, ball.color);
    ballGradient.addColorStop(1, "#000");

    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
