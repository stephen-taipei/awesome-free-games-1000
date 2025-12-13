/**
 * Gravity Well Game Engine
 * Game #259
 *
 * Place gravity wells to guide particles to the collector!
 */

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: Point[];
}

interface GravityWell {
  x: number;
  y: number;
  radius: number;
  strength: number;
}

interface GameState {
  score: number;
  collected: number;
  total: number;
  status: "idle" | "playing" | "over" | "victory";
}

type StateCallback = (state: GameState) => void;

const PARTICLE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"];
const GRAVITY_STRENGTH = 5000;
const MAX_WELLS = 5;
const PARTICLES_PER_LEVEL = 10;
const MAX_VELOCITY = 6;

export class GravityWellGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private wells: GravityWell[] = [];
  private collector: Point & { radius: number };
  private spawner: Point;
  private score = 0;
  private collected = 0;
  private lost = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private particlesSpawned = 0;
  private size = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.collector = { x: 0, y: 0, radius: 35 };
    this.spawner = { x: 0, y: 0 };
    this.setupEvents();
  }

  private setupEvents() {
    const handleClick = (x: number, y: number) => {
      if (this.status !== "playing") return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = x * scaleX;
      const clickY = y * scaleY;

      // Check if clicking on existing well
      for (let i = this.wells.length - 1; i >= 0; i--) {
        const well = this.wells[i];
        const dist = Math.hypot(clickX - well.x, clickY - well.y);
        if (dist < well.radius) {
          this.wells.splice(i, 1);
          return;
        }
      }

      // Don't place well on collector or spawner
      const distToCollector = Math.hypot(
        clickX - this.collector.x,
        clickY - this.collector.y
      );
      const distToSpawner = Math.hypot(
        clickX - this.spawner.x,
        clickY - this.spawner.y
      );

      if (distToCollector < 60 || distToSpawner < 60) return;

      // Add new well if under limit
      if (this.wells.length < MAX_WELLS) {
        this.wells.push({
          x: clickX,
          y: clickY,
          radius: 30,
          strength: GRAVITY_STRENGTH,
        });
      }
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

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        collected: this.collected,
        total: PARTICLES_PER_LEVEL,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    // Position collector and spawner
    this.collector.x = this.size - 60;
    this.collector.y = this.size - 60;
    this.spawner.x = 60;
    this.spawner.y = 60;

    this.draw();
  }

  start() {
    this.score = 0;
    this.collected = 0;
    this.lost = 0;
    this.particlesSpawned = 0;
    this.particles = [];
    this.wells = [];
    this.spawnTimer = 0;

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
    // Spawn particles
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1.5 && this.particlesSpawned < PARTICLES_PER_LEVEL) {
      this.spawnParticle();
      this.particlesSpawned++;
      this.spawnTimer = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply gravity from wells
      for (const well of this.wells) {
        const dx = well.x - p.x;
        const dy = well.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
          const force = well.strength / (dist * dist);
          p.vx += (dx / dist) * force * dt;
          p.vy += (dy / dist) * force * dt;
        }
      }

      // Limit velocity
      const vel = Math.hypot(p.vx, p.vy);
      if (vel > MAX_VELOCITY) {
        p.vx = (p.vx / vel) * MAX_VELOCITY;
        p.vy = (p.vy / vel) * MAX_VELOCITY;
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Update trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 20) {
        p.trail.shift();
      }

      // Check if collected
      const distToCollector = Math.hypot(
        p.x - this.collector.x,
        p.y - this.collector.y
      );
      if (distToCollector < this.collector.radius + p.radius) {
        this.collectParticle(i);
        continue;
      }

      // Check if lost (out of bounds)
      if (
        p.x < -50 ||
        p.x > this.size + 50 ||
        p.y < -50 ||
        p.y > this.size + 50
      ) {
        this.loseParticle(i);
        continue;
      }

      // Check if absorbed by well
      for (const well of this.wells) {
        const distToWell = Math.hypot(p.x - well.x, p.y - well.y);
        if (distToWell < 15) {
          this.loseParticle(i);
          break;
        }
      }
    }

    // Check game end
    if (
      this.particlesSpawned >= PARTICLES_PER_LEVEL &&
      this.particles.length === 0
    ) {
      if (this.collected >= Math.ceil(PARTICLES_PER_LEVEL * 0.6)) {
        this.victory();
      } else {
        this.gameOver();
      }
    }

    this.emitState();
  }

  private spawnParticle() {
    const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25;
    const speed = 1 + Math.random();
    this.particles.push({
      x: this.spawner.x,
      y: this.spawner.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 8,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      trail: [],
    });
  }

  private collectParticle(index: number) {
    this.particles.splice(index, 1);
    this.collected++;
    this.score += 100;
  }

  private loseParticle(index: number) {
    this.particles.splice(index, 1);
    this.lost++;
  }

  private victory() {
    this.status = "victory";
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

    // Background with stars
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, s, s);
    this.drawStars();

    // Draw grid
    ctx.strokeStyle = "rgba(100, 100, 255, 0.05)";
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

    // Draw gravity wells
    for (const well of this.wells) {
      this.drawGravityWell(well);
    }

    // Draw particle trails and particles
    for (const p of this.particles) {
      this.drawParticle(p);
    }

    // Draw spawner
    this.drawSpawner();

    // Draw collector
    this.drawCollector();

    // Draw well count indicator
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Wells: ${this.wells.length}/${MAX_WELLS}`, 10, s - 10);
  }

  private drawStars() {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    // Draw static stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const x = ((i * 137) % this.size);
      const y = ((i * 91) % this.size);
      const twinkle = 0.3 + 0.7 * Math.sin(time * 2 + i);
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawGravityWell(well: GravityWell) {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    // Gravity field visualization
    for (let i = 3; i >= 0; i--) {
      const radius = well.radius + i * 15 + Math.sin(time * 2 + i) * 5;
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 - i * 0.04})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(well.x, well.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core
    const gradient = ctx.createRadialGradient(
      well.x,
      well.y,
      0,
      well.x,
      well.y,
      well.radius
    );
    gradient.addColorStop(0, "#8b5cf6");
    gradient.addColorStop(0.5, "#6366f1");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(well.x, well.y, well.radius, 0, Math.PI * 2);
    ctx.fill();

    // Spinning effect
    ctx.save();
    ctx.translate(well.x, well.y);
    ctx.rotate(time * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;

    // Draw trail
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Glow
    const gradient = ctx.createRadialGradient(
      p.x,
      p.y,
      0,
      p.x,
      p.y,
      p.radius * 2
    );
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSpawner() {
    const ctx = this.ctx;
    const { x, y } = this.spawner;
    const time = performance.now() / 1000;

    // Outer ring
    ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Inner
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Arrow indicator
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(10, -5);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCollector() {
    const ctx = this.ctx;
    const { x, y, radius } = this.collector;
    const time = performance.now() / 1000;

    // Pulsing rings
    for (let i = 0; i < 3; i++) {
      const r = radius + i * 10 + Math.sin(time * 2 + i) * 5;
      ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 - i * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main collector
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "#22c55e");
    gradient.addColorStop(1, "#16a34a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Checkmark
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x - 4, y + 10);
    ctx.lineTo(x + 14, y - 10);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
