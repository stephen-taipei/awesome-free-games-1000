/**
 * Extreme Balance Game Engine
 * Game #268
 *
 * Keep the platform balanced while catching falling items!
 */

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  type: "good" | "bad" | "heavy";
  weight: number;
  radius: number;
  color: string;
  emoji: string;
}

interface StackedItem {
  x: number;
  y: number;
  weight: number;
  radius: number;
  color: string;
  emoji: string;
}

interface GameState {
  score: number;
  highScore: number;
  time: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PLATFORM_WIDTH = 200;
const PLATFORM_HEIGHT = 15;
const MAX_TILT = 30;
const TILT_SPEED = 2;
const GRAVITY = 0.15;

const ITEM_TYPES = [
  { type: "good" as const, weight: 1, radius: 15, color: "#00b894", emoji: "🍎" },
  { type: "good" as const, weight: 2, radius: 18, color: "#0984e3", emoji: "🍊" },
  { type: "good" as const, weight: 3, radius: 22, color: "#6c5ce7", emoji: "🍇" },
  { type: "heavy" as const, weight: 5, radius: 25, color: "#fdcb6e", emoji: "🎃" },
  { type: "bad" as const, weight: -2, radius: 12, color: "#d63031", emoji: "💣" },
];

export class BalanceGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private platformX = 0;
  private platformY = 0;
  private tilt = 0;
  private targetTilt = 0;
  private fallingItems: FallingItem[] = [];
  private stackedItems: StackedItem[] = [];
  private leftWeight = 0;
  private rightWeight = 0;
  private score = 0;
  private highScore = 0;
  private time = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastSpawnTime = 0;
  private spawnInterval = 2000;
  private startTime = 0;
  private keysPressed = { left: false, right: false };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("extreme_balance_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("extreme_balance_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        time: this.time,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.platformX = this.canvas.width / 2;
    this.platformY = this.canvas.height - 100;
    this.draw();
  }

  start() {
    this.score = 0;
    this.time = 0;
    this.tilt = 0;
    this.targetTilt = 0;
    this.leftWeight = 0;
    this.rightWeight = 0;
    this.fallingItems = [];
    this.stackedItems = [];
    this.status = "playing";
    this.startTime = Date.now();
    this.lastSpawnTime = Date.now();
    this.spawnInterval = 2000;
    this.emitState();
    this.gameLoop();
  }

  setTiltLeft(active: boolean) {
    this.keysPressed.left = active;
  }

