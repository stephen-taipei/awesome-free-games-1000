/**
 * Fly Swatter Game Logic
 * Game #177 - Arcade Swat Game
 */

interface Fly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  wingPhase: number;
  isDead: boolean;
  deathTime: number;
}

interface GameState {
  score: number;
  time: number;
  status: "idle" | "playing" | "gameOver";
  combo: number;
}

type StateChangeCallback = (state: GameState) => void;

const GAME_DURATION = 45;

export class FlySwatterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private score: number = 0;
  private timeRemaining: number = GAME_DURATION;
  private isPlaying: boolean = false;
  private animationId: number = 0;
  private lastTime: number = 0;

  private flies: Fly[] = [];
  private flyIdCounter: number = 0;
  private combo: number = 0;
  private lastHitTime: number = 0;

  private swatX: number = 0;
  private swatY: number = 0;
  private showSwat: boolean = false;
  private swatTimer: number = 0;

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.draw();
  }

  private spawnFly() {
    const size = 20 + Math.random() * 15;
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: x = -size; y = Math.random() * this.height; break;
      case 1: x = this.width + size; y = Math.random() * this.height; break;
      case 2: x = Math.random() * this.width; y = -size; break;
      default: x = Math.random() * this.width; y = this.height + size; break;
    }

    const targetX = this.width * 0.2 + Math.random() * this.width * 0.6;
    const targetY = this.height * 0.2 + Math.random() * this.height * 0.6;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 1.5 + Math.random() * 2;

    this.flies.push({
      id: this.flyIdCounter++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      angle: Math.random() * Math.PI * 2,
      wingPhase: Math.random() * Math.PI * 2,
      isDead: false,
      deathTime: 0,
    });
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: Math.ceil(this.timeRemaining),
        status: this.getStatus(),
        combo: this.combo,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.timeRemaining <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.isPlaying = true;
    this.flies = [];
    this.combo = 0;
    this.flyIdCounter = 0;

    for (let i = 0; i < 5; i++) {
      this.spawnFly();
    }

    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.timeRemaining -= delta;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.isPlaying = false;
      this.emitState();
      this.draw();
      return;
    }

    this.update(delta);
    this.draw();
    this.emitState();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number) {
    // Update swat animation
    if (this.showSwat) {
      this.swatTimer -= delta;
      if (this.swatTimer <= 0) {
        this.showSwat = false;
      }
    }

    // Reset combo if too much time passed
    if (performance.now() - this.lastHitTime > 2000) {
      this.combo = 0;
    }

    // Update flies
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const fly = this.flies[i];

      if (fly.isDead) {
        fly.deathTime -= delta;
        if (fly.deathTime <= 0) {
          this.flies.splice(i, 1);
        }
        continue;
      }

      fly.x += fly.vx;
      fly.y += fly.vy;
      fly.wingPhase += delta * 30;

      // Random direction changes
      if (Math.random() < 0.02) {
        fly.vx += (Math.random() - 0.5) * 2;
        fly.vy += (Math.random() - 0.5) * 2;
        const speed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy);
        const maxSpeed = 3;
        if (speed > maxSpeed) {
          fly.vx = (fly.vx / speed) * maxSpeed;
          fly.vy = (fly.vy / speed) * maxSpeed;
        }
      }

      // Bounce off walls
      if (fly.x < 0 || fly.x > this.width) {
        fly.vx *= -1;
        fly.x = Math.max(0, Math.min(this.width, fly.x));
      }
      if (fly.y < 0 || fly.y > this.height) {
        fly.vy *= -1;
        fly.y = Math.max(0, Math.min(this.height, fly.y));
      }

      fly.angle = Math.atan2(fly.vy, fly.vx);
    }

    // Spawn new flies
    if (Math.random() < 0.03 && this.flies.filter(f => !f.isDead).length < 10) {
      this.spawnFly();
    }
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying) return;

    this.swatX = x;
    this.swatY = y;
    this.showSwat = true;
    this.swatTimer = 0.15;

    let hit = false;
    for (const fly of this.flies) {
      if (fly.isDead) continue;

      const dist = Math.sqrt((fly.x - x) ** 2 + (fly.y - y) ** 2);
      if (dist < fly.size + 20) {
        fly.isDead = true;
        fly.deathTime = 0.5;
        this.combo++;
        this.lastHitTime = performance.now();
        this.score += 10 * this.combo;
        hit = true;
        break;
      }
    }

    if (!hit) {
      this.combo = 0;
    }
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.isPlaying = false;
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.flies = [];
    this.combo = 0;
    this.draw();
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background - kitchen wall
    ctx.fillStyle = "#FFF8DC";
    ctx.fillRect(0, 0, this.width, this.height);

    // Window
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(this.width - 120, 30, 100, 120);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.strokeRect(this.width - 120, 30, 100, 120);
    ctx.beginPath();
    ctx.moveTo(this.width - 70, 30);
    ctx.lineTo(this.width - 70, 150);
    ctx.moveTo(this.width - 120, 90);
    ctx.lineTo(this.width - 20, 90);
    ctx.stroke();

    // Draw flies
    for (const fly of this.flies) {
      this.drawFly(fly);
    }

    // Draw swat effect
    if (this.showSwat) {
      ctx.save();
      ctx.translate(this.swatX, this.swatY);
      ctx.fillStyle = "rgba(139, 69, 19, 0.6)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Grid pattern
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      for (let i = -30; i <= 30; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -20);
        ctx.lineTo(i, 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-30, i * 0.6);
        ctx.lineTo(30, i * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!this.isPlaying && this.timeRemaining === GAME_DURATION) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Fly Swatter", this.width / 2, this.height / 2);
    }
  }

  private drawFly(fly: Fly) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(fly.x, fly.y);

    if (fly.isDead) {
      ctx.globalAlpha = fly.deathTime * 2;
      ctx.rotate(Math.PI);
    } else {
      ctx.rotate(fly.angle + Math.PI / 2);
    }

    // Body
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(0, 0, fly.size * 0.4, fly.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -fly.size * 0.5, fly.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(-fly.size * 0.12, -fly.size * 0.55, fly.size * 0.1, 0, Math.PI * 2);
    ctx.arc(fly.size * 0.12, -fly.size * 0.55, fly.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    if (!fly.isDead) {
      const wingOffset = Math.sin(fly.wingPhase) * 0.3;
      ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
      ctx.beginPath();
      ctx.ellipse(-fly.size * 0.5, 0, fly.size * 0.5, fly.size * 0.25, wingOffset - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fly.size * 0.5, 0, fly.size * 0.5, fly.size * 0.25, -wingOffset + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dead marker
    if (fly.isDead) {
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-fly.size * 0.3, -fly.size * 0.3);
      ctx.lineTo(fly.size * 0.3, fly.size * 0.3);
      ctx.moveTo(fly.size * 0.3, -fly.size * 0.3);
      ctx.lineTo(-fly.size * 0.3, fly.size * 0.3);
      ctx.stroke();
    }

    ctx.restore();
  }
}
