/**
 * Ninja Jump Game Engine
 * Game #202 - Wall jumping platformer
 */

export interface LevelConfig {
  walls: { x: number; y: number; w: number; h: number; side: "left" | "right" }[];
  spikes: { x: number; y: number; w: number; side: "left" | "right" }[];
  coins: { x: number; y: number }[];
  goalY: number;
  startSide: "left" | "right";
}

export class NinjaJumpGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private ninja = {
    x: 30,
    y: 350,
    vx: 0,
    vy: 0,
    width: 24,
    height: 30,
    onWall: false,
    wallSide: "left" as "left" | "right",
    facingRight: true,
  };

  private walls: { x: number; y: number; w: number; h: number; side: "left" | "right" }[] = [];
  private spikes: { x: number; y: number; w: number; side: "left" | "right" }[] = [];
  private coins: { x: number; y: number; collected: boolean }[] = [];
  private goalY = 50;

  private gravity = 0.5;
  private jumpForceX = 8;
  private jumpForceY = -12;
  private slideSpeed = 2;

  private scrollY = 0;
  private collectedCoins = 0;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private leftWallX = 0;
  private rightWallX = 460;
  private wallWidth = 40;

  private levels: LevelConfig[] = [
    // Level 1 - Simple alternating
    {
      walls: [
        { x: 0, y: 320, w: 40, h: 80, side: "left" },
        { x: 460, y: 240, w: 40, h: 80, side: "right" },
        { x: 0, y: 160, w: 40, h: 80, side: "left" },
        { x: 460, y: 80, w: 40, h: 80, side: "right" },
      ],
      spikes: [],
      coins: [
        { x: 250, y: 280 },
        { x: 250, y: 200 },
        { x: 250, y: 120 },
      ],
      goalY: 40,
      startSide: "left",
    },
    // Level 2 - With spikes
    {
      walls: [
        { x: 0, y: 320, w: 40, h: 60, side: "left" },
        { x: 460, y: 260, w: 40, h: 60, side: "right" },
        { x: 0, y: 180, w: 40, h: 80, side: "left" },
        { x: 460, y: 100, w: 40, h: 80, side: "right" },
      ],
      spikes: [
        { x: 0, y: 260, w: 40, side: "left" },
        { x: 460, y: 180, w: 40, side: "right" },
      ],
      coins: [
        { x: 250, y: 290 },
        { x: 250, y: 220 },
        { x: 250, y: 140 },
      ],
      goalY: 50,
      startSide: "left",
    },
    // Level 3 - Narrow passages
    {
      walls: [
        { x: 0, y: 340, w: 40, h: 60, side: "left" },
        { x: 460, y: 280, w: 40, h: 50, side: "right" },
        { x: 0, y: 210, w: 40, h: 60, side: "left" },
        { x: 460, y: 140, w: 40, h: 60, side: "right" },
        { x: 0, y: 60, w: 40, h: 70, side: "left" },
      ],
      spikes: [
        { x: 0, y: 280, w: 40, side: "left" },
        { x: 460, y: 210, w: 40, side: "right" },
        { x: 0, y: 140, w: 40, side: "left" },
        { x: 460, y: 60, w: 40, side: "right" },
      ],
      coins: [
        { x: 250, y: 310 },
        { x: 250, y: 245 },
        { x: 250, y: 175 },
        { x: 250, y: 100 },
      ],
      goalY: 20,
      startSide: "left",
    },
    // Level 4 - Long climb
    {
      walls: [
        { x: 0, y: 500, w: 40, h: 100, side: "left" },
        { x: 460, y: 400, w: 40, h: 80, side: "right" },
        { x: 0, y: 300, w: 40, h: 80, side: "left" },
        { x: 460, y: 200, w: 40, h: 80, side: "right" },
        { x: 0, y: 100, w: 40, h: 80, side: "left" },
        { x: 460, y: 0, w: 40, h: 80, side: "right" },
      ],
      spikes: [
        { x: 0, y: 400, w: 40, side: "left" },
        { x: 460, y: 300, w: 40, side: "right" },
        { x: 0, y: 200, w: 40, side: "left" },
        { x: 460, y: 100, w: 40, side: "right" },
      ],
      coins: [
        { x: 250, y: 450 },
        { x: 250, y: 350 },
        { x: 250, y: 250 },
        { x: 250, y: 150 },
        { x: 250, y: 50 },
      ],
      goalY: -50,
      startSide: "left",
    },
    // Level 5 - Ultimate ninja
    {
      walls: [
        { x: 0, y: 550, w: 40, h: 50, side: "left" },
        { x: 460, y: 480, w: 40, h: 50, side: "right" },
        { x: 0, y: 400, w: 40, h: 60, side: "left" },
        { x: 460, y: 320, w: 40, h: 60, side: "right" },
        { x: 0, y: 240, w: 40, h: 60, side: "left" },
        { x: 460, y: 160, w: 40, h: 60, side: "right" },
        { x: 0, y: 80, w: 40, h: 60, side: "left" },
        { x: 460, y: 0, w: 40, h: 60, side: "right" },
      ],
      spikes: [
        { x: 0, y: 500, w: 40, side: "left" },
        { x: 460, y: 420, w: 40, side: "right" },
        { x: 0, y: 340, w: 40, side: "left" },
        { x: 460, y: 260, w: 40, side: "right" },
        { x: 0, y: 180, w: 40, side: "left" },
        { x: 460, y: 100, w: 40, side: "right" },
        { x: 0, y: 20, w: 40, side: "left" },
      ],
      coins: [
        { x: 250, y: 515 },
        { x: 250, y: 440 },
        { x: 250, y: 360 },
        { x: 250, y: 280 },
        { x: 250, y: 200 },
        { x: 250, y: 120 },
        { x: 250, y: 40 },
      ],
      goalY: -50,
      startSide: "left",
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "ArrowUp") && this.status === "playing") {
        e.preventDefault();
        this.jump();
      }
    });

    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.jump();
      }
    });
  }

  private jump() {
    if (this.ninja.onWall) {
      const direction = this.ninja.wallSide === "left" ? 1 : -1;
      this.ninja.vx = this.jumpForceX * direction;
      this.ninja.vy = this.jumpForceY;
      this.ninja.onWall = false;
      this.ninja.facingRight = direction > 0;
    }
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.walls = config.walls.map((w) => ({ ...w }));
    this.spikes = config.spikes.map((s) => ({ ...s }));
    this.coins = config.coins.map((c) => ({ ...c, collected: false }));
    this.goalY = config.goalY;

    // Start position
    const startWall = this.walls.find((w) => w.side === config.startSide);
    if (startWall) {
      this.ninja.x = config.startSide === "left" ? startWall.x + startWall.w : startWall.x - this.ninja.width;
      this.ninja.y = startWall.y - this.ninja.height;
    }

    this.ninja.vx = 0;
    this.ninja.vy = 0;
    this.ninja.onWall = true;
    this.ninja.wallSide = config.startSide;
    this.ninja.facingRight = config.startSide === "left";

    this.scrollY = 0;
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
    if (!this.ninja.onWall) {
      // Apply gravity
      this.ninja.vy += this.gravity;

      // Move ninja
      this.ninja.x += this.ninja.vx;
      this.ninja.y += this.ninja.vy;

      // Check wall collisions
      for (const wall of this.walls) {
        const wallScreenY = wall.y - this.scrollY;

        if (
          this.ninja.y + this.ninja.height > wallScreenY &&
          this.ninja.y < wallScreenY + wall.h
        ) {
          if (wall.side === "left" && this.ninja.x <= wall.x + wall.w && this.ninja.vx < 0) {
            this.ninja.x = wall.x + wall.w;
            this.ninja.vx = 0;
            this.ninja.vy = 0;
            this.ninja.onWall = true;
            this.ninja.wallSide = "left";
          } else if (wall.side === "right" && this.ninja.x + this.ninja.width >= wall.x && this.ninja.vx > 0) {
            this.ninja.x = wall.x - this.ninja.width;
            this.ninja.vx = 0;
            this.ninja.vy = 0;
            this.ninja.onWall = true;
            this.ninja.wallSide = "right";
          }
        }
      }
    } else {
      // Sliding down wall
      this.ninja.y += this.slideSpeed;

      // Check if still on wall
      let stillOnWall = false;
      for (const wall of this.walls) {
        const wallScreenY = wall.y - this.scrollY;

        if (
          wall.side === this.ninja.wallSide &&
          this.ninja.y + this.ninja.height > wallScreenY &&
          this.ninja.y < wallScreenY + wall.h
        ) {
          stillOnWall = true;
          break;
        }
      }

      if (!stillOnWall) {
        this.ninja.onWall = false;
      }
    }

    // Check spike collision
    for (const spike of this.spikes) {
      const spikeScreenY = spike.y - this.scrollY;
      const spikeX = spike.side === "left" ? spike.x : spike.x;

      if (
        this.ninja.x < spikeX + spike.w &&
        this.ninja.x + this.ninja.width > spikeX &&
        this.ninja.y + this.ninja.height > spikeScreenY &&
        this.ninja.y < spikeScreenY + 20
      ) {
        this.die();
        return;
      }
    }

    // Coin collection
    for (const coin of this.coins) {
      if (!coin.collected) {
        const coinScreenY = coin.y - this.scrollY;
        const dist = Math.hypot(
          this.ninja.x + this.ninja.width / 2 - coin.x,
          this.ninja.y + this.ninja.height / 2 - coinScreenY
        );
        if (dist < 25) {
          coin.collected = true;
          this.collectedCoins++;
          this.updateState();
        }
      }
    }

    // Update scroll to follow ninja
    const targetScroll = this.ninja.y - this.canvas.height / 2;
    this.scrollY += (targetScroll - this.scrollY) * 0.1;
    this.scrollY = Math.max(this.goalY - 100, this.scrollY);

    // Death by falling
    if (this.ninja.y > this.canvas.height + 100) {
      this.die();
      return;
    }

    // Win condition
    if (this.ninja.y < this.goalY - this.scrollY + 50) {
      this.win();
    }
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

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0a2e");
    gradient.addColorStop(1, "#2d1b4e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw walls
    for (const wall of this.walls) {
      this.drawWall(ctx, wall);
    }

    // Draw spikes
    for (const spike of this.spikes) {
      this.drawSpikes(ctx, spike);
    }

    // Draw coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(ctx, coin.x, coin.y - this.scrollY);
      }
    }

    // Draw goal
    this.drawGoal(ctx);

    // Draw ninja
    this.drawNinja(ctx);
  }

  private drawWall(ctx: CanvasRenderingContext2D, wall: { x: number; y: number; w: number; h: number; side: "left" | "right" }) {
    const screenY = wall.y - this.scrollY;

    // Wall background
    ctx.fillStyle = "#4a3f5a";
    ctx.fillRect(wall.x, screenY, wall.w, wall.h);

    // Wall texture
    ctx.fillStyle = "#5a4f6a";
    for (let i = 0; i < wall.h; i += 20) {
      const offset = ((i / 20) % 2) * 10;
      ctx.fillRect(wall.x + offset, screenY + i, 20, 10);
    }

    // Wall edge
    ctx.fillStyle = "#6a5f7a";
    if (wall.side === "left") {
      ctx.fillRect(wall.x + wall.w - 4, screenY, 4, wall.h);
    } else {
      ctx.fillRect(wall.x, screenY, 4, wall.h);
    }
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, spike: { x: number; y: number; w: number; side: "left" | "right" }) {
    const screenY = spike.y - this.scrollY;

    ctx.fillStyle = "#ff4444";
    const spikeWidth = 10;

    for (let i = 0; i < spike.w; i += spikeWidth) {
      ctx.beginPath();
      if (spike.side === "left") {
        ctx.moveTo(spike.x + spike.w, screenY + i);
        ctx.lineTo(spike.x + spike.w - 15, screenY + i + spikeWidth / 2);
        ctx.lineTo(spike.x + spike.w, screenY + i + spikeWidth);
      } else {
        ctx.moveTo(spike.x, screenY + i);
        ctx.lineTo(spike.x + 15, screenY + i + spikeWidth / 2);
        ctx.lineTo(spike.x, screenY + i + spikeWidth);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const bounce = Math.sin(this.frameCount * 0.1) * 3;

    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(x, y + bounce, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffec8b";
    ctx.beginPath();
    ctx.arc(x - 4, y + bounce - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGoal(ctx: CanvasRenderingContext2D) {
    const screenY = this.goalY - this.scrollY;
    const pulse = Math.sin(this.frameCount * 0.1) * 5;

    // Goal line
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(this.canvas.width, screenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Goal banner
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(this.canvas.width / 2 - 40, screenY - 20 + pulse, 80, 25);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GOAL", this.canvas.width / 2, screenY - 3 + pulse);
  }

  private drawNinja(ctx: CanvasRenderingContext2D) {
    const n = this.ninja;

    ctx.save();
    ctx.translate(n.x + n.width / 2, n.y + n.height / 2);

    if (!n.facingRight) {
      ctx.scale(-1, 1);
    }

    // Body
    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(-n.width / 2 + 4, -n.height / 2 + 8, n.width - 8, n.height - 10);

    // Head
    ctx.fillStyle = "#2c2c2c";
    ctx.beginPath();
    ctx.arc(0, -n.height / 2 + 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-12, -n.height / 2 + 4, 24, 4);

    // Headband tails
    ctx.fillRect(-14, -n.height / 2 + 4, 4, 12);

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.fillRect(-6, -n.height / 2 + 5, 4, 3);
    ctx.fillRect(2, -n.height / 2 + 5, 4, 3);

    ctx.restore();

    // Trail effect when jumping
    if (!n.onWall) {
      ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(
          n.x + n.width / 2 - n.vx * i * 2,
          n.y + n.height / 2 - n.vy * i * 0.5,
          8 - i * 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
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
