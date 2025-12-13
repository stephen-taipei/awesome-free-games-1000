/**
 * Bomb Chain Game Engine
 * Game #260
 *
 * Create chain explosions for maximum points!
 */

interface Bomb {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  exploded: boolean;
  explosionRadius: number;
  explosionTime: number;
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
  chain: number;
  bombsLeft: number;
  status: "idle" | "playing" | "exploding" | "over";
}

type StateCallback = (state: GameState) => void;

const BOMB_COLORS = ["#ff6600", "#ff3300", "#ff9900", "#ffcc00", "#ff0066"];
const EXPLOSION_RADIUS = 80;
const EXPLOSION_DURATION = 0.5;

export class BombChainGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bombs: Bomb[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private chain = 0;
  private maxChain = 0;
  private bombsLeft = 3;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private explodingCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupEvents();
  }

  private setupEvents() {
    const handleClick = (x: number, y: number) => {
      if (this.status !== "playing" || this.bombsLeft <= 0) return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = x * scaleX;
      const clickY = y * scaleY;

      // Find clicked bomb
      for (const bomb of this.bombs) {
        if (bomb.exploded) continue;
        const dist = Math.hypot(clickX - bomb.x, clickY - bomb.y);
        if (dist < bomb.radius) {
          this.bombsLeft--;
          this.chain = 0;
          this.explodeBomb(bomb);
          this.status = "exploding";
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

  private explodeBomb(bomb: Bomb) {
    bomb.exploded = true;
    bomb.explosionRadius = 0;
    bomb.explosionTime = 0;
    this.explodingCount++;
    this.chain++;
    if (this.chain > this.maxChain) this.maxChain = this.chain;

    // Score based on chain
    this.score += 10 * this.chain;

    // Create explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: bomb.color,
        size: 4 + Math.random() * 4,
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
        chain: this.maxChain,
        bombsLeft: this.bombsLeft,
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
    this.chain = 0;
    this.maxChain = 0;
    this.bombsLeft = 3;
    this.bombs = [];
    this.particles = [];
    this.explodingCount = 0;

    // Create bombs
    this.createBombs(25);

    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private createBombs(count: number) {
    const size = this.canvas.width;
    const padding = 50;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      let valid = false;

      while (!valid && attempts < 50) {
        x = padding + Math.random() * (size - padding * 2);
        y = padding + Math.random() * (size - padding * 2);

        valid = true;
        for (const bomb of this.bombs) {
          const dist = Math.hypot(x - bomb.x, y - bomb.y);
          if (dist < 50) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid) {
        this.bombs.push({
          x: x!,
          y: y!,
          radius: 20 + Math.random() * 10,
          color: BOMB_COLORS[Math.floor(Math.random() * BOMB_COLORS.length)],
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          exploded: false,
          explosionRadius: 0,
          explosionTime: 0,
        });
      }
    }
  }

  private gameLoop() {
    if (this.status === "over" || this.status === "idle") return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Update non-exploded bombs (slight movement)
    for (const bomb of this.bombs) {
      if (bomb.exploded) continue;

      bomb.x += bomb.vx;
      bomb.y += bomb.vy;

      // Bounce off walls
      if (bomb.x < bomb.radius || bomb.x > this.canvas.width - bomb.radius) {
        bomb.vx *= -1;
      }
      if (bomb.y < bomb.radius || bomb.y > this.canvas.height - bomb.radius) {
        bomb.vy *= -1;
      }
    }

    // Update explosions
    let stillExploding = false;
    for (const bomb of this.bombs) {
      if (!bomb.exploded) continue;

      bomb.explosionTime += dt;
      bomb.explosionRadius = Math.min(
        EXPLOSION_RADIUS,
        (bomb.explosionTime / EXPLOSION_DURATION) * EXPLOSION_RADIUS
      );

      if (bomb.explosionTime < EXPLOSION_DURATION) {
        stillExploding = true;

        // Check chain reaction
        for (const other of this.bombs) {
          if (other.exploded) continue;
          const dist = Math.hypot(bomb.x - other.x, bomb.y - other.y);
          if (dist < bomb.explosionRadius + other.radius) {
            this.explodeBomb(other);
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= dt * 2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check if explosions finished
    if (this.status === "exploding" && !stillExploding) {
      // Check if we can still click
      const unexploded = this.bombs.filter((b) => !b.exploded).length;
      if (this.bombsLeft <= 0 || unexploded === 0) {
        this.gameOver();
      } else {
        this.status = "playing";
      }
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
    const s = this.canvas.width;

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, s, s);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 100, 0, 0.05)";
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

    // Draw explosions first (behind bombs)
    for (const bomb of this.bombs) {
      if (bomb.exploded && bomb.explosionTime < EXPLOSION_DURATION) {
        this.drawExplosion(bomb);
      }
    }

    // Draw bombs
    for (const bomb of this.bombs) {
      if (!bomb.exploded) {
        this.drawBomb(bomb);
      }
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

    // Draw chain indicator
    if (this.chain > 1) {
      ctx.fillStyle = "#ff6600";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${this.chain}x CHAIN!`, s / 2, s / 2);
    }
  }

  private drawBomb(bomb: Bomb) {
    const ctx = this.ctx;
    const { x, y, radius, color } = bomb;

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bomb body
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Bomb highlight
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.quadraticCurveTo(x + 10, y - radius - 10, x + 5, y - radius - 15);
    ctx.stroke();

    // Spark
    const time = performance.now() / 100;
    if (Math.sin(time) > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 5, y - radius - 15, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawExplosion(bomb: Bomb) {
    const ctx = this.ctx;
    const { x, y, explosionRadius, color } = bomb;
    const alpha = 1 - bomb.explosionTime / EXPLOSION_DURATION;

    // Outer ring
    const gradient = ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      explosionRadius
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(0.7, `rgba(255, 100, 0, ${alpha * 0.5})`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, explosionRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, explosionRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
