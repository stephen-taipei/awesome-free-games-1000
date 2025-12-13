/**
 * Golf Puzzle - Game #044
 * Plan your shots to get the ball in the hole
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Hole {
  x: number;
  y: number;
  radius: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Level {
  ball: { x: number; y: number };
  hole: { x: number; y: number };
  walls: Wall[];
  par: number;
}

const LEVELS: Level[] = [
  {
    ball: { x: 100, y: 200 },
    hole: { x: 500, y: 200 },
    walls: [],
    par: 1
  },
  {
    ball: { x: 100, y: 100 },
    hole: { x: 500, y: 300 },
    walls: [
      { x1: 300, y1: 50, x2: 300, y2: 250 }
    ],
    par: 2
  },
  {
    ball: { x: 100, y: 200 },
    hole: { x: 500, y: 200 },
    walls: [
      { x1: 250, y1: 100, x2: 250, y2: 300 },
      { x1: 400, y1: 100, x2: 400, y2: 300 }
    ],
    par: 3
  },
  {
    ball: { x: 100, y: 350 },
    hole: { x: 500, y: 50 },
    walls: [
      { x1: 200, y1: 0, x2: 200, y2: 280 },
      { x1: 350, y1: 120, x2: 350, y2: 400 }
    ],
    par: 3
  },
  {
    ball: { x: 50, y: 350 },
    hole: { x: 550, y: 50 },
    walls: [
      { x1: 150, y1: 200, x2: 150, y2: 400 },
      { x1: 300, y1: 0, x2: 300, y2: 200 },
      { x1: 450, y1: 150, x2: 450, y2: 400 }
    ],
    par: 4
  }
];

export class GolfPuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 10 };
  hole: Hole = { x: 0, y: 0, radius: 15 };
  walls: Wall[] = [];

  currentLevel = 0;
  strokes = 0;
  par = 1;

  isAiming = false;
  aimStartX = 0;
  aimStartY = 0;
  aimEndX = 0;
  aimEndY = 0;

  isMoving = false;

  status: 'playing' | 'won' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.ball = {
      x: level.ball.x,
      y: level.ball.y,
      vx: 0,
      vy: 0,
      radius: 10
    };
    this.hole = {
      x: level.hole.x,
      y: level.hole.y,
      radius: 15
    };
    this.walls = [...level.walls];
    this.par = level.par;
    this.strokes = 0;
    this.isAiming = false;
    this.isMoving = false;

    this.notifyState();
  }

  public handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing' || this.isMoving) return;

    if (type === 'down') {
      // Check if clicking near ball
      const dx = x - this.ball.x;
      const dy = y - this.ball.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        this.isAiming = true;
        this.aimStartX = this.ball.x;
        this.aimStartY = this.ball.y;
        this.aimEndX = x;
        this.aimEndY = y;
      }
    } else if (type === 'move' && this.isAiming) {
      this.aimEndX = x;
      this.aimEndY = y;
      this.draw();
    } else if (type === 'up' && this.isAiming) {
      // Shoot the ball
      const dx = this.aimStartX - this.aimEndX;
      const dy = this.aimStartY - this.aimEndY;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, 20);

      if (power > 1) {
        const angle = Math.atan2(dy, dx);
        this.ball.vx = Math.cos(angle) * power;
        this.ball.vy = Math.sin(angle) * power;
        this.strokes++;
        this.isMoving = true;
        this.loop();
      }

      this.isAiming = false;
      this.notifyState();
    }
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.isMoving && this.status === 'playing') {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (!this.isMoving) return;

    const friction = 0.98;
    const minSpeed = 0.1;

    // Apply friction
    this.ball.vx *= friction;
    this.ball.vy *= friction;

    // Update position
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Check wall collisions
    this.walls.forEach(wall => {
      this.checkWallCollision(wall);
    });

    // Check canvas boundaries
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = -this.ball.vx * 0.8;
    }
    if (this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.x = this.canvas.width - this.ball.radius;
      this.ball.vx = -this.ball.vx * 0.8;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = -this.ball.vy * 0.8;
    }
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.ball.y = this.canvas.height - this.ball.radius;
      this.ball.vy = -this.ball.vy * 0.8;
    }

    // Check if in hole
    const dx = this.ball.x - this.hole.x;
    const dy = this.ball.y - this.hole.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.hole.radius - 5) {
      const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
      if (speed < 8) {
        // Ball in hole!
        this.isMoving = false;
        this.status = 'won';
        this.notifyState();
        return;
      }
    }

    // Check if stopped
    const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (speed < minSpeed) {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.isMoving = false;
    }
  }

  private checkWallCollision(wall: Wall) {
    // Line segment collision detection
    const { x1, y1, x2, y2 } = wall;

    // Vector from wall start to ball
    const dx = this.ball.x - x1;
    const dy = this.ball.y - y1;

    // Wall vector
    const wx = x2 - x1;
    const wy = y2 - y1;
    const wallLen = Math.sqrt(wx * wx + wy * wy);

    // Normalize
    const nx = wx / wallLen;
    const ny = wy / wallLen;

    // Project ball onto wall line
    const proj = dx * nx + dy * ny;
    const clampedProj = Math.max(0, Math.min(wallLen, proj));

    // Closest point on wall
    const closestX = x1 + nx * clampedProj;
    const closestY = y1 + ny * clampedProj;

    // Distance to closest point
    const distX = this.ball.x - closestX;
    const distY = this.ball.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < this.ball.radius + 3) {
      // Collision! Reflect velocity
      const normalX = distX / dist;
      const normalY = distY / dist;

      // Dot product of velocity and normal
      const dot = this.ball.vx * normalX + this.ball.vy * normalY;

      // Reflect
      this.ball.vx -= 2 * dot * normalX;
      this.ball.vy -= 2 * dot * normalY;

      // Dampen
      this.ball.vx *= 0.8;
      this.ball.vy *= 0.8;

      // Push ball out of wall
      this.ball.x = closestX + normalX * (this.ball.radius + 4);
      this.ball.y = closestY + normalY * (this.ball.radius + 4);
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grass pattern
    this.ctx.fillStyle = '#2d5a27';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grass texture
    this.ctx.strokeStyle = 'rgba(50, 100, 40, 0.3)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < this.canvas.width; i += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }

    // Draw hole
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.beginPath();
    this.ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Hole rim
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Flag
    const flagHeight = 60;
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.hole.x, this.hole.y);
    this.ctx.lineTo(this.hole.x, this.hole.y - flagHeight);
    this.ctx.stroke();

    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.moveTo(this.hole.x, this.hole.y - flagHeight);
    this.ctx.lineTo(this.hole.x + 25, this.hole.y - flagHeight + 12);
    this.ctx.lineTo(this.hole.x, this.hole.y - flagHeight + 24);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw walls
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.walls.forEach(wall => {
      this.ctx.beginPath();
      this.ctx.moveTo(wall.x1, wall.y1);
      this.ctx.lineTo(wall.x2, wall.y2);
      this.ctx.stroke();
    });

    // Draw aim line
    if (this.isAiming) {
      const dx = this.aimStartX - this.aimEndX;
      const dy = this.aimStartY - this.aimEndY;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy), 150);

      // Power indicator line
      this.ctx.strokeStyle = `rgba(255, ${255 - power * 1.5}, 0, 0.8)`;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([10, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.ball.x, this.ball.y);
      this.ctx.lineTo(this.ball.x + dx, this.ball.y + dy);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Arrow head
      const angle = Math.atan2(dy, dx);
      const headLen = 15;
      this.ctx.beginPath();
      this.ctx.moveTo(this.ball.x + dx, this.ball.y + dy);
      this.ctx.lineTo(
        this.ball.x + dx - headLen * Math.cos(angle - Math.PI / 6),
        this.ball.y + dy - headLen * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.moveTo(this.ball.x + dx, this.ball.y + dy);
      this.ctx.lineTo(
        this.ball.x + dx - headLen * Math.cos(angle + Math.PI / 6),
        this.ball.y + dy - headLen * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.stroke();
    }

    // Draw ball
    this.ctx.fillStyle = 'white';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Ball dimples
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x - 3, this.ball.y - 3, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x + 2, this.ball.y - 2, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(600, rect.width);
      this.canvas.height = 400;
    }
    this.draw();
  }

  public reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public nextLevel() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        strokes: this.strokes,
        par: this.par
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
