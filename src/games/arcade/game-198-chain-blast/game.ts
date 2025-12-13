/**
 * Chain Blast Game Engine
 * Game #198 - Chain reaction explosions
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  exploded: boolean;
  exploding: boolean;
  explosionRadius: number;
  explosionMaxRadius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface LevelConfig {
  ballCount: number;
  targetCount: number;
  ballSpeed: number;
}

export class ChainBlastGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private balls: Ball[] = [];
  private particles: Particle[] = [];
  private explosions: { x: number; y: number; radius: number; maxRadius: number }[] = [];

  private score = 0;
  private maxChain = 0;
  private currentChain = 0;
  private targetCount = 0;
  private clicksLeft = 1;

  private currentLevel = 0;
  private status: "idle" | "playing" | "exploding" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;

  private colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8", "#a29bfe"];

  private levels: LevelConfig[] = [
    { ballCount: 10, targetCount: 5, ballSpeed: 1.5 },
    { ballCount: 15, targetCount: 8, ballSpeed: 1.8 },
    { ballCount: 20, targetCount: 12, ballSpeed: 2 },
    { ballCount: 25, targetCount: 18, ballSpeed: 2.2 },
    { ballCount: 30, targetCount: 25, ballSpeed: 2.5 },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    this.canvas.addEventListener("click", (e) => {
      if (this.status !== "playing" || this.clicksLeft <= 0) return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.triggerExplosion(x, y);
      this.clicksLeft--;
      this.status = "exploding";
    });
  }

  private triggerExplosion(x: number, y: number) {
    this.explosions.push({
      x,
      y,
      radius: 0,
      maxRadius: 60,
    });
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];

    this.balls = [];
    this.particles = [];
    this.explosions = [];

    for (let i = 0; i < config.ballCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.ballSpeed * (0.5 + Math.random() * 0.5);

      this.balls.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 50 + Math.random() * (this.canvas.height - 100),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 12 + Math.random() * 8,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        exploded: false,
        exploding: false,
        explosionRadius: 0,
        explosionMaxRadius: 50 + Math.random() * 30,
      });
    }

    this.score = 0;
    this.maxChain = 0;
    this.currentChain = 0;
    this.targetCount = config.targetCount;
    this.clicksLeft = 1;

    this.updateState();
  }

  private gameLoop() {
    if (this.status === "won" || this.status === "lost") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update balls
    for (const ball of this.balls) {
      if (ball.exploded) continue;

      if (!ball.exploding) {
        // Move ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce off walls
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > this.canvas.width) {
          ball.vx *= -1;
          ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
        }
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > this.canvas.height) {
          ball.vy *= -1;
          ball.y = Math.max(ball.radius, Math.min(this.canvas.height - ball.radius, ball.y));
        }

        // Check for explosion collision
        for (const exp of this.explosions) {
          const dist = Math.hypot(ball.x - exp.x, ball.y - exp.y);
          if (dist < exp.radius + ball.radius) {
            ball.exploding = true;
            this.currentChain++;
            this.maxChain = Math.max(this.maxChain, this.currentChain);
            break;
          }
        }

        // Check for ball-to-ball explosion
        for (const other of this.balls) {
          if (other === ball || !other.exploding || other.exploded) continue;

          const dist = Math.hypot(ball.x - other.x, ball.y - other.y);
          if (dist < other.explosionRadius + ball.radius) {
            ball.exploding = true;
            this.currentChain++;
            this.maxChain = Math.max(this.maxChain, this.currentChain);
            break;
          }
        }
      } else {
        // Expanding explosion
        ball.explosionRadius += 3;

        if (ball.explosionRadius >= ball.explosionMaxRadius) {
          ball.exploded = true;
          this.score++;
          this.createParticles(ball.x, ball.y, ball.color);
          this.updateState();
        }
      }
    }

    // Update manual explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.radius += 4;
      if (exp.radius >= exp.maxRadius) {
        this.explosions.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= 0.02;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check for game end
    if (this.status === "exploding") {
      const anyExploding = this.balls.some((b) => b.exploding && !b.exploded);
      const anyExplosions = this.explosions.length > 0;

      if (!anyExploding && !anyExplosions) {
        // Chain reaction finished
        if (this.score >= this.targetCount) {
          this.win();
        } else if (this.clicksLeft <= 0) {
          this.lose();
        }
      }
    }
  }

  private createParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }

  private win() {
    this.status = "won";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "won" });
    }
  }

  private lose() {
    this.status = "lost";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "lost" });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        target: this.targetCount,
        chain: this.maxChain,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw manual explosions
    for (const exp of this.explosions) {
      const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      gradient.addColorStop(0, "rgba(255, 200, 100, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 100, 50, 0.5)");
      gradient.addColorStop(1, "rgba(255, 50, 50, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw balls
    for (const ball of this.balls) {
      if (ball.exploded) continue;

      if (ball.exploding) {
        // Explosion effect
        const gradient = ctx.createRadialGradient(
          ball.x, ball.y, 0,
          ball.x, ball.y, ball.explosionRadius
        );
        gradient.addColorStop(0, "rgba(255, 255, 200, 0.9)");
        gradient.addColorStop(0.3, ball.color);
        gradient.addColorStop(1, "rgba(255, 100, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.explosionRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal ball
        const gradient = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3,
          ball.y - ball.radius * 0.3,
          0,
          ball.x,
          ball.y,
          ball.radius
        );
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.3, ball.color);
        gradient.addColorStop(1, this.darkenColor(ball.color));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw UI
    this.drawUI(ctx);
  }

  private darkenColor(hex: string): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const R = Math.max(0, (num >> 16) - 50);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - 50);
    const B = Math.max(0, (num & 0x0000ff) - 50);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Progress bar
    const barWidth = 200;
    const barHeight = 10;
    const x = (this.canvas.width - barWidth) / 2;
    const y = 15;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const progress = Math.min(1, this.score / this.targetCount);
    ctx.fillStyle = progress >= 1 ? "#4caf50" : "#ff9800";
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Score text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${this.score} / ${this.targetCount}`, this.canvas.width / 2, y + 35);

    // Click hint
    if (this.status === "playing" && this.clicksLeft > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "12px sans-serif";
      ctx.fillText("Click to start chain reaction!", this.canvas.width / 2, this.canvas.height - 20);
    }
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getScore(): number {
    return this.score;
  }

  public getChain(): number {
    return this.maxChain;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
