/**
 * Mini Golf Game Engine
 * Game #241
 *
 * Arcade-style mini golf with physics!
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Hole {
  x: number;
  y: number;
  radius: number;
}

interface Obstacle {
  type: "rect" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

interface Level {
  ball: { x: number; y: number };
  hole: { x: number; y: number };
  obstacles: Obstacle[];
  par: number;
}

interface GameState {
  hole: number;
  strokes: number;
  totalStrokes: number;
  status: "idle" | "playing" | "aiming" | "moving" | "complete";
}

type StateCallback = (state: GameState) => void;

const BALL_RADIUS = 8;
const HOLE_RADIUS = 12;
const FRICTION = 0.985;
const MAX_POWER = 15;
const TOTAL_HOLES = 9;

export class MiniGolfGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: "idle" | "playing" | "aiming" | "moving" | "complete" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS };
  private hole: Hole = { x: 0, y: 0, radius: HOLE_RADIUS };
  private obstacles: Obstacle[] = [];

  private currentHole = 1;
  private strokes = 0;
  private totalStrokes = 0;
  private levels: Level[] = [];

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragEndX = 0;
  private dragEndY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.generateLevels();
    this.setupControls();
  }

  private generateLevels() {
    // Generate 9 procedural holes
    this.levels = [];

    for (let i = 0; i < TOTAL_HOLES; i++) {
      const w = 400;
      const h = 400;
      const margin = 50;

      // Ball and hole positions
      const ballX = margin + Math.random() * (w / 3);
      const ballY = h - margin - Math.random() * (h / 4);
      const holeX = w - margin - Math.random() * (w / 3);
      const holeY = margin + Math.random() * (h / 4);

      // Generate obstacles
      const obstacles: Obstacle[] = [];
      const obstacleCount = 2 + Math.floor(i / 2);

      for (let j = 0; j < obstacleCount; j++) {
        if (Math.random() > 0.5) {
          // Rectangle
          obstacles.push({
            type: "rect",
            x: margin + Math.random() * (w - margin * 2 - 80),
            y: margin + Math.random() * (h - margin * 2 - 40),
            width: 40 + Math.random() * 60,
            height: 20 + Math.random() * 30,
          });
        } else {
          // Circle
          obstacles.push({
            type: "circle",
            x: margin + 30 + Math.random() * (w - margin * 2 - 60),
            y: margin + 30 + Math.random() * (h - margin * 2 - 60),
            radius: 15 + Math.random() * 20,
          });
        }
      }

      this.levels.push({
        ball: { x: ballX, y: ballY },
        hole: { x: holeX, y: holeY },
        obstacles,
        par: 3 + Math.floor(i / 3),
      });
    }
  }

  private setupControls() {
    this.canvas.addEventListener("mousedown", (e) => this.startDrag(e));
    this.canvas.addEventListener("mousemove", (e) => this.updateDrag(e));
    this.canvas.addEventListener("mouseup", () => this.endDrag());
    this.canvas.addEventListener("mouseleave", () => this.cancelDrag());

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.startDrag(e.touches[0]);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.updateDrag(e.touches[0]);
    });
    this.canvas.addEventListener("touchend", () => this.endDrag());
  }

  private getCanvasCoords(e: MouseEvent | Touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private startDrag(e: MouseEvent | Touch) {
    if (this.status !== "playing") return;

    const pos = this.getCanvasCoords(e);
    const dx = pos.x - this.ball.x;
    const dy = pos.y - this.ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 50) {
      this.isDragging = true;
      this.status = "aiming";
      this.dragStartX = this.ball.x;
      this.dragStartY = this.ball.y;
      this.dragEndX = pos.x;
      this.dragEndY = pos.y;
    }
  }

  private updateDrag(e: MouseEvent | Touch) {
    if (!this.isDragging) return;

    const pos = this.getCanvasCoords(e);
    this.dragEndX = pos.x;
    this.dragEndY = pos.y;
    this.draw();
  }

  private endDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;

    const dx = this.dragStartX - this.dragEndX;
    const dy = this.dragStartY - this.dragEndY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist / 10, MAX_POWER);

    if (power > 0.5) {
      const angle = Math.atan2(dy, dx);
      this.ball.vx = Math.cos(angle) * power;
      this.ball.vy = Math.sin(angle) * power;
      this.strokes++;
      this.totalStrokes++;
      this.status = "moving";
      this.emitState();
    } else {
      this.status = "playing";
    }
  }

  private cancelDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.status = "playing";
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        hole: this.currentHole,
        strokes: this.strokes,
        totalStrokes: this.totalStrokes,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.draw();
  }

  start() {
    this.currentHole = 1;
    this.strokes = 0;
    this.totalStrokes = 0;
    this.generateLevels();
    this.loadHole();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private loadHole() {
    const level = this.levels[this.currentHole - 1];
    const scale = this.canvas.width / 400;

    this.ball.x = level.ball.x * scale;
    this.ball.y = level.ball.y * scale;
    this.ball.vx = 0;
    this.ball.vy = 0;

    this.hole.x = level.hole.x * scale;
    this.hole.y = level.hole.y * scale;

    this.obstacles = level.obstacles.map((obs) => {
      if (obs.type === "rect") {
        return {
          type: obs.type,
          x: obs.x! * scale,
          y: obs.y! * scale,
          width: obs.width! * scale,
          height: obs.height! * scale,
        };
      } else {
        return {
          type: obs.type,
          x: obs.x * scale,
          y: obs.y * scale,
          radius: obs.radius! * scale,
        };
      }
    });

    this.strokes = 0;
  }

  private gameLoop() {
    if (this.status === "idle" || this.status === "complete") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    if (this.status !== "moving") return;

    // Apply velocity
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Apply friction
    this.ball.vx *= FRICTION;
    this.ball.vy *= FRICTION;

    // Wall collisions
    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx *= -0.8;
    }
    if (this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.x = this.canvas.width - this.ball.radius;
      this.ball.vx *= -0.8;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -0.8;
    }
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.ball.y = this.canvas.height - this.ball.radius;
      this.ball.vy *= -0.8;
    }

    // Obstacle collisions
    this.obstacles.forEach((obs) => {
      if (obs.type === "rect") {
        this.handleRectCollision(obs);
      } else {
        this.handleCircleCollision(obs);
      }
    });

    // Check if ball stopped
    const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
    if (speed < 0.1) {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.status = "playing";
    }

    // Check if ball in hole
    const dx = this.ball.x - this.hole.x;
    const dy = this.ball.y - this.hole.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.hole.radius && speed < 5) {
      this.holeComplete();
    }
  }

  private handleRectCollision(obs: Obstacle) {
    const left = obs.x!;
    const right = obs.x! + obs.width!;
    const top = obs.y!;
    const bottom = obs.y! + obs.height!;

    const closestX = Math.max(left, Math.min(this.ball.x, right));
    const closestY = Math.max(top, Math.min(this.ball.y, bottom));

    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.ball.radius) {
      const overlap = this.ball.radius - dist;
      const nx = dx / dist || 0;
      const ny = dy / dist || 0;

      this.ball.x += nx * overlap;
      this.ball.y += ny * overlap;

      const dot = this.ball.vx * nx + this.ball.vy * ny;
      this.ball.vx -= 2 * dot * nx * 0.8;
      this.ball.vy -= 2 * dot * ny * 0.8;
    }
  }

  private handleCircleCollision(obs: Obstacle) {
    const dx = this.ball.x - obs.x;
    const dy = this.ball.y - obs.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.ball.radius + obs.radius!;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      this.ball.x += nx * overlap;
      this.ball.y += ny * overlap;

      const dot = this.ball.vx * nx + this.ball.vy * ny;
      this.ball.vx -= 2 * dot * nx * 0.8;
      this.ball.vy -= 2 * dot * ny * 0.8;
    }
  }

  private holeComplete() {
    if (this.currentHole >= TOTAL_HOLES) {
      this.status = "complete";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    } else {
      this.currentHole++;
      this.loadHole();
      this.status = "playing";
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Green background
    ctx.fillStyle = "#2d5a27";
    ctx.fillRect(0, 0, w, h);

    // Grass texture
    ctx.strokeStyle = "rgba(0, 100, 0, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "#1a3a17";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);

    // Draw hole
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hole flag
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(this.hole.x, this.hole.y - 40);
    ctx.lineTo(this.hole.x + 20, this.hole.y - 30);
    ctx.lineTo(this.hole.x, this.hole.y - 20);
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.hole.x, this.hole.y);
    ctx.lineTo(this.hole.x, this.hole.y - 40);
    ctx.stroke();

    // Draw obstacles
    this.obstacles.forEach((obs) => {
      ctx.fillStyle = "#8b4513";

      if (obs.type === "rect") {
        ctx.fillRect(obs.x!, obs.y!, obs.width!, obs.height!);
        ctx.strokeStyle = "#5d2e0a";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x!, obs.y!, obs.width!, obs.height!);
      } else {
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius!, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5d2e0a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw ball
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw aim line
    if (this.isDragging) {
      const dx = this.dragStartX - this.dragEndX;
      const dy = this.dragStartY - this.dragEndY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist / 10, MAX_POWER);

      // Power indicator
      ctx.strokeStyle = power > MAX_POWER * 0.7 ? "#ff4444" : "#ffff00";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.ball.x, this.ball.y);
      ctx.lineTo(this.ball.x + dx * 0.5, this.ball.y + dy * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power bar
      const barWidth = 100;
      const barHeight = 10;
      const barX = this.ball.x - barWidth / 2;
      const barY = this.ball.y + 30;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = power > MAX_POWER * 0.7 ? "#ff4444" : "#44ff44";
      ctx.fillRect(barX, barY, (power / MAX_POWER) * barWidth, barHeight);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
