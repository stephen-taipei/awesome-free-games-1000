/**
 * Bowling Game
 * Game #170 - Physics-based 2D bowling
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  spin: number;
}

interface Pin {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  fallen: boolean;
  angle: number;
}

export class BowlingGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private frame: number = 1;
  private throwsInFrame: number = 0;
  private totalFrames: number = 5;
  private pinsKnockedFirst: number = 0;
  private status: "idle" | "playing" | "rolling" | "over" = "idle";
  private ball: Ball;
  private pins: Pin[] = [];
  private dragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragEnd: { x: number; y: number } | null = null;
  private laneWidth: number = 200;
  private animationId: number = 0;
  private message: string = "";
  private messageTimeout: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 18, active: false, spin: 0 };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.resetBall();
    this.setupPins();
    this.draw();
  }

  public start() {
    this.score = 0;
    this.frame = 1;
    this.throwsInFrame = 0;
    this.pinsKnockedFirst = 0;
    this.status = "playing";
    this.message = "";
    this.resetBall();
    this.setupPins();

    this.emitState();
    this.loop();
  }

  private resetBall() {
    this.ball.x = this.width / 2;
    this.ball.y = this.height - 60;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.active = false;
    this.ball.spin = 0;
  }

  private setupPins() {
    this.pins = [];
    const startX = this.width / 2;
    const startY = 100;
    const spacing = 30;

    // Triangle formation: 1-2-3-4
    const rows = [
      [0],
      [-0.5, 0.5],
      [-1, 0, 1],
      [-1.5, -0.5, 0.5, 1.5],
    ];

    rows.forEach((row, rowIndex) => {
      row.forEach((offset) => {
        this.pins.push({
          x: startX + offset * spacing,
          y: startY + rowIndex * spacing,
          radius: 10,
          vx: 0,
          vy: 0,
          fallen: false,
          angle: 0,
        });
      });
    });
  }

  private loop = () => {
    if (this.status === "over" || this.status === "idle") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    if (!this.ball.active) return;

    // Apply spin effect
    this.ball.vx += this.ball.spin * 0.02;
    this.ball.spin *= 0.98;

    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Lane boundaries
    const laneLeft = (this.width - this.laneWidth) / 2;
    const laneRight = (this.width + this.laneWidth) / 2;

    // Gutter check
    if (this.ball.x - this.ball.radius < laneLeft || this.ball.x + this.ball.radius > laneRight) {
      this.ball.vx = 0;
      this.ball.vy *= 0.95;
    }

    // Check pin collisions
    for (const pin of this.pins) {
      if (pin.fallen) continue;

      const dx = this.ball.x - pin.x;
      const dy = this.ball.y - pin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.ball.radius + pin.radius;

      if (dist < minDist) {
        // Collision response
        const nx = dx / dist;
        const ny = dy / dist;

        pin.vx = this.ball.vx * 0.6 + nx * 3;
        pin.vy = this.ball.vy * 0.6 + ny * 3;
        pin.fallen = true;

        this.ball.vx *= 0.8;
        this.ball.vy *= 0.9;
      }
    }

    // Update fallen pins
    for (const pin of this.pins) {
      if (pin.fallen) {
        pin.x += pin.vx;
        pin.y += pin.vy;
        pin.vx *= 0.95;
        pin.vy *= 0.95;
        pin.angle += pin.vx * 0.1;

        // Pin-pin collisions
        for (const other of this.pins) {
          if (other === pin) continue;

          const dx = other.x - pin.x;
          const dy = other.y - pin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < pin.radius * 2 && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            if (!other.fallen) {
              other.fallen = true;
              other.vx = pin.vx * 0.5 + nx * 2;
              other.vy = pin.vy * 0.5 + ny * 2;
            }
          }
        }
      }
    }

    // Check if ball stopped or off screen
    if (this.ball.y < -50 || Math.abs(this.ball.vy) < 0.5) {
      this.endThrow();
    }
  }

  private endThrow() {
    this.ball.active = false;
    const knockedDown = this.pins.filter((p) => p.fallen).length;

    if (this.throwsInFrame === 0) {
      this.pinsKnockedFirst = knockedDown;
      this.score += knockedDown;

      if (knockedDown === 10) {
        this.showMessage("game.strike");
        this.nextFrame();
      } else {
        this.throwsInFrame = 1;
        this.resetBall();
      }
    } else {
      const knockedSecond = knockedDown - this.pinsKnockedFirst;
      this.score += knockedSecond;

      if (knockedDown === 10) {
        this.showMessage("game.spare");
      }
      this.nextFrame();
    }

    this.emitState();
  }

  private nextFrame() {
    this.throwsInFrame = 0;
    this.pinsKnockedFirst = 0;

    if (this.frame >= this.totalFrames) {
      this.endGame();
      return;
    }

    this.frame++;
    this.resetBall();
    this.setupPins();
    this.emitState();
  }

  private showMessage(key: string) {
    this.message = key;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = window.setTimeout(() => {
      this.message = "";
    }, 1500);
  }

  private endGame() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw lane
    const laneLeft = (this.width - this.laneWidth) / 2;

    // Lane background
    this.ctx.fillStyle = "#c19a6b";
    this.ctx.fillRect(laneLeft, 0, this.laneWidth, this.height);

    // Lane boards
    this.ctx.strokeStyle = "#a0784a";
    this.ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = laneLeft + (i * this.laneWidth) / 8;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Gutters
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.fillRect(laneLeft - 20, 0, 20, this.height);
    this.ctx.fillRect(laneLeft + this.laneWidth, 0, 20, this.height);

    // Foul line
    this.ctx.strokeStyle = "#e74c3c";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(laneLeft, this.height - 120);
    this.ctx.lineTo(laneLeft + this.laneWidth, this.height - 120);
    this.ctx.stroke();

    // Arrows
    this.ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let i = 0; i < 5; i++) {
      const x = laneLeft + this.laneWidth / 2 + (i - 2) * 30;
      const y = this.height - 200;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x - 8, y + 20);
      this.ctx.lineTo(x + 8, y + 20);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Draw pins
    for (const pin of this.pins) {
      this.ctx.save();
      this.ctx.translate(pin.x, pin.y);
      this.ctx.rotate(pin.angle);

      if (pin.fallen) {
        this.ctx.globalAlpha = 0.5;
      }

      // Pin body
      this.ctx.fillStyle = "#ecf0f1";
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, pin.radius * 0.8, pin.radius, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Pin top
      this.ctx.beginPath();
      this.ctx.arc(0, -pin.radius * 0.5, pin.radius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();

      // Red stripes
      this.ctx.strokeStyle = "#e74c3c";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, pin.radius * 0.6, Math.PI * 0.3, Math.PI * 0.7);
      this.ctx.stroke();

      this.ctx.restore();
    }

    // Draw aim line
    if (this.dragging && this.dragStart && this.dragEnd && !this.ball.active) {
      const dx = this.dragStart.x - this.dragEnd.x;
      const dy = this.dragStart.y - this.dragEnd.y;

      this.ctx.strokeStyle = "rgba(255,255,255,0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.ball.x, this.ball.y);
      this.ctx.lineTo(this.ball.x + dx * 3, this.ball.y + dy * 3);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    const ballGradient = this.ctx.createRadialGradient(
      this.ball.x - 5,
      this.ball.y - 5,
      0,
      this.ball.x,
      this.ball.y,
      this.ball.radius
    );
    ballGradient.addColorStop(0, "#9b59b6");
    ballGradient.addColorStop(1, "#6c3483");
    this.ctx.fillStyle = ballGradient;
    this.ctx.fill();

    // Ball holes
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x - 4, this.ball.y - 6, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x + 4, this.ball.y - 6, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y + 2, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw message
    if (this.message) {
      this.ctx.fillStyle = "#f1c40f";
      this.ctx.font = "bold 32px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(this.message === "game.strike" ? "STRIKE!" : "SPARE!", this.width / 2, this.height / 2);
    }
  }

  public handleMouseDown(x: number, y: number) {
    if (this.status !== "playing" || this.ball.active) return;

    this.dragging = true;
    this.dragStart = { x, y };
    this.dragEnd = { x, y };
  }

  public handleMouseMove(x: number, y: number) {
    if (!this.dragging || this.ball.active) return;
    this.dragEnd = { x, y };
  }

  public handleMouseUp() {
    if (!this.dragging || !this.dragStart || !this.dragEnd || this.ball.active) return;

    const dx = this.dragStart.x - this.dragEnd.x;
    const dy = this.dragStart.y - this.dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 100) / 10;

    if (power > 1 && dy > 0) {
      const angle = Math.atan2(dy, dx);
      this.ball.vx = Math.cos(angle) * power * 0.5;
      this.ball.vy = -Math.abs(Math.sin(angle)) * power;
      this.ball.spin = dx * 0.1;
      this.ball.active = true;
      this.status = "rolling";
    }

    this.dragging = false;
    this.dragStart = null;
    this.dragEnd = null;
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        frame: this.frame,
        status: this.status,
      });
    }
  }
}
