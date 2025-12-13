/**
 * Merge Master Game Engine
 * Game #266
 *
 * Drop items and merge same levels to create higher level items!
 */

interface Item {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  level: number;
  radius: number;
  merging: boolean;
}

interface GameState {
  score: number;
  highScore: number;
  maxLevel: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.3;
const FRICTION = 0.98;
const BOUNCE = 0.6;
const BASE_RADIUS = 15;
const RADIUS_INCREMENT = 5;
const MAX_LEVEL = 11;

const LEVEL_COLORS = [
  "#FF6B6B", // 1 - Red
  "#4ECDC4", // 2 - Teal
  "#45B7D1", // 3 - Blue
  "#96CEB4", // 4 - Green
  "#FFEAA7", // 5 - Yellow
  "#DDA0DD", // 6 - Plum
  "#98D8C8", // 7 - Mint
  "#F7DC6F", // 8 - Gold
  "#BB8FCE", // 9 - Purple
  "#85C1E9", // 10 - Sky
  "#F8B500", // 11 - Orange
];

const LEVEL_EMOJIS = ["🍒", "🍎", "🍊", "🍋", "🥝", "🍇", "🍓", "🍑", "🥭", "🍉", "🌟"];

export class MergeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private items: Item[] = [];
  private nextLevel = 1;
  private dropX = 0;
  private canDrop = true;
  private dropCooldown = 500;
  private score = 0;
  private highScore = 0;
  private maxLevel = 1;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private itemIdCounter = 0;
  private dangerLineY = 80;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("merge_master_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("merge_master_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        maxLevel: this.maxLevel,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.dropX = this.canvas.width / 2;
    this.draw();
  }

  start() {
    this.items = [];
    this.score = 0;
    this.maxLevel = 1;
    this.nextLevel = this.getRandomLevel();
    this.canDrop = true;
    this.status = "playing";
    this.dropX = this.canvas.width / 2;
    this.emitState();
    this.gameLoop();
  }

  private getRandomLevel(): number {
    // Higher probability for lower levels
    const weights = [40, 30, 20, 10];
    const maxSpawn = Math.min(4, this.maxLevel);
    let total = 0;
    for (let i = 0; i < maxSpawn; i++) total += weights[i];

    let rand = Math.random() * total;
    for (let i = 0; i < maxSpawn; i++) {
      rand -= weights[i];
      if (rand <= 0) return i + 1;
    }
    return 1;
  }

  getNextLevel(): number {
    return this.nextLevel;
  }

  getNextColor(): string {
    return LEVEL_COLORS[this.nextLevel - 1];
  }

  getNextEmoji(): string {
    return LEVEL_EMOJIS[this.nextLevel - 1];
  }

  setDropX(x: number) {
    const radius = this.getRadius(this.nextLevel);
    this.dropX = Math.max(radius, Math.min(this.canvas.width - radius, x));
  }

  drop() {
    if (!this.canDrop || this.status !== "playing") return;

    const level = this.nextLevel;
    const radius = this.getRadius(level);

    const item: Item = {
      id: this.itemIdCounter++,
      x: this.dropX,
      y: radius + 10,
      vx: 0,
      vy: 0,
      level,
      radius,
      merging: false,
    };

    this.items.push(item);
    this.nextLevel = this.getRandomLevel();
    this.canDrop = false;

    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);

