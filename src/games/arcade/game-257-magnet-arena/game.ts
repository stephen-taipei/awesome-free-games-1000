/**
 * Magnet Arena Game Engine
 * Game #257
 *
 * Use magnetic forces to attract or repel orbs!
 */

interface Point {
  x: number;
  y: number;
}

type Polarity = "N" | "S";

interface Player {
  x: number;
  y: number;
  radius: number;
  polarity: Polarity;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  polarity: Polarity;
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
  timeLeft: number;
  polarity: Polarity;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GAME_DURATION = 60;
const MAGNETIC_FORCE = 800;
const MAX_VELOCITY = 8;
const FRICTION = 0.98;

export class MagnetArenaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private orbs: Orb[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private timeLeft = GAME_DURATION;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private mouseX = 0;
  private mouseY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 30, polarity: "N" };
    this.setupEvents();
  }

  private setupEvents() {
    const updateMouse = (x: number, y: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseX = (x - rect.left) * scaleX;
      this.mouseY = (y - rect.top) * scaleY;
    };

    this.canvas.addEventListener("mousemove", (e) => {
      updateMouse(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      updateMouse(touch.clientX, touch.clientY);
    });

    const togglePolarity = () => {
      if (this.status !== "playing") return;
      this.player.polarity = this.player.polarity === "N" ? "S" : "N";
      this.emitState();
      // Create polarity switch effect
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 1,
          color: this.player.polarity === "N" ? "#e74c3c" : "#3498db",
        });
      }
    };

    this.canvas.addEventListener("click", togglePolarity);
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      updateMouse(touch.clientX, touch.clientY);
      togglePolarity();
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        timeLeft: Math.ceil(this.timeLeft),
        polarity: this.player.polarity,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.player.x = size / 2;
    this.player.y = size / 2;
    this.mouseX = size / 2;
    this.mouseY = size / 2;
    this.draw();
  }

  start() {
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.player.polarity = "N";
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.orbs = [];
    this.particles = [];

    // Create initial orbs
    this.spawnOrbs(10);

    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private spawnOrbs(count: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = 50 + Math.random() * (w - 100);
        y = 50 + Math.random() * (h - 100);
      } while (Math.hypot(x - this.player.x, y - this.player.y) < 100);

      this.orbs.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 15,
        polarity: Math.random() > 0.5 ? "N" : "S",
        collected: false,
      });
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    if (this.timeLeft > 0) {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update(dt: number) {
    // Update time
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver();
      return;
    }

    // Update player position (follow mouse smoothly)
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    this.player.x += dx * 0.1;
    this.player.y += dy * 0.1;

    // Update orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (orb.collected) continue;

      // Calculate magnetic force
      const distX = this.player.x - orb.x;
      const distY = this.player.y - orb.y;
      const dist = Math.hypot(distX, distY);

      if (dist > 10) {
        const force = MAGNETIC_FORCE / (dist * dist);
        const dirX = distX / dist;
        const dirY = distY / dist;

        // Opposite poles attract, same poles repel
        const attract = this.player.polarity !== orb.polarity;
        const modifier = attract ? 1 : -1;

        orb.vx += dirX * force * modifier * dt;
        orb.vy += dirY * force * modifier * dt;
      }

      // Apply friction
      orb.vx *= FRICTION;
      orb.vy *= FRICTION;

      // Limit velocity
      const vel = Math.hypot(orb.vx, orb.vy);
      if (vel > MAX_VELOCITY) {
        orb.vx = (orb.vx / vel) * MAX_VELOCITY;
        orb.vy = (orb.vy / vel) * MAX_VELOCITY;
      }

      // Update position
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Bounce off walls
      if (orb.x < orb.radius) {
        orb.x = orb.radius;
        orb.vx *= -0.8;
      }
      if (orb.x > this.canvas.width - orb.radius) {
        orb.x = this.canvas.width - orb.radius;
        orb.vx *= -0.8;
      }
      if (orb.y < orb.radius) {
        orb.y = orb.radius;
        orb.vy *= -0.8;
      }
      if (orb.y > this.canvas.height - orb.radius) {
        orb.y = this.canvas.height - orb.radius;
        orb.vy *= -0.8;
      }

      // Check collection (only opposite poles can collect)
      if (dist < this.player.radius + orb.radius) {
        if (this.player.polarity !== orb.polarity) {
          this.collectOrb(i);
        }
      }
    }

    // Spawn more orbs if needed
    const activeOrbs = this.orbs.filter((o) => !o.collected).length;
    if (activeOrbs < 5) {
      this.spawnOrbs(3);
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

  private collectOrb(index: number) {
    const orb = this.orbs[index];
    orb.collected = true;
    this.score += 10;

    // Create collection particles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.particles.push({
        x: orb.x,
        y: orb.y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 1,
        color: orb.polarity === "N" ? "#e74c3c" : "#3498db",
      });
    }

    // Remove collected orb after animation
    setTimeout(() => {
      const idx = this.orbs.indexOf(orb);
      if (idx !== -1) this.orbs.splice(idx, 1);
    }, 100);
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

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw magnetic field lines from player
    this.drawMagneticField();

    // Draw orbs
    for (const orb of this.orbs) {
      if (!orb.collected) {
        this.drawOrb(orb);
      }
    }

    // Draw player
    this.drawPlayer();

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawMagneticField() {
    const ctx = this.ctx;
    const color =
      this.player.polarity === "N"
        ? "rgba(231, 76, 60, 0.1)"
        : "rgba(52, 152, 219, 0.1)";

    const time = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const radius =
        this.player.radius + 30 + i * 40 + Math.sin(time * 2 + i) * 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, radius, polarity } = this.player;

    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    if (polarity === "N") {
      gradient.addColorStop(0, "rgba(231, 76, 60, 0.5)");
      gradient.addColorStop(1, "rgba(231, 76, 60, 0)");
    } else {
      gradient.addColorStop(0, "rgba(52, 152, 219, 0.5)");
      gradient.addColorStop(1, "rgba(52, 152, 219, 0)");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    ctx.fillStyle = polarity === "N" ? "#e74c3c" : "#3498db";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = polarity === "N" ? "#c0392b" : "#2980b9";
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Polarity symbol
    ctx.fillStyle = "white";
    ctx.font = `bold ${radius}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(polarity, x, y);

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOrb(orb: Orb) {
    const ctx = this.ctx;
    const { x, y, radius, polarity } = orb;

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.3);
    if (polarity === "N") {
      gradient.addColorStop(0, "rgba(231, 76, 60, 0.4)");
      gradient.addColorStop(1, "rgba(231, 76, 60, 0)");
    } else {
      gradient.addColorStop(0, "rgba(52, 152, 219, 0.4)");
      gradient.addColorStop(1, "rgba(52, 152, 219, 0)");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    ctx.fillStyle = polarity === "N" ? "#e74c3c" : "#3498db";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Polarity indicator
    ctx.fillStyle = "white";
    ctx.font = `bold ${radius * 0.8}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(polarity, x, y);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
