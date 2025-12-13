export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hole {
  x: number;
  y: number;
  radius: number;
  type: "trap" | "goal";
}

export interface Level {
  walls: Wall[];
  holes: Hole[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
}

const LEVELS: Level[] = [
  // Level 1 - Simple path
  {
    walls: [
      { x: 150, y: 0, width: 20, height: 200 },
      { x: 300, y: 150, width: 20, height: 250 },
      { x: 450, y: 0, width: 20, height: 300 },
    ],
    holes: [{ x: 225, y: 200, radius: 15, type: "trap" }],
    start: { x: 50, y: 50 },
    goal: { x: 530, y: 380 },
  },
  // Level 2 - More complex
  {
    walls: [
      { x: 100, y: 80, width: 200, height: 20 },
      { x: 100, y: 80, width: 20, height: 150 },
      { x: 200, y: 180, width: 200, height: 20 },
      { x: 380, y: 180, width: 20, height: 150 },
      { x: 100, y: 280, width: 200, height: 20 },
      { x: 450, y: 80, width: 20, height: 220 },
    ],
    holes: [
      { x: 350, y: 130, radius: 15, type: "trap" },
      { x: 150, y: 230, radius: 15, type: "trap" },
    ],
    start: { x: 50, y: 50 },
    goal: { x: 530, y: 380 },
  },
  // Level 3 - Maze style
  {
    walls: [
      { x: 80, y: 0, width: 20, height: 120 },
      { x: 80, y: 180, width: 20, height: 220 },
      { x: 160, y: 80, width: 20, height: 320 },
      { x: 240, y: 0, width: 20, height: 280 },
      { x: 320, y: 120, width: 20, height: 280 },
      { x: 400, y: 0, width: 20, height: 200 },
      { x: 400, y: 280, width: 20, height: 120 },
      { x: 480, y: 80, width: 20, height: 240 },
    ],
    holes: [
      { x: 120, y: 300, radius: 12, type: "trap" },
      { x: 200, y: 150, radius: 12, type: "trap" },
      { x: 280, y: 350, radius: 12, type: "trap" },
      { x: 360, y: 80, radius: 12, type: "trap" },
      { x: 440, y: 250, radius: 12, type: "trap" },
    ],
    start: { x: 40, y: 50 },
    goal: { x: 540, y: 380 },
  },
];

export class BallMazeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  ball: Ball;
  currentLevel: number = 0;
  level: Level;

  gravity = { x: 0, y: 0 };
  friction = 0.98;
  maxSpeed = 8;