    this.emitState();
  }

  private getRadius(level: number): number {
    return BASE_RADIUS + (level - 1) * RADIUS_INCREMENT;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update physics
    for (const item of this.items) {
      if (item.merging) continue;

      // Apply gravity
      item.vy += GRAVITY;

      // Apply velocity
      item.x += item.vx;
      item.y += item.vy;

      // Apply friction
      item.vx *= FRICTION;

      // Wall collision
      if (item.x - item.radius < 0) {
        item.x = item.radius;
        item.vx = -item.vx * BOUNCE;
      }
      if (item.x + item.radius > w) {
        item.x = w - item.radius;
        item.vx = -item.vx * BOUNCE;
      }

      // Floor collision
      if (item.y + item.radius > h) {
        item.y = h - item.radius;
        item.vy = -item.vy * BOUNCE;
        if (Math.abs(item.vy) < 1) item.vy = 0;
      }
    }

    // Check collisions between items
    this.checkCollisions();

    // Remove merged items
    this.items = this.items.filter((item) => !item.merging);

    // Check game over
    this.checkGameOver();
  }

  private checkCollisions() {
    for (let i = 0; i < this.items.length; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        const a = this.items[i];
        const b = this.items[j];

        if (a.merging || b.merging) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          // Collision detected
          if (a.level === b.level && a.level < MAX_LEVEL) {
            // Merge!
            this.merge(a, b);
          } else {
            // Bounce off each other
            this.resolveCollision(a, b, dx, dy, dist, minDist);
          }
        }
      }
    }
  }

  private merge(a: Item, b: Item) {
    const newLevel = a.level + 1;
    const newRadius = this.getRadius(newLevel);

    // Mark both as merging
    a.merging = true;
    b.merging = true;

    // Create new merged item at midpoint
    const newItem: Item = {
      id: this.itemIdCounter++,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      vx: (a.vx + b.vx) / 2,
      vy: (a.vy + b.vy) / 2,
      level: newLevel,
      radius: newRadius,
      merging: false,
    };

    this.items.push(newItem);

    // Update score
    const points = Math.pow(2, newLevel) * 10;
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Update max level
    if (newLevel > this.maxLevel) {
      this.maxLevel = newLevel;
    }

    this.emitState();
  }

  private resolveCollision(
    a: Item,
    b: Item,
    dx: number,
    dy: number,
    dist: number,
    minDist: number
  ) {
    // Normalize
    const nx = dx / dist;
    const ny = dy / dist;

    // Overlap
    const overlap = minDist - dist;

    // Separate
    const massA = a.radius * a.radius;
    const massB = b.radius * b.radius;
    const totalMass = massA + massB;

    a.x -= (overlap * massB / totalMass) * nx;
    a.y -= (overlap * massB / totalMass) * ny;
    b.x += (overlap * massA / totalMass) * nx;
    b.y += (overlap * massA / totalMass) * ny;

    // Relative velocity
    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvn = dvx * nx + dvy * ny;

    // Only resolve if moving towards each other
    if (dvn > 0) return;

    // Impulse
    const restitution = 0.5;
    const impulse = (-(1 + restitution) * dvn) / (1 / massA + 1 / massB);

    a.vx += (impulse / massA) * nx;
    a.vy += (impulse / massA) * ny;
    b.vx -= (impulse / massB) * nx;
    b.vy -= (impulse / massB) * ny;
  }

  private checkGameOver() {
    // Check if any settled item is above danger line
    for (const item of this.items) {
      if (item.merging) continue;
      if (Math.abs(item.vy) < 0.5 && item.y - item.radius < this.dangerLineY) {
        this.gameOver();
        return;
      }
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
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Danger line
    ctx.strokeStyle = "rgba(255, 100, 100, 0.5)";
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.dangerLineY);
    ctx.lineTo(w, this.dangerLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw drop guide
    if (this.status === "playing" && this.canDrop) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.dropX, 0);
      ctx.lineTo(this.dropX, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Preview item
      const previewRadius = this.getRadius(this.nextLevel);
      this.drawItem(this.dropX, previewRadius + 10, this.nextLevel, previewRadius, 0.5);
    }

    // Draw items
    for (const item of this.items) {
      if (!item.merging) {
        this.drawItem(item.x, item.y, item.level, item.radius, 1);
      }
    }
  }

  private drawItem(x: number, y: number, level: number, radius: number, alpha: number) {
    const ctx = this.ctx;
    const color = LEVEL_COLORS[level - 1];
    const emoji = LEVEL_EMOJIS[level - 1];

    ctx.globalAlpha = alpha;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
    ctx.fill();

    // Main circle
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, this.lightenColor(color, 30));
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = `${radius * 0.9}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y);

    ctx.globalAlpha = 1;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
