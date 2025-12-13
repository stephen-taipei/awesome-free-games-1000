/**
 * Ball Roll Game Engine
 * Game #246
 *
 * Roll the ball through obstacles using tilt/keyboard controls
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

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "block" | "moving" | "spike";
  moveDir?: number;
  moveSpeed?: number;
  moveRange?: number;
  startX?: number;
}

interface Collectible {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  type: "coin" | "star";
}

interface GameState {
  score: number;
  level: number;
  lives: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.3;
const FRICTION = 0.98;
const BOUNCE = 0.6;
const MAX_SPEED = 12;

export class BallRollGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 15 };
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private goal: { x: number; y: number; width: number; height: number } | null = null;
  private tiltX = 0;
  private tiltY = 0;
  private score = 0;
  private level = 1;
  private lives = 3;
  private status: "idle" | "playing" | "won" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

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
        level: this.level,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setTilt(x: number, y: number) {
    this.tiltX = Math.max(-1, Math.min(1, x));
    this.tiltY = Math.max(-1, Math.min(1, y));
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private loadLevel() {
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];

    const w = this.width;
    const h = this.height;

    // Ball start position
    this.ball = {
      x: 50,
      y: h - 50,
      vx: 0,
      vy: 0,
      radius: 15,
    };

    // Goal position
    this.goal = {
      x: w - 80,
      y: 30,
      width: 60,
      height: 40,
    };

    // Generate obstacles based on level
    const obstacleCount = 3 + this.level * 2;
    for (let i = 0; i < obstacleCount; i++) {
      const type = Math.random() < 0.3 ? "moving" : Math.random() < 0.5 ? "spike" : "block";
      const obstacle: Obstacle = {
        x: 80 + Math.random() * (w - 200),
        y: 80 + Math.random() * (h - 200),
        width: 40 + Math.random() * 60,
        height: 15 + Math.random() * 25,
        type,
      };

      if (type === "moving") {
        obstacle.moveDir = 1;
        obstacle.moveSpeed = 1 + Math.random() * 2;
        obstacle.moveRange = 50 + Math.random() * 50;
        obstacle.startX = obstacle.x;
      }

      this.obstacles.push(obstacle);
    }

    // Add collectibles
    const coinCount = 3 + this.level;
    for (let i = 0; i < coinCount; i++) {
      this.collectibles.push({
        x: 60 + Math.random() * (w - 120),
        y: 60 + Math.random() * (h - 120),
        radius: 12,
        collected: false,
        type: Math.random() < 0.2 ? "star" : "coin",
      });
    }
  }

  nextLevel() {
    this.level++;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Apply tilt as acceleration
    this.ball.vx += this.tiltX * GRAVITY * 2;
    this.ball.vy += this.tiltY * GRAVITY * 2;

    // Apply friction
    this.ball.vx *= FRICTION;
    this.ball.vy *= FRICTION;

    // Clamp speed
    this.ball.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, this.ball.vx));
    this.ball.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, this.ball.vy));

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall collisions
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = -this.ball.vx * BOUNCE;
    }
    if (this.ball.x + this.ball.radius > this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx = -this.ball.vx * BOUNCE;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = -this.ball.vy * BOUNCE;
    }
    if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.vy = -this.ball.vy * BOUNCE;
    }

    // Update moving obstacles
    for (const obs of this.obstacles) {
      if (obs.type === "moving" && obs.startX !== undefined) {
        obs.x += obs.moveSpeed! * obs.moveDir!;
        if (obs.x > obs.startX + obs.moveRange! || obs.x < obs.startX - obs.moveRange!) {
          obs.moveDir! *= -1;
        }
      }
    }

    // Check obstacle collisions
    for (const obs of this.obstacles) {
      if (this.checkBallRectCollision(obs)) {
        if (obs.type === "spike") {
          this.hitSpike();
          return;
        } else {
          this.resolveBallRectCollision(obs);
        }
      }
    }

    // Check collectibles
    for (const col of this.collectibles) {
      if (!col.collected) {
        const dx = this.ball.x - col.x;
        const dy = this.ball.y - col.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.ball.radius + col.radius) {
          col.collected = true;
          this.score += col.type === "star" ? 50 : 10;
          this.spawnParticles(col.x, col.y, col.type === "star" ? "#ffd700" : "#f1c40f");
          this.emitState();
        }
      }
    }

    // Check goal
    if (this.goal) {
      if (
        this.ball.x > this.goal.x &&
        this.ball.x < this.goal.x + this.goal.width &&
        this.ball.y > this.goal.y &&
        this.ball.y < this.goal.y + this.goal.height
      ) {
        this.levelComplete();
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private checkBallRectCollision(rect: Obstacle): boolean {
    const closestX = Math.max(rect.x, Math.min(this.ball.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(this.ball.y, rect.y + rect.height));
    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    return dx * dx + dy * dy < this.ball.radius * this.ball.radius;
  }

  private resolveBallRectCollision(rect: Obstacle) {
    const closestX = Math.max(rect.x, Math.min(this.ball.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(this.ball.y, rect.y + rect.height));

    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.ball.radius) {
      const overlap = this.ball.radius - dist;
      const nx = dx / dist || 0;
      const ny = dy / dist || 0;

      this.ball.x += nx * overlap;
      this.ball.y += ny * overlap;

      // Reflect velocity
      const dot = this.ball.vx * nx + this.ball.vy * ny;
      this.ball.vx = (this.ball.vx - 2 * dot * nx) * BOUNCE;
      this.ball.vy = (this.ball.vy - 2 * dot * ny) * BOUNCE;
    }
  }

  private hitSpike() {
    this.lives--;
    this.spawnParticles(this.ball.x, this.ball.y, "#e74c3c");
    this.emitState();

    if (this.lives <= 0) {
      this.status = "over";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    } else {
      // Reset ball position
      this.ball.x = 50;
      this.ball.y = this.height - 50;
      this.ball.vx = 0;
      this.ball.vy = 0;
    }
  }

  private levelComplete() {
    this.score += 100;
    this.status = "won";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.spawnParticles(this.ball.x, this.ball.y, "#2ecc71");
    this.emitState();
  }

  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 1,
        color,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw goal
    if (this.goal) {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.roundRect(this.goal.x, this.goal.y, this.goal.width, this.goal.height, 8);
      ctx.fill();

      // Goal glow
      ctx.shadowColor = "#2ecc71";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Flag icon
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(this.goal.x + 15, this.goal.y + 8);
      ctx.lineTo(this.goal.x + 15, this.goal.y + 32);
      ctx.lineTo(this.goal.x + 35, this.goal.y + 20);
      ctx.closePath();
      ctx.fill();
    }

    // Draw obstacles
    for (const obs of this.obstacles) {
      if (obs.type === "spike") {
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        const spikes = 4;
        for (let i = 0; i < spikes; i++) {
          const sx = obs.x + (obs.width / spikes) * i;
          ctx.moveTo(sx, obs.y + obs.height);
          ctx.lineTo(sx + obs.width / spikes / 2, obs.y);
          ctx.lineTo(sx + obs.width / spikes, obs.y + obs.height);
        }
        ctx.fill();
      } else {
        ctx.fillStyle = obs.type === "moving" ? "#9b59b6" : "#3498db";
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height / 3);
      }
    }

    // Draw collectibles
    for (const col of this.collectibles) {
      if (!col.collected) {
        if (col.type === "star") {
          ctx.fillStyle = "#ffd700";
          this.drawStar(col.x, col.y, col.radius);
        } else {
          ctx.fillStyle = "#f1c40f";
          ctx.beginPath();
          ctx.arc(col.x, col.y, col.radius, 0, Math.PI * 2);
          ctx.fill();

          // Shine
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(col.x - 3, col.y - 3, col.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw ball
    const ballGradient = ctx.createRadialGradient(
      this.ball.x - 5,
      this.ball.y - 5,
      0,
      this.ball.x,
      this.ball.y,
      this.ball.radius
    );
    ballGradient.addColorStop(0, "#ff6b6b");
    ballGradient.addColorStop(1, "#ee5a5a");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(this.ball.x + 5, this.ball.y + this.ball.radius + 5, this.ball.radius * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(this.ball.x - 5, this.ball.y - 5, this.ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Draw tilt indicator
    this.drawTiltIndicator();
  }

  private drawStar(x: number, y: number, radius: number) {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawTiltIndicator() {
    const ctx = this.ctx;
    const indicatorX = 40;
    const indicatorY = 40;
    const indicatorRadius = 25;

    // Outer circle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Tilt direction
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(
      indicatorX + this.tiltX * indicatorRadius * 0.7,
      indicatorY + this.tiltY * indicatorRadius * 0.7,
      8,
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
