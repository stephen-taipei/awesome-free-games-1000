/**
 * Trampoline Game Engine
 * Game #190
 *
 * Bounce on trampolines and collect stars!
 */

interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "spring" | "moving" | "break";
  vx?: number;
  broken?: boolean;
}

interface Star {
  x: number;
  y: number;
  collected: boolean;
}

interface GameState {
  score: number;
  height: number;
  stars: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class TrampolineGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playerX = 0;
  private playerY = 0;
  private playerVx = 0;
  private playerVy = 0;
  private platforms: Platform[] = [];
  private starsList: Star[] = [];
  private score = 0;
  private height = 0;
  private maxHeight = 0;
  private stars = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private cameraY = 0;

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
        score: this.score,
        height: Math.floor(this.maxHeight / 10),
        stars: this.stars,
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
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.playerX = w / 2;
    this.playerY = h - 100;
    this.playerVx = 0;
    this.playerVy = 0;
    this.score = 0;
    this.height = 0;
    this.maxHeight = 0;
    this.stars = 0;
    this.cameraY = 0;
    this.platforms = [];
    this.starsList = [];

    // Create initial platforms
    this.generatePlatforms(0, h * 3);

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private generatePlatforms(fromY: number, toY: number) {
    const w = this.canvas.width;
    const platformWidth = w * 0.2;
    const gap = 80;

    for (let y = fromY; y < toY; y += gap) {
      const type = this.getPlatformType();
      const platform: Platform = {
        x: Math.random() * (w - platformWidth),
        y: y,
        width: platformWidth,
        type,
      };

      if (type === "moving") {
        platform.vx = (Math.random() > 0.5 ? 1 : -1) * 2;
      }

      this.platforms.push(platform);

      // Add stars occasionally
      if (Math.random() < 0.3) {
        this.starsList.push({
          x: platform.x + platformWidth / 2,
          y: y - 40,
          collected: false,
        });
      }
    }
  }

  private getPlatformType(): Platform["type"] {
    const rand = Math.random();
    if (rand < 0.6) return "normal";
    if (rand < 0.75) return "spring";
    if (rand < 0.9) return "moving";
    return "break";
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  movePlayer(direction: "left" | "right") {
    if (this.status !== "playing") return;
    const accel = 0.8;
    if (direction === "left") {
      this.playerVx -= accel;
    } else {
      this.playerVx += accel;
    }
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gravity = 0.25;
    const maxVx = 8;
    const friction = 0.95;

    // Handle input
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.playerVx -= 0.5;
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.playerVx += 0.5;
    }

    // Apply physics
    this.playerVx *= friction;
    this.playerVx = Math.max(-maxVx, Math.min(maxVx, this.playerVx));
    this.playerVy += gravity;

    // Move player
    this.playerX += this.playerVx;
    this.playerY += this.playerVy;

    // Wrap around horizontally
    if (this.playerX < -20) this.playerX = w + 20;
    if (this.playerX > w + 20) this.playerX = -20;

    // Update camera
    const targetCameraY = this.playerY - h * 0.4;
    if (targetCameraY < this.cameraY) {
      this.cameraY = targetCameraY;
    }

    // Track max height
    const currentHeight = -this.playerY;
    if (currentHeight > this.maxHeight) {
      this.maxHeight = currentHeight;
      this.score = Math.floor(this.maxHeight / 5);
      this.emitState();
    }

    // Update platforms
    for (const platform of this.platforms) {
      if (platform.type === "moving" && platform.vx) {
        platform.x += platform.vx;
        if (platform.x < 0 || platform.x + platform.width > w) {
          platform.vx *= -1;
        }
      }
    }

    // Check platform collisions (only when falling)
    if (this.playerVy > 0) {
      const playerBottom = this.playerY + 20;
      const playerLeft = this.playerX - 15;
      const playerRight = this.playerX + 15;

      for (const platform of this.platforms) {
        if (platform.broken) continue;

        if (
          playerBottom >= platform.y &&
          playerBottom <= platform.y + 15 &&
          playerRight > platform.x &&
          playerLeft < platform.x + platform.width
        ) {
          // Bounce!
          if (platform.type === "break") {
            platform.broken = true;
            this.playerVy = -10;
          } else if (platform.type === "spring") {
            this.playerVy = -18;
            this.score += 20;
          } else {
            this.playerVy = -12;
          }

          this.emitState();
          break;
        }
      }
    }

    // Collect stars
    for (const star of this.starsList) {
      if (star.collected) continue;

      const dx = this.playerX - star.x;
      const dy = this.playerY - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        star.collected = true;
        this.stars++;
        this.score += 50;
        this.emitState();
      }
    }

