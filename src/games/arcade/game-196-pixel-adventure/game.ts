/**
 * Pixel Adventure Game Engine
 * Game #196 - Retro-style platformer
 */

export interface LevelConfig {
  platforms: { x: number; y: number; w: number; h: number }[];
  coins: { x: number; y: number }[];
  spikes: { x: number; y: number; w: number }[];
  goal: { x: number; y: number };
  playerStart: { x: number; y: number };
}

export class PixelAdventureGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: 50,
    y: 300,
    vx: 0,
    vy: 0,
    width: 16,
    height: 24,
    grounded: false,
    facingRight: true,
  };

  private platforms: { x: number; y: number; w: number; h: number }[] = [];
  private coins: { x: number; y: number; collected: boolean }[] = [];
  private spikes: { x: number; y: number; w: number }[] = [];
  private goal = { x: 450, y: 300 };

  private keys: Record<string, boolean> = {};
  private gravity = 0.6;
  private jumpForce = -12;
  private moveSpeed = 4;

  private collectedCoins = 0;
  private lives = 3;
  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private levels: LevelConfig[] = [
    // Level 1 - Simple intro
    {
      platforms: [
        { x: 0, y: 360, w: 500, h: 40 },
        { x: 150, y: 280, w: 100, h: 20 },
        { x: 320, y: 220, w: 100, h: 20 },
      ],
      coins: [
        { x: 100, y: 330 },
        { x: 180, y: 250 },
        { x: 350, y: 190 },
      ],
      spikes: [],
      goal: { x: 360, y: 196 },
      playerStart: { x: 50, y: 320 },
    },
    // Level 2 - Gaps and spikes
    {
      platforms: [
        { x: 0, y: 360, w: 150, h: 40 },
        { x: 200, y: 360, w: 100, h: 40 },
        { x: 350, y: 360, w: 150, h: 40 },
        { x: 100, y: 260, w: 80, h: 20 },
        { x: 280, y: 200, w: 100, h: 20 },
      ],
      coins: [
        { x: 80, y: 330 },
        { x: 240, y: 330 },
        { x: 120, y: 230 },
        { x: 320, y: 170 },
      ],
      spikes: [{ x: 200, y: 345, w: 100 }],
      goal: { x: 320, y: 176 },
      playerStart: { x: 50, y: 320 },
    },
    // Level 3 - Vertical climb
    {
      platforms: [
        { x: 0, y: 360, w: 120, h: 40 },
        { x: 180, y: 300, w: 80, h: 20 },
        { x: 50, y: 230, w: 80, h: 20 },
        { x: 180, y: 160, w: 80, h: 20 },
        { x: 300, y: 100, w: 100, h: 20 },
        { x: 380, y: 360, w: 120, h: 40 },
      ],
      coins: [
        { x: 60, y: 330 },
        { x: 200, y: 270 },
        { x: 70, y: 200 },
        { x: 200, y: 130 },
        { x: 340, y: 70 },
      ],
      spikes: [
        { x: 120, y: 345, w: 60 },
        { x: 300, y: 345, w: 80 },
      ],
      goal: { x: 350, y: 76 },
      playerStart: { x: 50, y: 320 },
    },
    // Level 4 - Moving challenge
    {
      platforms: [
        { x: 0, y: 360, w: 100, h: 40 },
        { x: 140, y: 320, w: 60, h: 20 },
        { x: 240, y: 280, w: 60, h: 20 },
        { x: 340, y: 240, w: 60, h: 20 },
        { x: 240, y: 180, w: 60, h: 20 },
        { x: 140, y: 140, w: 60, h: 20 },
        { x: 40, y: 100, w: 80, h: 20 },
        { x: 400, y: 360, w: 100, h: 40 },
      ],
      coins: [
        { x: 160, y: 290 },
        { x: 260, y: 250 },
        { x: 360, y: 210 },
        { x: 260, y: 150 },
        { x: 160, y: 110 },
        { x: 60, y: 70 },
      ],
      spikes: [
        { x: 100, y: 345, w: 40 },
        { x: 200, y: 345, w: 40 },
        { x: 300, y: 345, w: 100 },
      ],
      goal: { x: 60, y: 76 },
      playerStart: { x: 50, y: 320 },
    },
    // Level 5 - Final challenge
    {
      platforms: [
        { x: 0, y: 360, w: 80, h: 40 },
        { x: 120, y: 320, w: 50, h: 20 },
        { x: 200, y: 360, w: 50, h: 40 },
        { x: 280, y: 300, w: 50, h: 20 },
        { x: 360, y: 260, w: 50, h: 20 },
        { x: 280, y: 200, w: 50, h: 20 },
        { x: 180, y: 160, w: 50, h: 20 },
        { x: 80, y: 200, w: 50, h: 20 },
        { x: 80, y: 120, w: 50, h: 20 },
        { x: 180, y: 80, w: 80, h: 20 },
        { x: 420, y: 360, w: 80, h: 40 },
      ],
      coins: [
        { x: 40, y: 330 },
        { x: 135, y: 290 },
        { x: 215, y: 330 },
        { x: 295, y: 270 },
        { x: 375, y: 230 },
        { x: 295, y: 170 },
        { x: 195, y: 130 },
        { x: 95, y: 170 },
        { x: 95, y: 90 },
        { x: 210, y: 50 },
      ],
      spikes: [
        { x: 80, y: 345, w: 40 },
        { x: 250, y: 345, w: 30 },
        { x: 330, y: 345, w: 90 },
      ],
      goal: { x: 200, y: 56 },
      playerStart: { x: 30, y: 320 },
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
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
    this.coins = config.coins.map((c) => ({ ...c, collected: false }));
    this.spikes = config.spikes.map((s) => ({ ...s }));
    this.goal = { ...config.goal };

    this.player.x = config.playerStart.x;
    this.player.y = config.playerStart.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grounded = false;

    this.collectedCoins = 0;
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
    // Horizontal movement
    if (this.keys["arrowleft"] || this.keys["a"]) {
      this.player.vx = -this.moveSpeed;
      this.player.facingRight = false;
    } else if (this.keys["arrowright"] || this.keys["d"]) {
      this.player.vx = this.moveSpeed;
      this.player.facingRight = true;
    } else {
      this.player.vx = 0;
    }

    // Jump
    if ((this.keys[" "] || this.keys["arrowup"] || this.keys["w"]) && this.player.grounded) {
      this.player.vy = this.jumpForce;
      this.player.grounded = false;
    }

    // Apply gravity
    this.player.vy += this.gravity;

    // Move player
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Platform collision
    this.player.grounded = false;
    for (const plat of this.platforms) {
      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        plat.x, plat.y, plat.w, plat.h
      )) {
        // Landing on top
        if (this.player.vy > 0 && this.player.y + this.player.height - this.player.vy <= plat.y) {
          this.player.y = plat.y - this.player.height;
          this.player.vy = 0;
          this.player.grounded = true;
        }
        // Hitting bottom
        else if (this.player.vy < 0 && this.player.y - this.player.vy >= plat.y + plat.h) {
          this.player.y = plat.y + plat.h;
          this.player.vy = 0;
        }
        // Side collision
        else if (this.player.vx > 0) {
          this.player.x = plat.x - this.player.width;
        } else if (this.player.vx < 0) {
          this.player.x = plat.x + plat.w;
        }
      }
    }

    // Boundary check
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x > this.canvas.width - this.player.width) {
      this.player.x = this.canvas.width - this.player.width;
    }

    // Fall death
    if (this.player.y > this.canvas.height) {
      this.die();
      return;
    }

    // Spike collision
    for (const spike of this.spikes) {
      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        spike.x, spike.y, spike.w, 15
      )) {
        this.die();
        return;
      }
    }

    // Coin collection
    for (const coin of this.coins) {
      if (!coin.collected && this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        coin.x - 8, coin.y - 8, 16, 16
      )) {
        coin.collected = true;
        this.collectedCoins++;
        this.updateState();
      }
    }

    // Goal check
    if (this.rectIntersect(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.goal.x, this.goal.y, 24, 24
    )) {
      this.win();
    }
  }

  private rectIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private die() {
    this.lives--;
    this.updateState();

    if (this.lives <= 0) {
      this.status = "lost";
      this.stopAnimation();
      if (this.onStateChange) {
        this.onStateChange({ status: "lost" });
      }
    } else {
      // Respawn
      const config = this.levels[this.currentLevel % this.levels.length];
      this.player.x = config.playerStart.x;
      this.player.y = config.playerStart.y;
      this.player.vx = 0;
      this.player.vy = 0;
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
        lives: this.lives,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - pixel sky gradient
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, w, h);

    // Pixel clouds
    this.drawPixelCloud(ctx, 50, 40);
    this.drawPixelCloud(ctx, 200, 60);
    this.drawPixelCloud(ctx, 380, 30);

    // Platforms
    for (const plat of this.platforms) {
      this.drawPlatform(ctx, plat);
    }

    // Spikes
    for (const spike of this.spikes) {
      this.drawSpikes(ctx, spike);
    }

    // Coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(ctx, coin.x, coin.y);
      }
    }

    // Goal flag
    this.drawGoal(ctx, this.goal.x, this.goal.y);

    // Player
    this.drawPlayer(ctx);

    // UI
    this.drawUI(ctx);
  }

  private drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "#fff";
    // Simple pixel cloud pattern
    ctx.fillRect(x, y, 8, 8);
    ctx.fillRect(x + 8, y - 4, 8, 8);
    ctx.fillRect(x + 16, y, 8, 8);
    ctx.fillRect(x + 8, y + 4, 8, 8);
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, plat: { x: number; y: number; w: number; h: number }) {
    // Grass top
    ctx.fillStyle = "#4ade4a";
    ctx.fillRect(plat.x, plat.y, plat.w, 4);

    // Dirt
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(plat.x, plat.y + 4, plat.w, plat.h - 4);

    // Pixel detail
    ctx.fillStyle = "#6d4423";
    for (let i = plat.x + 4; i < plat.x + plat.w - 4; i += 12) {
      ctx.fillRect(i, plat.y + 8, 4, 4);
      ctx.fillRect(i + 6, plat.y + 16, 4, 4);
    }
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, spike: { x: number; y: number; w: number }) {
    ctx.fillStyle = "#666";
    const spikeWidth = 10;
    const spikeHeight = 15;

    for (let i = spike.x; i < spike.x + spike.w; i += spikeWidth) {
      ctx.beginPath();
      ctx.moveTo(i, spike.y + spikeHeight);
      ctx.lineTo(i + spikeWidth / 2, spike.y);
      ctx.lineTo(i + spikeWidth, spike.y + spikeHeight);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const bounce = Math.sin(this.frameCount * 0.1) * 2;

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x - 6, y - 6 + bounce, 12, 12);

    ctx.fillStyle = "#ffec8b";
    ctx.fillRect(x - 4, y - 4 + bounce, 4, 4);
  }

  private drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Flag pole
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(x, y, 4, 40);

    // Flag
    const wave = Math.sin(this.frameCount * 0.05) * 2;
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 24 + wave, y + 8);
    ctx.lineTo(x + 4, y + 16);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const walkFrame = Math.floor(this.frameCount / 8) % 2;

    // Body
    ctx.fillStyle = "#4169e1";
    ctx.fillRect(p.x + 2, p.y + 8, 12, 12);

    // Head
    ctx.fillStyle = "#ffcc99";
    ctx.fillRect(p.x + 4, p.y, 8, 8);

    // Eyes
    ctx.fillStyle = "#000";
    if (p.facingRight) {
      ctx.fillRect(p.x + 8, p.y + 2, 2, 2);
    } else {
      ctx.fillRect(p.x + 6, p.y + 2, 2, 2);
    }

    // Legs
    ctx.fillStyle = "#333";
    if (p.grounded && p.vx !== 0) {
      // Walking animation
      if (walkFrame === 0) {
        ctx.fillRect(p.x + 3, p.y + 20, 4, 4);
        ctx.fillRect(p.x + 9, p.y + 18, 4, 6);
      } else {
        ctx.fillRect(p.x + 3, p.y + 18, 4, 6);
        ctx.fillRect(p.x + 9, p.y + 20, 4, 4);
      }
    } else {
      ctx.fillRect(p.x + 3, p.y + 20, 4, 4);
      ctx.fillRect(p.x + 9, p.y + 20, 4, 4);
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Lives
    ctx.fillStyle = "#ff4444";
    for (let i = 0; i < this.lives; i++) {
      ctx.fillRect(10 + i * 18, 10, 12, 12);
    }

    // Coins collected
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(this.canvas.width - 80, 10, 12, 12);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`x${this.collectedCoins}/${this.coins.length}`, this.canvas.width - 60, 21);
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public reset() {
    this.lives = 3;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  public nextLevel() {
    this.currentLevel++;
    this.lives = 3;
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

  public getLives(): number {
    return this.lives;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
