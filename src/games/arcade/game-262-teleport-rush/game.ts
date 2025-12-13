/**
 * Teleport Rush Game Engine
 * Game #262
 *
 * Teleport through obstacles to reach the goal!
 */

interface Player {
  x: number;
  y: number;
  radius: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

interface Goal {
  x: number;
  y: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  score: number;
  teleportsLeft: number;
  level: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

const MAX_LEVELS = 5;

export class TeleportRushGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private obstacles: Obstacle[] = [];
  private goal: Goal;
  private particles: Particle[] = [];
  private score = 0;
  private teleportsLeft = 5;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private size = 0;
  private teleportCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 15 };
    this.goal = { x: 0, y: 0, radius: 25 };
    this.setupEvents();
  }

  private setupEvents() {
    const handleClick = (x: number, y: number) => {
      if (this.status !== "playing" || this.teleportCooldown > 0) return;
      if (this.teleportsLeft <= 0) return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const targetX = x * scaleX;
      const targetY = y * scaleY;

      // Check if teleporting into obstacle
      for (const obs of this.obstacles) {
        if (
          targetX > obs.x - this.player.radius &&
          targetX < obs.x + obs.width + this.player.radius &&
          targetY > obs.y - this.player.radius &&
          targetY < obs.y + obs.height + this.player.radius
        ) {
          return; // Can't teleport into obstacle
        }
      }

      // Check bounds
      if (
        targetX < this.player.radius ||
        targetX > this.size - this.player.radius ||
        targetY < this.player.radius ||
        targetY > this.size - this.player.radius
      ) {
        return;
      }

      this.teleport(targetX, targetY);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handleClick(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleClick(touch.clientX - rect.left, touch.clientY - rect.top);
    });
  }

  private teleport(x: number, y: number) {
    // Create departure particles
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 1,
        color: "#9b59b6",
      });
    }

    // Teleport
    this.player.x = x;
    this.player.y = y;
    this.teleportsLeft--;
    this.teleportCooldown = 0.3;

    // Create arrival particles
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        color: "#e0b0ff",
      });
    }

    this.emitState();
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        teleportsLeft: this.teleportsLeft,
        level: this.level,
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
    this.score = 0;
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    if (this.level > MAX_LEVELS) {
      this.level = 1;
      this.score += 500;
    }
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private loadLevel() {
    this.particles = [];
    this.teleportCooldown = 0;
    this.teleportsLeft = 5 + this.level;

    // Player start position
    this.player.x = 50;
    this.player.y = this.size / 2;

    // Goal position
    this.goal.x = this.size - 50;
    this.goal.y = this.size / 2;

    // Generate obstacles based on level
    this.obstacles = [];
    const numObstacles = 3 + this.level * 2;

    for (let i = 0; i < numObstacles; i++) {
      const isVertical = Math.random() > 0.5;
      const obs: Obstacle = {
        x: 100 + Math.random() * (this.size - 250),
        y: 50 + Math.random() * (this.size - 150),
        width: isVertical ? 20 : 60 + Math.random() * 80,
        height: isVertical ? 60 + Math.random() * 80 : 20,
        vx: (Math.random() - 0.5) * (1 + this.level * 0.5),
        vy: (Math.random() - 0.5) * (1 + this.level * 0.5),
      };
      this.obstacles.push(obs);
    }
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
    // Update teleport cooldown
    if (this.teleportCooldown > 0) {
      this.teleportCooldown -= dt;
    }

    // Update obstacles
    for (const obs of this.obstacles) {
      obs.x += obs.vx;
      obs.y += obs.vy;

      // Bounce off walls
      if (obs.x < 0 || obs.x + obs.width > this.size) {
        obs.vx *= -1;
        obs.x = Math.max(0, Math.min(this.size - obs.width, obs.x));
      }
      if (obs.y < 0 || obs.y + obs.height > this.size) {
        obs.vy *= -1;
        obs.y = Math.max(0, Math.min(this.size - obs.height, obs.y));
      }

      // Check collision with player
      if (
        this.player.x + this.player.radius > obs.x &&
        this.player.x - this.player.radius < obs.x + obs.width &&
        this.player.y + this.player.radius > obs.y &&
        this.player.y - this.player.radius < obs.y + obs.height
      ) {
        this.gameOver();
        return;
      }
    }

    // Check goal
    const distToGoal = Math.hypot(
      this.player.x - this.goal.x,
      this.player.y - this.goal.y
    );
    if (distToGoal < this.player.radius + this.goal.radius) {
      this.levelComplete();
      return;
    }

    // Check if out of teleports and stuck
    if (this.teleportsLeft <= 0) {
      // Give player a moment to reach goal if close
      // Otherwise they might be stuck
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.emitState();
  }

  private levelComplete() {
    this.status = "complete";
    this.score += 100 + this.teleportsLeft * 20;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.size;

    // Background
    ctx.fillStyle = "#0a0515";
    ctx.fillRect(0, 0, s, s);

    // Grid
    ctx.strokeStyle = "rgba(155, 89, 182, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= s; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    for (let y = 0; y <= s; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }

    // Draw goal
    this.drawGoal();

    // Draw obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(obs);
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

    // Draw player
    this.drawPlayer();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, radius } = this.player;
    const time = performance.now() / 1000;

    // Teleport ready indicator
    if (this.teleportCooldown <= 0 && this.teleportsLeft > 0) {
      ctx.strokeStyle = "rgba(155, 89, 182, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 5 + Math.sin(time * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, "rgba(155, 89, 182, 0.5)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    bodyGradient.addColorStop(0, "#e0b0ff");
    bodyGradient.addColorStop(1, "#9b59b6");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y - 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a0a2e";
    ctx.beginPath();
    ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGoal() {
    const ctx = this.ctx;
    const { x, y, radius } = this.goal;
    const time = performance.now() / 1000;

    // Pulsing rings
    for (let i = 0; i < 3; i++) {
      const r = radius + i * 10 + Math.sin(time * 2 + i) * 5;
      ctx.strokeStyle = `rgba(46, 204, 113, ${0.4 - i * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main goal
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "#2ecc71");
    gradient.addColorStop(1, "#27ae60");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.fillStyle = "white";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const r1 = radius * 0.5;
      const r2 = radius * 0.25;
      ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(
        Math.cos(angle + Math.PI / 5) * r2,
        Math.sin(angle + Math.PI / 5) * r2
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawObstacle(obs: Obstacle) {
    const ctx = this.ctx;

    // Glow
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 10;

    // Main body
    const gradient = ctx.createLinearGradient(
      obs.x,
      obs.y,
      obs.x + obs.width,
      obs.y + obs.height
    );
    gradient.addColorStop(0, "#c0392b");
    gradient.addColorStop(1, "#e74c3c");
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

    // Hazard stripes
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    const stripeWidth = 10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(obs.x, obs.y, obs.width, obs.height);
    ctx.clip();
    for (let i = -obs.height; i < obs.width + obs.height; i += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(obs.x + i, obs.y);
      ctx.lineTo(obs.x + i + stripeWidth, obs.y);
      ctx.lineTo(obs.x + i + stripeWidth + obs.height, obs.y + obs.height);
      ctx.lineTo(obs.x + i + obs.height, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.shadowBlur = 0;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
