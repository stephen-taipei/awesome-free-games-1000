/**
 * Slingshot Game
 * Game #169 - Physics-based slingshot shooting
 */

interface Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

interface Target {
  x: number;
  y: number;
  radius: number;
  points: number;
  hit: boolean;
  color: string;
  colorRGBA: number[];
}

export interface PendingEvents {
  launch: { x: number; y: number; power: number }[];
  trail: { x: number; y: number }[];
  targetHit: { x: number; y: number; points: number; color: number[] }[];
  miss: { x: number; y: number }[];
  gameOver: { x: number; y: number; victory: boolean }[];
  start: boolean;
}

export class SlingshotGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private shotsLeft: number = 10;
  private totalShots: number = 10;
  private status: "idle" | "playing" | "over" = "idle";
  private stone: Stone;
  private targets: Target[] = [];
  private slingshotX: number = 0;
  private slingshotY: number = 0;
  private dragging: boolean = false;
  private dragX: number = 0;
  private dragY: number = 0;
  private gravity: number = 0.3;
  private animationId: number = 0;
  private trailTimer: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  public pendingEvents: PendingEvents = {
    launch: [],
    trail: [],
    targetHit: [],
    miss: [],
    gameOver: [],
    start: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.stone = { x: 0, y: 0, vx: 0, vy: 0, radius: 12, active: false };
  }

  public clearPendingEvents() {
    this.pendingEvents = {
      launch: [],
      trail: [],
      targetHit: [],
      miss: [],
      gameOver: [],
      start: false,
    };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.slingshotX = 80;
    this.slingshotY = this.height - 100;
    this.resetStone();

    this.draw();
  }

  public start() {
    this.score = 0;
    this.shotsLeft = this.totalShots;
    this.status = "playing";
    this.generateTargets();
    this.resetStone();

    this.pendingEvents.start = true;
    this.emitState();
    this.loop();
  }

  private hexToRGBA(hex: string): number[] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1.0];
  }

  private generateTargets() {
    this.targets = [];
    const targetCount = 8;
    const colors = ["#e74c3c", "#f39c12", "#9b59b6", "#3498db", "#1abc9c"];

    for (let i = 0; i < targetCount; i++) {
      const x = 200 + Math.random() * (this.width - 280);
      const y = 80 + Math.random() * (this.height * 0.5);
      const radius = 20 + Math.random() * 20;
      const points = Math.round((40 - radius) / 2) * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.targets.push({
        x,
        y,
        radius,
        points,
        hit: false,
        color,
        colorRGBA: this.hexToRGBA(color),
      });
    }
  }

  private resetStone() {
    this.stone.x = this.slingshotX;
    this.stone.y = this.slingshotY;
    this.stone.vx = 0;
    this.stone.vy = 0;
    this.stone.active = false;
    this.dragX = this.slingshotX;
    this.dragY = this.slingshotY;
    this.trailTimer = 0;
  }

  private loop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    if (!this.stone.active) return;

    this.stone.vy += this.gravity;
    this.stone.x += this.stone.vx;
    this.stone.y += this.stone.vy;

    // Stone trail
    this.trailTimer += 1 / 60;
    if (this.trailTimer > 0.03) {
      this.trailTimer = 0;
      this.pendingEvents.trail.push({
        x: this.stone.x / this.width,
        y: this.stone.y / this.height,
      });
    }

    // Check target collisions
    for (const target of this.targets) {
      if (target.hit) continue;

      const dx = this.stone.x - target.x;
      const dy = this.stone.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.stone.radius + target.radius) {
        target.hit = true;
        this.score += target.points;

        this.pendingEvents.targetHit.push({
          x: target.x / this.width,
          y: target.y / this.height,
          points: target.points,
          color: target.colorRGBA,
        });

        this.emitState();
      }
    }

    // Check if stone is off screen
    if (
      this.stone.y > this.height + 50 ||
      this.stone.x > this.width + 50 ||
      this.stone.x < -50
    ) {
      // Emit miss if no target was hit during this shot
      this.pendingEvents.miss.push({
        x: Math.min(Math.max(this.stone.x, 0), this.width) / this.width,
        y: 0.9,
      });

      if (this.shotsLeft > 0) {
        this.resetStone();
      } else {
        this.endGame();
      }
    }
  }

  private endGame() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const victory = this.score >= 300;
    this.pendingEvents.gameOver.push({
      x: 0.5,
      y: 0.5,
      victory,
    });

    this.emitState();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw targets
    for (const target of this.targets) {
      if (target.hit) continue;

      // Target shadow
      this.ctx.beginPath();
      this.ctx.arc(target.x + 3, target.y + 3, target.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(0,0,0,0.2)";
      this.ctx.fill();

      // Main target
      this.ctx.beginPath();
      this.ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = target.color;
      this.ctx.fill();
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Target rings
      this.ctx.beginPath();
      this.ctx.arc(target.x, target.y, target.radius * 0.6, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(255,255,255,0.6)";
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(target.x, target.y, target.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = "rgba(255,255,255,0.8)";
      this.ctx.fill();

      // Points text
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 12px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`${target.points}`, target.x, target.y + target.radius + 15);
    }

    // Draw slingshot
    this.drawSlingshot();

    // Draw trajectory guide
    if (this.dragging && !this.stone.active) {
      this.drawTrajectory();
    }

    // Draw stone with shadow
    const stoneX = this.dragging && !this.stone.active ? this.dragX : this.stone.x;
    const stoneY = this.dragging && !this.stone.active ? this.dragY : this.stone.y;

    // Shadow
    this.ctx.beginPath();
    this.ctx.arc(stoneX + 2, stoneY + 2, this.stone.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.ctx.fill();

    // Stone gradient
    const stoneGradient = this.ctx.createRadialGradient(
      stoneX - 3, stoneY - 3, 0,
      stoneX, stoneY, this.stone.radius
    );
    stoneGradient.addColorStop(0, "#95a5a6");
    stoneGradient.addColorStop(0.5, "#7f8c8d");
    stoneGradient.addColorStop(1, "#5d6d7e");

    this.ctx.beginPath();
    this.ctx.arc(stoneX, stoneY, this.stone.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = stoneGradient;
    this.ctx.fill();
    this.ctx.strokeStyle = "#4a5568";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawSlingshot() {
    // Fork base with wood texture
    const woodGradient = this.ctx.createLinearGradient(
      this.slingshotX - 10, this.slingshotY,
      this.slingshotX + 10, this.slingshotY
    );
    woodGradient.addColorStop(0, "#8b4513");
    woodGradient.addColorStop(0.5, "#a0522d");
    woodGradient.addColorStop(1, "#8b4513");

    this.ctx.fillStyle = woodGradient;
    this.ctx.fillRect(this.slingshotX - 8, this.slingshotY, 16, 60);

    // Left fork
    this.ctx.beginPath();
    this.ctx.moveTo(this.slingshotX - 8, this.slingshotY);
    this.ctx.lineTo(this.slingshotX - 25, this.slingshotY - 40);
    this.ctx.lineTo(this.slingshotX - 15, this.slingshotY - 40);
    this.ctx.lineTo(this.slingshotX - 8, this.slingshotY - 10);
    this.ctx.fillStyle = woodGradient;
    this.ctx.fill();

    // Right fork
    this.ctx.beginPath();
    this.ctx.moveTo(this.slingshotX + 8, this.slingshotY);
    this.ctx.lineTo(this.slingshotX + 25, this.slingshotY - 40);
    this.ctx.lineTo(this.slingshotX + 15, this.slingshotY - 40);
    this.ctx.lineTo(this.slingshotX + 8, this.slingshotY - 10);
    this.ctx.fillStyle = woodGradient;
    this.ctx.fill();

    // Elastic bands
    const bandY = this.slingshotY - 35;
    const stoneX = this.dragging && !this.stone.active ? this.dragX : this.slingshotX;
    const stoneY = this.dragging && !this.stone.active ? this.dragY : this.slingshotY;

    this.ctx.strokeStyle = "#c0392b";
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = "round";

    // Left band
    this.ctx.beginPath();
    this.ctx.moveTo(this.slingshotX - 20, bandY);
    this.ctx.lineTo(stoneX - this.stone.radius, stoneY);
    this.ctx.stroke();

    // Right band
    this.ctx.beginPath();
    this.ctx.moveTo(this.slingshotX + 20, bandY);
    this.ctx.lineTo(stoneX + this.stone.radius, stoneY);
    this.ctx.stroke();
  }

  private drawTrajectory() {
    const dx = this.slingshotX - this.dragX;
    const dy = this.slingshotY - this.dragY;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 100) / 8;
    const angle = Math.atan2(dy, dx);

    let vx = Math.cos(angle) * power;
    let vy = Math.sin(angle) * power;
    let x = this.dragX;
    let y = this.dragY;

    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = "rgba(255,255,255,0.6)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    for (let i = 0; i < 30; i++) {
      vy += this.gravity;
      x += vx;
      y += vy;
      this.ctx.lineTo(x, y);
      if (y > this.height) break;
    }

    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  public handleMouseDown(x: number, y: number) {
    if (this.status !== "playing" || this.stone.active) return;

    const dx = x - this.slingshotX;
    const dy = y - this.slingshotY;
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      this.dragging = true;
      this.dragX = x;
      this.dragY = y;
    }
  }

  public handleMouseMove(x: number, y: number) {
    if (!this.dragging || this.stone.active) return;

    const dx = x - this.slingshotX;
    const dy = y - this.slingshotY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 100;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      this.dragX = this.slingshotX + Math.cos(angle) * maxDist;
      this.dragY = this.slingshotY + Math.sin(angle) * maxDist;
    } else {
      this.dragX = x;
      this.dragY = y;
    }
  }

  public handleMouseUp() {
    if (!this.dragging || this.stone.active) return;

    const dx = this.slingshotX - this.dragX;
    const dy = this.slingshotY - this.dragY;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 100) / 8;

    if (power > 1) {
      const angle = Math.atan2(dy, dx);
      this.stone.x = this.dragX;
      this.stone.y = this.dragY;
      this.stone.vx = Math.cos(angle) * power;
      this.stone.vy = Math.sin(angle) * power;
      this.stone.active = true;
      this.shotsLeft--;

      this.pendingEvents.launch.push({
        x: this.slingshotX / this.width,
        y: this.slingshotY / this.height,
        power: power / 12.5,
      });

      this.emitState();
    }

    this.dragging = false;
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        shots: this.shotsLeft,
        status: this.status,
      });
    }
  }
}
