/**
 * Dodgeball Game
 * Game #174 - Physics-based dodge game
 */

interface Player {
  x: number;
  y: number;
  radius: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class DodgeballGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private lives: number = 3;
  private status: "idle" | "playing" | "over" = "idle";
  private player: Player;
  private balls: Ball[] = [];
  private particles: Particle[] = [];
  private targetX: number = 0;
  private targetY: number = 0;
  private animationId: number = 0;
  private spawnTimer: number = 0;
  private scoreTimer: number = 0;
  private lastTime: number = 0;
  private invincible: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 20 };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.targetX = this.player.x;
    this.targetY = this.player.y;

    this.draw();
  }

  public start() {
    this.score = 0;
    this.lives = 3;
    this.status = "playing";
    this.balls = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.scoreTimer = 0;
    this.invincible = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.targetX = this.player.x;
    this.targetY = this.player.y;

    this.emitState();
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (this.status !== "playing") return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.spawnTimer += delta;
    this.scoreTimer += delta;

    // Spawn rate increases with score
    const spawnRate = Math.max(500 - this.score * 5, 200);
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnBall();
    }

    // Score increases over time
    if (this.scoreTimer > 100) {
      this.scoreTimer = 0;
      this.score++;
      this.emitState();
    }

    if (this.invincible > 0) {
      this.invincible -= delta;
    }

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private spawnBall() {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    const speed = 3 + Math.random() * 2 + this.score * 0.02;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.width;
        y = -20;
        vx = (Math.random() - 0.5) * 4;
        vy = speed;
        break;
      case 1: // Right
        x = this.width + 20;
        y = Math.random() * this.height;
        vx = -speed;
        vy = (Math.random() - 0.5) * 4;
        break;
      case 2: // Bottom
        x = Math.random() * this.width;
        y = this.height + 20;
        vx = (Math.random() - 0.5) * 4;
        vy = -speed;
        break;
      default: // Left
        x = -20;
        y = Math.random() * this.height;
        vx = speed;
        vy = (Math.random() - 0.5) * 4;
        break;
    }

    const colors = ["#e74c3c", "#f39c12", "#9b59b6", "#1abc9c", "#3498db"];
    const radius = 10 + Math.random() * 15;

    this.balls.push({
      x,
      y,
      vx,
      vy,
      radius,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  private update() {
    // Update player position
    this.player.x += (this.targetX - this.player.x) * 0.12;
    this.player.y += (this.targetY - this.player.y) * 0.12;

    // Constrain player
    this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));

    // Update balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Check collision with player
      if (this.invincible <= 0) {
        const dx = ball.x - this.player.x;
        const dy = ball.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ball.radius + this.player.radius) {
          this.lives--;
          this.invincible = 2000; // 2 seconds invincibility
          this.addHitParticles();
          this.emitState();

          if (this.lives <= 0) {
            this.endGame();
            return;
          }
        }
      }

      // Remove if off screen
      if (
        ball.x < -50 ||
        ball.x > this.width + 50 ||
        ball.y < -50 ||
        ball.y > this.height + 50
      ) {
        this.balls.splice(i, 1);
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private addHitParticles() {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color: "#e74c3c",
      });
    }
  }

  private endGame() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    // Background
    this.ctx.fillStyle = "#1a252f";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Grid pattern
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Draw balls
    for (const ball of this.balls) {
      // Shadow
      this.ctx.fillStyle = "rgba(0,0,0,0.3)";
      this.ctx.beginPath();
      this.ctx.ellipse(ball.x + 3, ball.y + 3, ball.radius, ball.radius * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Ball
      const gradient = this.ctx.createRadialGradient(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        0,
        ball.x,
        ball.y,
        ball.radius
      );
      gradient.addColorStop(0, this.lightenColor(ball.color, 30));
      gradient.addColorStop(1, ball.color);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Highlight
      this.ctx.fillStyle = "rgba(255,255,255,0.3)";
      this.ctx.beginPath();
      this.ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw player
    const blinkAlpha = this.invincible > 0 ? (Math.sin(Date.now() * 0.02) * 0.5 + 0.5) : 1;
    this.ctx.globalAlpha = blinkAlpha;

    // Player shadow
    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.ctx.beginPath();
    this.ctx.ellipse(this.player.x + 3, this.player.y + 3, this.player.radius, this.player.radius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body
    const playerGradient = this.ctx.createRadialGradient(
      this.player.x - this.player.radius * 0.3,
      this.player.y - this.player.radius * 0.3,
      0,
      this.player.x,
      this.player.y,
      this.player.radius
    );
    playerGradient.addColorStop(0, "#5dade2");
    playerGradient.addColorStop(1, "#2980b9");
    this.ctx.fillStyle = playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Player face
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 6, this.player.y - 5, 4, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 6, this.player.y - 5, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 6, this.player.y - 5, 2, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 6, this.player.y - 5, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Smile
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y + 2, 8, 0.2, Math.PI - 0.2);
    this.ctx.stroke();

    this.ctx.globalAlpha = 1;
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

  public handleMouseMove(x: number, y: number) {
    if (this.status !== "playing") return;
    this.targetX = x;
    this.targetY = y;
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
