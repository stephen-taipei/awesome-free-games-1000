/**
 * Anti-Gravity Game Engine
 * Game #199 - Platform game with gravity flipping
 */

export interface LevelConfig {
  platforms: { x: number; y: number; w: number; h: number }[];
  spikes: { x: number; y: number; w: number; flip: boolean }[];
  coins: { x: number; y: number }[];
  goal: { x: number; y: number };
  playerStart: { x: number; y: number };
}

export class AntiGravityGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: 50,
    y: 200,
    vx: 0,
    vy: 0,
    width: 20,
    height: 20,
  };

  private platforms: { x: number; y: number; w: number; h: number }[] = [];
  private spikes: { x: number; y: number; w: number; flip: boolean }[] = [];
  private coins: { x: number; y: number; collected: boolean }[] = [];
  private goal = { x: 450, y: 350 };

  private gravity = 0.5;
  private gravityDir = 1; // 1 = down, -1 = up
  private moveSpeed = 3;
  private scrollX = 0;
  private levelWidth = 1500;

  private collectedCoins = 0;
  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private levels: LevelConfig[] = [
    // Level 1 - Simple intro
    {
      platforms: [
        { x: 0, y: 350, w: 300, h: 50 },
        { x: 0, y: 0, w: 300, h: 50 },
        { x: 350, y: 350, w: 200, h: 50 },
        { x: 350, y: 0, w: 200, h: 50 },
        { x: 600, y: 350, w: 300, h: 50 },
        { x: 600, y: 0, w: 300, h: 50 },
      ],
      spikes: [],
      coins: [
        { x: 150, y: 320 },
        { x: 450, y: 80 },
        { x: 750, y: 320 },
      ],
      goal: { x: 850, y: 300 },
      playerStart: { x: 50, y: 300 },
    },
    // Level 2 - With spikes
    {
      platforms: [
        { x: 0, y: 350, w: 250, h: 50 },
        { x: 0, y: 0, w: 250, h: 50 },
        { x: 300, y: 350, w: 150, h: 50 },
        { x: 300, y: 0, w: 150, h: 50 },
        { x: 500, y: 350, w: 200, h: 50 },
        { x: 500, y: 0, w: 200, h: 50 },
        { x: 750, y: 350, w: 300, h: 50 },
        { x: 750, y: 0, w: 300, h: 50 },
      ],
      spikes: [
        { x: 300, y: 335, w: 150, flip: false },
        { x: 500, y: 50, w: 200, flip: true },
      ],
      coins: [
        { x: 100, y: 320 },
        { x: 375, y: 80 },
        { x: 600, y: 320 },
        { x: 900, y: 80 },
      ],
      goal: { x: 1000, y: 300 },
      playerStart: { x: 50, y: 300 },
    },
    // Level 3 - Tight spaces
    {
      platforms: [
        { x: 0, y: 350, w: 200, h: 50 },
        { x: 0, y: 0, w: 500, h: 50 },
        { x: 250, y: 200, w: 200, h: 30 },
        { x: 500, y: 350, w: 200, h: 50 },
        { x: 550, y: 0, w: 200, h: 50 },
        { x: 750, y: 170, w: 150, h: 30 },
        { x: 950, y: 350, w: 300, h: 50 },
        { x: 950, y: 0, w: 300, h: 50 },
      ],
      spikes: [
        { x: 200, y: 335, w: 50, flip: false },
        { x: 500, y: 50, w: 50, flip: true },
        { x: 700, y: 335, w: 50, flip: false },
      ],
      coins: [
        { x: 100, y: 320 },
        { x: 350, y: 170 },
        { x: 600, y: 80 },
        { x: 825, y: 140 },
        { x: 1100, y: 320 },
      ],
      goal: { x: 1180, y: 300 },
      playerStart: { x: 50, y: 300 },
    },
    // Level 4 - Alternating paths
    {
      platforms: [
        { x: 0, y: 350, w: 150, h: 50 },
        { x: 0, y: 0, w: 150, h: 50 },
        { x: 200, y: 0, w: 150, h: 50 },
        { x: 400, y: 350, w: 150, h: 50 },
        { x: 600, y: 0, w: 150, h: 50 },
        { x: 800, y: 350, w: 150, h: 50 },
        { x: 1000, y: 0, w: 150, h: 50 },
        { x: 1200, y: 350, w: 200, h: 50 },
        { x: 1200, y: 0, w: 200, h: 50 },
      ],
      spikes: [
        { x: 200, y: 335, w: 150, flip: false },
        { x: 400, y: 50, w: 150, flip: true },
        { x: 600, y: 335, w: 150, flip: false },
        { x: 800, y: 50, w: 150, flip: true },
        { x: 1000, y: 335, w: 150, flip: false },
      ],
      coins: [
        { x: 75, y: 80 },
        { x: 275, y: 80 },
        { x: 475, y: 320 },
        { x: 675, y: 80 },
        { x: 875, y: 320 },
        { x: 1075, y: 80 },
      ],
      goal: { x: 1350, y: 300 },
      playerStart: { x: 50, y: 300 },
    },
    // Level 5 - Ultimate challenge
    {
      platforms: [
        { x: 0, y: 350, w: 100, h: 50 },
        { x: 0, y: 0, w: 100, h: 50 },
        { x: 150, y: 180, w: 100, h: 20 },
        { x: 300, y: 350, w: 100, h: 50 },
        { x: 300, y: 0, w: 100, h: 50 },
        { x: 450, y: 200, w: 100, h: 20 },
        { x: 600, y: 350, w: 100, h: 50 },
        { x: 600, y: 0, w: 100, h: 50 },
        { x: 750, y: 180, w: 100, h: 20 },
        { x: 900, y: 350, w: 100, h: 50 },
        { x: 900, y: 0, w: 100, h: 50 },
        { x: 1050, y: 200, w: 100, h: 20 },
        { x: 1200, y: 350, w: 200, h: 50 },
        { x: 1200, y: 0, w: 200, h: 50 },
      ],
      spikes: [
        { x: 100, y: 335, w: 50, flip: false },
        { x: 100, y: 50, w: 50, flip: true },
        { x: 400, y: 335, w: 50, flip: false },
        { x: 400, y: 50, w: 50, flip: true },
        { x: 700, y: 335, w: 50, flip: false },
        { x: 700, y: 50, w: 50, flip: true },
        { x: 1000, y: 335, w: 50, flip: false },
        { x: 1000, y: 50, w: 50, flip: true },
      ],
      coins: [
        { x: 50, y: 80 },
        { x: 200, y: 150 },
        { x: 350, y: 320 },
        { x: 500, y: 170 },
        { x: 650, y: 80 },
        { x: 800, y: 150 },
        { x: 950, y: 320 },
        { x: 1100, y: 170 },
      ],
      goal: { x: 1350, y: 300 },
      playerStart: { x: 50, y: 300 },
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key === " " && this.status === "playing") {
        e.preventDefault();
        this.flipGravity();
      }
    });

    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.flipGravity();
      }
    });
  }

  private flipGravity() {
    this.gravityDir *= -1;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.platforms = config.platforms.map((p) => ({ ...p }));
    this.spikes = config.spikes.map((s) => ({ ...s }));
    this.coins = config.coins.map((c) => ({ ...c, collected: false }));
    this.goal = { ...config.goal };

    this.player.x = config.playerStart.x;
    this.player.y = config.playerStart.y;
    this.player.vx = 0;
    this.player.vy = 0;

    this.gravityDir = 1;
    this.scrollX = 0;
    this.collectedCoins = 0;
    this.levelWidth = Math.max(...config.platforms.map((p) => p.x + p.w)) + 100;

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Auto-move forward
    this.player.vx = this.moveSpeed;

    // Apply gravity
    this.player.vy += this.gravity * this.gravityDir;
    this.player.vy = Math.max(-10, Math.min(10, this.player.vy));

    // Move player
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Platform collision
    for (const plat of this.platforms) {
      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        plat.x, plat.y, plat.w, plat.h
      )) {
        if (this.gravityDir > 0) {
          // Normal gravity - land on top
          if (this.player.vy > 0 && this.player.y + this.player.height - this.player.vy <= plat.y + 5) {
            this.player.y = plat.y - this.player.height;
            this.player.vy = 0;
          }
          // Hit ceiling
          else if (this.player.vy < 0 && this.player.y - this.player.vy >= plat.y + plat.h - 5) {
            this.player.y = plat.y + plat.h;
            this.player.vy = 0;
          }
        } else {
          // Reversed gravity - land on ceiling
          if (this.player.vy < 0 && this.player.y - this.player.vy >= plat.y + plat.h - 5) {
            this.player.y = plat.y + plat.h;
            this.player.vy = 0;
          }
          // Hit floor
          else if (this.player.vy > 0 && this.player.y + this.player.height - this.player.vy <= plat.y + 5) {
            this.player.y = plat.y - this.player.height;
            this.player.vy = 0;
          }
        }
      }
    }

    // Spike collision
    for (const spike of this.spikes) {
      const spikeHeight = 15;
      const spikeY = spike.flip ? spike.y : spike.y - spikeHeight;

      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        spike.x, spikeY, spike.w, spikeHeight
      )) {
        this.die();
        return;
      }
    }

    // Boundary death
    if (this.player.y < -50 || this.player.y > this.canvas.height + 50) {
      this.die();
      return;
    }

    // Coin collection
    for (const coin of this.coins) {
      if (!coin.collected && this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        coin.x - 10, coin.y - 10, 20, 20
      )) {
        coin.collected = true;
        this.collectedCoins++;
        this.updateState();
      }
    }

    // Goal check
    if (this.rectIntersect(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.goal.x, this.goal.y, 30, 30
    )) {
      this.win();
      return;
    }

    // Update scroll
    const targetScroll = this.player.x - 100;
    this.scrollX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, targetScroll));
  }

  private rectIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private die() {
    this.status = "lost";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "lost" });
    }
  }

  private win() {
    this.status = "won";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "won" });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        coins: this.collectedCoins,
        totalCoins: this.coins.length,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient based on gravity
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    if (this.gravityDir > 0) {
      gradient.addColorStop(0, "#1a1a3e");
      gradient.addColorStop(1, "#2d1b4e");
    } else {
      gradient.addColorStop(0, "#2d1b4e");
      gradient.addColorStop(1, "#1a1a3e");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw gravity indicator
    this.drawGravityIndicator(ctx);

    ctx.save();
    ctx.translate(-this.scrollX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      ctx.fillStyle = "#4a4a6a";
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = "#6a6a8a";
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Draw spikes
    for (const spike of this.spikes) {
      this.drawSpikes(ctx, spike);
    }

    // Draw coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(ctx, coin.x, coin.y);
      }
    }

    // Draw goal
    this.drawGoal(ctx);

    // Draw player
    this.drawPlayer(ctx);

    ctx.restore();
  }

  private drawGravityIndicator(ctx: CanvasRenderingContext2D) {
    const x = this.canvas.width - 40;
    const y = 40;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Arrow
    ctx.fillStyle = this.gravityDir > 0 ? "#ff6b6b" : "#4ecdc4";
    ctx.beginPath();
    if (this.gravityDir > 0) {
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x - 10, y - 5);
      ctx.lineTo(x + 10, y - 5);
    } else {
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x - 10, y + 5);
      ctx.lineTo(x + 10, y + 5);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, spike: { x: number; y: number; w: number; flip: boolean }) {
    ctx.fillStyle = "#ff4444";
    const spikeWidth = 15;
    const spikeHeight = 15;

    for (let i = spike.x; i < spike.x + spike.w; i += spikeWidth) {
      ctx.beginPath();
      if (spike.flip) {
        ctx.moveTo(i, spike.y);
        ctx.lineTo(i + spikeWidth / 2, spike.y + spikeHeight);
        ctx.lineTo(i + spikeWidth, spike.y);
      } else {
        ctx.moveTo(i, spike.y);
        ctx.lineTo(i + spikeWidth / 2, spike.y - spikeHeight);
        ctx.lineTo(i + spikeWidth, spike.y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const bounce = Math.sin(this.frameCount * 0.1) * 3;

    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(x, y + bounce, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffec8b";
    ctx.beginPath();
    ctx.arc(x - 3, y + bounce - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGoal(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.frameCount * 0.1) * 5;

    // Glow
    const gradient = ctx.createRadialGradient(
      this.goal.x + 15, this.goal.y + 15, 0,
      this.goal.x + 15, this.goal.y + 15, 30 + pulse
    );
    gradient.addColorStop(0, "rgba(76, 175, 80, 0.5)");
    gradient.addColorStop(1, "rgba(76, 175, 80, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.goal.x + 15, this.goal.y + 15, 30 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Portal
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.arc(this.goal.x + 15, this.goal.y + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#81c784";
    ctx.beginPath();
    ctx.arc(this.goal.x + 15, this.goal.y + 15, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    // Trail
    ctx.fillStyle = "rgba(156, 39, 176, 0.3)";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(
        p.x + p.width / 2 - i * 8,
        p.y + p.height / 2,
        p.width / 2 - i * 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Body
    const gradient = ctx.createRadialGradient(
      p.x + p.width / 2, p.y + p.height / 2, 0,
      p.x + p.width / 2, p.y + p.height / 2, p.width / 2
    );
    gradient.addColorStop(0, "#e040fb");
    gradient.addColorStop(1, "#9c27b0");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeY = this.gravityDir > 0 ? p.y + 6 : p.y + p.height - 10;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x + 7, eyeY, 3, 0, Math.PI * 2);
    ctx.arc(p.x + 13, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getCoins(): number {
    return this.collectedCoins;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