  status: "playing" | "won" | "lost" = "playing";
  startTime: number = 0;
  elapsedTime: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = LEVELS[0];
    this.ball = this.createBall();
  }

  private createBall(): Ball {
    return {
      x: this.level.start.x,
      y: this.level.start.y,
      vx: 0,
      vy: 0,
      radius: 12,
    };
  }

  public start() {
    this.status = "playing";
    this.ball = this.createBall();
    this.startTime = Date.now();
    this.loop();
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
    this.level = LEVELS[this.currentLevel];
    this.ball = this.createBall();
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.level = LEVELS[this.currentLevel];
      this.ball = this.createBall();
      this.status = "playing";
      this.startTime = Date.now();
      this.loop();
      return true;
    }
    return false;
  }

  private loop = () => {
    if (this.status === "playing") {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      if (this.onStateChange) {
        this.onStateChange({ time: this.elapsedTime, level: this.currentLevel + 1 });
      }
    }

    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.status !== "playing") return;

    // Apply gravity (from device tilt or keyboard)
    this.ball.vx += this.gravity.x * 0.5;
    this.ball.vy += this.gravity.y * 0.5;

    // Apply friction
    this.ball.vx *= this.friction;
    this.ball.vy *= this.friction;

    // Clamp speed
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    if (speed > this.maxSpeed) {
      this.ball.vx = (this.ball.vx / speed) * this.maxSpeed;
      this.ball.vy = (this.ball.vy / speed) * this.maxSpeed;
    }

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall collisions
    this.checkWallCollisions();

    // Boundary collisions
    this.checkBoundaryCollisions();

    // Check holes
    this.checkHoles();

    // Check goal
    this.checkGoal();
  }

  private checkWallCollisions() {
    for (const wall of this.level.walls) {
      // Find closest point on wall to ball
      const closestX = Math.max(wall.x, Math.min(this.ball.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(this.ball.y, wall.y + wall.height));

      const dx = this.ball.x - closestX;
      const dy = this.ball.y - closestY;
      const dist = Math.hypot(dx, dy);

      if (dist < this.ball.radius) {
        // Collision response
        const overlap = this.ball.radius - dist;
        if (dist > 0) {
          this.ball.x += (dx / dist) * overlap;
          this.ball.y += (dy / dist) * overlap;

          // Reflect velocity
          const normal = { x: dx / dist, y: dy / dist };
          const dot = this.ball.vx * normal.x + this.ball.vy * normal.y;
          this.ball.vx -= 1.5 * dot * normal.x;
          this.ball.vy -= 1.5 * dot * normal.y;
        }
      }
    }
  }

  private checkBoundaryCollisions() {
    const { width, height } = this.canvas;

    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = -this.ball.vx * 0.5;
    }
    if (this.ball.x + this.ball.radius > width) {
      this.ball.x = width - this.ball.radius;
      this.ball.vx = -this.ball.vx * 0.5;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = -this.ball.vy * 0.5;
    }
    if (this.ball.y + this.ball.radius > height) {
      this.ball.y = height - this.ball.radius;
      this.ball.vy = -this.ball.vy * 0.5;
    }
  }

  private checkHoles() {
    for (const hole of this.level.holes) {
      const dx = this.ball.x - hole.x;
      const dy = this.ball.y - hole.y;
      const dist = Math.hypot(dx, dy);

      if (dist < hole.radius) {
        if (hole.type === "trap") {
          this.status = "lost";
          if (this.onStateChange) {
            this.onStateChange({ status: "lost" });
          }
          // Reset after short delay
          setTimeout(() => {
            this.reset();
          }, 1000);
        }
      }
    }
  }

  private checkGoal() {
    const dx = this.ball.x - this.level.goal.x;
    const dy = this.ball.y - this.level.goal.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 20) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          time: this.elapsedTime,
          hasNextLevel: this.currentLevel < LEVELS.length - 1,
        });
      }
    }
  }

  public setGravity(x: number, y: number) {
    this.gravity.x = Math.max(-1, Math.min(1, x));
    this.gravity.y = Math.max(-1, Math.min(1, y));
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw maze background
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid pattern
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Draw goal
    const goalGradient = this.ctx.createRadialGradient(
      this.level.goal.x,
      this.level.goal.y,
      0,
      this.level.goal.x,
      this.level.goal.y,
      25
    );
    goalGradient.addColorStop(0, "#4ade80");
    goalGradient.addColorStop(0.5, "#22c55e");
    goalGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
    this.ctx.fillStyle = goalGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.level.goal.x, this.level.goal.y, 25, 0, Math.PI * 2);
    this.ctx.fill();

    // Goal ring
    this.ctx.strokeStyle = "#4ade80";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.level.goal.x, this.level.goal.y, 18, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw holes (traps)
    for (const hole of this.level.holes) {
      const holeGradient = this.ctx.createRadialGradient(
        hole.x,
        hole.y,
        0,
        hole.x,
        hole.y,
        hole.radius
      );
      holeGradient.addColorStop(0, "#000");
      holeGradient.addColorStop(0.7, "#1f1f1f");
      holeGradient.addColorStop(1, "#333");
      this.ctx.fillStyle = holeGradient;
      this.ctx.beginPath();
      this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Hole border
      this.ctx.strokeStyle = "#ef4444";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw walls
    for (const wall of this.level.walls) {
      const wallGradient = this.ctx.createLinearGradient(
        wall.x,
        wall.y,
        wall.x + wall.width,
        wall.y + wall.height
      );
      wallGradient.addColorStop(0, "#4a5568");
      wallGradient.addColorStop(0.5, "#718096");
      wallGradient.addColorStop(1, "#4a5568");
      this.ctx.fillStyle = wallGradient;
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Wall highlight
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.fillRect(wall.x, wall.y, wall.width, 3);
    }

    // Draw ball
    if (this.status !== "lost") {
      // Ball shadow
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.ball.x + 3,
        this.ball.y + 3,
        this.ball.radius,
        this.ball.radius * 0.6,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // Ball gradient
      const ballGradient = this.ctx.createRadialGradient(
        this.ball.x - 4,
        this.ball.y - 4,
        0,
        this.ball.x,
        this.ball.y,
        this.ball.radius
      );
      ballGradient.addColorStop(0, "#f472b6");
      ballGradient.addColorStop(0.5, "#ec4899");
      ballGradient.addColorStop(1, "#be185d");
      this.ctx.fillStyle = ballGradient;
      this.ctx.beginPath();
      this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Ball highlight
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      this.ctx.beginPath();
      this.ctx.arc(
        this.ball.x - 3,
        this.ball.y - 3,
        this.ball.radius * 0.4,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Draw status overlay if lost
    if (this.status === "lost") {
      this.ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
    }
  }

  public reset() {
    this.ball = this.createBall();
    this.status = "playing";
    this.startTime = Date.now();
    this.loop();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
