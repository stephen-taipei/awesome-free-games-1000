/**
 * Heaven Run Game Engine
 * Game #405
 *
 * A heavenly parkour game where you run and jump on clouds
 */

interface Point {
  x: number;
  y: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  type: "cloud" | "golden";
}

interface Star {
  x: number;
  y: number;
  collected: boolean;
}

interface Powerup {
  x: number;
  y: number;
  type: "halo" | "feather";
  collected: boolean;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  jumpPower: number;
  fallSpeed: number;
}

interface GameState {
  score: number;
  highScore: number;
  height: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_POWER = -12;
const MOVE_SPEED = 5;
const PLAYER_SIZE = 30;
const PLATFORM_SPAWN_INTERVAL = 150;
const MIN_PLATFORM_GAP = 100;
const MAX_PLATFORM_GAP = 200;

export class HeavenRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private platforms: Platform[] = [];
  private stars: Star[] = [];
  private powerups: Powerup[] = [];
  private score = 0;
  private highScore = 0;
  private height = 0;
  private maxHeight = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private cameraY = 0;
  private keys: Set<string> = new Set();
  private cloudParticles: Array<{ x: number; y: number; size: number; speed: number }> = [];
  private haloEffect = false;
  private featherEffect = false;
  private effectTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      onGround: false,
      jumpPower: JUMP_POWER,
      fallSpeed: 1,
    };

    this.initCloudParticles();
  }

  private initCloudParticles() {
    for (let i = 0; i < 20; i++) {
      this.cloudParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 30 + 20,
        speed: Math.random() * 0.5 + 0.2,
      });
    }
  }

  private loadHighScore() {
    const saved = localStorage.getItem("heavenrun_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("heavenrun_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        height: this.height,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  start() {
    this.score = 0;
    this.height = 0;
    this.maxHeight = 0;
    this.cameraY = 0;
    this.haloEffect = false;
    this.featherEffect = false;
    this.effectTimer = 0;

    // Initialize player
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height - 200;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = false;
    this.player.jumpPower = JUMP_POWER;
    this.player.fallSpeed = 1;

    // Initialize platforms
    this.platforms = [];
    this.createInitialPlatforms();

    // Initialize collectibles
    this.stars = [];
    this.powerups = [];

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private createInitialPlatforms() {
    // Starting platform
    this.platforms.push({
      x: this.canvas.width / 2 - 100,
      y: this.canvas.height - 150,
      width: 200,
      type: "cloud",
    });

    // Generate platforms upward
    let lastY = this.canvas.height - 150;
    for (let i = 0; i < 15; i++) {
      lastY -= 80 + Math.random() * 40;
      const x = Math.random() * (this.canvas.width - 150);
      const isGolden = Math.random() < 0.1;

      this.platforms.push({
        x,
        y: lastY,
        width: isGolden ? 120 : 150,
        type: isGolden ? "golden" : "cloud",
      });

      // Add star above some platforms
      if (Math.random() < 0.4) {
        this.stars.push({
          x: x + (isGolden ? 60 : 75),
          y: lastY - 50,
          collected: false,
        });
      }

      // Add powerup occasionally
      if (Math.random() < 0.1) {
        this.powerups.push({
          x: x + (isGolden ? 60 : 75),
          y: lastY - 60,
          type: Math.random() < 0.5 ? "halo" : "feather",
          collected: false,
        });
      }
    }
  }

  handleKeyDown(key: string) {
    this.keys.add(key);

    if ((key === " " || key === "ArrowUp" || key === "w") && this.player.onGround) {
      this.jump();
    }
  }

  handleKeyUp(key: string) {
    this.keys.delete(key);
  }

  jump() {
    if (this.player.onGround) {
      this.player.vy = this.player.jumpPower;
      this.player.onGround = false;
    }
  }

  private gameLoop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update() {
    // Handle horizontal movement
    if (this.keys.has("ArrowLeft") || this.keys.has("a")) {
      this.player.vx = -MOVE_SPEED;
    } else if (this.keys.has("ArrowRight") || this.keys.has("d")) {
      this.player.vx = MOVE_SPEED;
    } else {
      this.player.vx = 0;
    }

    // Apply gravity
    const gravity = this.featherEffect ? GRAVITY * 0.5 : GRAVITY;
    this.player.vy += gravity;

    // Apply velocity
    this.player.x += this.player.vx;
    this.player.y += this.player.vy * this.player.fallSpeed;

    // Wrap horizontally
    if (this.player.x < -this.player.width) {
      this.player.x = this.canvas.width;
    } else if (this.player.x > this.canvas.width) {
      this.player.x = -this.player.width;
    }

    // Check platform collisions
    this.player.onGround = false;
    for (const platform of this.platforms) {
      const relativeY = platform.y - this.cameraY;

      if (
        this.player.vy >= 0 &&
        this.player.x + this.player.width > platform.x &&
        this.player.x < platform.x + platform.width &&
        this.player.y + this.player.height >= relativeY &&
        this.player.y + this.player.height <= relativeY + 20
      ) {
        this.player.y = relativeY - this.player.height;
        this.player.vy = 0;
        this.player.onGround = true;

        if (platform.type === "golden") {
          this.score += 50;
          this.emitState();
        }
        break;
      }
    }

    // Collect stars
    for (const star of this.stars) {
      if (!star.collected) {
        const relativeY = star.y - this.cameraY;
        const dist = Math.hypot(
          this.player.x + this.player.width / 2 - star.x,
          this.player.y + this.player.height / 2 - relativeY
        );

        if (dist < 25) {
          star.collected = true;
          this.score += 10;
          this.emitState();
        }
      }
    }

    // Collect powerups
    for (const powerup of this.powerups) {
      if (!powerup.collected) {
        const relativeY = powerup.y - this.cameraY;
        const dist = Math.hypot(
          this.player.x + this.player.width / 2 - powerup.x,
          this.player.y + this.player.height / 2 - relativeY
        );

        if (dist < 25) {
          powerup.collected = true;

          if (powerup.type === "halo") {
            this.haloEffect = true;
            this.player.jumpPower = JUMP_POWER * 1.5;
            this.effectTimer = 300; // 5 seconds at 60fps
          } else if (powerup.type === "feather") {
            this.featherEffect = true;
            this.player.fallSpeed = 0.6;
            this.effectTimer = 300;
          }
        }
      }
    }

    // Update effect timer
    if (this.effectTimer > 0) {
      this.effectTimer--;
      if (this.effectTimer === 0) {
        this.haloEffect = false;
        this.featherEffect = false;
        this.player.jumpPower = JUMP_POWER;
        this.player.fallSpeed = 1;
      }
    }

    // Camera follows player when going up
    const targetCameraY = Math.max(0, this.player.y - this.canvas.height * 0.4);
    this.cameraY += (targetCameraY - this.cameraY) * 0.1;

    // Update height score
    const currentHeight = Math.floor(-this.cameraY / 10);
    if (currentHeight > this.maxHeight) {
      this.maxHeight = currentHeight;
      this.height = currentHeight;
      this.score += 1;
      this.emitState();
    }

    // Generate new platforms
    const highestPlatform = Math.min(...this.platforms.map(p => p.y));
    if (highestPlatform > this.cameraY - this.canvas.height) {
      const lastY = highestPlatform;
      const newY = lastY - (80 + Math.random() * 40);
      const x = Math.random() * (this.canvas.width - 150);
      const isGolden = Math.random() < 0.1;

      this.platforms.push({
        x,
        y: newY,
        width: isGolden ? 120 : 150,
        type: isGolden ? "golden" : "cloud",
      });

      if (Math.random() < 0.4) {
        this.stars.push({
          x: x + (isGolden ? 60 : 75),
          y: newY - 50,
          collected: false,
        });
      }

      if (Math.random() < 0.1) {
        this.powerups.push({
          x: x + (isGolden ? 60 : 75),
          y: newY - 60,
          type: Math.random() < 0.5 ? "halo" : "feather",
          collected: false,
        });
      }
    }

    // Remove platforms below view
    this.platforms = this.platforms.filter(
      p => p.y < this.cameraY + this.canvas.height + 100
    );
    this.stars = this.stars.filter(
      s => s.y < this.cameraY + this.canvas.height + 100
    );
    this.powerups = this.powerups.filter(
      p => p.y < this.cameraY + this.canvas.height + 100
    );

    // Update cloud particles
    this.cloudParticles.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x < -cloud.size) {
        cloud.x = this.canvas.width + cloud.size;
        cloud.y = Math.random() * this.canvas.height;
      }
    });

    // Check game over
    if (this.player.y - this.cameraY > this.canvas.height) {
      this.gameOver();
    }

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.5, "#B0E2FF");
    gradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    const sunGradient = ctx.createRadialGradient(w - 100, 100, 20, w - 100, 100, 60);
    sunGradient.addColorStop(0, "#FFD700");
    sunGradient.addColorStop(0.5, "#FFA500");
    sunGradient.addColorStop(1, "rgba(255, 165, 0, 0)");
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(w - 100, 100, 60, 0, Math.PI * 2);
    ctx.fill();

    // Background clouds
    this.drawBackgroundClouds();

    // Draw platforms
    for (const platform of this.platforms) {
      const y = platform.y - this.cameraY;
      if (y > -100 && y < h + 100) {
        this.drawPlatform(platform.x, y, platform.width, platform.type);
      }
    }

    // Draw stars
    for (const star of this.stars) {
      if (!star.collected) {
        const y = star.y - this.cameraY;
        if (y > -50 && y < h + 50) {
          this.drawStar(star.x, y);
        }
      }
    }

    // Draw powerups
    for (const powerup of this.powerups) {
      if (!powerup.collected) {
        const y = powerup.y - this.cameraY;
        if (y > -50 && y < h + 50) {
          this.drawPowerup(powerup.x, y, powerup.type);
        }
      }
    }

    // Draw player
    this.drawPlayer();
  }

  private drawBackgroundClouds() {
    this.cloudParticles.forEach(cloud => {
      this.drawCloud(cloud.x, cloud.y, cloud.size, 0.3);
    });
  }

  private drawCloud(x: number, y: number, size: number, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "white";

    // Cloud shape with circles
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x - size * 0.4, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y - size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.2, y - size * 0.3, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPlatform(x: number, y: number, width: number, type: "cloud" | "golden") {
    const ctx = this.ctx;
    const height = 30;

    if (type === "golden") {
      // Golden cloud
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "#FFD700");
      gradient.addColorStop(0.5, "#FFA500");
      gradient.addColorStop(1, "#FF8C00");
      ctx.fillStyle = gradient;
    } else {
      // White cloud
      ctx.fillStyle = "white";
    }

    // Draw cloud platform
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cloud puffs
    ctx.beginPath();
    ctx.arc(x + width * 0.25, y + height * 0.3, width * 0.15, 0, Math.PI * 2);
    ctx.arc(x + width * 0.5, y + height * 0.2, width * 0.18, 0, Math.PI * 2);
    ctx.arc(x + width * 0.75, y + height * 0.3, width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    if (type === "golden") {
      // Sparkle effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(x + width * 0.3, y + height * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(x + width * 0.7, y + height * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStar(x: number, y: number) {
    const ctx = this.ctx;
    const size = 15;
    const time = Date.now() / 1000;
    const scale = 1 + Math.sin(time * 3) * 0.1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? size : size / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sparkle
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();
  }

  private drawPowerup(x: number, y: number, type: "halo" | "feather") {
    const ctx = this.ctx;
    const time = Date.now() / 1000;
    const bob = Math.sin(time * 2) * 5;

    if (type === "halo") {
      // Halo
      ctx.save();
      ctx.translate(x, y + bob);

      // Outer glow
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 20);
      gradient.addColorStop(0, "rgba(255, 215, 0, 0.8)");
      gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // Halo ring
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    } else {
      // Feather
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.rotate(Math.sin(time * 3) * 0.2);

      // Feather shaft
      ctx.fillStyle = "white";
      ctx.fillRect(-2, -15, 4, 30);

      // Feather vanes
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Feather details
      ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
      ctx.lineWidth = 1;
      for (let i = -10; i <= 10; i += 5) {
        ctx.beginPath();
        ctx.moveTo(-8, i);
        ctx.lineTo(8, i);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const x = this.player.x;
    const y = this.player.y;
    const size = this.player.width;

    // Halo effect
    if (this.haloEffect) {
      const gradient = ctx.createRadialGradient(x + size / 2, y - 5, 5, x + size / 2, y - 5, 25);
      gradient.addColorStop(0, "rgba(255, 215, 0, 0.6)");
      gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + size / 2, y - 5, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + size / 2, y - 5, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Wings
    this.drawWings(x, y + size / 2, size);

    // Angel body
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Face
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.4, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y + size * 0.35, 2, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y + size * 0.35, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.4, size * 0.15, 0, Math.PI);
    ctx.stroke();

    // Feather effect particles
    if (this.featherEffect) {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 20 + 10;
        const px = x + size / 2 + Math.cos(angle) * dist;
        const py = y + size / 2 + Math.sin(angle) * dist;

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
      }
    }
  }

  private drawWings(x: number, y: number, size: number) {
    const ctx = this.ctx;
    const time = Date.now() / 200;
    const flapAngle = Math.sin(time) * 0.3;

    // Left wing
    ctx.save();
    ctx.translate(x + size * 0.2, y);
    ctx.rotate(-flapAngle);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-size * 0.4, 0, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.translate(x + size * 0.8, y);
    ctx.rotate(flapAngle);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(size * 0.4, 0, size * 0.5, size * 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Wing details
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1;

    // Left wing feathers
    ctx.save();
    ctx.translate(x + size * 0.2, y);
    ctx.rotate(-flapAngle);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.2 + i * size * 0.13);
      ctx.lineTo(-size * 0.2, -size * 0.2 + i * size * 0.13);
      ctx.stroke();
    }
    ctx.restore();

    // Right wing feathers
    ctx.save();
    ctx.translate(x + size * 0.8, y);
    ctx.rotate(flapAngle);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(size * 0.2, -size * 0.2 + i * size * 0.13);
      ctx.lineTo(size * 0.6, -size * 0.2 + i * size * 0.13);
      ctx.stroke();
    }
    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
