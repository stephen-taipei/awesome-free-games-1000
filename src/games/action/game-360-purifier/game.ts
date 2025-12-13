/**
 * Purifier Game Engine
 * Game #360
 *
 * Cleanse corruption with holy light!
 */

interface Corruption {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  spreading: boolean;
  spreadTimer: number;
}

interface LightBurst {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: "light" | "dark";
}

interface GameState {
  light: number;
  purified: number;
  score: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class PurifierGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private corruptions: Corruption[] = [];
  private bursts: LightBurst[] = [];
  private particles: Particle[] = [];
  private light = 100;
  private purified = 0;
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private spawnTimer = 0;
  private lightRegenTimer = 0;
  private purifyRadius = 40;

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
        light: Math.floor(this.light),
        purified: this.purified,
        score: this.score,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.mouseX = this.canvas.width / 2;
    this.mouseY = this.canvas.height / 2;
    this.draw();
  }

  setMouse(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = ((x - rect.left) / rect.width) * this.canvas.width;
    this.mouseY = ((y - rect.top) / rect.height) * this.canvas.height;
  }

  burst() {
    if (this.status !== "playing" || this.light < 25) return;

    this.light -= 25;
    this.bursts.push({
      x: this.mouseX,
      y: this.mouseY,
      radius: 10,
      maxRadius: 120,
    });

    // Create light particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.mouseX,
        y: this.mouseY,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 30,
        type: "light",
      });
    }

    this.emitState();
  }

  start() {
    this.light = 100;
    this.purified = 0;
    this.score = 0;
    this.wave = 1;
    this.corruptions = [];
    this.bursts = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.lightRegenTimer = 0;
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
    this.updateCorruptions();
    this.updateBursts();
    this.updateParticles();
    this.purifyAtMouse();
    this.spawnCorruptions();
    this.regenLight();
    this.checkGameOver();
    this.emitState();
  }

  private updateCorruptions() {
    for (let i = this.corruptions.length - 1; i >= 0; i--) {
      const c = this.corruptions[i];

      // Spread corruption
      if (c.spreading) {
        c.spreadTimer++;
        if (c.spreadTimer >= 180 && c.radius < 60) {
          c.radius += 0.1;
        }

        // Spawn new corruption
        if (c.spreadTimer >= 300 && Math.random() < 0.01 * this.wave) {
          const angle = Math.random() * Math.PI * 2;
          const dist = c.radius + 40;
          const nx = c.x + Math.cos(angle) * dist;
          const ny = c.y + Math.sin(angle) * dist;

          if (nx > 30 && nx < this.canvas.width - 30 && ny > 30 && ny < this.canvas.height - 30) {
            this.corruptions.push({
              x: nx,
              y: ny,
              radius: 15,
              health: 50 + this.wave * 10,
              maxHealth: 50 + this.wave * 10,
              spreading: true,
              spreadTimer: 0,
            });
          }
        }
      }

      // Remove purified corruption
      if (c.health <= 0) {
        this.corruptions.splice(i, 1);
        this.purified++;
        this.score += 10 * this.wave;

        // Dark particles on purification
        for (let j = 0; j < 10; j++) {
          this.particles.push({
            x: c.x,
            y: c.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 20,
            type: "dark",
          });
        }
      }
    }
  }

  private updateBursts() {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.radius += 8;

      // Damage corruption
      for (const c of this.corruptions) {
        const dx = c.x - b.x;
        const dy = c.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + c.radius && dist > b.radius - 10 + c.radius) {
          c.health -= 20;
        }
      }

      if (b.radius >= b.maxRadius) {
        this.bursts.splice(i, 1);
      }
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private purifyAtMouse() {
    // Passive purification at mouse position
    for (const c of this.corruptions) {
      const dx = c.x - this.mouseX;
      const dy = c.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.purifyRadius + c.radius) {
        c.health -= 0.5;
        this.light -= 0.02;

        // Occasional light particle
        if (Math.random() < 0.1) {
          this.particles.push({
            x: this.mouseX + (Math.random() - 0.5) * 20,
            y: this.mouseY + (Math.random() - 0.5) * 20,
            vx: (c.x - this.mouseX) / dist * 2,
            vy: (c.y - this.mouseY) / dist * 2,
            life: 15,
            type: "light",
          });
        }
      }
    }
  }

  private spawnCorruptions() {
    this.spawnTimer++;
    const spawnRate = Math.max(100, 250 - this.wave * 15);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      // Spawn away from mouse
      let x, y;
      let attempts = 0;
      do {
        x = 50 + Math.random() * (this.canvas.width - 100);
        y = 50 + Math.random() * (this.canvas.height - 100);
        attempts++;
      } while (
        Math.sqrt((x - this.mouseX) ** 2 + (y - this.mouseY) ** 2) < 100 &&
        attempts < 10
      );

      this.corruptions.push({
        x,
        y,
        radius: 20 + Math.random() * 10,
        health: 50 + this.wave * 10,
        maxHealth: 50 + this.wave * 10,
        spreading: true,
        spreadTimer: 0,
      });

      if (this.purified > 0 && this.purified % 10 === 0) {
        this.wave++;
      }
    }
  }

  private regenLight() {
    this.lightRegenTimer++;
    if (this.lightRegenTimer >= 20) {
      this.lightRegenTimer = 0;
      this.light = Math.min(100, this.light + 0.5);
    }
  }

  private checkGameOver() {
    // Game over if too much corruption
    let totalCorruption = 0;
    for (const c of this.corruptions) {
      totalCorruption += c.radius;
    }

    if (totalCorruption > 800 || this.light <= 0) {
      this.status = "over";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);

    // Draw corruptions
    for (const c of this.corruptions) {
      this.drawCorruption(c);
    }

    // Draw bursts
    for (const b of this.bursts) {
      this.drawBurst(b);
    }

    // Draw particles
    for (const p of this.particles) {
      this.drawParticle(p);
    }

    // Draw light cursor
    this.drawLightCursor();

    // Light bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = "#fff";
    ctx.fillRect(10, 10, this.light, 15);

    // Wave indicator
    ctx.fillStyle = "#87ceeb";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 10, 22);

    // Corruption meter
    let totalCorruption = 0;
    for (const c of this.corruptions) {
      totalCorruption += c.radius;
    }
    const corruptionPercent = Math.min(100, (totalCorruption / 800) * 100);

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, h - 25, 100, 15);
    ctx.fillStyle = "#8b0000";
    ctx.fillRect(10, h - 25, corruptionPercent, 15);
    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Corruption", 12, h - 14);
  }

  private drawCorruption(c: Corruption) {
    const ctx = this.ctx;

    // Corruption glow
    const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * 1.5);
    gradient.addColorStop(0, "rgba(80, 0, 80, 0.8)");
    gradient.addColorStop(0.5, "rgba(40, 0, 40, 0.5)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "rgba(100, 0, 100, 0.9)";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();

    // Tendrils
    ctx.strokeStyle = "rgba(60, 0, 60, 0.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Date.now() / 1000;
      const len = c.radius * 0.8;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.quadraticCurveTo(
        c.x + Math.cos(angle + 0.5) * len,
        c.y + Math.sin(angle + 0.5) * len,
        c.x + Math.cos(angle) * c.radius * 1.3,
        c.y + Math.sin(angle) * c.radius * 1.3
      );
      ctx.stroke();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(c.x - 20, c.y - c.radius - 15, 40, 5);
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(c.x - 20, c.y - c.radius - 15, (c.health / c.maxHealth) * 40, 5);
  }

  private drawBurst(b: LightBurst) {
    const ctx = this.ctx;
    const alpha = 1 - b.radius / b.maxRadius;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = `rgba(135, 206, 235, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    const alpha = p.life / 30;

    if (p.type === "light") {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(80, 0, 80, ${alpha})`;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLightCursor() {
    const ctx = this.ctx;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.mouseX, this.mouseY, 0,
      this.mouseX, this.mouseY, this.purifyRadius
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, this.purifyRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cross
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.mouseX - 15, this.mouseY);
    ctx.lineTo(this.mouseX + 15, this.mouseY);
    ctx.moveTo(this.mouseX, this.mouseY - 15);
    ctx.lineTo(this.mouseX, this.mouseY + 15);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