    // Generate more platforms as player goes up
    const topPlatform = Math.min(...this.platforms.map((p) => p.y));
    if (topPlatform > this.cameraY - h) {
      this.generatePlatforms(topPlatform - h, topPlatform);
    }

    // Remove platforms and stars below view
    this.platforms = this.platforms.filter((p) => p.y < this.cameraY + h * 2);
    this.starsList = this.starsList.filter((s) => s.y < this.cameraY + h * 2);

    // Check game over
    if (this.playerY > this.cameraY + h + 50) {
      this.status = "over";
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient based on height
    const heightFactor = Math.min(1, this.maxHeight / 5000);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    skyGradient.addColorStop(0, this.lerpColor("#87ceeb", "#1a1a2e", heightFactor));
    skyGradient.addColorStop(1, this.lerpColor("#a8e6cf", "#16213e", heightFactor));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw clouds/stars based on height
    if (heightFactor < 0.5) {
      this.drawClouds();
    } else {
      this.drawStarsBackground();
    }

    ctx.save();
    ctx.translate(0, -this.cameraY);

    // Draw platforms
    for (const platform of this.platforms) {
      if (platform.broken) continue;
      this.drawPlatform(platform);
    }

    // Draw stars
    for (const star of this.starsList) {
      if (star.collected) continue;
      this.drawStar(star);
    }

    // Draw player
    this.drawPlayer();

    ctx.restore();

    // Height indicator
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(this.maxHeight / 10)}m`, w - 10, 25);
  }

  private drawClouds() {
    const ctx = this.ctx;
    const time = Date.now() / 3000;

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + time * 20) % (this.canvas.width + 100)) - 50;
      const y = 50 + i * 60;
      const size = 30 + i * 10;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.arc(x + size * 0.7, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
      ctx.arc(x + size * 1.3, y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStarsBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";

    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % this.canvas.width;
      const y = (i * 251) % this.canvas.height;
      const size = (i % 3) + 1;
      const twinkle = 0.5 + Math.sin(Date.now() / 200 + i) * 0.5;

      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlatform(platform: Platform) {
    const ctx = this.ctx;
    const x = platform.x;
    const y = platform.y;
    const width = platform.width;
    const height = 15;

    let color: string;
    switch (platform.type) {
      case "spring":
        color = "#e74c3c";
        break;
      case "moving":
        color = "#9b59b6";
        break;
      case "break":
        color = "#95a5a6";
        break;
      default:
        color = "#2ecc71";
    }

    // Platform shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, width, height, 5);
    ctx.fill();

    // Platform body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 5);
    ctx.fill();

    // Platform highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 2, width - 6, height / 3, 3);
    ctx.fill();

    // Spring indicator
    if (platform.type === "spring") {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const sx = x + width * 0.3 + i * width * 0.2;
        ctx.moveTo(sx, y - 5);
        ctx.lineTo(sx, y - 15);
      }
      ctx.stroke();
    }
  }

  private drawStar(star: Star) {
    const ctx = this.ctx;
    const x = star.x;
    const y = star.y;
    const size = 15;
    const rotation = Date.now() / 500;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Star glow
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    glowGradient.addColorStop(0, "rgba(243, 156, 18, 0.5)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerX = Math.cos(angle) * size;
      const outerY = Math.sin(angle) * size;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * (size * 0.4);
      const innerY = Math.sin(innerAngle) * (size * 0.4);

      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const x = this.playerX;
    const y = this.playerY;
    const size = 20;

    // Character body
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = "#ffd5a3";
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (happy when going up, worried when falling)
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.playerVy < 0) {
      ctx.arc(x, y - size * 0.2, size * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
    } else {
      ctx.arc(x, y - size * 0.1, size * 0.2, 1.1 * Math.PI, 1.9 * Math.PI);
    }
    ctx.stroke();

    // Arms (spread when jumping)
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    const armAngle = this.playerVy < 0 ? -0.5 : 0.3;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.8, y);
    ctx.lineTo(x - size * 1.5, y + armAngle * size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.8, y);
    ctx.lineTo(x + size * 1.5, y + armAngle * size);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(x - size * 0.3, y + size);
    ctx.lineTo(x - size * 0.4, y + size * 1.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + size);
    ctx.lineTo(x + size * 0.4, y + size * 1.5);
    ctx.stroke();
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
