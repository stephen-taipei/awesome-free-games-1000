/**
 * Shadow Chase Game Engine
 * Game #263
 *
 * Race against your shadow ghost - it follows your movements!
 */

interface Point {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
}

interface Shadow {
  positions: Point[];
  delay: number;
  currentIndex: number;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
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

const SHADOW_DELAY = 60; // frames of delay

export class ShadowChaseGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private shadow: Shadow;
  private orbs: Orb[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private time = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private size = 0;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 15, targetX: 0, targetY: 0 };
    this.shadow = { positions: [], delay: SHADOW_DELAY, currentIndex: 0 };
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
    this.frameCount = 0;
    this.player.x = this.size / 2;
    this.player.y = this.size / 2;
    this.player.targetX = this.size / 2;
    this.player.targetY = this.size / 2;

    // Initialize shadow with player's starting position
    this.shadow.positions = [];
    for (let i = 0; i < SHADOW_DELAY + 10; i++) {
      this.shadow.positions.push({ x: this.player.x, y: this.player.y });
    }
    this.shadow.currentIndex = 0;

    this.orbs = [];
    this.particles = [];
    this.spawnOrbs(5);

    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private spawnOrbs(count: number) {
    const padding = 50;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      let valid = false;

      while (!valid && attempts < 50) {
        x = padding + Math.random() * (this.size - padding * 2);
        y = padding + Math.random() * (this.size - padding * 2);

        valid = true;
        // Don't spawn near player
        if (Math.hypot(x - this.player.x, y - this.player.y) < 80) {
          valid = false;
        }
        // Don't spawn too close to existing orbs
        for (const orb of this.orbs) {
          if (!orb.collected && Math.hypot(x - orb.x, y - orb.y) < 50) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid) {
        this.orbs.push({
          x: x!,
          y: y!,
          radius: 12,
          collected: false,
        });
      }
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
    this.time += dt;
    this.frameCount++;

    // Move player towards target
    const dx = this.player.targetX - this.player.x;
    const dy = this.player.targetY - this.player.y;
    this.player.x += dx * 0.12;
    this.player.y += dy * 0.12;

    // Keep player in bounds
    this.player.x = Math.max(
      this.player.radius,
      Math.min(this.size - this.player.radius, this.player.x)
    );
    this.player.y = Math.max(
      this.player.radius,
      Math.min(this.size - this.player.radius, this.player.y)
    );

    // Record player position for shadow
    this.shadow.positions.push({ x: this.player.x, y: this.player.y });

    // Get shadow position (delayed)
    const shadowIndex = Math.max(
      0,
      this.shadow.positions.length - 1 - SHADOW_DELAY
    );
    const shadowPos = this.shadow.positions[shadowIndex];

    // Clean up old positions
    if (this.shadow.positions.length > SHADOW_DELAY * 3) {
      this.shadow.positions.splice(0, SHADOW_DELAY);
    }

    // Check shadow catching player
    const distToShadow = Math.hypot(
      this.player.x - shadowPos.x,
      this.player.y - shadowPos.y
    );
    if (distToShadow < this.player.radius * 2 && this.time > 2) {
      this.gameOver();
      return;
    }

    // Check orb collection
    for (const orb of this.orbs) {
      if (orb.collected) continue;

      const distToOrb = Math.hypot(
        this.player.x - orb.x,
        this.player.y - orb.y
      );
      if (distToOrb < this.player.radius + orb.radius) {
        this.collectOrb(orb);
      }
    }

    // Spawn more orbs if needed
    const activeOrbs = this.orbs.filter((o) => !o.collected).length;
    if (activeOrbs < 3) {
      this.spawnOrbs(2);
    }

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

  private collectOrb(orb: Orb) {
    orb.collected = true;
    this.score += 10;

    // Create particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: orb.x,
        y: orb.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        color: "#ffd700",
      });
    }
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
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, s, s);

    // Draw trail
    this.drawTrail();

    // Draw orbs
    for (const orb of this.orbs) {
      if (!orb.collected) {
        this.drawOrb(orb);
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

    // Draw shadow
    this.drawShadow();

    // Draw player
    this.drawPlayer();

    // Draw warning if shadow is close
    const shadowIndex = Math.max(
      0,
      this.shadow.positions.length - 1 - SHADOW_DELAY
    );
    const shadowPos = this.shadow.positions[shadowIndex];
    const distToShadow = Math.hypot(
      this.player.x - shadowPos.x,
      this.player.y - shadowPos.y
    );
    if (distToShadow < 60 && this.time > 1) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(this.time * 10) * 0.2})`;
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("DANGER!", s / 2, 40);
    }
  }

  private drawTrail() {
    const ctx = this.ctx;
    const positions = this.shadow.positions;

    if (positions.length < 2) return;

    // Draw ghostly trail
    const startIndex = Math.max(0, positions.length - SHADOW_DELAY * 2);
    for (let i = startIndex; i < positions.length - SHADOW_DELAY; i++) {
      const pos = positions[i];
      const alpha = (i - startIndex) / (positions.length - SHADOW_DELAY - startIndex) * 0.1;
      ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, radius } = this.player;

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
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
    bodyGradient.addColorStop(0, "#ffffff");
    bodyGradient.addColorStop(1, "#cccccc");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawShadow() {
    const ctx = this.ctx;
    const shadowIndex = Math.max(
      0,
      this.shadow.positions.length - 1 - SHADOW_DELAY
    );
    const pos = this.shadow.positions[shadowIndex];

    if (!pos) return;

    const time = performance.now() / 1000;

    // Flickering effect
    const flicker = 0.5 + Math.sin(time * 8) * 0.1;

    // Shadow aura
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 40);
    gradient.addColorStop(0, `rgba(50, 50, 50, ${flicker * 0.5})`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Shadow body
    ctx.fillStyle = `rgba(30, 30, 30, ${flicker})`;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Creepy eyes
    ctx.fillStyle = `rgba(255, 0, 0, ${flicker})`;
    ctx.beginPath();
    ctx.arc(pos.x - 4, pos.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(pos.x + 4, pos.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOrb(orb: Orb) {
    const ctx = this.ctx;
    const { x, y, radius } = orb;
    const time = performance.now() / 1000;

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.5)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Orb body
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(x, y, radius + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
