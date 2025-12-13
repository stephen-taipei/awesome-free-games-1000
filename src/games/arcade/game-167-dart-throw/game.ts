/**
 * Dart Throw Game
 * Game #167 - Canvas aim and throw darts
 */

interface Dart {
  x: number;
  y: number;
  score: number;
}

export class DartThrowGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private round: number = 1;
  private dartsLeft: number = 3;
  private totalRounds: number = 5;
  private status: "idle" | "playing" | "throwing" | "over" = "idle";
  private darts: Dart[] = [];
  private aimX: number = 0;
  private aimY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private targetRadius: number = 150;
  private throwingDart: { x: number; y: number; z: number; vz: number } | null = null;
  private animationId: number = 0;
  private wobbleTime: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.targetX = this.width / 2;
    this.targetY = this.height / 2;
    this.aimX = this.targetX;
    this.aimY = this.targetY;

    this.draw();
  }

  public start() {
    this.score = 0;
    this.round = 1;
    this.dartsLeft = 3;
    this.darts = [];
    this.status = "playing";
    this.throwingDart = null;
    this.wobbleTime = 0;

    this.emitState();
    this.loop();
  }

  private loop = () => {
    if (this.status === "over" || this.status === "idle") return;

    this.wobbleTime += 0.05;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    // Natural aim wobble
    if (this.status === "playing") {
      const wobbleX = Math.sin(this.wobbleTime * 2) * 8 + Math.sin(this.wobbleTime * 5) * 4;
      const wobbleY = Math.cos(this.wobbleTime * 2.5) * 8 + Math.cos(this.wobbleTime * 4) * 4;
      this.aimX = this.targetX + wobbleX;
      this.aimY = this.targetY + wobbleY;
    }

    // Animate throwing dart
    if (this.status === "throwing" && this.throwingDart) {
      this.throwingDart.z += this.throwingDart.vz;
      this.throwingDart.vz -= 0.5;

      if (this.throwingDart.z <= 0) {
        this.landDart();
      }
    }
  }

  private landDart() {
    if (!this.throwingDart) return;

    const dx = this.throwingDart.x - this.targetX;
    const dy = this.throwingDart.y - this.targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let dartScore = 0;
    if (dist < this.targetRadius * 0.1) dartScore = 50;
    else if (dist < this.targetRadius * 0.25) dartScore = 25;
    else if (dist < this.targetRadius * 0.45) dartScore = 20;
    else if (dist < this.targetRadius * 0.65) dartScore = 15;
    else if (dist < this.targetRadius * 0.85) dartScore = 10;
    else if (dist < this.targetRadius) dartScore = 5;

    this.darts.push({
      x: this.throwingDart.x,
      y: this.throwingDart.y,
      score: dartScore,
    });

    this.score += dartScore;
    this.dartsLeft--;
    this.throwingDart = null;

    if (this.dartsLeft <= 0) {
      if (this.round < this.totalRounds) {
        this.round++;
        this.dartsLeft = 3;
        this.darts = [];
      } else {
        this.endGame();
        return;
      }
    }

    this.status = "playing";
    this.emitState();
  }

  private endGame() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw dartboard
    this.drawDartboard();

    // Draw landed darts
    this.darts.forEach((dart) => this.drawDart(dart.x, dart.y, dart.score));

    // Draw throwing dart
    if (this.status === "throwing" && this.throwingDart) {
      const scale = 1 + this.throwingDart.z / 100;
      this.drawDart(
        this.throwingDart.x,
        this.throwingDart.y - this.throwingDart.z,
        0,
        scale
      );
    }

    // Draw aim crosshair
    if (this.status === "playing") {
      this.ctx.strokeStyle = "#e74c3c";
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      this.ctx.moveTo(this.aimX - 15, this.aimY);
      this.ctx.lineTo(this.aimX + 15, this.aimY);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(this.aimX, this.aimY - 15);
      this.ctx.lineTo(this.aimX, this.aimY + 15);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(this.aimX, this.aimY, 10, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawDartboard() {
    const rings = [
      { radius: 1, color: "#e74c3c", score: 50 },
      { radius: 0.25, color: "#2ecc71", score: 25 },
      { radius: 0.45, color: "#e74c3c", score: 20 },
      { radius: 0.65, color: "#ecf0f1", score: 15 },
      { radius: 0.85, color: "#e74c3c", score: 10 },
      { radius: 1, color: "#2c3e50", score: 5 },
    ];

    // Draw from outside in
    for (let i = rings.length - 1; i >= 0; i--) {
      this.ctx.beginPath();
      this.ctx.arc(
        this.targetX,
        this.targetY,
        this.targetRadius * rings[i].radius,
        0,
        Math.PI * 2
      );
      this.ctx.fillStyle = rings[i].color;
      this.ctx.fill();
    }

    // Draw ring borders
    this.ctx.strokeStyle = "#1a252f";
    this.ctx.lineWidth = 2;
    rings.forEach((ring) => {
      this.ctx.beginPath();
      this.ctx.arc(
        this.targetX,
        this.targetY,
        this.targetRadius * ring.radius,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    });

    // Draw center bullseye
    this.ctx.beginPath();
    this.ctx.arc(this.targetX, this.targetY, this.targetRadius * 0.1, 0, Math.PI * 2);
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.fill();
    this.ctx.strokeStyle = "#c0392b";
    this.ctx.stroke();
  }

  private drawDart(x: number, y: number, score: number, scale: number = 1) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);

    // Dart body
    this.ctx.fillStyle = "#7f8c8d";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(5, 10);
    this.ctx.lineTo(-5, 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Dart tip
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -25);
    this.ctx.lineTo(2, -20);
    this.ctx.lineTo(-2, -20);
    this.ctx.closePath();
    this.ctx.fill();

    // Dart flights
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.beginPath();
    this.ctx.moveTo(0, 10);
    this.ctx.lineTo(10, 20);
    this.ctx.lineTo(0, 15);
    this.ctx.lineTo(-10, 20);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    // Score popup
    if (score > 0) {
      this.ctx.fillStyle = "#f1c40f";
      this.ctx.font = "bold 14px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`+${score}`, x, y - 30);
    }
  }

  public handleClick() {
    if (this.status !== "playing") return;

    this.status = "throwing";
    this.throwingDart = {
      x: this.aimX,
      y: this.aimY,
      z: 50,
      vz: 5,
    };
  }

  public handleMouseMove(x: number, y: number) {
    if (this.status !== "playing") return;

    // Allow some control over aim, but with wobble
    const dx = x - this.targetX;
    const dy = y - this.targetY;
    const clampDist = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
    const angle = Math.atan2(dy, dx);

    this.targetX = this.width / 2 + Math.cos(angle) * clampDist * 0.3;
    this.targetY = this.height / 2 + Math.sin(angle) * clampDist * 0.3;
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
        round: this.round,
        dartsLeft: this.dartsLeft,
        status: this.status,
      });
    }
  }
}
