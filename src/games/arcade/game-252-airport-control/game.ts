/**
 * Airport Control Game Engine
 * Game #252
 *
 * Guide planes to safe landings on the correct runways
 */

interface Plane {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetRunway: number;
  color: string;
  path: { x: number; y: number }[];
  pathIndex: number;
  landed: boolean;
  crashed: boolean;
}

interface Runway {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  color: string;
  label: string;
}

interface GameState {
  score: number;
  highScore: number;
  landed: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const RUNWAY_COLORS = ["#e74c3c", "#3498db", "#2ecc71"];

export class AirportControlGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private planes: Plane[] = [];
  private runways: Runway[] = [];
  private selectedPlane: Plane | null = null;
  private drawingPath: { x: number; y: number }[] = [];
  private score = 0;
  private highScore = 0;
  private landed = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private planeIdCounter = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("airport_control_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("airport_control_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        landed: this.landed,
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.initRunways();
    this.draw();
  }

  private initRunways() {
    this.runways = [
      {
        x: this.width / 2 - 80,
        y: this.height - 60,
        width: 100,
        height: 20,
        angle: 0,
        color: RUNWAY_COLORS[0],
        label: "A",
      },
      {
        x: this.width / 2 + 30,
        y: this.height - 100,
        width: 100,
        height: 20,
        angle: -0.3,
        color: RUNWAY_COLORS[1],
        label: "B",
      },
      {
        x: this.width / 2 - 50,
        y: this.height - 140,
        width: 100,
        height: 20,
        angle: 0.2,
        color: RUNWAY_COLORS[2],
        label: "C",
      },
    ];
  }

