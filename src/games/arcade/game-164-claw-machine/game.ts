/**
 * Claw Machine Game
 * Game #164 - Physics Claw
 * Control the claw to grab prizes!
 */

interface Prize {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'bear' | 'bunny' | 'star' | 'ball' | 'diamond';
  grabbed: boolean;
  points: number;
  color: string;
}

interface Claw {
  x: number;
  y: number;
  targetX: number;
  openAngle: number;
  state: 'idle' | 'moving' | 'dropping' | 'grabbing' | 'rising' | 'returning';
  grabbedPrize: Prize | null;
}

export class ClawMachineGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private claw: Claw = {
    x: 200,
    y: 60,
    targetX: 200,
    openAngle: 0.5,
    state: 'idle',
    grabbedPrize: null
  };

  private prizes: Prize[] = [];
  private clawSpeed = 3;
  private dropSpeed = 4;
  private riseSpeed = 2;

  private dropZoneX = 50;
  private dropZoneWidth = 80;

  score = 0;
  lives = 5;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  private prizeColors: Record<string, string> = {
    bear: '#8B4513',
    bunny: '#fff',
    star: '#ffd700',
    ball: '#e74c3c',
    diamond: '#3498db'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupLevel();
  }

  private setupLevel() {
    this.prizes = [];
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Place prizes
    const types: Prize['type'][] = ['bear', 'bunny', 'star', 'ball', 'diamond'];
    const prizeCount = 8 + this.level * 2;

    for (let i = 0; i < prizeCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const size = type === 'diamond' ? 25 : type === 'star' ? 30 : 35;
      const points = type === 'diamond' ? 100 : type === 'star' ? 50 : type === 'bear' ? 40 : 30;

      this.prizes.push({
        x: 100 + Math.random() * (w - 200),
        y: h - 100 - Math.random() * 80,
        width: size,
        height: size,
        type,
        grabbed: false,
        points,
        color: this.prizeColors[type]
      });
    }

    // Reset claw
    this.claw.x = w / 2;
    this.claw.y = 60;
    this.claw.state = 'idle';
    this.claw.openAngle = 0.5;
    this.claw.grabbedPrize = null;
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.gameLoop();
    this.emitState();
  }

  private gameLoop() {
    if (this.status !== 'playing') return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 16) {
      this.lastTime = now;
      this.update();
      this.draw();
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;
    this.updateClaw();
    this.checkWin();
  }

  private updateClaw() {
    const c = this.claw;
    const h = this.canvas.height;

    switch (c.state) {
      case 'idle':
        // Claw follows target position
        const diff = c.targetX - c.x;
        if (Math.abs(diff) > 1) {
          c.x += Math.sign(diff) * Math.min(Math.abs(diff), this.clawSpeed);
        }
        break;

      case 'dropping':
        c.y += this.dropSpeed;
        c.openAngle = Math.min(0.8, c.openAngle + 0.02);

        // Check for prize to grab
        if (c.y > h - 150) {
          for (const prize of this.prizes) {
            if (!prize.grabbed && Math.abs(c.x - prize.x) < 30 && Math.abs(c.y - prize.y + 30) < 40) {
              // Probability of successful grab
              const grabChance = 0.6 + (0.05 * this.level);
              if (Math.random() < grabChance) {
                prize.grabbed = true;
                c.grabbedPrize = prize;
              }
              break;
            }
          }
        }

        // Bottom reached
        if (c.y >= h - 100) {
          c.state = 'grabbing';
        }
        break;

      case 'grabbing':
        c.openAngle = Math.max(0.1, c.openAngle - 0.05);
        if (c.openAngle <= 0.15) {
          c.state = 'rising';
        }
        break;

      case 'rising':
        c.y -= this.riseSpeed;

        // Update grabbed prize position
        if (c.grabbedPrize) {
          c.grabbedPrize.x = c.x;
          c.grabbedPrize.y = c.y + 40;

          // Random chance to drop
          if (Math.random() < 0.002) {
            c.grabbedPrize.grabbed = false;
            c.grabbedPrize = null;
          }
        }

        if (c.y <= 60) {
          c.y = 60;
          c.state = 'returning';
        }
        break;

      case 'returning':
        // Move to drop zone
        const toDrop = this.dropZoneX + this.dropZoneWidth / 2 - c.x;
        if (Math.abs(toDrop) > 1) {
          c.x += Math.sign(toDrop) * this.clawSpeed;
          if (c.grabbedPrize) {
            c.grabbedPrize.x = c.x;
          }
        } else {
          // Drop the prize
          if (c.grabbedPrize) {
            this.score += c.grabbedPrize.points;
            // Remove prize from array
            const idx = this.prizes.indexOf(c.grabbedPrize);
            if (idx > -1) this.prizes.splice(idx, 1);
            c.grabbedPrize = null;
            this.emitState();
          }

          c.openAngle = 0.5;
          c.state = 'idle';
          c.targetX = this.canvas.width / 2;
        }
        break;
    }
  }

  private checkWin() {
    if (this.lives <= 0 && this.claw.state === 'idle') {
      if (this.score >= this.level * 100) {
        this.level++;
        if (this.level > 5) {
          this.status = 'won';
          if (this.animationId) cancelAnimationFrame(this.animationId);
        } else {
          this.lives = 5;
          this.setupLevel();
        }
      } else {
        this.status = 'lost';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  private drop() {
    if (this.claw.state !== 'idle' || this.lives <= 0) return;
    this.claw.state = 'dropping';
    this.lives--;
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - arcade machine
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);

    // Glass case
    ctx.fillStyle = 'rgba(135, 206, 250, 0.1)';
    ctx.fillRect(20, 50, w - 40, h - 100);
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 50, w - 40, h - 100);

    // Prize area floor
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(20, h - 120, w - 40, 70);

    // Drop zone
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(this.dropZoneX - 10, h - 120, this.dropZoneWidth + 20, 70);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(this.dropZoneX, h - 115, this.dropZoneWidth, 60);

    // Prize chute
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, h - 120, this.dropZoneX - 10, 120);

    // Draw prizes
    for (const prize of this.prizes) {
      if (!prize.grabbed) {
        this.drawPrize(prize);
      }
    }

    // Draw grabbed prize
    if (this.claw.grabbedPrize) {
      this.drawPrize(this.claw.grabbedPrize);
    }

    // Draw claw
    this.drawClaw();

    // Track rail
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(30, 45, w - 60, 10);

    // Controls hint
    if (this.claw.state === 'idle') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Move: Arrow Keys / Touch', w / 2, h - 20);
      ctx.fillText('Drop: Space / Tap Center', w / 2, h - 5);
    }

    // Target score
    const targetScore = this.level * 100;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Target: ${targetScore}`, w - 30, 30);
  }

  private drawClaw() {
    const ctx = this.ctx;
    const c = this.claw;

    // Cable
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x, 50);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();

    // Claw body
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Claw arms
    const armLength = 35;
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Left arm
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-c.openAngle - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, armLength);
    ctx.lineTo(-8, armLength + 10);
    ctx.stroke();
    ctx.restore();

    // Right arm
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.openAngle - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, armLength);
    ctx.lineTo(8, armLength + 10);
    ctx.stroke();
    ctx.restore();

    // Center arm
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, armLength - 5);
    ctx.stroke();
    ctx.restore();
  }

  private drawPrize(prize: Prize) {
    const ctx = this.ctx;
    const { x, y, width, height, type, color } = prize;

    ctx.save();
    ctx.translate(x, y);

    switch (type) {
      case 'bear':
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 5, width / 2, height / 2 - 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -height / 3, width / 3, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.arc(-width / 4, -height / 2, 8, 0, Math.PI * 2);
        ctx.arc(width / 4, -height / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-6, -height / 3, 3, 0, Math.PI * 2);
        ctx.arc(6, -height / 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.beginPath();
        ctx.arc(0, -height / 4, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bunny':
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 5, width / 2.5, height / 2 - 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -height / 4, width / 3, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.ellipse(-8, -height / 2 - 10, 5, 15, -0.2, 0, Math.PI * 2);
        ctx.ellipse(8, -height / 2 - 10, 5, 15, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner ears
        ctx.fillStyle = '#ffcccc';
        ctx.beginPath();
        ctx.ellipse(-8, -height / 2 - 8, 3, 10, -0.2, 0, Math.PI * 2);
        ctx.ellipse(8, -height / 2 - 8, 3, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(-5, -height / 4, 3, 0, Math.PI * 2);
        ctx.arc(5, -height / 4, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'star':
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const outerR = width / 2;
          const innerR = width / 4;
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
          const innerAngle = angle + Math.PI / 5;
          ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
        }
        ctx.closePath();
        ctx.fill();

        // Shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'ball':
        // Ball
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Stripes
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, width / 3, 0, Math.PI * 2);
        ctx.stroke();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-5, -5, 6, 8, -0.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'diamond':
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -height / 2);
        ctx.lineTo(width / 2, 0);
        ctx.lineTo(0, height / 2);
        ctx.lineTo(-width / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Facets
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.moveTo(0, -height / 2);
        ctx.lineTo(width / 4, 0);
        ctx.lineTo(0, height / 2);
        ctx.closePath();
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, -height / 2);
        ctx.lineTo(-width / 4, -height / 4);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const w = this.canvas.width;

    if (type === 'down') {
      // Tap center to drop
      if (Math.abs(x - w / 2) < 80 && this.claw.state === 'idle') {
        this.drop();
      }
    }

    if ((type === 'down' || type === 'move') && this.claw.state === 'idle') {
      // Move claw based on touch position
      this.claw.targetX = Math.max(50, Math.min(w - 50, x));
    }
  }

  handleKey(key: string, pressed: boolean) {
    if (this.status !== 'playing' || !pressed) return;

    if (this.claw.state === 'idle') {
      if (key === 'ArrowLeft' || key === 'a') {
        this.claw.targetX = Math.max(50, this.claw.targetX - 30);
      } else if (key === 'ArrowRight' || key === 'd') {
        this.claw.targetX = Math.min(this.canvas.width - 50, this.claw.targetX + 30);
      } else if (key === ' ' || key === 'ArrowDown') {
        this.drop();
      }
    }
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, 450);
      this.canvas.width = size;
      this.canvas.height = size;
      this.setupLevel();
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 5;
    this.level = 1;
    this.status = 'paused';
    this.setupLevel();
    this.draw();
    this.emitState();
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
    this.emitState();
  }

  private emitState() {
    this.onStateChange?.({
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.status
    });
  }
}
