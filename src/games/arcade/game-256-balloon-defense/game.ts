/**
 * Balloon Defense Game Engine
 * Game #256
 *
 * Protect your balloons from incoming sharp objects!
 */

interface Point {
  x: number;
  y: number;
}

interface Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  bobOffset: number;
  bobSpeed: number;
}

interface Threat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "spike" | "arrow" | "needle";
  size: number;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface GameState {
  score: number;
  lives: number;
  wave: number;
  status: "idle" | "playing" | "over" | "victory";
}

type StateCallback = (state: GameState) => void;

const BALLOON_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#f38181"];
const MAX_WAVES = 10;

export class BalloonDefenseGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private balloons: Balloon[] = [];
  private threats: Threat[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private lives = 3;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private waveThreatsRemaining = 0;
  private threatsDestroyedThisWave = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
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

      // Check for threat hits
      for (let i = this.threats.length - 1; i >= 0; i--) {
        const threat = this.threats[i];
        const dist = Math.hypot(clickX - threat.x, clickY - threat.y);
        if (dist < threat.size + 20) {
          this.destroyThreat(i);
          this.score += 10;
          this.threatsDestroyedThisWave++;
          this.emitState();
          break;
        }
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

  private destroyThreat(index: number) {
    const threat = this.threats[index];
    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: threat.x,
        y: threat.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        color: "#ffd700",
        size: 4,
      });
    }
    this.threats.splice(index, 1);
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        lives: this.lives,
        wave: this.wave,
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
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.threats = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.waveThreatsRemaining = this.getWaveThreats();
    this.threatsDestroyedThisWave = 0;

    // Create balloons
    this.createBalloons();

    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private createBalloons() {
    this.balloons = [];
    const centerX = this.canvas.width / 2;
    const bottomY = this.canvas.height - 60;

    for (let i = 0; i < 5; i++) {
      this.balloons.push({
        x: centerX + (i - 2) * 50,
        y: bottomY,
        radius: 25,
        color: BALLOON_COLORS[i],
        bobOffset: Math.random() * Math.PI * 2,
        bobSpeed: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private getWaveThreats(): number {
    return 5 + this.wave * 3;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Spawn threats
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.5, 2 - this.wave * 0.15);
    if (this.spawnTimer >= spawnInterval && this.waveThreatsRemaining > 0) {
      this.spawnThreat();
      this.waveThreatsRemaining--;
      this.spawnTimer = 0;
    }

    // Update threats
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const threat = this.threats[i];
      threat.x += threat.vx * dt * 60;
      threat.y += threat.vy * dt * 60;
      threat.angle += 0.05;

      // Check balloon collision
      for (let j = this.balloons.length - 1; j >= 0; j--) {
        const balloon = this.balloons[j];
        const dist = Math.hypot(threat.x - balloon.x, threat.y - balloon.y);
        if (dist < balloon.radius + threat.size) {
          this.popBalloon(j);
          this.threats.splice(i, 1);
          break;
        }
      }

      // Remove if out of bounds
      if (
        threat.x < -50 ||
        threat.x > this.canvas.width + 50 ||
        threat.y > this.canvas.height + 50
      ) {
        this.threats.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= dt * 2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update balloon bob
    const time = performance.now() / 1000;
    for (const balloon of this.balloons) {
      balloon.y =
        this.canvas.height -
        60 +
        Math.sin(time * balloon.bobSpeed + balloon.bobOffset) * 5;
    }

    // Check wave completion
    if (
      this.waveThreatsRemaining === 0 &&
      this.threats.length === 0 &&
      this.balloons.length > 0
    ) {
      if (this.wave >= MAX_WAVES) {
        this.victory();
      } else {
        this.nextWave();
      }
    }

    // Check game over
    if (this.lives <= 0 || this.balloons.length === 0) {
      this.gameOver();
    }
  }

  private spawnThreat() {
    const types: Threat["type"][] = ["spike", "arrow", "needle"];
    const type = types[Math.floor(Math.random() * types.length)];

    const side = Math.random();
    let x: number, y: number, vx: number, vy: number;

    if (side < 0.5) {
      // From top
      x = Math.random() * this.canvas.width;
      y = -20;
      vx = (Math.random() - 0.5) * 2;
      vy = 2 + this.wave * 0.3;
    } else if (side < 0.75) {
      // From left
      x = -20;
      y = Math.random() * this.canvas.height * 0.5;
      vx = 2 + this.wave * 0.2;
      vy = 1 + Math.random();
    } else {
      // From right
      x = this.canvas.width + 20;
      y = Math.random() * this.canvas.height * 0.5;
      vx = -(2 + this.wave * 0.2);
      vy = 1 + Math.random();
    }

    this.threats.push({
      x,
      y,
      vx,
      vy,
      type,
      size: 15,
      angle: 0,
    });
  }

  private popBalloon(index: number) {
    const balloon = this.balloons[index];

    // Create pop particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: balloon.x,
        y: balloon.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5 - 2,
        life: 1,
        color: balloon.color,
        size: 6,
      });
    }

    this.balloons.splice(index, 1);
    this.lives--;
    this.emitState();
  }

  private nextWave() {
    this.wave++;
    this.waveThreatsRemaining = this.getWaveThreats();
    this.threatsDestroyedThisWave = 0;
    this.score += 50; // Wave bonus
    this.emitState();
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
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(1, "#e0f7fa");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw clouds
    this.drawClouds();

    // Draw grass
    ctx.fillStyle = "#90EE90";
    ctx.fillRect(0, h - 30, w, 30);

    // Draw balloons
    for (const balloon of this.balloons) {
      this.drawBalloon(balloon);
    }

    // Draw threats
    for (const threat of this.threats) {
      this.drawThreat(threat);
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawClouds() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    const time = performance.now() / 5000;
    const cloudPositions = [
      { x: 80 + Math.sin(time) * 20, y: 60 },
      { x: 250 + Math.sin(time + 1) * 20, y: 100 },
      { x: 400 + Math.sin(time + 2) * 20, y: 50 },
    ];

    for (const pos of cloudPositions) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
      ctx.arc(pos.x + 25, pos.y - 10, 25, 0, Math.PI * 2);
      ctx.arc(pos.x + 50, pos.y, 30, 0, Math.PI * 2);
      ctx.arc(pos.x + 25, pos.y + 10, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBalloon(balloon: Balloon) {
    const ctx = this.ctx;
    const { x, y, radius, color } = balloon;

    // String
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.quadraticCurveTo(x + 10, y + radius + 20, x, y + radius + 40);
    ctx.stroke();

    // Balloon body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.85, radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.25,
      radius * 0.15,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Knot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + radius);
    ctx.lineTo(x + 5, y + radius);
    ctx.lineTo(x, y + radius + 8);
    ctx.closePath();
    ctx.fill();
  }

  private drawThreat(threat: Threat) {
    const ctx = this.ctx;
    const { x, y, size, angle, type } = threat;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    switch (type) {
      case "spike":
        // Draw spike ball
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Spikes
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          ctx.fillStyle = "#555";
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(a) * size * 0.5,
            Math.sin(a) * size * 0.5
          );
          ctx.lineTo(
            Math.cos(a - 0.2) * size * 0.3,
            Math.sin(a - 0.2) * size * 0.3
          );
          ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
          ctx.lineTo(
            Math.cos(a + 0.2) * size * 0.3,
            Math.sin(a + 0.2) * size * 0.3
          );
          ctx.closePath();
          ctx.fill();
        }
        break;

      case "arrow":
        // Arrow
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(-size, -3, size * 1.5, 6);
        // Arrow head
        ctx.fillStyle = "#666";
        ctx.beginPath();
        ctx.moveTo(size * 0.5, -8);
        ctx.lineTo(size, 0);
        ctx.lineTo(size * 0.5, 8);
        ctx.closePath();
        ctx.fill();
        // Feathers
        ctx.fillStyle = "#f44";
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(-size - 8, -6);
        ctx.lineTo(-size + 5, 0);
        ctx.lineTo(-size - 8, 6);
        ctx.closePath();
        ctx.fill();
        break;

      case "needle":
        // Needle
        ctx.fillStyle = "#c0c0c0";
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, -2);
        ctx.lineTo(size + 5, 0);
        ctx.lineTo(size, 2);
        ctx.closePath();
        ctx.fill();
        // Eye of needle
        ctx.fillStyle = "#888";
        ctx.beginPath();
        ctx.ellipse(-size + 5, 0, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(-size + 5, 0, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
