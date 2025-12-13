/**
 * Parachute Drop Game Engine
 * Game #245
 *
 * Fall physics with item collection!
 */

interface Collectible {
  x: number;
  y: number;
  type: "star" | "coin" | "gem" | "danger";
  collected: boolean;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
}

interface GameState {
  score: number;
  altitude: number;
  highScore: number;
  status: "idle" | "playing" | "landed" | "crashed";
}

type StateCallback = (state: GameState) => void;

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const GRAVITY = 0.05;
const MAX_FALL_SPEED = 4;
const HORIZONTAL_SPEED = 5;
const WIND_CHANGE_INTERVAL = 180;

export class ParachuteDropGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: "idle" | "playing" | "landed" | "crashed" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private playerX = 0;
  private playerY = 0;
  private playerVY = 0;
  private playerVX = 0;

  private score = 0;
  private highScore = 0;
  private altitude = 1000;
  private collectibles: Collectible[] = [];
  private clouds: Cloud[] = [];

  private movingLeft = false;
  private movingRight = false;
  private wind = 0;
  private windTimer = 0;
  private parachuteOpen = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.loadHighScore();
    this.setupControls();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("parachutedrop_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("parachutedrop_highscore", this.highScore.toString());
  }

  private setupControls() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.movingLeft = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.movingRight = true;
      }
      if (e.key === " " || e.key === "ArrowDown") {
        this.parachuteOpen = false;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.movingLeft = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.movingRight = false;
      }
      if (e.key === " " || e.key === "ArrowDown") {
        this.parachuteOpen = true;
      }
    });
  }

  moveLeft(active: boolean) {
    this.movingLeft = active;
  }

  moveRight(active: boolean) {
    this.movingRight = active;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        altitude: Math.max(0, Math.floor(this.altitude)),
        highScore: this.highScore,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.playerX = size / 2;
    this.playerY = size * 0.15;

    this.draw();
  }

  start() {
    this.score = 0;
    this.altitude = 1000;
    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height * 0.15;
    this.playerVY = 0;
    this.playerVX = 0;
    this.wind = 0;
    this.windTimer = 0;
    this.parachuteOpen = true;
    this.collectibles = [];
    this.clouds = [];
    this.status = "playing";

    this.generateItems();
    this.generateClouds();
    this.emitState();
    this.gameLoop();
  }

  private generateItems() {
    const w = this.canvas.width;
    const types: Collectible["type"][] = ["star", "coin", "gem", "danger"];

    for (let i = 0; i < 50; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.collectibles.push({
        x: Math.random() * (w - 60) + 30,
        y: this.canvas.height * 0.3 + Math.random() * this.canvas.height * 2,
        type,
        collected: false,
      });
    }
  }

  private generateClouds() {
    const w = this.canvas.width;
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * w,
        y: Math.random() * this.canvas.height,
        width: 60 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.5,
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
    // Wind changes
    this.windTimer++;
    if (this.windTimer >= WIND_CHANGE_INTERVAL) {
      this.wind = (Math.random() - 0.5) * 2;
      this.windTimer = 0;
    }

    // Horizontal movement
    if (this.movingLeft) {
      this.playerVX = -HORIZONTAL_SPEED;
    } else if (this.movingRight) {
      this.playerVX = HORIZONTAL_SPEED;
    } else {
      this.playerVX *= 0.9;
    }

    // Apply wind
    this.playerVX += this.wind * 0.1;

    // Gravity and fall speed
    const fallSpeed = this.parachuteOpen ? MAX_FALL_SPEED * 0.4 : MAX_FALL_SPEED;
    this.playerVY += GRAVITY;
    if (this.playerVY > fallSpeed) {
      this.playerVY = fallSpeed;
    }

    // Move player
    this.playerX += this.playerVX;

    // Wall boundaries
    if (this.playerX < PLAYER_WIDTH / 2) {
      this.playerX = PLAYER_WIDTH / 2;
      this.playerVX = 0;
    }
    if (this.playerX > this.canvas.width - PLAYER_WIDTH / 2) {
      this.playerX = this.canvas.width - PLAYER_WIDTH / 2;
      this.playerVX = 0;
    }

    // Decrease altitude
    this.altitude -= this.playerVY;

    // Check landing
    if (this.altitude <= 0) {
      this.land();
      return;
    }

    // Move collectibles up (simulating falling)
    const scrollSpeed = this.playerVY;
    this.collectibles.forEach((item) => {
      item.y -= scrollSpeed;

      // Check collection
      if (!item.collected) {
        const dx = item.x - this.playerX;
        const dy = item.y - this.playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
          item.collected = true;
          if (item.type === "danger") {
            this.crash();
            return;
          }
          const points = item.type === "gem" ? 50 : item.type === "coin" ? 20 : 10;
          this.score += points;
        }
      }
    });

    // Remove collected items and spawn new ones
    this.collectibles = this.collectibles.filter(
      (c) => !c.collected && c.y > -50
    );

    while (this.collectibles.length < 30 && this.altitude > 100) {
      const types: Collectible["type"][] = ["star", "coin", "gem", "danger"];
      this.collectibles.push({
        x: Math.random() * (this.canvas.width - 60) + 30,
        y: this.canvas.height + Math.random() * 100,
        type: types[Math.floor(Math.random() * types.length)],
        collected: false,
      });
    }

    // Move clouds
    this.clouds.forEach((cloud) => {
      cloud.y -= scrollSpeed * 0.3;
      cloud.x += cloud.speed + this.wind * 0.5;

      if (cloud.x > this.canvas.width + cloud.width) {
        cloud.x = -cloud.width;
      }
      if (cloud.x < -cloud.width) {
        cloud.x = this.canvas.width + cloud.width;
      }
      if (cloud.y < -50) {
        cloud.y = this.canvas.height + 50;
      }
    });

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    this.emitState();
  }

  private land() {
    this.status = "landed";
    // Bonus for safe landing
    if (this.parachuteOpen) {
      this.score += 100;
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private crash() {
    this.status = "crashed";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient based on altitude
    const skyProgress = 1 - this.altitude / 1000;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);

    if (skyProgress < 0.7) {
      gradient.addColorStop(0, "#1e3a5f");
      gradient.addColorStop(1, "#87ceeb");
    } else {
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(1, "#90EE90");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.clouds.forEach((cloud) => {
      this.drawCloud(cloud.x, cloud.y, cloud.width);
    });

    // Draw ground when close
    if (this.altitude < 200) {
      const groundY = h - (200 - this.altitude) * 2;
      ctx.fillStyle = "#228B22";
      ctx.fillRect(0, groundY, w, h - groundY);

      // Landing zone
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(w / 2 - 50, groundY, 100, 10);
    }

    // Draw collectibles
    this.collectibles.forEach((item) => {
      if (!item.collected && item.y > -20 && item.y < h + 20) {
        this.drawCollectible(item);
      }
    });

    // Draw wind indicator
    this.drawWindIndicator();

    // Draw player
    this.drawPlayer();
  }

  private drawCloud(x: number, y: number, width: number) {
    const ctx = this.ctx;
    const height = width * 0.5;

    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.3, height * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.25, y - height * 0.1, width * 0.35, height * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + width * 0.5, y, width * 0.25, height * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCollectible(item: Collectible) {
    const ctx = this.ctx;
    const { x, y, type } = item;

    ctx.save();

    switch (type) {
      case "star":
        ctx.fillStyle = "#FFD700";
        this.drawStar(x, y, 5, 12, 6);
        break;
      case "coin":
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "gem":
        ctx.fillStyle = "#9400D3";
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + 12);
        ctx.lineTo(x - 10, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#DA70D6";
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 6, y);
        ctx.closePath();
        ctx.fill();
        break;
      case "danger":
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 12, y + 10);
        ctx.lineTo(x - 12, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("!", x, y + 6);
        break;
    }

    ctx.restore();
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    const ctx = this.ctx;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawWindIndicator() {
    const ctx = this.ctx;
    const x = 50;
    const y = 30;

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Wind", x, y - 10);

    // Arrow
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();

    // Arrow head based on wind direction
    if (Math.abs(this.wind) > 0.1) {
      const dir = this.wind > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x + 20 * dir, y);
      ctx.lineTo(x + 10 * dir, y - 5);
      ctx.lineTo(x + 10 * dir, y + 5);
      ctx.closePath();
      ctx.fillStyle = "white";
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const x = this.playerX;
    const y = this.playerY;

    ctx.save();

    // Parachute
    if (this.parachuteOpen) {
      ctx.fillStyle = "#FF6B6B";
      ctx.beginPath();
      ctx.arc(x, y - 35, 30, Math.PI, 0);
      ctx.fill();

      // Parachute stripes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x, y - 35, 30, Math.PI, Math.PI + Math.PI / 4);
      ctx.lineTo(x, y - 35);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y - 35, 30, Math.PI + Math.PI / 2, Math.PI + Math.PI * 3 / 4);
      ctx.lineTo(x, y - 35);
      ctx.closePath();
      ctx.fill();

      // Strings
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 25, y - 20);
      ctx.lineTo(x - 5, y - 5);
      ctx.moveTo(x + 25, y - 20);
      ctx.lineTo(x + 5, y - 5);
      ctx.stroke();
    }

    // Body
    ctx.fillStyle = "#4169E1";
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Goggles
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#87CEEB";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 12, 3, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 4, y - 12, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#4169E1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 15);
    ctx.lineTo(x - 5, y + 25);
    ctx.moveTo(x + 3, y + 15);
    ctx.lineTo(x + 5, y + 25);
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