  setTiltRight(active: boolean) {
    this.keysPressed.right = active;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const now = Date.now();

    // Update time
    this.time = Math.floor((now - this.startTime) / 1000);

    // Handle tilt input
    if (this.keysPressed.left) {
      this.targetTilt = Math.max(-MAX_TILT, this.targetTilt - TILT_SPEED);
    } else if (this.keysPressed.right) {
      this.targetTilt = Math.min(MAX_TILT, this.targetTilt + TILT_SPEED);
    } else {
      // Natural balance based on weight
      const weightDiff = this.rightWeight - this.leftWeight;
      this.targetTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, weightDiff * 3));
    }

    // Smooth tilt transition
    this.tilt += (this.targetTilt - this.tilt) * 0.1;

    // Spawn new items
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.spawnItem();
      this.lastSpawnTime = now;
      // Speed up over time
      this.spawnInterval = Math.max(800, 2000 - this.time * 20);
    }

    // Update falling items
    this.updateFallingItems();

    // Update stacked items based on tilt
    this.updateStackedItems();

    // Check game over
    if (Math.abs(this.tilt) >= MAX_TILT - 1) {
      this.gameOver();
    }

    this.emitState();
  }

  private spawnItem() {
    const template = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const x = 50 + Math.random() * (this.canvas.width - 100);

    this.fallingItems.push({
      x,
      y: -template.radius,
      vy: 1 + Math.random() * 2,
      type: template.type,
      weight: template.weight,
      radius: template.radius,
      color: template.color,
      emoji: template.emoji,
    });
  }

  private updateFallingItems() {
    const toRemove: number[] = [];

    for (let i = 0; i < this.fallingItems.length; i++) {
      const item = this.fallingItems[i];
      item.vy += GRAVITY;
      item.y += item.vy;

      // Check platform collision
      if (this.checkPlatformCollision(item)) {
        if (item.type === "bad") {
          // Bomb - remove some stacked items
          this.score = Math.max(0, this.score - 50);
          for (let j = 0; j < 2 && this.stackedItems.length > 0; j++) {
            const removed = this.stackedItems.pop()!;
            if (removed.x < this.platformX) {
              this.leftWeight -= removed.weight;
            } else {
              this.rightWeight -= removed.weight;
            }
          }
        } else {
          // Add to stack
          this.addToStack(item);
          this.score += item.weight * 10;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
        }
        toRemove.push(i);
      } else if (item.y > this.canvas.height + item.radius) {
        // Missed
        toRemove.push(i);
      }
    }

    // Remove processed items
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.fallingItems.splice(toRemove[i], 1);
    }
  }

  private checkPlatformCollision(item: FallingItem): boolean {
    // Calculate platform endpoints based on tilt
    const tiltRad = (this.tilt * Math.PI) / 180;
    const halfWidth = PLATFORM_WIDTH / 2;

    const leftX = this.platformX - halfWidth * Math.cos(tiltRad);
    const leftY = this.platformY + halfWidth * Math.sin(tiltRad);
    const rightX = this.platformX + halfWidth * Math.cos(tiltRad);
    const rightY = this.platformY - halfWidth * Math.sin(tiltRad);

    // Simple collision - check if item is within platform bounds
    if (
      item.x >= leftX - item.radius &&
      item.x <= rightX + item.radius
    ) {
      // Calculate Y on platform at item's X position
      const t = (item.x - leftX) / (rightX - leftX);
      const platformYAtX = leftY + t * (rightY - leftY);

      if (item.y + item.radius >= platformYAtX - 5) {
        return true;
      }
    }

    return false;
  }

  private addToStack(item: FallingItem) {
    // Calculate position on platform
    const tiltRad = (this.tilt * Math.PI) / 180;
    const halfWidth = PLATFORM_WIDTH / 2;

    const leftX = this.platformX - halfWidth * Math.cos(tiltRad);
    const leftY = this.platformY + halfWidth * Math.sin(tiltRad);
    const rightX = this.platformX + halfWidth * Math.cos(tiltRad);
    const rightY = this.platformY - halfWidth * Math.sin(tiltRad);

    const t = Math.max(0, Math.min(1, (item.x - leftX) / (rightX - leftX)));
    const stackY = leftY + t * (rightY - leftY) - item.radius - 5;

    this.stackedItems.push({
      x: item.x,
      y: stackY,
      weight: item.weight,
      radius: item.radius,
      color: item.color,
      emoji: item.emoji,
    });

    // Update weights
    if (item.x < this.platformX) {
      this.leftWeight += item.weight;
    } else {
      this.rightWeight += item.weight;
    }
  }

  private updateStackedItems() {
    // Update stacked item positions based on tilt
    const tiltRad = (this.tilt * Math.PI) / 180;
    const halfWidth = PLATFORM_WIDTH / 2;

    const leftX = this.platformX - halfWidth * Math.cos(tiltRad);
    const leftY = this.platformY + halfWidth * Math.sin(tiltRad);
    const rightX = this.platformX + halfWidth * Math.cos(tiltRad);
    const rightY = this.platformY - halfWidth * Math.sin(tiltRad);

    const toRemove: number[] = [];

    for (let i = 0; i < this.stackedItems.length; i++) {
      const item = this.stackedItems[i];

      // Slide based on tilt
      item.x += Math.sin(tiltRad) * 2;

      // Check if fallen off
      if (item.x < leftX - item.radius || item.x > rightX + item.radius) {
        toRemove.push(i);
        if (item.x < this.platformX) {
          this.leftWeight -= item.weight;
        } else {
          this.rightWeight -= item.weight;
        }
        continue;
      }

      // Update Y position
      const t = Math.max(0, Math.min(1, (item.x - leftX) / (rightX - leftX)));
      item.y = leftY + t * (rightY - leftY) - item.radius - 5;
    }

    // Remove fallen items
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.stackedItems.splice(toRemove[i], 1);
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

    // Background
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, w, h);

    // Draw balance indicator
    this.drawBalanceIndicator();

    // Draw platform
    this.drawPlatform();

    // Draw stacked items
    for (const item of this.stackedItems) {
      this.drawItem(item.x, item.y, item.radius, item.color, item.emoji);
    }

    // Draw falling items
    for (const item of this.fallingItems) {
      this.drawItem(item.x, item.y, item.radius, item.color, item.emoji);
    }

    // Draw weight indicators
    this.drawWeightIndicators();
  }

  private drawBalanceIndicator() {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const y = 30;

    // Background bar
    ctx.fillStyle = "#4a5568";
    ctx.fillRect(centerX - 100, y - 10, 200, 20);

    // Tilt indicator
    const indicatorX = centerX + (this.tilt / MAX_TILT) * 90;
    ctx.fillStyle = Math.abs(this.tilt) > MAX_TILT * 0.7 ? "#e74c3c" : "#00b894";
    ctx.beginPath();
    ctx.arc(indicatorX, y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Center mark
    ctx.fillStyle = "white";
    ctx.fillRect(centerX - 2, y - 15, 4, 30);
  }

  private drawPlatform() {
    const ctx = this.ctx;
    const tiltRad = (this.tilt * Math.PI) / 180;

    ctx.save();
    ctx.translate(this.platformX, this.platformY);
    ctx.rotate(tiltRad);

    // Platform shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(
      -PLATFORM_WIDTH / 2 + 5,
      5,
      PLATFORM_WIDTH,
      PLATFORM_HEIGHT
    );

    // Platform
    const gradient = ctx.createLinearGradient(
      -PLATFORM_WIDTH / 2,
      0,
      PLATFORM_WIDTH / 2,
      0
    );
    gradient.addColorStop(0, "#e74c3c");
    gradient.addColorStop(0.5, "#f5576c");
    gradient.addColorStop(1, "#e74c3c");
    ctx.fillStyle = gradient;
    ctx.fillRect(
      -PLATFORM_WIDTH / 2,
      -PLATFORM_HEIGHT / 2,
      PLATFORM_WIDTH,
      PLATFORM_HEIGHT
    );

    // Platform edge
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      -PLATFORM_WIDTH / 2,
      -PLATFORM_HEIGHT / 2,
      PLATFORM_WIDTH,
      PLATFORM_HEIGHT
    );

    ctx.restore();

    // Pivot point
    ctx.fillStyle = "#718096";
    ctx.beginPath();
    ctx.moveTo(this.platformX, this.platformY + PLATFORM_HEIGHT);
    ctx.lineTo(this.platformX - 20, this.canvas.height - 20);
    ctx.lineTo(this.platformX + 20, this.canvas.height - 20);
    ctx.closePath();
    ctx.fill();
  }

  private drawItem(
    x: number,
    y: number,
    radius: number,
    color: string,
    emoji: string
  ) {
    const ctx = this.ctx;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
    ctx.fill();

    // Item
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = `${radius * 1.2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y);
  }

  private drawWeightIndicators() {
    const ctx = this.ctx;

    // Left weight
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`L: ${this.leftWeight}`, 50, this.canvas.height - 30);

    // Right weight
    ctx.fillText(
      `R: ${this.rightWeight}`,
      this.canvas.width - 50,
      this.canvas.height - 30
    );
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
