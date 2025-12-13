/**
 * Bounce Master Game Engine
 * Game #267
 *
 * Calculate angle and use bounces to hit all targets!
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  bounces: number;
}

interface Target {
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  score: number;
  level: number;
  shots: number;
  status: "idle" | "aiming" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const BALL_SPEED = 12;
const MAX_BOUNCES = 8;
const BALL_RADIUS = 10;
const TARGET_RADIUS = 20;

export class BounceGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ball: Ball | null = null;
  private targets: Target[] = [];
  private obstacles: Obstacle[] = [];
  private launcherX = 0;
  private launcherY = 0;
  private aimX = 0;
  private aimY = 0;
  private isAiming = false;
  private score = 0;
  private level = 1;
  private shots = 3;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

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
        shots: this.shots,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.launcherX = this.canvas.width / 2;
    this.launcherY = this.canvas.height - 40;
    this.draw();
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.shots = 3;
    this.status = "aiming";
    this.setupLevel();
    this.emitState();
    this.gameLoop();
  }

  private setupLevel() {
    this.targets = [];
    this.obstacles = [];
    this.ball = null;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Create targets based on level
    const targetCount = Math.min(3 + Math.floor(this.level / 2), 8);
    const margin = 50;

    for (let i = 0; i < targetCount; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = margin + Math.random() * (w - margin * 2);
        y = margin + Math.random() * (h - 150);
        attempts++;
      } while (this.isOverlapping(x, y, TARGET_RADIUS) && attempts < 50);

      this.targets.push({
        x,
        y,
        radius: TARGET_RADIUS,
        hit: false,
      });
    }

    // Create obstacles based on level
    if (this.level >= 2) {
      const obstacleCount = Math.min(Math.floor(this.level / 2), 4);
      for (let i = 0; i < obstacleCount; i++) {
        const obsWidth = 60 + Math.random() * 40;
        const obsHeight = 15 + Math.random() * 15;
        let x, y;
        let attempts = 0;
        do {
          x = margin + Math.random() * (w - margin * 2 - obsWidth);
          y = 100 + Math.random() * (h - 250);
          attempts++;
        } while (
          this.isOverlappingObstacle(x, y, obsWidth, obsHeight) &&
          attempts < 50
        );

        this.obstacles.push({
          x,
          y,
          width: obsWidth,
          height: obsHeight,
        });
      }
    }

    this.shots = 3 + Math.floor(this.level / 3);
  }

  private isOverlapping(x: number, y: number, radius: number): boolean {
    for (const t of this.targets) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < t.radius + radius + 20) {
        return true;
      }
    }
    return false;
  }

  private isOverlappingObstacle(
    x: number,
    y: number,
    w: number,
    h: number
  ): boolean {
    for (const t of this.targets) {
      if (
        t.x > x - t.radius &&
        t.x < x + w + t.radius &&
        t.y > y - t.radius &&
        t.y < y + h + t.radius
      ) {
        return true;
      }
    }
    for (const o of this.obstacles) {
      if (
        x < o.x + o.width &&
        x + w > o.x &&
        y < o.y + o.height &&
        y + h > o.y
      ) {
        return true;
      }
    }
    return false;
  }

  startAim(x: number, y: number) {
    if (this.status !== "aiming") return;
    this.isAiming = true;
    this.aimX = x;
    this.aimY = y;
  }

  updateAim(x: number, y: number) {
    if (!this.isAiming) return;
    this.aimX = x;
    this.aimY = y;
  }

  endAim() {
    if (!this.isAiming || this.status !== "aiming") return;
    this.isAiming = false;

    // Calculate direction
    const dx = this.launcherX - this.aimX;
    const dy = this.launcherY - this.aimY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 20) return;

    // Launch ball
    this.ball = {
      x: this.launcherX,
      y: this.launcherY,
      vx: (dx / dist) * BALL_SPEED,
      vy: (dy / dist) * BALL_SPEED,
      radius: BALL_RADIUS,
      active: true,
      bounces: 0,
    };

    this.shots--;
    this.status = "playing";
    this.emitState();
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    if (this.status !== "playing" || !this.ball) return;

    const ball = this.ball;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounces
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx;
      ball.bounces++;
    }
    if (ball.x + ball.radius > w) {
      ball.x = w - ball.radius;
      ball.vx = -ball.vx;
      ball.bounces++;
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy;
      ball.bounces++;
    }

    // Obstacle bounces
    for (const obs of this.obstacles) {
      if (this.ballObstacleCollision(ball, obs)) {
        ball.bounces++;
      }
    }

    // Check target hits
    for (const target of this.targets) {
      if (target.hit) continue;

      const dx = target.x - ball.x;
      const dy = target.y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < target.radius + ball.radius) {
        target.hit = true;
        this.score += 100 * (1 + ball.bounces);
        this.emitState();
      }
    }

    // Check if ball is out or max bounces
    if (ball.y > h + ball.radius || ball.bounces > MAX_BOUNCES) {
      ball.active = false;
      this.checkRoundEnd();
    }
  }

  private ballObstacleCollision(ball: Ball, obs: Obstacle): boolean {
    // Find closest point on rectangle
    const closestX = Math.max(obs.x, Math.min(ball.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(ball.y, obs.y + obs.height));

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ball.radius) {
      // Determine bounce direction
      const overlapX = ball.radius - Math.abs(dx);
      const overlapY = ball.radius - Math.abs(dy);

      if (overlapX < overlapY) {
        ball.vx = -ball.vx;
        ball.x += dx > 0 ? overlapX : -overlapX;
      } else {
        ball.vy = -ball.vy;
        ball.y += dy > 0 ? overlapY : -overlapY;
      }
      return true;
    }
    return false;
  }

  private checkRoundEnd() {
    const allHit = this.targets.every((t) => t.hit);

    if (allHit) {
      // Level complete!
      this.status = "clear";
      this.score += this.shots * 50; // Bonus for remaining shots
      this.emitState();
    } else if (this.shots <= 0) {
      // Game over
      this.status = "over";
      this.emitState();
    } else {
      // Continue aiming
      this.status = "aiming";
      this.ball = null;
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.status = "aiming";
    this.setupLevel();
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw obstacles
    for (const obs of this.obstacles) {
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = "#718096";
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw targets
    for (const target of this.targets) {
      this.drawTarget(target);
    }

    // Draw launcher
    this.drawLauncher();

    // Draw aim line
    if (this.isAiming && this.status === "aiming") {
      this.drawAimLine();
    }

    // Draw ball
    if (this.ball && this.ball.active) {
      this.drawBall(this.ball);
    }
  }

  private drawTarget(target: Target) {
    const ctx = this.ctx;

    if (target.hit) {
      // Hit effect
      ctx.fillStyle = "rgba(56, 239, 125, 0.3)";
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Target rings
    const colors = target.hit
      ? ["#38ef7d", "#11998e", "#0f7a6b"]
      : ["#e74c3c", "#c0392b", "#962d22"];

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * (1 - i * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Center dot
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLauncher() {
    const ctx = this.ctx;

    // Base
    ctx.fillStyle = "#38ef7d";
    ctx.beginPath();
    ctx.arc(this.launcherX, this.launcherY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Inner
    ctx.fillStyle = "#11998e";
    ctx.beginPath();
    ctx.arc(this.launcherX, this.launcherY, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAimLine() {
    const ctx = this.ctx;
    const dx = this.launcherX - this.aimX;
    const dy = this.launcherY - this.aimY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 20) return;

    // Aim direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Draw trajectory preview
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.launcherX, this.launcherY);

    // Simple trajectory preview
    let previewX = this.launcherX;
    let previewY = this.launcherY;
    let vx = dirX * BALL_SPEED;
    let vy = dirY * BALL_SPEED;
    let bounces = 0;

    for (let i = 0; i < 50 && bounces < 3; i++) {
      previewX += vx;
      previewY += vy;

      // Wall bounces
      if (previewX < BALL_RADIUS || previewX > this.canvas.width - BALL_RADIUS) {
        vx = -vx;
        bounces++;
      }
      if (previewY < BALL_RADIUS) {
        vy = -vy;
        bounces++;
      }

      ctx.lineTo(previewX, previewY);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Power indicator
    const power = Math.min(dist / 100, 1);
    ctx.fillStyle = `hsl(${120 * (1 - power)}, 100%, 50%)`;
    ctx.fillRect(10, this.canvas.height - 30, power * 100, 10);
    ctx.strokeStyle = "white";
    ctx.strokeRect(10, this.canvas.height - 30, 100, 10);
  }

  private drawBall(ball: Ball) {
    const ctx = this.ctx;

    // Trail effect
    ctx.fillStyle = "rgba(56, 239, 125, 0.3)";
    ctx.beginPath();
    ctx.arc(ball.x - ball.vx, ball.y - ball.vy, ball.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    const gradient = ctx.createRadialGradient(
      ball.x - 3,
      ball.y - 3,
      0,
      ball.x,
      ball.y,
      ball.radius
    );
    gradient.addColorStop(0, "#7affbc");
    gradient.addColorStop(1, "#38ef7d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(ball.x - 3, ball.y - 3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
