/**
 * Billiard Puzzle Game Engine
 * Game #116 - Plan shots to pocket all balls
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pocketed: boolean;
  isCue: boolean;
}

export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface LevelConfig {
  balls: { x: number; y: number; color: string }[];
  cue: { x: number; y: number };
  maxShots: number;
}

export class BilliardPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private tableWidth = 600;
  private tableHeight = 300;
  private padding = 30;
  private ballRadius = 12;
  private pocketRadius = 18;

  private balls: Ball[] = [];
  private pockets: Pocket[] = [];

  private friction = 0.985;
  private maxPower = 20;

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragEnd = { x: 0, y: 0 };

  private shotsLeft = 5;
  private currentLevel = 0;
  private status: "idle" | "aiming" | "moving" | "won" | "failed" = "idle";
  private animationId = 0;

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple straight shot
    {
      balls: [{ x: 400, y: 150, color: "#e74c3c" }],
      cue: { x: 150, y: 150 },
      maxShots: 3,
    },
    // Level 2 - Two balls
    {
      balls: [
        { x: 400, y: 100, color: "#e74c3c" },
        { x: 400, y: 200, color: "#3498db" },
      ],
      cue: { x: 150, y: 150 },
      maxShots: 3,
    },
    // Level 3 - Angle shot
    {
      balls: [
        { x: 450, y: 80, color: "#e74c3c" },
        { x: 300, y: 220, color: "#f39c12" },
      ],
      cue: { x: 150, y: 150 },
      maxShots: 3,
    },
    // Level 4 - Bank shot
    {
      balls: [
        { x: 500, y: 150, color: "#9b59b6" },
        { x: 350, y: 75, color: "#1abc9c" },
      ],
      cue: { x: 100, y: 150 },
      maxShots: 4,
    },
    // Level 5 - Multiple balls
    {
      balls: [
        { x: 400, y: 100, color: "#e74c3c" },
        { x: 450, y: 150, color: "#3498db" },
        { x: 400, y: 200, color: "#2ecc71" },
      ],
      cue: { x: 150, y: 150 },
      maxShots: 4,
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupPockets();
    this.setupInput();
  }

  private setupPockets() {
    const w = this.tableWidth;
    const h = this.tableHeight;
    const p = this.padding;
    const r = this.pocketRadius;

    this.pockets = [
      { x: p, y: p, radius: r }, // top-left
      { x: w / 2 + p, y: p - 5, radius: r }, // top-center
      { x: w + p, y: p, radius: r }, // top-right
      { x: p, y: h + p, radius: r }, // bottom-left
      { x: w / 2 + p, y: h + p + 5, radius: r }, // bottom-center
      { x: w + p, y: h + p, radius: r }, // bottom-right
    ];
  }

  private setupInput() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "idle" && this.status !== "aiming") return;

      const pos = getPos(e);
      const cue = this.balls.find((b) => b.isCue && !b.pocketed);
      if (!cue) return;

      const dist = Math.hypot(pos.x - cue.x, pos.y - cue.y);
      if (dist < cue.radius * 2) {
        this.isDragging = true;
        this.status = "aiming";
        this.dragStart = { x: cue.x, y: cue.y };
        this.dragEnd = pos;
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      this.dragEnd = getPos(e);
      this.draw();
    };

    const handleEnd = () => {
      if (!this.isDragging) return;

      const cue = this.balls.find((b) => b.isCue && !b.pocketed);
      if (cue) {
        const dx = this.dragStart.x - this.dragEnd.x;
        const dy = this.dragStart.y - this.dragEnd.y;
        const power = Math.min(Math.hypot(dx, dy) / 10, this.maxPower);

        if (power > 1) {
          const angle = Math.atan2(dy, dx);
          cue.vx = Math.cos(angle) * power;
          cue.vy = Math.sin(angle) * power;

          this.shotsLeft--;
          this.status = "moving";

          if (this.onStateChange) {
            this.onStateChange({ shots: this.shotsLeft });
          }

          this.animate();
        }
      }

      this.isDragging = false;
      if (this.status === "aiming") {
        this.status = "idle";
      }
      this.draw();
    };

    this.canvas.addEventListener("mousedown", handleStart);
    this.canvas.addEventListener("mousemove", handleMove);
    this.canvas.addEventListener("mouseup", handleEnd);
    this.canvas.addEventListener("mouseleave", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("touchend", handleEnd);
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "idle";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.shotsLeft = config.maxShots;
    this.balls = [];

    // Add cue ball
    this.balls.push({
      x: config.cue.x + this.padding,
      y: config.cue.y + this.padding,
      vx: 0,
      vy: 0,
      radius: this.ballRadius,
      color: "#ffffff",
      pocketed: false,
      isCue: true,
    });

    // Add target balls
    config.balls.forEach((b) => {
      this.balls.push({
        x: b.x + this.padding,
        y: b.y + this.padding,
        vx: 0,
        vy: 0,
        radius: this.ballRadius,
        color: b.color,
        pocketed: false,
        isCue: false,
      });
    });

    if (this.onStateChange) {
      this.onStateChange({ shots: this.shotsLeft });
    }
  }

  private animate() {
    cancelAnimationFrame(this.animationId);

    const update = () => {
      let moving = false;

      // Update ball positions
      this.balls.forEach((ball) => {
        if (ball.pocketed) return;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Apply friction
        ball.vx *= this.friction;
        ball.vy *= this.friction;

        // Stop if very slow
        if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
          ball.vx = 0;
          ball.vy = 0;
        } else {
          moving = true;
        }

        // Wall collisions
        this.wallCollision(ball);
      });

      // Ball-ball collisions
      this.ballCollisions();

      // Check pockets
      this.checkPockets();

      this.draw();

      if (moving) {
        this.animationId = requestAnimationFrame(update);
      } else {
        this.checkGameState();
      }
    };

    update();
  }

  private wallCollision(ball: Ball) {
    const left = this.padding + ball.radius;
    const right = this.tableWidth + this.padding - ball.radius;
    const top = this.padding + ball.radius;
    const bottom = this.tableHeight + this.padding - ball.radius;

    if (ball.x < left) {
      ball.x = left;
      ball.vx *= -0.8;
    }
    if (ball.x > right) {
      ball.x = right;
      ball.vx *= -0.8;
    }
    if (ball.y < top) {
      ball.y = top;
      ball.vy *= -0.8;
    }
    if (ball.y > bottom) {
      ball.y = bottom;
      ball.vy *= -0.8;
    }
  }

  private ballCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const b1 = this.balls[i];
        const b2 = this.balls[j];

        if (b1.pocketed || b2.pocketed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0) {
          // Collision response
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative velocity
          const dvx = b1.vx - b2.vx;
          const dvy = b1.vy - b2.vy;
          const dvn = dvx * nx + dvy * ny;

          // Don't resolve if moving apart
          if (dvn < 0) continue;

          // Update velocities (equal mass)
          b1.vx -= dvn * nx;
          b1.vy -= dvn * ny;
          b2.vx += dvn * nx;
          b2.vy += dvn * ny;

          // Separate balls
          const overlap = minDist - dist;
          b1.x -= (overlap / 2) * nx;
          b1.y -= (overlap / 2) * ny;
          b2.x += (overlap / 2) * nx;
          b2.y += (overlap / 2) * ny;
        }
      }
    }
  }

  private checkPockets() {
    this.balls.forEach((ball) => {
      if (ball.pocketed) return;

      for (const pocket of this.pockets) {
        const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
        if (dist < pocket.radius) {
          ball.pocketed = true;
          ball.vx = 0;
          ball.vy = 0;
          break;
        }
      }
    });
  }

  private checkGameState() {
    const cue = this.balls.find((b) => b.isCue);
    const targetBalls = this.balls.filter((b) => !b.isCue);

    // Cue ball pocketed - reset its position
    if (cue && cue.pocketed) {
      const config = this.levels[this.currentLevel % this.levels.length];
      cue.pocketed = false;
      cue.x = config.cue.x + this.padding;
      cue.y = config.cue.y + this.padding;
      cue.vx = 0;
      cue.vy = 0;
    }

    // All target balls pocketed - win
    if (targetBalls.every((b) => b.pocketed)) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
      return;
    }

    // Out of shots - fail
    if (this.shotsLeft <= 0) {
      this.status = "failed";
      if (this.onStateChange) {
        this.onStateChange({ status: "failed" });
      }
      return;
    }

    this.status = "idle";
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#0d1520";
    ctx.fillRect(0, 0, w, h);

    // Table felt
    ctx.fillStyle = "#0d6d3a";
    ctx.fillRect(
      this.padding,
      this.padding,
      this.tableWidth,
      this.tableHeight
    );

    // Table border
    ctx.strokeStyle = "#5d3a1a";
    ctx.lineWidth = 20;
    ctx.strokeRect(
      this.padding,
      this.padding,
      this.tableWidth,
      this.tableHeight
    );

    // Inner border
    ctx.strokeStyle = "#3d2010";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.padding - 10,
      this.padding - 10,
      this.tableWidth + 20,
      this.tableHeight + 20
    );

    // Pockets
    this.pockets.forEach((pocket) => {
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Balls
    this.balls.forEach((ball) => {
      if (ball.pocketed) return;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ball
      const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        0,
        ball.x,
        ball.y,
        ball.radius
      );
      gradient.addColorStop(0, this.lightenColor(ball.color));
      gradient.addColorStop(1, ball.color);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        ball.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Aiming line
    if (this.isDragging) {
      const cue = this.balls.find((b) => b.isCue && !b.pocketed);
      if (cue) {
        const dx = this.dragStart.x - this.dragEnd.x;
        const dy = this.dragStart.y - this.dragEnd.y;
        const power = Math.min(Math.hypot(dx, dy) / 10, this.maxPower);

        // Direction line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + dx * 3, cue.y + dy * 3);
        ctx.stroke();
        ctx.setLineDash([]);

        // Power indicator
        ctx.strokeStyle = this.dragEnd.x < this.dragStart.x ? "#e74c3c" : "#2ecc71";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(this.dragEnd.x, this.dragEnd.y);
        ctx.stroke();

        // Cue stick
        const angle = Math.atan2(
          this.dragEnd.y - cue.y,
          this.dragEnd.x - cue.x
        );
        const stickLength = 150;
        const stickStart = power * 3 + cue.radius + 5;

        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(
          cue.x + Math.cos(angle) * stickStart,
          cue.y + Math.sin(angle) * stickStart
        );
        ctx.lineTo(
          cue.x + Math.cos(angle) * (stickStart + stickLength),
          cue.y + Math.sin(angle) * (stickStart + stickLength)
        );
        ctx.stroke();

        // Power bar
        const barX = this.padding;
        const barY = this.tableHeight + this.padding + 35;
        const barWidth = this.tableWidth;
        const barHeight = 10;

        ctx.fillStyle = "#333";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const powerRatio = power / this.maxPower;
        const powerColor = powerRatio < 0.5 ? "#2ecc71" : powerRatio < 0.8 ? "#f39c12" : "#e74c3c";
        ctx.fillStyle = powerColor;
        ctx.fillRect(barX, barY, barWidth * powerRatio, barHeight);
      }
    }
  }

  private lightenColor(color: string): string {
    // Simple color lightening
    if (color === "#ffffff") return "#ffffff";
    return color.replace(/^#/, "#ff");
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const scale = Math.min(
        rect.width / (this.tableWidth + this.padding * 2),
        rect.height / (this.tableHeight + this.padding * 2 + 50)
      );

      this.canvas.width = (this.tableWidth + this.padding * 2) * scale;
      this.canvas.height = (this.tableHeight + this.padding * 2 + 50) * scale;

      this.ctx.scale(scale, scale);
      this.draw();
    }
  }

  public reset() {
    cancelAnimationFrame(this.animationId);
    this.loadLevel(this.currentLevel);
    this.status = "idle";
    this.draw();
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

  public getShots(): number {
    return this.shotsLeft;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
