/**
 * Thunder Dodge Game Engine
 * Game #261
 *
 * Dodge lightning strikes to survive!
 */

interface Player {
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
}

interface Lightning {
  x: number;
  y: number;
  warning: boolean;
  warningTime: number;
  striking: boolean;
  strikeTime: number;
  segments: { x: number; y: number }[];
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
  time: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const WARNING_DURATION = 1.0;
const STRIKE_DURATION = 0.3;
const STRIKE_RADIUS = 40;

export class ThunderDodgeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private lightnings: Lightning[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private time = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private difficulty = 1;
  private size = 0;
  private flashAlpha = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 15, targetX: 0, targetY: 0 };
    this.setupEvents();
  }

  private setupEvents() {
    const updateTarget = (x: number, y: number) => {
      if (this.status !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.player.targetX = x * scaleX;
      this.player.targetY = y * scaleY;
    };

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      updateTarget(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      updateTarget(touch.clientX - rect.left, touch.clientY - rect.top);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      updateTarget(touch.clientX - rect.left, touch.clientY - rect.top);
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: Math.floor(this.time),
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.player.x = this.size / 2;
    this.player.y = this.size / 2;
    this.player.targetX = this.size / 2;
    this.player.targetY = this.size / 2;
    this.draw();
  }

  start() {
    this.score = 0;
    this.time = 0;
    this.difficulty = 1;
    this.lightnings = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.flashAlpha = 0;
    this.player.x = this.size / 2;
    this.player.y = this.size / 2;
    this.player.targetX = this.size / 2;
    this.player.targetY = this.size / 2;

    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
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
    this.time += dt;
    this.difficulty = 1 + Math.floor(this.time / 10) * 0.5;

    // Move player towards target
    const dx = this.player.targetX - this.player.x;
    const dy = this.player.targetY - this.player.y;
    this.player.x += dx * 0.15;
    this.player.y += dy * 0.15;

    // Keep player in bounds
    this.player.x = Math.max(
      this.player.radius,
      Math.min(this.size - this.player.radius, this.player.x)
    );
    this.player.y = Math.max(
      this.player.radius,
      Math.min(this.size - this.player.radius, this.player.y)
    );

    // Spawn lightning
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.3, 1.5 - this.difficulty * 0.15);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnLightning();
      this.spawnTimer = 0;
    }

    // Update lightning
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const l = this.lightnings[i];

      if (l.warning) {
        l.warningTime += dt;
        if (l.warningTime >= WARNING_DURATION) {
          l.warning = false;
          l.striking = true;
          l.segments = this.generateLightningSegments(l.x);
          this.flashAlpha = 0.5;
        }
      } else if (l.striking) {
        l.strikeTime += dt;
        if (l.strikeTime >= STRIKE_DURATION) {
          this.lightnings.splice(i, 1);
          this.score += 10;
          this.emitState();
        } else if (l.strikeTime < 0.1) {
          // Check collision only at start of strike
          const dist = Math.hypot(this.player.x - l.x, this.player.y - this.size + 30);
          const hitY = this.player.y > this.size * 0.7;
          if (Math.abs(this.player.x - l.x) < STRIKE_RADIUS && hitY) {
            this.gameOver();
            return;
          }
        }
      }
    }

    // Update flash
    this.flashAlpha *= 0.9;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 3;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.emitState();
  }

  private spawnLightning() {
    const x = 50 + Math.random() * (this.size - 100);
    this.lightnings.push({
      x,
      y: 0,
      warning: true,
      warningTime: 0,
      striking: false,
      strikeTime: 0,
      segments: [],
    });
  }

  private generateLightningSegments(x: number): { x: number; y: number }[] {
    const segments: { x: number; y: number }[] = [];
    let currentX = x;
    let currentY = 0;
    const endY = this.size;

    segments.push({ x: currentX, y: currentY });

    while (currentY < endY) {
      currentY += 20 + Math.random() * 30;
      currentX += (Math.random() - 0.5) * 40;
      segments.push({ x: currentX, y: Math.min(currentY, endY) });
    }

    return segments;
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Create explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 1,
        color: "#ffd700",
      });
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.size;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, s);
    gradient.addColorStop(0, "#0a0a1a");
    gradient.addColorStop(0.7, "#16213e");
    gradient.addColorStop(1, "#1a3a1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);

    // Draw storm clouds
    this.drawClouds();

    // Draw ground
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, s - 30, s, 30);

    // Draw warning zones
    for (const l of this.lightnings) {
      if (l.warning) {
        this.drawWarning(l);
      }
    }

    // Draw lightning strikes
    for (const l of this.lightnings) {
      if (l.striking) {
        this.drawLightning(l);
      }
    }

    // Draw player
    if (this.status === "playing") {
      this.drawPlayer();
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

    // Flash effect
    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, s, s);
    }
  }

  private drawClouds() {
    const ctx = this.ctx;
    const time = performance.now() / 2000;

    ctx.fillStyle = "#2a2a4a";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 120 + time * 20) % (this.size + 100)) - 50;
      const y = 30 + Math.sin(time + i) * 10;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.arc(x + 30, y - 10, 30, 0, Math.PI * 2);
      ctx.arc(x + 60, y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWarning(l: Lightning) {
    const ctx = this.ctx;
    const alpha = 0.3 + Math.sin(l.warningTime * 10) * 0.2;

    // Warning circle on ground
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(l.x, this.size - 15, STRIKE_RADIUS, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warning line
    ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(l.x, 0);
    ctx.lineTo(l.x, this.size);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawLightning(l: Lightning) {
    const ctx = this.ctx;
    const alpha = 1 - l.strikeTime / STRIKE_DURATION;

    // Glow
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 20;

    // Main bolt
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(l.segments[0].x, l.segments[0].y);
    for (let i = 1; i < l.segments.length; i++) {
      ctx.lineTo(l.segments[i].x, l.segments[i].y);
    }
    ctx.stroke();

    // Inner bright core
    ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l.segments[0].x, l.segments[0].y);
    for (let i = 1; i < l.segments.length; i++) {
      ctx.lineTo(l.segments[i].x, l.segments[i].y);
    }
    ctx.stroke();

    // Branches
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    for (let i = 2; i < l.segments.length - 1; i += 2) {
      if (Math.random() > 0.5) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(l.segments[i].x, l.segments[i].y);
        ctx.lineTo(
          l.segments[i].x + dir * 20,
          l.segments[i].y + 15
        );
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;

    // Ground impact
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(
      l.segments[l.segments.length - 1].x,
      this.size - 10,
      STRIKE_RADIUS * (1 + (1 - alpha)),
      15,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, radius } = this.player;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x, this.size - 12, radius, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, "#4fc3f7");
    gradient.addColorStop(1, "#0288d1");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 3, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Worried mouth
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 8, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