  handlePointerDown(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking a plane
    for (const plane of this.planes) {
      if (plane.landed || plane.crashed) continue;
      const dx = x - plane.x;
      const dy = y - plane.y;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        this.selectedPlane = plane;
        this.drawingPath = [{ x, y }];
        return;
      }
    }
  }

  handlePointerMove(x: number, y: number) {
    if (this.selectedPlane && this.drawingPath.length > 0) {
      const last = this.drawingPath[this.drawingPath.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        this.drawingPath.push({ x, y });
      }
    }
  }

  handlePointerUp() {
    if (this.selectedPlane && this.drawingPath.length > 1) {
      this.selectedPlane.path = [...this.drawingPath];
      this.selectedPlane.pathIndex = 0;
    }
    this.selectedPlane = null;
    this.drawingPath = [];
  }

  start() {
    this.score = 0;
    this.landed = 0;
    this.planes = [];
    this.spawnTimer = 0;
    this.planeIdCounter = 0;
    this.initRunways();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Spawn planes
    this.spawnTimer += dt;
    const spawnInterval = Math.max(2000, 5000 - this.landed * 100);

    if (this.spawnTimer >= spawnInterval && this.planes.filter((p) => !p.landed && !p.crashed).length < 5) {
      this.spawnPlane();
      this.spawnTimer = 0;
    }

    // Update planes
    for (const plane of this.planes) {
      if (plane.landed || plane.crashed) continue;

      // Follow path
      if (plane.path.length > 0 && plane.pathIndex < plane.path.length) {
        const target = plane.path[plane.pathIndex];
        const dx = target.x - plane.x;
        const dy = target.y - plane.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
          plane.pathIndex++;
        } else {
          plane.angle = Math.atan2(dy, dx);
        }
      }

      // Move plane
      plane.x += Math.cos(plane.angle) * plane.speed;
      plane.y += Math.sin(plane.angle) * plane.speed;

      // Check runway landing
      for (let i = 0; i < this.runways.length; i++) {
        const runway = this.runways[i];
        if (this.checkLanding(plane, runway)) {
          if (plane.targetRunway === i) {
            // Correct landing
            plane.landed = true;
            this.landed++;
            this.score += 100;

            if (this.score > this.highScore) {
              this.highScore = this.score;
              this.saveHighScore();
            }
            this.emitState();
          } else {
            // Wrong runway
            plane.crashed = true;
            this.gameOver();
            return;
          }
        }
      }

      // Check collisions
      for (const other of this.planes) {
        if (other === plane || other.landed || other.crashed) continue;
        const dx = other.x - plane.x;
        const dy = other.y - plane.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          plane.crashed = true;
          other.crashed = true;
          this.gameOver();
          return;
        }
      }

      // Check out of bounds
      if (plane.x < -50 || plane.x > this.width + 50 || plane.y < -50 || plane.y > this.height + 50) {
        plane.crashed = true;
        this.gameOver();
        return;
      }
    }
  }

  private checkLanding(plane: Plane, runway: Runway): boolean {
    const cx = runway.x + runway.width / 2;
    const cy = runway.y + runway.height / 2;

    const dx = plane.x - cx;
    const dy = plane.y - cy;

    // Check if plane is near runway
    if (Math.abs(dx) < runway.width / 2 + 10 && Math.abs(dy) < 20) {
      // Check angle
      const angleDiff = Math.abs(plane.angle - runway.angle);
      return angleDiff < 0.5 || angleDiff > Math.PI * 2 - 0.5;
    }
    return false;
  }

  private spawnPlane() {
    const targetRunway = Math.floor(Math.random() * this.runways.length);
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number, angle: number;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.width;
        y = -20;
        angle = Math.PI / 2;
        break;
      case 1: // Right
        x = this.width + 20;
        y = Math.random() * (this.height * 0.6);
        angle = Math.PI;
        break;
      case 2: // Left
        x = -20;
        y = Math.random() * (this.height * 0.6);
        angle = 0;
        break;
      default: // Top corners
        x = Math.random() > 0.5 ? 0 : this.width;
        y = -20;
        angle = Math.PI / 2 + (x === 0 ? 0.3 : -0.3);
    }

    this.planes.push({
      id: this.planeIdCounter++,
      x,
      y,
      angle,
      speed: 1.5 + Math.random() * 0.5,
      targetRunway,
      color: RUNWAY_COLORS[targetRunway],
      path: [],
      pathIndex: 0,
      landed: false,
      crashed: false,
    });
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;

    // Sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.7, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    ctx.fillStyle = "white";
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % this.width;
      const y = (i * 41) % (this.height * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = "#2d4a22";
    ctx.fillRect(0, this.height - 180, this.width, 180);

    // Draw runways
    for (const runway of this.runways) {
      this.drawRunway(runway);
    }

    // Draw paths
    for (const plane of this.planes) {
      if (plane.path.length > 1 && !plane.landed && !plane.crashed) {
        ctx.strokeStyle = plane.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(plane.x, plane.y);
        for (let i = plane.pathIndex; i < plane.path.length; i++) {
          ctx.lineTo(plane.path[i].x, plane.path[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw drawing path
    if (this.drawingPath.length > 1) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.drawingPath[0].x, this.drawingPath[0].y);
      for (const point of this.drawingPath) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    // Draw planes
    for (const plane of this.planes) {
      this.drawPlane(plane);
    }
  }

  private drawRunway(runway: Runway) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(runway.x + runway.width / 2, runway.y + runway.height / 2);
    ctx.rotate(runway.angle);

    // Runway base
    ctx.fillStyle = "#333";
    ctx.fillRect(-runway.width / 2, -runway.height / 2, runway.width, runway.height);

    // Runway markings
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(-runway.width / 2 + 10, 0);
    ctx.lineTo(runway.width / 2 - 10, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Color indicator
    ctx.fillStyle = runway.color;
    ctx.fillRect(-runway.width / 2, -runway.height / 2, 10, runway.height);

    // Label
    ctx.fillStyle = "white";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(runway.label, 0, 5);

    ctx.restore();
  }

  private drawPlane(plane: Plane) {
    const ctx = this.ctx;

    if (plane.landed) return;

    ctx.save();
    ctx.translate(plane.x, plane.y);
    ctx.rotate(plane.angle);

    if (plane.crashed) {
      // Explosion
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Plane body
      ctx.fillStyle = plane.color;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      // Wings
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(-5, -15, 8, 30);

      // Highlight
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(10, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Selection ring
    if (this.selectedPlane === plane) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(plane.x, plane.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
