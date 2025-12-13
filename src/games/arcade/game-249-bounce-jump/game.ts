/**
 * Bounce Jump Game Engine
 * Game #249
 *
 * Bounce on trampolines to collect items and reach new heights
 */

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
}

interface Trampoline {
  x: number;
  y: number;
  width: number;
  bouncing: boolean;
  bouncePower: number;
  color: string;
}

interface Collectible {
  x: number;
  y: number;
  type: "coin" | "star" | "gem";
  collected: boolean;
  rotation: number;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface GameState {
  score: number;
  highScore: number;
  height: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.35;
const BOUNCE_POWER = -16;
const SUPER_BOUNCE = -22;
const MAX_VX = 8;

export class BounceJumpGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private player: Player;
  private trampolines: Trampoline[] = [];
  private collectibles: Collectible[] = [];
  private clouds: Cloud[] = [];
  private score = 0;
  private highScore = 0;
  private maxHeight = 0;
  private cameraY = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private moveDir = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
    this.loadHighScore();
  }

  private createPlayer(): Player {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 30,
      height: 40,
      rotation: 0,
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem("bounce_jump_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("bounce_jump_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        height: Math.floor(this.maxHeight / 10),
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setMoveDirection(dir: number) {
    this.moveDir = dir;
  }

  start() {
    this.score = 0;
    this.maxHeight = 0;
    this.cameraY = 0;
    this.trampolines = [];
    this.collectibles = [];
    this.particles = [];

    // Initialize player
    this.player = this.createPlayer();
    this.player.x = this.width / 2;
    this.player.y = this.height - 80;
    this.player.vy = BOUNCE_POWER;

    // Generate initial trampolines
    this.generateTrampolines(0, this.height + 500);

    // Generate clouds
    this.generateClouds();

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private generateTrampolines(fromY: number, toY: number) {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
    let y = fromY;

    while (y < toY) {
      const trampoline: Trampoline = {
        x: 30 + Math.random() * (this.width - 100),
        y: y,
        width: 60 + Math.random() * 40,
        bouncing: false,
        bouncePower: Math.random() < 0.15 ? SUPER_BOUNCE : BOUNCE_POWER,
        color: colors[Math.floor(Math.random() * colors.length)],
      };

      this.trampolines.push(trampoline);

      // Add collectible above some trampolines
      if (Math.random() < 0.4) {
        const types: ("coin" | "star" | "gem")[] = ["coin", "coin", "coin", "star", "gem"];
        this.collectibles.push({
          x: trampoline.x + trampoline.width / 2,
          y: y - 40 - Math.random() * 30,
          type: types[Math.floor(Math.random() * types.length)],
          collected: false,
          rotation: 0,
        });
      }

      y += 80 + Math.random() * 60;
    }
  }

  private generateClouds() {
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 3,
        size: 40 + Math.random() * 60,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Apply horizontal movement
    this.player.vx += this.moveDir * 0.5;
    this.player.vx *= 0.95;
    this.player.vx = Math.max(-MAX_VX, Math.min(MAX_VX, this.player.vx));

    // Apply gravity
    this.player.vy += GRAVITY;

    // Move player
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Rotation based on velocity
    this.player.rotation = this.player.vx * 0.05;

    // Screen wrap
    if (this.player.x < -this.player.width) {
      this.player.x = this.width;
    } else if (this.player.x > this.width) {
      this.player.x = -this.player.width;
    }

    // Update max height
    const currentHeight = this.height - this.player.y + this.cameraY;
    if (currentHeight > this.maxHeight) {
      this.maxHeight = currentHeight;
      this.emitState();
    }

    // Camera follow
    const targetCameraY = Math.max(0, this.height - this.player.y - this.height * 0.4);
    if (targetCameraY > this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    }

    // Generate more trampolines as needed
    const highestTrampoline = Math.max(...this.trampolines.map((t) => t.y));
    if (this.player.y - 500 < highestTrampoline) {
      this.generateTrampolines(highestTrampoline - 100, highestTrampoline + 500);
    }

    // Trampoline collision
    for (const tramp of this.trampolines) {
      if (this.player.vy > 0) {
        const playerBottom = this.player.y + this.player.height / 2;
        const playerLeft = this.player.x - this.player.width / 2;
        const playerRight = this.player.x + this.player.width / 2;

        if (
          playerBottom >= tramp.y &&
          playerBottom <= tramp.y + 15 &&
          playerRight > tramp.x &&
          playerLeft < tramp.x + tramp.width
        ) {
          this.player.vy = tramp.bouncePower;
          tramp.bouncing = true;
          setTimeout(() => {
            tramp.bouncing = false;
          }, 200);

          this.score += tramp.bouncePower === SUPER_BOUNCE ? 20 : 10;

          // Bounce particles
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: this.player.x,
              y: tramp.y,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 4,
              life: 1,
              color: tramp.color,
            });
          }

          this.emitState();
        }
      }
    }

    // Collectible collision
    for (const col of this.collectibles) {
      if (!col.collected) {
        col.rotation += 0.05;

        const dx = this.player.x - col.x;
        const dy = this.player.y - col.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 35) {
          col.collected = true;
          const points = col.type === "gem" ? 100 : col.type === "star" ? 50 : 10;
          this.score += points;

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }

          // Sparkle particles
          for (let i = 0; i < 10; i++) {
            this.particles.push({
              x: col.x,
              y: col.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 1,
              color: col.type === "gem" ? "#9B59B6" : col.type === "star" ? "#FFD700" : "#F1C40F",
            });
          }

          this.emitState();
        }
      }
    }

    // Update clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > this.width + cloud.size) {
        cloud.x = -cloud.size;
        cloud.y = this.cameraY + Math.random() * this.height;
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.03;
      return p.life > 0;
    });

    // Check game over (fell off screen)
    if (this.player.y > this.cameraY + this.height + 100) {
      this.gameOver();
    }

    // Cleanup off-screen elements
    this.trampolines = this.trampolines.filter((t) => t.y > this.cameraY - 100);
    this.collectibles = this.collectibles.filter((c) => c.y > this.cameraY - 100);
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

    // Sky gradient based on height
    const heightRatio = Math.min(1, this.maxHeight / 5000);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGradient.addColorStop(0, this.lerpColor("#87CEEB", "#1a1a2e", heightRatio));
    skyGradient.addColorStop(1, this.lerpColor("#E0F7FA", "#16213e", heightRatio));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw stars at high altitude
    if (heightRatio > 0.3) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(heightRatio - 0.3) * 1.4})`;
      for (let i = 0; i < 50; i++) {
        const x = (i * 73 + this.cameraY * 0.1) % this.width;
        const y = (i * 97) % this.height;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw clouds
    for (const cloud of this.clouds) {
      const screenY = cloud.y - this.cameraY;
      if (screenY > -100 && screenY < this.height + 100) {
        this.drawCloud(cloud.x, screenY, cloud.size);
      }
    }

    // Draw trampolines
    for (const tramp of this.trampolines) {
      const screenY = tramp.y - this.cameraY;
      if (screenY > -50 && screenY < this.height + 50) {
        this.drawTrampoline(tramp, screenY);
      }
    }

    // Draw collectibles
    for (const col of this.collectibles) {
      if (!col.collected) {
        const screenY = col.y - this.cameraY;
        if (screenY > -50 && screenY < this.height + 50) {
          this.drawCollectible(col, screenY);
        }
      }
    }

    // Draw particles
    for (const p of this.particles) {
      const screenY = p.y - this.cameraY;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw player
    this.drawPlayer();

    // Draw height indicator
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(this.maxHeight / 10)}m`, this.width - 10, 25);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.15, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y + size * 0.1, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTrampoline(tramp: Trampoline, screenY: number) {
    const ctx = this.ctx;
    const bounceOffset = tramp.bouncing ? 5 : 0;

    // Legs
    ctx.fillStyle = "#555";
    ctx.fillRect(tramp.x + 5, screenY, 6, 20);
    ctx.fillRect(tramp.x + tramp.width - 11, screenY, 6, 20);

    // Pad
    ctx.fillStyle = tramp.color;
    ctx.beginPath();
    ctx.roundRect(tramp.x, screenY - 8 + bounceOffset, tramp.width, 12, 6);
    ctx.fill();

    // Super bounce indicator
    if (tramp.bouncePower === SUPER_BOUNCE) {
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(tramp.x + tramp.width / 2, screenY - 2 + bounceOffset, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(tramp.x + 5, screenY - 6 + bounceOffset, tramp.width - 10, 4);
  }

  private drawCollectible(col: Collectible, screenY: number) {
    const ctx = this.ctx;
    const bounce = Math.sin(Date.now() / 200) * 3;

    ctx.save();
    ctx.translate(col.x, screenY + bounce);
    ctx.rotate(col.rotation);

    if (col.type === "gem") {
      ctx.fillStyle = "#9B59B6";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(5, -5);
      ctx.lineTo(-5, -5);
      ctx.closePath();
      ctx.fill();
    } else if (col.type === "star") {
      ctx.fillStyle = "#FFD700";
      this.drawStar(ctx, 0, 0, 12);
    } else {
      ctx.fillStyle = "#F1C40F";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(-3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const screenY = this.player.y - this.cameraY;

    ctx.save();
    ctx.translate(this.player.x, screenY);
    ctx.rotate(this.player.rotation);

    // Body
    ctx.fillStyle = "#FF6B6B";
    ctx.beginPath();
    ctx.roundRect(-15, -20, 30, 35, 10);
    ctx.fill();

    // Face
    ctx.fillStyle = "#FFCC80";
    ctx.beginPath();
    ctx.arc(0, -25, 15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(-5, -28, 3, 0, Math.PI * 2);
    ctx.arc(5, -28, 3, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -23, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Arms (based on velocity)
    ctx.fillStyle = "#FFCC80";
    const armAngle = this.player.vy < 0 ? -0.8 : 0.5;
    ctx.save();
    ctx.translate(-15, -10);
    ctx.rotate(armAngle);
    ctx.fillRect(0, 0, 15, 6);
    ctx.restore();

    ctx.save();
    ctx.translate(15, -10);
    ctx.rotate(-armAngle);
    ctx.fillRect(-15, 0, 15, 6);
    ctx.restore();

    // Legs
    ctx.fillStyle = "#3498db";
    ctx.fillRect(-12, 15, 10, 15);
    ctx.fillRect(2, 15, 10, 15);

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
