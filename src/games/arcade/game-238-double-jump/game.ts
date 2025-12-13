/**
 * Double Jump Game Engine
 * Game #238
 *
 * Platform game with double jump mechanics!
 */

interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "moving" | "crumbling";
  moveDir?: number;
  crumbleTimer?: number;
}

interface GameState {
  score: number;
  highScore: number;
  jumpsLeft: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PLAYER_SIZE = 30;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MAX_JUMPS = 2;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 15;

export class DoubleJumpGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private highScore = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private playerX = 0;
  private playerY = 0;
  private playerVelY = 0;
  private jumpsLeft = MAX_JUMPS;
  private platforms: Platform[] = [];
  private cameraY = 0;
  private highestY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("doublejump_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("doublejump_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        jumpsLeft: this.jumpsLeft,
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
    this.status = "playing";
    this.jumpsLeft = MAX_JUMPS;
    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height - 100;
    this.playerVelY = 0;
    this.cameraY = 0;
    this.highestY = this.playerY;

    this.generatePlatforms();
    this.emitState();
    this.gameLoop();
  }

  private generatePlatforms() {
    this.platforms = [];

    // Starting platform
    this.platforms.push({
      x: this.canvas.width / 2 - PLATFORM_WIDTH / 2,
      y: this.canvas.height - 50,
      width: PLATFORM_WIDTH,
      type: "normal",
    });

    // Generate more platforms
    let y = this.canvas.height - 120;
    while (y > -this.canvas.height * 2) {
      const x = Math.random() * (this.canvas.width - PLATFORM_WIDTH);
      const rand = Math.random();
      let type: Platform["type"] = "normal";

      if (rand > 0.8) {
        type = "moving";
      } else if (rand > 0.6) {
        type = "crumbling";
      }

      this.platforms.push({
        x,
        y,
        width: PLATFORM_WIDTH,
        type,
        moveDir: type === "moving" ? (Math.random() > 0.5 ? 1 : -1) : undefined,
      });

      y -= 60 + Math.random() * 40;
    }
  }

  jump() {
    if (this.status !== "playing") return;
    if (this.jumpsLeft <= 0) return;

    this.playerVelY = JUMP_FORCE;
    this.jumpsLeft--;
    this.emitState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Apply gravity
    this.playerVelY += GRAVITY;
    this.playerY += this.playerVelY;

    // Update highest point (score)
    if (this.playerY < this.highestY) {
      this.score += Math.floor((this.highestY - this.playerY) / 10);
      this.highestY = this.playerY;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }
    }

    // Update camera
    const targetCameraY = this.playerY - this.canvas.height / 3;
    if (targetCameraY < this.cameraY) {
      this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    }

    // Update platforms
    this.platforms.forEach((platform) => {
      // Moving platforms
      if (platform.type === "moving" && platform.moveDir) {
        platform.x += platform.moveDir * 2;
        if (platform.x <= 0 || platform.x >= this.canvas.width - platform.width) {
          platform.moveDir *= -1;
        }
      }

      // Crumbling platforms
      if (platform.type === "crumbling" && platform.crumbleTimer !== undefined) {
        platform.crumbleTimer--;
        if (platform.crumbleTimer <= 0) {
          platform.y = -9999; // Remove platform
        }
      }
    });

    // Check platform collisions (only when falling)
    if (this.playerVelY > 0) {
      this.platforms.forEach((platform) => {
        const playerBottom = this.playerY + PLAYER_SIZE / 2;
        const playerLeft = this.playerX - PLAYER_SIZE / 2;
        const playerRight = this.playerX + PLAYER_SIZE / 2;

        if (
          playerBottom >= platform.y &&
          playerBottom <= platform.y + PLATFORM_HEIGHT &&
          playerRight >= platform.x &&
          playerLeft <= platform.x + platform.width
        ) {
          this.playerY = platform.y - PLAYER_SIZE / 2;
          this.playerVelY = 0;
          this.jumpsLeft = MAX_JUMPS;

          if (platform.type === "crumbling" && platform.crumbleTimer === undefined) {
            platform.crumbleTimer = 30;
          }

          this.emitState();
        }
      });
    }

    // Generate more platforms as player climbs
    const highestPlatform = Math.min(...this.platforms.map((p) => p.y));
    if (highestPlatform > this.cameraY - this.canvas.height) {
      let y = highestPlatform - 60 - Math.random() * 40;
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * (this.canvas.width - PLATFORM_WIDTH);
        const rand = Math.random();
        let type: Platform["type"] = "normal";

        if (rand > 0.75) {
          type = "moving";
        } else if (rand > 0.5) {
          type = "crumbling";
        }

        this.platforms.push({
          x,
          y,
          width: PLATFORM_WIDTH,
          type,
          moveDir: type === "moving" ? (Math.random() > 0.5 ? 1 : -1) : undefined,
        });

        y -= 60 + Math.random() * 40;
      }
    }

    // Remove platforms below camera
    this.platforms = this.platforms.filter(
      (p) => p.y < this.cameraY + this.canvas.height + 100
    );

    // Check game over
    if (this.playerY > this.cameraY + this.canvas.height + 50) {
      this.gameOver();
    }

    this.emitState();
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

    // Sky gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % w;
      const y = ((i * 97 - this.cameraY * 0.1) % h + h) % h;
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.save();
    ctx.translate(0, -this.cameraY);

    // Draw platforms
    this.platforms.forEach((platform) => {
      this.drawPlatform(platform);
    });

    // Draw player
    this.drawPlayer();

    ctx.restore();
  }

  private drawPlatform(platform: Platform) {
    const ctx = this.ctx;

    let color = "#4ade80"; // Normal - green
    if (platform.type === "moving") {
      color = "#60a5fa"; // Moving - blue
    } else if (platform.type === "crumbling") {
      if (platform.crumbleTimer !== undefined) {
        const alpha = platform.crumbleTimer / 30;
        color = `rgba(251, 146, 60, ${alpha})`; // Crumbling - orange fading
      } else {
        color = "#fb923c"; // Crumbling - orange
      }
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT, 5);
    ctx.fill();

    // Platform shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(platform.x + 5, platform.y + 2, platform.width - 10, 4, 2);
    ctx.fill();
  }

  private drawPlayer() {
    const ctx = this.ctx;

    // Glow effect
    const gradient = ctx.createRadialGradient(
      this.playerX,
      this.playerY,
      0,
      this.playerX,
      this.playerY,
      PLAYER_SIZE
    );
    gradient.addColorStop(0, "rgba(250, 204, 21, 0.3)");
    gradient.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Player body
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#1a1a2e";
    const eyeOffset = PLAYER_SIZE / 6;
    ctx.beginPath();
    ctx.arc(this.playerX - eyeOffset, this.playerY - 3, 4, 0, Math.PI * 2);
    ctx.arc(this.playerX + eyeOffset, this.playerY - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Jump trail when in air
    if (this.playerVelY < 0) {
      ctx.fillStyle = "rgba(250, 204, 21, 0.3)";
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(
          this.playerX,
          this.playerY + i * 15,
          (PLAYER_SIZE / 2) * (1 - i * 0.2),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
