/**
 * Submarine Puzzle Game Engine
 * Game #124 - Navigate submarine through underwater obstacles
 */

export interface Obstacle {
  x: number;
  minDepth: number;
  maxDepth: number;
  width: number;
  type: "rock" | "mine" | "seaweed" | "coral";
}

export interface Collectible {
  x: number;
  depth: number;
  type: "oxygen" | "star";
  collected: boolean;
}

export interface LevelConfig {
  obstacles: Obstacle[];
  collectibles: Collectible[];
  targetDepth: number;
  speed: number;
}

export class SubmarineGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private submarineX = 80;
  private submarineDepth = 200;
  private targetDepth = 200;
  private depthSpeed = 3;

  private scrollX = 0;
  private levelLength = 2000;
  private speed = 2;

  private oxygen = 100;
  private maxOxygen = 100;
  private oxygenDrain = 0.05;

  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;

  private bubbles: { x: number; y: number; size: number; speed: number }[] = [];

  private levels: LevelConfig[] = [
    // Level 1 - Simple obstacles
    {
      obstacles: [
        { x: 300, minDepth: 0, maxDepth: 150, width: 80, type: "rock" },
        { x: 500, minDepth: 250, maxDepth: 400, width: 100, type: "seaweed" },
        { x: 800, minDepth: 100, maxDepth: 200, width: 60, type: "rock" },
        { x: 1100, minDepth: 200, maxDepth: 400, width: 80, type: "coral" },
      ],
      collectibles: [
        { x: 400, depth: 200, type: "oxygen", collected: false },
        { x: 700, depth: 300, type: "star", collected: false },
      ],
      targetDepth: 200,
      speed: 2,
    },
    // Level 2 - More obstacles
    {
      obstacles: [
        { x: 250, minDepth: 0, maxDepth: 180, width: 100, type: "rock" },
        { x: 450, minDepth: 280, maxDepth: 400, width: 80, type: "seaweed" },
        { x: 650, minDepth: 0, maxDepth: 120, width: 70, type: "coral" },
        { x: 650, minDepth: 300, maxDepth: 400, width: 70, type: "rock" },
        { x: 900, minDepth: 150, maxDepth: 280, width: 90, type: "mine" },
        { x: 1200, minDepth: 0, maxDepth: 200, width: 100, type: "rock" },
      ],
      collectibles: [
        { x: 350, depth: 230, type: "oxygen", collected: false },
        { x: 550, depth: 200, type: "oxygen", collected: false },
        { x: 800, depth: 100, type: "star", collected: false },
        { x: 1100, depth: 300, type: "star", collected: false },
      ],
      targetDepth: 300,
      speed: 2.5,
    },
    // Level 3 - Narrow passages
    {
      obstacles: [
        { x: 200, minDepth: 0, maxDepth: 150, width: 80, type: "rock" },
        { x: 200, minDepth: 250, maxDepth: 400, width: 80, type: "rock" },
        { x: 400, minDepth: 0, maxDepth: 100, width: 100, type: "coral" },
        { x: 400, minDepth: 200, maxDepth: 400, width: 100, type: "seaweed" },
        { x: 600, minDepth: 0, maxDepth: 250, width: 80, type: "rock" },
        { x: 600, minDepth: 350, maxDepth: 400, width: 80, type: "rock" },
        { x: 850, minDepth: 100, maxDepth: 220, width: 70, type: "mine" },
        { x: 1050, minDepth: 0, maxDepth: 180, width: 90, type: "rock" },
        { x: 1050, minDepth: 280, maxDepth: 400, width: 90, type: "coral" },
      ],
      collectibles: [
        { x: 300, depth: 200, type: "oxygen", collected: false },
        { x: 500, depth: 150, type: "oxygen", collected: false },
        { x: 750, depth: 300, type: "star", collected: false },
        { x: 950, depth: 230, type: "oxygen", collected: false },
      ],
      targetDepth: 250,
      speed: 2.5,
    },
    // Level 4 - Mine field
    {
      obstacles: [
        { x: 300, minDepth: 80, maxDepth: 180, width: 50, type: "mine" },
        { x: 400, minDepth: 220, maxDepth: 320, width: 50, type: "mine" },
        { x: 550, minDepth: 100, maxDepth: 200, width: 50, type: "mine" },
        { x: 700, minDepth: 280, maxDepth: 380, width: 50, type: "mine" },
        { x: 850, minDepth: 50, maxDepth: 150, width: 50, type: "mine" },
        { x: 1000, minDepth: 180, maxDepth: 280, width: 50, type: "mine" },
        { x: 1150, minDepth: 300, maxDepth: 400, width: 80, type: "rock" },
      ],
      collectibles: [
        { x: 350, depth: 300, type: "oxygen", collected: false },
        { x: 500, depth: 100, type: "oxygen", collected: false },
        { x: 650, depth: 220, type: "star", collected: false },
        { x: 800, depth: 200, type: "oxygen", collected: false },
        { x: 950, depth: 350, type: "star", collected: false },
      ],
      targetDepth: 100,
      speed: 3,
    },
    // Level 5 - Ultimate challenge
    {
      obstacles: [
        { x: 200, minDepth: 0, maxDepth: 120, width: 100, type: "rock" },
        { x: 200, minDepth: 220, maxDepth: 400, width: 100, type: "seaweed" },
        { x: 400, minDepth: 100, maxDepth: 200, width: 60, type: "mine" },
        { x: 550, minDepth: 0, maxDepth: 180, width: 80, type: "coral" },
        { x: 550, minDepth: 280, maxDepth: 400, width: 80, type: "rock" },
        { x: 750, minDepth: 150, maxDepth: 250, width: 50, type: "mine" },
        { x: 900, minDepth: 0, maxDepth: 100, width: 70, type: "rock" },
        { x: 900, minDepth: 200, maxDepth: 300, width: 70, type: "coral" },
        { x: 900, minDepth: 350, maxDepth: 400, width: 70, type: "rock" },
        { x: 1100, minDepth: 80, maxDepth: 180, width: 50, type: "mine" },
        { x: 1100, minDepth: 280, maxDepth: 380, width: 50, type: "mine" },
        { x: 1300, minDepth: 0, maxDepth: 150, width: 100, type: "rock" },
        { x: 1300, minDepth: 250, maxDepth: 400, width: 100, type: "seaweed" },
      ],
      collectibles: [
        { x: 300, depth: 170, type: "oxygen", collected: false },
        { x: 480, depth: 250, type: "oxygen", collected: false },
        { x: 650, depth: 200, type: "star", collected: false },
        { x: 820, depth: 130, type: "oxygen", collected: false },
        { x: 1000, depth: 330, type: "oxygen", collected: false },
        { x: 1200, depth: 200, type: "star", collected: false },
      ],
      targetDepth: 200,
      speed: 3.5,
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initBubbles();
  }

  private initBubbles() {
    this.bubbles = [];
    for (let i = 0; i < 20; i++) {
      this.bubbles.push({
        x: Math.random() * 2000,
        y: Math.random() * 400,
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
  }

  public moveUp() {
    if (this.status !== "playing") return;
    this.targetDepth = Math.max(50, this.targetDepth - 40);
  }

  public moveDown() {
    if (this.status !== "playing") return;
    this.targetDepth = Math.min(350, this.targetDepth + 40);
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.obstacles = config.obstacles.map((o) => ({ ...o }));
    this.collectibles = config.collectibles.map((c) => ({ ...c, collected: false }));
    this.speed = config.speed;
    this.targetDepth = config.targetDepth;
    this.submarineDepth = config.targetDepth;

    this.scrollX = 0;
    this.oxygen = this.maxOxygen;
    this.levelLength = 1500 + levelIndex * 200;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Move submarine depth towards target
    if (Math.abs(this.submarineDepth - this.targetDepth) > 1) {
      const dir = this.targetDepth > this.submarineDepth ? 1 : -1;
      this.submarineDepth += dir * this.depthSpeed;
    }

    // Scroll forward
    this.scrollX += this.speed;

    // Drain oxygen
    this.oxygen = Math.max(0, this.oxygen - this.oxygenDrain);

    // Check collectibles
    this.collectibles.forEach((c) => {
      if (!c.collected) {
        const relX = c.x - this.scrollX;
        if (
          relX > this.submarineX - 30 &&
          relX < this.submarineX + 60 &&
          Math.abs(c.depth - this.submarineDepth) < 40
        ) {
          c.collected = true;
          if (c.type === "oxygen") {
            this.oxygen = Math.min(this.maxOxygen, this.oxygen + 25);
          }
        }
      }
    });

    // Check collisions
    const submarineLeft = this.submarineX - 20;
    const submarineRight = this.submarineX + 50;
    const submarineTop = this.submarineDepth - 15;
    const submarineBottom = this.submarineDepth + 15;

    for (const obs of this.obstacles) {
      const obsLeft = obs.x - this.scrollX;
      const obsRight = obsLeft + obs.width;

      if (
        submarineRight > obsLeft &&
        submarineLeft < obsRight &&
        submarineBottom > obs.minDepth &&
        submarineTop < obs.maxDepth
      ) {
        this.status = "lost";
        this.stopAnimation();
        if (this.onStateChange) {
          this.onStateChange({ status: "lost" });
        }
        return;
      }
    }

    // Check oxygen
    if (this.oxygen <= 0) {
      this.status = "lost";
      this.stopAnimation();
      if (this.onStateChange) {
        this.onStateChange({ status: "lost" });
      }
      return;
    }

    // Check win
    if (this.scrollX >= this.levelLength) {
      this.status = "won";
      this.stopAnimation();
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
      return;
    }

    // Update bubbles
    this.bubbles.forEach((b) => {
      b.y -= b.speed;
      if (b.y < 0) {
        b.y = 400;
        b.x = this.scrollX + Math.random() * this.canvas.width;
      }
    });

    // Notify state
    if (this.onStateChange) {
      this.onStateChange({
        depth: Math.round(this.submarineDepth),
        oxygen: Math.round(this.oxygen),
        progress: Math.round((this.scrollX / this.levelLength) * 100),
      });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Ocean gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0077be");
    gradient.addColorStop(0.5, "#005a8c");
    gradient.addColorStop(1, "#003366");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw depth lines
    this.drawDepthLines(ctx);

    // Draw bubbles
    this.drawBubbles(ctx);

    // Draw obstacles
    this.obstacles.forEach((obs) => {
      this.drawObstacle(ctx, obs);
    });

    // Draw collectibles
    this.collectibles.forEach((c) => {
      if (!c.collected) {
        this.drawCollectible(ctx, c);
      }
    });

    // Draw submarine
    this.drawSubmarine(ctx);

    // Draw goal marker
    this.drawGoal(ctx);

    // Draw oxygen bar
    this.drawOxygenBar(ctx);

    // Draw progress bar
    this.drawProgressBar(ctx);
  }

  private drawDepthLines(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    for (let depth = 100; depth <= 300; depth += 100) {
      ctx.beginPath();
      ctx.moveTo(0, depth);
      ctx.lineTo(this.canvas.width, depth);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${depth}m`, 5, depth - 5);
    }
  }

  private drawBubbles(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    this.bubbles.forEach((b) => {
      const screenX = b.x - this.scrollX;
      if (screenX > -20 && screenX < this.canvas.width + 20) {
        ctx.beginPath();
        ctx.arc(screenX, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const x = obs.x - this.scrollX;
    if (x < -100 || x > this.canvas.width + 100) return;

    const height = obs.maxDepth - obs.minDepth;

    switch (obs.type) {
      case "rock":
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath();
        ctx.moveTo(x, obs.maxDepth);
        ctx.lineTo(x + obs.width / 2, obs.minDepth);
        ctx.lineTo(x + obs.width, obs.maxDepth);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case "seaweed":
        ctx.fillStyle = "#2d5a27";
        for (let i = 0; i < 3; i++) {
          const waveX = x + (obs.width / 4) * (i + 1);
          ctx.beginPath();
          ctx.moveTo(waveX, obs.maxDepth);
          ctx.quadraticCurveTo(
            waveX + 10,
            obs.minDepth + height * 0.3,
            waveX - 5,
            obs.minDepth
          );
          ctx.quadraticCurveTo(
            waveX - 15,
            obs.minDepth + height * 0.3,
            waveX,
            obs.maxDepth
          );
          ctx.fill();
        }
        break;

      case "coral":
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.arc(x + obs.width / 2, obs.minDepth + height / 2, height / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ff8787";
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const bx = x + obs.width / 2 + Math.cos(angle) * height * 0.3;
          const by = obs.minDepth + height / 2 + Math.sin(angle) * height * 0.3;
          ctx.beginPath();
          ctx.arc(bx, by, height * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case "mine":
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(x + obs.width / 2, obs.minDepth + height / 2, height / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#555";
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const cx = x + obs.width / 2;
          const cy = obs.minDepth + height / 2;
          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(angle) * height * 0.3,
            cy + Math.sin(angle) * height * 0.3
          );
          ctx.lineTo(
            cx + Math.cos(angle) * height * 0.5,
            cy + Math.sin(angle) * height * 0.5
          );
          ctx.stroke();
        }

        // Warning light
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(x + obs.width / 2, obs.minDepth + height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  private drawCollectible(ctx: CanvasRenderingContext2D, c: Collectible) {
    const x = c.x - this.scrollX;
    if (x < -50 || x > this.canvas.width + 50) return;

    if (c.type === "oxygen") {
      // Oxygen tank
      ctx.fillStyle = "#00bcd4";
      ctx.beginPath();
      ctx.roundRect(x - 10, c.depth - 15, 20, 30, 5);
      ctx.fill();

      ctx.fillStyle = "#4dd0e1";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("O₂", x, c.depth + 5);
    } else {
      // Star
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(angle) * 15;
        const py = c.depth + Math.sin(angle) * 15;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawSubmarine(ctx: CanvasRenderingContext2D) {
    const x = this.submarineX;
    const y = this.submarineDepth;

    // Hull
    ctx.fillStyle = "#ffc107";
    ctx.beginPath();
    ctx.ellipse(x + 15, y, 35, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Periscope
    ctx.fillStyle = "#ff9800";
    ctx.fillRect(x + 5, y - 30, 6, 15);
    ctx.fillRect(x + 5, y - 32, 12, 4);

    // Window
    ctx.fillStyle = "#87ceeb";
    ctx.beginPath();
    ctx.arc(x + 20, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffc107";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Propeller
    ctx.fillStyle = "#666";
    ctx.fillRect(x - 30, y - 3, 10, 6);

    const propAngle = Date.now() * 0.02;
    ctx.save();
    ctx.translate(x - 35, y);
    ctx.rotate(propAngle);
    ctx.fillStyle = "#888";
    ctx.fillRect(-2, -12, 4, 24);
    ctx.restore();

    // Bubbles from submarine
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    const bubbleTime = Date.now() * 0.01;
    for (let i = 0; i < 3; i++) {
      const bx = x - 40 - i * 8 - Math.sin(bubbleTime + i) * 3;
      const by = y + Math.cos(bubbleTime + i * 2) * 5;
      ctx.beginPath();
      ctx.arc(bx, by, 3 - i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D) {
    const goalX = this.levelLength - this.scrollX;
    if (goalX > this.canvas.width + 50) return;

    // Goal flag
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(goalX, 50, 5, 300);

    ctx.fillStyle = "#66bb6a";
    ctx.beginPath();
    ctx.moveTo(goalX + 5, 50);
    ctx.lineTo(goalX + 50, 80);
    ctx.lineTo(goalX + 5, 110);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GOAL", goalX + 27, 85);
  }

  private drawOxygenBar(ctx: CanvasRenderingContext2D) {
    const barWidth = 120;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    const fillPercent = this.oxygen / this.maxOxygen;
    const fillColor =
      fillPercent > 0.5 ? "#4caf50" : fillPercent > 0.25 ? "#ff9800" : "#f44336";

    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, barWidth * fillPercent, barHeight);

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`O₂ ${Math.round(this.oxygen)}%`, x + barWidth / 2, y + 12);
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D) {
    const barWidth = this.canvas.width - 40;
    const barHeight = 8;
    const x = 20;
    const y = this.canvas.height - 20;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    const progress = Math.min(1, this.scrollX / this.levelLength);
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    // Submarine marker
    ctx.fillStyle = "#ffc107";
    ctx.beginPath();
    ctx.arc(x + barWidth * progress, y + barHeight / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width - 20);
      this.canvas.height = 400;
      this.draw();
    }
  }

  public reset() {
    this.stopAnimation();
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

  public getDepth(): number {
    return Math.round(this.submarineDepth);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
