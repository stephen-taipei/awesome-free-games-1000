/**
 * Basketball Arcade Game
 * Game #166 - Physics-based basketball shooting
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

interface Hoop {
  x: number;
  y: number;
  width: number;
  rimY: number;
}

export class BasketballArcadeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private ball: Ball;
  private hoop: Hoop;
  private score: number = 0;
  private timeLeft: number = 60;
  private status: "idle" | "playing" | "over" = "idle";
  private dragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragEnd: { x: number; y: number } | null = null;
  private gravity: number = 0.4;
  private animationId: number = 0;
  private lastTime: number = 0;
  private timerInterval: number = 0;
  private scored: boolean = false;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ball = this.createBall();
    this.hoop = { x: 0, y: 0, width: 80, rimY: 0 };
  }

  private createBall(): Ball {
    return {
      x: 100,
      y: this.height - 80,
      vx: 0,
      vy: 0,
      radius: 20,
      active: false,
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

    this.ball.x = 100;
    this.ball.y = this.height - 80;
    this.hoop.x = this.width - 100;
    this.hoop.y = 120;
    this.hoop.rimY = this.hoop.y + 40;

    this.draw();
  }

  public start() {
    this.score = 0;
    this.timeLeft = 60;
    this.status = "playing";
    this.resetBall();
    this.scored = false;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.status === "playing") {
        this.timeLeft--;
        this.emitState();
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }
    }, 1000);

    this.emitState();
    this.lastTime = performance.now();
    this.loop();
  }

  private resetBall() {
    this.ball.x = 100;
    this.ball.y = this.height - 80;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.active = false;
    this.scored = false;
  }

  private endGame() {
    this.status = "over";
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private loop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    if (!this.ball.active) return;

    this.ball.vy += this.gravity;
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Check rim collision
    const rimLeft = this.hoop.x - this.hoop.width / 2;
    const rimRight = this.hoop.x + this.hoop.width / 2;
    const rimY = this.hoop.rimY;

    // Score detection - ball passes through hoop from above
    if (
      !this.scored &&
      this.ball.vy > 0 &&
      this.ball.x > rimLeft + 10 &&
      this.ball.x < rimRight - 10 &&
      this.ball.y > rimY - 10 &&
      this.ball.y < rimY + 20
    ) {
      this.scored = true;
      this.score += this.getPoints();
      this.emitState();
    }

    // Rim bounce
    const rimRadius = 8;
    const leftRim = { x: rimLeft, y: rimY };
    const rightRim = { x: rimRight, y: rimY };

    this.checkRimCollision(leftRim, rimRadius);
    this.checkRimCollision(rightRim, rimRadius);

    // Backboard collision
    const backboardX = this.hoop.x + this.hoop.width / 2 + 10;
    const backboardTop = this.hoop.y - 20;
    const backboardBottom = this.hoop.rimY + 30;

    if (
      this.ball.x + this.ball.radius > backboardX &&
      this.ball.y > backboardTop &&
      this.ball.y < backboardBottom
    ) {
      this.ball.x = backboardX - this.ball.radius;
      this.ball.vx *= -0.6;
    }

    // Reset if ball goes off screen
    if (
      this.ball.y > this.height + 50 ||
      this.ball.x < -50 ||
      this.ball.x > this.width + 50
    ) {
      this.resetBall();
    }
  }

  private checkRimCollision(rim: { x: number; y: number }, rimRadius: number) {
    const dx = this.ball.x - rim.x;
    const dy = this.ball.y - rim.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.ball.radius + rimRadius;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      this.ball.x += nx * overlap;
      this.ball.y += ny * overlap;

      const dot = this.ball.vx * nx + this.ball.vy * ny;
      this.ball.vx = (this.ball.vx - 2 * dot * nx) * 0.7;
      this.ball.vy = (this.ball.vy - 2 * dot * ny) * 0.7;
    }
  }

  private getPoints(): number {
    const dist = Math.abs(this.ball.x - 100);
    if (dist > this.width * 0.6) return 3;
    return 2;
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw court lines
    this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height - 20);
    this.ctx.lineTo(this.width, this.height - 20);
    this.ctx.stroke();

    // Draw 3-point line
    this.ctx.strokeStyle = "rgba(255,200,0,0.3)";
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.4, 0);
    this.ctx.lineTo(this.width * 0.4, this.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw backboard
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(
      this.hoop.x + this.hoop.width / 2 + 5,
      this.hoop.y - 30,
      8,
      80
    );

    // Draw hoop
    this.ctx.strokeStyle = "#ff6b35";
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(this.hoop.x - this.hoop.width / 2, this.hoop.rimY);
    this.ctx.lineTo(this.hoop.x + this.hoop.width / 2, this.hoop.rimY);
    this.ctx.stroke();

    // Draw net
    this.ctx.strokeStyle = "rgba(255,255,255,0.5)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x =
        this.hoop.x - this.hoop.width / 2 + (i * this.hoop.width) / 6;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.hoop.rimY);
      this.ctx.lineTo(this.hoop.x, this.hoop.rimY + 40);
      this.ctx.stroke();
    }

    // Draw aim line
    if (this.dragging && this.dragStart && this.dragEnd) {
      const dx = this.dragStart.x - this.dragEnd.x;
      const dy = this.dragStart.y - this.dragEnd.y;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy), 150);

      this.ctx.strokeStyle = `rgba(255, 107, 53, ${power / 150})`;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.ball.x, this.ball.y);
      this.ctx.lineTo(this.ball.x + dx * 2, this.ball.y + dy * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Power indicator
      this.ctx.fillStyle = "#ff6b35";
      this.ctx.fillRect(20, this.height - 40, (power / 150) * 100, 10);
      this.ctx.strokeStyle = "#fff";
      this.ctx.strokeRect(20, this.height - 40, 100, 10);
    }

    // Draw ball
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#f39c12";
    this.ctx.fill();

    // Ball lines
    this.ctx.strokeStyle = "#c0392b";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.ball.x - this.ball.radius, this.ball.y);
    this.ctx.lineTo(this.ball.x + this.ball.radius, this.ball.y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.ball.x, this.ball.y - this.ball.radius);
    this.ctx.lineTo(this.ball.x, this.ball.y + this.ball.radius);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public handleMouseDown(x: number, y: number) {
    if (this.status !== "playing" || this.ball.active) return;

    const dx = x - this.ball.x;
    const dy = y - this.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.ball.radius + 30) {
      this.dragging = true;
      this.dragStart = { x, y };
      this.dragEnd = { x, y };
    }
  }

  public handleMouseMove(x: number, y: number) {
    if (!this.dragging) return;
    this.dragEnd = { x, y };
    this.draw();
  }

  public handleMouseUp() {
    if (!this.dragging || !this.dragStart || !this.dragEnd) return;

    const dx = this.dragStart.x - this.dragEnd.x;
    const dy = this.dragStart.y - this.dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 150) / 10;

    if (power > 1) {
      const angle = Math.atan2(dy, dx);
      this.ball.vx = Math.cos(angle) * power;
      this.ball.vy = Math.sin(angle) * power;
      this.ball.active = true;
    }

    this.dragging = false;
    this.dragStart = null;
    this.dragEnd = null;
  }

  public reset() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
        time: this.timeLeft,
        status: this.status,
      });
    }
  }
}
