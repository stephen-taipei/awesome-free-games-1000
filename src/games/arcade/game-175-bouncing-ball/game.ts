/**
 * Bouncing Ball (Breakout) Game
 * Game #175 - Physics-based brick breaker
 */

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hits: number;
  maxHits: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class BouncingBallGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private lives: number = 3;
  private level: number = 1;
  private status: "idle" | "playing" | "won" | "over" = "idle";
  private paddle: Paddle;
  private ball: Ball;
  private bricks: Brick[] = [];
  private particles: Particle[] = [];
  private targetX: number = 0;
  private animationId: number = 0;
  private launched: boolean = false;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.paddle = { x: 0, y: 0, width: 100, height: 15 };
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 10, speed: 6 };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.paddle.y = this.height - 40;
    this.paddle.x = this.width / 2 - this.paddle.width / 2;
    this.targetX = this.paddle.x;

    this.draw();
  }

  public start() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = "playing";
    this.particles = [];
    this.launched = false;

    this.setupBricks();
    this.resetBall();

    this.emitState();
    this.loop();
  }

  private setupBricks() {
    this.bricks = [];
    const rows = 4 + Math.min(this.level, 3);
    const cols = 8;
    const brickWidth = (this.width - 40) / cols;
    const brickHeight = 25;

    const colors = [
      "#ff6b9d",
      "#c44569",
      "#f8b500",
      "#00d4ff",
      "#0099cc",
      "#7bed9f",
      "#a55eea",
    ];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const maxHits = row < 2 ? 2 : 1;
        this.bricks.push({
          x: 20 + col * brickWidth,
          y: 60 + row * (brickHeight + 5),
          width: brickWidth - 4,
          height: brickHeight,
          color: colors[row % colors.length],
          hits: 0,
          maxHits,
        });
      }
    }
  }

  private resetBall() {
    this.ball.x = this.paddle.x + this.paddle.width / 2;
    this.ball.y = this.paddle.y - this.ball.radius - 5;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.launched = false;
  }

  private launchBall() {
    if (this.launched) return;
    this.launched = true;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    this.ball.vx = Math.cos(angle) * this.ball.speed;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  private loop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    // Update paddle
    this.paddle.x += (this.targetX - this.paddle.x) * 0.15;
    this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x));

    // Ball follows paddle if not launched
    if (!this.launched) {
      this.ball.x = this.paddle.x + this.paddle.width / 2;
      this.ball.y = this.paddle.y - this.ball.radius - 5;
      return;
    }

    // Update ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall collisions
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx *= -1;
    }
    if (this.ball.x + this.ball.radius > this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx *= -1;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
    }

    // Bottom - lose life
    if (this.ball.y > this.height + 20) {
      this.lives--;
      this.emitState();
      if (this.lives <= 0) {
        this.endGame(false);
        return;
      }
      this.resetBall();
    }

    // Paddle collision
    if (
      this.ball.y + this.ball.radius > this.paddle.y &&
      this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
      this.ball.x > this.paddle.x &&
      this.ball.x < this.paddle.x + this.paddle.width &&
      this.ball.vy > 0
    ) {
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      const angle = (hitPos - 0.5) * Math.PI * 0.7;
      const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);

      this.ball.vx = Math.sin(angle) * speed;
      this.ball.vy = -Math.abs(Math.cos(angle) * speed);
      this.ball.y = this.paddle.y - this.ball.radius;

      this.addParticles(this.ball.x, this.ball.y, "#00d4ff", 5);
    }

    // Brick collisions
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const brick = this.bricks[i];
      if (this.checkBrickCollision(brick)) {
        brick.hits++;
        if (brick.hits >= brick.maxHits) {
          this.addParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 10);
          this.bricks.splice(i, 1);
          this.score += 10 * brick.maxHits;
        } else {
          this.score += 5;
        }
        this.emitState();
      }
    }

    // Check win
    if (this.bricks.length === 0) {
      this.level++;
      if (this.level > 3) {
        this.endGame(true);
      } else {
        this.ball.speed += 0.5;
        this.setupBricks();
        this.resetBall();
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private checkBrickCollision(brick: Brick): boolean {
    const bx = this.ball.x;
    const by = this.ball.y;
    const br = this.ball.radius;

    // Find closest point on brick to ball
    const closestX = Math.max(brick.x, Math.min(bx, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(by, brick.y + brick.height));

    const dx = bx - closestX;
    const dy = by - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < br) {
      // Determine which side was hit
      const overlapX = br - Math.abs(dx);
      const overlapY = br - Math.abs(dy);

      if (overlapX < overlapY) {
        this.ball.vx *= -1;
        this.ball.x += dx > 0 ? overlapX : -overlapX;
      } else {
        this.ball.vy *= -1;
        this.ball.y += dy > 0 ? overlapY : -overlapY;
      }
      return true;
    }
    return false;
  }

  private addParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 1,
        color,
      });
    }
  }

  private endGame(won: boolean) {
    this.status = won ? "won" : "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0f0f23");
    gradient.addColorStop(1, "#1a1a35");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    this.ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.width;
      const y = (i * 53) % this.height;
      const size = ((i * 7) % 3) + 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw bricks
    for (const brick of this.bricks) {
      // Brick shadow
      this.ctx.fillStyle = "rgba(0,0,0,0.3)";
      this.ctx.fillRect(brick.x + 3, brick.y + 3, brick.width, brick.height);

      // Brick body
      const alpha = brick.hits > 0 ? 0.6 : 1;
      this.ctx.globalAlpha = alpha;

      const brickGradient = this.ctx.createLinearGradient(
        brick.x,
        brick.y,
        brick.x,
        brick.y + brick.height
      );
      brickGradient.addColorStop(0, this.lightenColor(brick.color, 20));
      brickGradient.addColorStop(1, brick.color);
      this.ctx.fillStyle = brickGradient;
      this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

      // Brick highlight
      this.ctx.fillStyle = "rgba(255,255,255,0.2)";
      this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 3);

      this.ctx.globalAlpha = 1;
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Draw paddle
    const paddleGradient = this.ctx.createLinearGradient(
      this.paddle.x,
      this.paddle.y,
      this.paddle.x,
      this.paddle.y + this.paddle.height
    );
    paddleGradient.addColorStop(0, "#00d4ff");
    paddleGradient.addColorStop(1, "#0099cc");
    this.ctx.fillStyle = paddleGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 5);
    this.ctx.fill();

    // Paddle glow
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "#00d4ff";
    this.ctx.fillStyle = "rgba(0,212,255,0.3)";
    this.ctx.beginPath();
    this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 5);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Draw ball
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = "#ff6b9d";
    const ballGradient = this.ctx.createRadialGradient(
      this.ball.x - this.ball.radius * 0.3,
      this.ball.y - this.ball.radius * 0.3,
      0,
      this.ball.x,
      this.ball.y,
      this.ball.radius
    );
    ballGradient.addColorStop(0, "#fff");
    ballGradient.addColorStop(0.3, "#ff6b9d");
    ballGradient.addColorStop(1, "#c44569");
    this.ctx.fillStyle = ballGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Ball trail
    if (this.launched) {
      for (let i = 1; i <= 5; i++) {
        const alpha = 1 - i / 5;
        this.ctx.fillStyle = `rgba(255, 107, 157, ${alpha * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(
          this.ball.x - this.ball.vx * i * 0.5,
          this.ball.y - this.ball.vy * i * 0.5,
          this.ball.radius * (1 - i * 0.1),
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  }

  public handleMouseMove(x: number) {
    if (this.status !== "playing") return;
    this.targetX = x - this.paddle.width / 2;
  }

  public handleClick() {
    if (this.status === "playing" && !this.launched) {
      this.launchBall();
    }
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
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
}
