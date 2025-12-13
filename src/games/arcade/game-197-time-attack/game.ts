/**
 * Time Attack Game Engine
 * Game #197 - Speed run through obstacle courses
 */

export interface LevelConfig {
  walls: { x: number; y: number; w: number; h: number }[];
  stars: { x: number; y: number }[];
  goal: { x: number; y: number };
  playerStart: { x: number; y: number };
  timeLimit: number;
}

export class TimeAttackGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = { x: 50, y: 50, size: 20 };
  private walls: { x: number; y: number; w: number; h: number }[] = [];
  private stars: { x: number; y: number; collected: boolean }[] = [];
  private goal = { x: 450, y: 350 };

  private keys: Record<string, boolean> = {};
  private moveSpeed = 5;

  private timeLeft = 30;
  private timeLimit = 30;
  private bestTime: Record<number, number> = {};
  private elapsedTime = 0;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  private levels: LevelConfig[] = [
    // Level 1 - Simple path
    {
      walls: [
        { x: 100, y: 0, w: 20, h: 300 },
        { x: 200, y: 100, w: 20, h: 300 },
        { x: 300, y: 0, w: 20, h: 300 },
        { x: 400, y: 100, w: 20, h: 300 },
      ],
      stars: [
        { x: 50, y: 350 },
        { x: 150, y: 50 },
        { x: 250, y: 350 },
        { x: 350, y: 50 },
      ],
      goal: { x: 460, y: 360 },
      playerStart: { x: 30, y: 30 },
      timeLimit: 25,
    },
    // Level 2 - Maze
    {
      walls: [
        { x: 80, y: 0, w: 20, h: 320 },
        { x: 160, y: 80, w: 20, h: 320 },
        { x: 240, y: 0, w: 20, h: 320 },
        { x: 320, y: 80, w: 20, h: 320 },
        { x: 400, y: 0, w: 20, h: 280 },
      ],
      stars: [
        { x: 40, y: 360 },
        { x: 120, y: 40 },
        { x: 200, y: 360 },
        { x: 280, y: 40 },
        { x: 360, y: 360 },
      ],
      goal: { x: 460, y: 360 },
      playerStart: { x: 30, y: 30 },
      timeLimit: 30,
    },
    // Level 3 - Cross pattern
    {
      walls: [
        { x: 200, y: 0, w: 100, h: 150 },
        { x: 200, y: 250, w: 100, h: 150 },
        { x: 0, y: 150, w: 150, h: 100 },
        { x: 350, y: 150, w: 150, h: 100 },
      ],
      stars: [
        { x: 50, y: 50 },
        { x: 450, y: 50 },
        { x: 50, y: 350 },
        { x: 450, y: 350 },
        { x: 250, y: 200 },
      ],
      goal: { x: 240, y: 190 },
      playerStart: { x: 30, y: 200 },
      timeLimit: 20,
    },
    // Level 4 - Chambers
    {
      walls: [
        { x: 0, y: 130, w: 180, h: 20 },
        { x: 0, y: 260, w: 180, h: 20 },
        { x: 160, y: 0, w: 20, h: 130 },
        { x: 160, y: 280, w: 20, h: 120 },
        { x: 320, y: 130, w: 180, h: 20 },
        { x: 320, y: 260, w: 180, h: 20 },
        { x: 320, y: 0, w: 20, h: 130 },
        { x: 320, y: 280, w: 20, h: 120 },
        { x: 180, y: 180, w: 140, h: 20 },
      ],
      stars: [
        { x: 80, y: 65 },
        { x: 80, y: 195 },
        { x: 80, y: 330 },
        { x: 420, y: 65 },
        { x: 420, y: 195 },
        { x: 420, y: 330 },
      ],
      goal: { x: 240, y: 10 },
      playerStart: { x: 240, y: 370 },
      timeLimit: 35,
    },
    // Level 5 - Spiral
    {
      walls: [
        { x: 50, y: 50, w: 400, h: 20 },
        { x: 430, y: 50, w: 20, h: 250 },
        { x: 100, y: 280, w: 350, h: 20 },
        { x: 100, y: 120, w: 20, h: 180 },
        { x: 100, y: 120, w: 280, h: 20 },
        { x: 360, y: 120, w: 20, h: 100 },
        { x: 170, y: 200, w: 210, h: 20 },
      ],
      stars: [
        { x: 470, y: 370 },
        { x: 470, y: 160 },
        { x: 250, y: 90 },
        { x: 130, y: 230 },
        { x: 250, y: 250 },
        { x: 320, y: 160 },
      ],
      goal: { x: 230, y: 155 },
      playerStart: { x: 20, y: 370 },
      timeLimit: 40,
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
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
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
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.walls = config.walls.map((w) => ({ ...w }));
    this.stars = config.stars.map((s) => ({ ...s, collected: false }));
    this.goal = { ...config.goal };

    this.player.x = config.playerStart.x;
    this.player.y = config.playerStart.y;

    this.timeLimit = config.timeLimit;
    this.timeLeft = config.timeLimit;
    this.elapsedTime = 0;

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(delta);
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number) {
    // Update time
    this.timeLeft -= delta;
    this.elapsedTime += delta;

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.lose();
      return;
    }

    // Movement
    let dx = 0;
    let dy = 0;

    if (this.keys["arrowleft"] || this.keys["a"]) dx = -this.moveSpeed;
    if (this.keys["arrowright"] || this.keys["d"]) dx = this.moveSpeed;
    if (this.keys["arrowup"] || this.keys["w"]) dy = -this.moveSpeed;
    if (this.keys["arrowdown"] || this.keys["s"]) dy = this.moveSpeed;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Try horizontal movement
    const newX = this.player.x + dx;
    if (!this.checkWallCollision(newX, this.player.y)) {
      this.player.x = newX;
    }

    // Try vertical movement
    const newY = this.player.y + dy;
    if (!this.checkWallCollision(this.player.x, newY)) {
      this.player.y = newY;
    }

    // Boundary check
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.size, this.player.x));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.size, this.player.y));

    // Star collection
    for (const star of this.stars) {
      if (!star.collected && this.checkStarCollision(star)) {
        star.collected = true;
      }
    }

    // Goal check
    const allStarsCollected = this.stars.every((s) => s.collected);
    if (allStarsCollected && this.checkGoalCollision()) {
      this.win();
    }

    this.updateState();
  }

  private checkWallCollision(x: number, y: number): boolean {
    const p = { x, y, w: this.player.size, h: this.player.size };

    for (const wall of this.walls) {
      if (this.rectIntersect(p.x, p.y, p.w, p.h, wall.x, wall.y, wall.w, wall.h)) {
        return true;
      }
    }
    return false;
  }

  private checkStarCollision(star: { x: number; y: number }): boolean {
    const dist = Math.hypot(
      this.player.x + this.player.size / 2 - star.x,
      this.player.y + this.player.size / 2 - star.y
    );
    return dist < this.player.size / 2 + 12;
  }

  private checkGoalCollision(): boolean {
    const dist = Math.hypot(
      this.player.x + this.player.size / 2 - (this.goal.x + 15),
      this.player.y + this.player.size / 2 - (this.goal.y + 15)
    );
    return dist < this.player.size / 2 + 15;
  }

  private rectIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private win() {
    this.status = "won";
    this.stopAnimation();

    // Update best time
    const currentBest = this.bestTime[this.currentLevel];
    if (!currentBest || this.elapsedTime < currentBest) {
      this.bestTime[this.currentLevel] = this.elapsedTime;
    }

    if (this.onStateChange) {
      this.onStateChange({
        status: "won",
        time: this.elapsedTime,
        bestTime: this.bestTime[this.currentLevel],
      });
    }
  }

  private lose() {
    this.status = "lost";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "lost" });
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
        time: this.timeLeft,
        stars: this.stars.filter((s) => s.collected).length,
        totalStars: this.stars.length,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Walls
    for (const wall of this.walls) {
      ctx.fillStyle = "#4a4a6a";
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = "#6a6a8a";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }

    // Stars
    const allCollected = this.stars.every((s) => s.collected);
    for (const star of this.stars) {
      if (!star.collected) {
        this.drawStar(ctx, star.x, star.y);
      }
    }

    // Goal
    this.drawGoal(ctx, this.goal.x, this.goal.y, allCollected);

    // Player
    this.drawPlayer(ctx);

    // Timer display
    this.drawTimer(ctx);
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const time = this.frameCount * 0.1;
    const scale = 1 + Math.sin(time) * 0.1;

    ctx.fillStyle = "#ffd700";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * 12;
      const py = Math.sin(angle) * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
    const pulse = Math.sin(this.frameCount * 0.1) * 5;

    // Outer glow
    if (active) {
      const gradient = ctx.createRadialGradient(x + 15, y + 15, 0, x + 15, y + 15, 30 + pulse);
      gradient.addColorStop(0, "rgba(76, 175, 80, 0.5)");
      gradient.addColorStop(1, "rgba(76, 175, 80, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + 15, y + 15, 30 + pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Goal flag
    ctx.fillStyle = active ? "#4caf50" : "#666";
    ctx.fillRect(x + 12, y, 6, 30);

    ctx.fillStyle = active ? "#66bb6a" : "#888";
    ctx.beginPath();
    ctx.moveTo(x + 18, y);
    ctx.lineTo(x + 35, y + 8);
    ctx.lineTo(x + 18, y + 16);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const time = this.frameCount * 0.15;

    // Trail effect
    ctx.fillStyle = "rgba(0, 150, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(p.x + p.size / 2, p.y + p.size / 2, p.size / 2 + 5, 0, Math.PI * 2);
    ctx.fill();

    // Player body
    const gradient = ctx.createRadialGradient(
      p.x + p.size / 2, p.y + p.size / 2, 0,
      p.x + p.size / 2, p.y + p.size / 2, p.size / 2
    );
    gradient.addColorStop(0, "#00bfff");
    gradient.addColorStop(1, "#0066cc");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x + p.size / 2, p.y + p.size / 2, p.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(p.x + p.size / 3, p.y + p.size / 3, p.size / 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTimer(ctx: CanvasRenderingContext2D) {
    const percentage = this.timeLeft / this.timeLimit;
    const barWidth = this.canvas.width - 40;
    const barHeight = 8;
    const x = 20;
    const y = 10;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    const fillColor = percentage > 0.5 ? "#4caf50" : percentage > 0.25 ? "#ff9800" : "#f44336";
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, barWidth * percentage, barHeight);

    // Time text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${this.timeLeft.toFixed(1)}s`, this.canvas.width - 20, 35);
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.lastTime = performance.now();
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

  public getTime(): number {
    return this.timeLeft;
  }

  public getBestTime(): number | null {
    return this.bestTime[this.currentLevel] || null;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
