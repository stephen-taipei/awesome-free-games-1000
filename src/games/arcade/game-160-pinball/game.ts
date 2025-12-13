/**
 * Pinball Game
 * Game #160 - Physics-based Pinball
 * Classic pinball with flippers, bumpers, and targets
 */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Flipper {
  x: number;
  y: number;
  length: number;
  angle: number;
  targetAngle: number;
  side: 'left' | 'right';
}

interface Bumper {
  x: number;
  y: number;
  radius: number;
  points: number;
  hit: number;
}

interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
  lit: boolean;
  points: number;
}

export class PinballGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private ball: Ball | null = null;
  private flippers: Flipper[] = [];
  private bumpers: Bumper[] = [];
  private targets: Target[] = [];

  private leftPressed = false;
  private rightPressed = false;
  private launchPressed = false;
  private launchPower = 0;

  private gravity = 0.15;
  private friction = 0.995;
  private bounciness = 0.7;
  private flipperSpeed = 0.3;

  score = 0;
  lives = 3;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupTable();
  }

  private setupTable() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Flippers
    this.flippers = [
      {
        x: w * 0.3,
        y: h * 0.85,
        length: w * 0.15,
        angle: 0.3,
        targetAngle: 0.3,
        side: 'left'
      },
      {
        x: w * 0.7,
        y: h * 0.85,
        length: w * 0.15,
        angle: Math.PI - 0.3,
        targetAngle: Math.PI - 0.3,
        side: 'right'
      }
    ];

    // Bumpers
    this.bumpers = [
      { x: w * 0.5, y: h * 0.25, radius: 25, points: 100, hit: 0 },
      { x: w * 0.3, y: h * 0.35, radius: 20, points: 50, hit: 0 },
      { x: w * 0.7, y: h * 0.35, radius: 20, points: 50, hit: 0 },
      { x: w * 0.4, y: h * 0.45, radius: 18, points: 75, hit: 0 },
      { x: w * 0.6, y: h * 0.45, radius: 18, points: 75, hit: 0 }
    ];

    // Targets
    this.targets = [];
    for (let i = 0; i < 5; i++) {
      this.targets.push({
        x: w * 0.15 + i * (w * 0.7) / 4,
        y: h * 0.15,
        width: w * 0.08,
        height: 15,
        lit: false,
        points: 200
      });
    }

    // Reset ball position for launch
    this.ball = null;
    this.launchPower = 0;
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.prepareBall();
    this.gameLoop();
    this.emitState();
  }

  private prepareBall() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ball = {
      x: w * 0.92,
      y: h * 0.8,
      vx: 0,
      vy: 0,
      radius: 10
    };
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

    // Update launch power
    if (this.launchPressed && this.ball && this.ball.x > this.canvas.width * 0.88) {
      this.launchPower = Math.min(30, this.launchPower + 0.5);
    }

    this.updateFlippers();
    this.updateBall();
    this.updateBumpers();
    this.checkWin();
  }

  private updateFlippers() {
    for (const f of this.flippers) {
      if (f.side === 'left') {
        f.targetAngle = this.leftPressed ? -0.5 : 0.3;
      } else {
        f.targetAngle = this.rightPressed ? Math.PI + 0.5 : Math.PI - 0.3;
      }

      // Smooth flipper movement
      const diff = f.targetAngle - f.angle;
      if (Math.abs(diff) > 0.01) {
        f.angle += Math.sign(diff) * this.flipperSpeed;
      }
    }
  }

  private updateBall() {
    if (!this.ball) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Launch ball
    if (this.ball.x > w * 0.88 && !this.launchPressed && this.launchPower > 0) {
      this.ball.vy = -this.launchPower;
      this.ball.x = w * 0.85;
      this.launchPower = 0;
    }

    // In launch tube - don't apply physics
    if (this.ball.x > w * 0.88) return;

    // Apply gravity
    this.ball.vy += this.gravity;

    // Apply friction
    this.ball.vx *= this.friction;
    this.ball.vy *= this.friction;

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall collisions
    // Left wall
    if (this.ball.x - this.ball.radius < w * 0.05) {
      this.ball.x = w * 0.05 + this.ball.radius;
      this.ball.vx = -this.ball.vx * this.bounciness;
    }

    // Right wall (before launch tube)
    if (this.ball.x + this.ball.radius > w * 0.85 && this.ball.y > h * 0.15) {
      this.ball.x = w * 0.85 - this.ball.radius;
      this.ball.vx = -this.ball.vx * this.bounciness;
    }

    // Top wall
    if (this.ball.y - this.ball.radius < h * 0.05) {
      this.ball.y = h * 0.05 + this.ball.radius;
      this.ball.vy = -this.ball.vy * this.bounciness;
    }

    // Slanted side walls
    const sideWallStart = h * 0.6;
    if (this.ball.y > sideWallStart) {
      // Left slant
      const leftWallX = w * 0.05 + (this.ball.y - sideWallStart) * 0.3;
      if (this.ball.x - this.ball.radius < leftWallX) {
        this.ball.x = leftWallX + this.ball.radius;
        // Bounce off slant
        const nx = 0.95, ny = -0.3;
        const dot = this.ball.vx * nx + this.ball.vy * ny;
        this.ball.vx = (this.ball.vx - 2 * dot * nx) * this.bounciness;
        this.ball.vy = (this.ball.vy - 2 * dot * ny) * this.bounciness;
      }

      // Right slant
      const rightWallX = w * 0.85 - (this.ball.y - sideWallStart) * 0.3;
      if (this.ball.x + this.ball.radius > rightWallX) {
        this.ball.x = rightWallX - this.ball.radius;
        const nx = -0.95, ny = -0.3;
        const dot = this.ball.vx * nx + this.ball.vy * ny;
        this.ball.vx = (this.ball.vx - 2 * dot * nx) * this.bounciness;
        this.ball.vy = (this.ball.vy - 2 * dot * ny) * this.bounciness;
      }
    }

    // Flipper collisions
    for (const f of this.flippers) {
      this.checkFlipperCollision(f);
    }

    // Bumper collisions
    for (const b of this.bumpers) {
      this.checkBumperCollision(b);
    }

    // Target collisions
    for (const t of this.targets) {
      this.checkTargetCollision(t);
    }

    // Ball lost
    if (this.ball.y > h + 50) {
      this.loseLife();
    }
  }

  private checkFlipperCollision(f: Flipper) {
    if (!this.ball) return;

    // Calculate flipper end point
    const endX = f.x + Math.cos(f.angle) * f.length * (f.side === 'left' ? 1 : -1);
    const endY = f.y + Math.sin(f.angle) * f.length;

    // Check distance from ball to flipper line
    const dx = endX - f.x;
    const dy = endY - f.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const t = Math.max(0, Math.min(1,
      ((this.ball.x - f.x) * dx + (this.ball.y - f.y) * dy) / (len * len)
    ));

    const closestX = f.x + t * dx;
    const closestY = f.y + t * dy;

    const distX = this.ball.x - closestX;
    const distY = this.ball.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < this.ball.radius + 5) {
      // Collision response
      const nx = distX / dist;
      const ny = distY / dist;

      // Push ball out
      this.ball.x = closestX + nx * (this.ball.radius + 6);
      this.ball.y = closestY + ny * (this.ball.radius + 6);

      // Calculate flipper velocity at hit point
      const flipperVel = (f.targetAngle - f.angle) * 15;

      // Reflect velocity with flipper boost
      const dot = this.ball.vx * nx + this.ball.vy * ny;
      this.ball.vx = (this.ball.vx - 2 * dot * nx) * this.bounciness;
      this.ball.vy = (this.ball.vy - 2 * dot * ny) * this.bounciness;

      // Add flipper boost
      if (Math.abs(flipperVel) > 1) {
        this.ball.vx += flipperVel * ny * 0.5;
        this.ball.vy -= Math.abs(flipperVel) * 0.8;
      }
    }
  }

  private checkBumperCollision(b: Bumper) {
    if (!this.ball) return;

    const dx = this.ball.x - b.x;
    const dy = this.ball.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.ball.radius + b.radius) {
      // Bounce
      const nx = dx / dist;
      const ny = dy / dist;

      this.ball.x = b.x + nx * (this.ball.radius + b.radius + 1);
      this.ball.y = b.y + ny * (this.ball.radius + b.radius + 1);

      const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
      const boostSpeed = Math.max(speed, 8);

      this.ball.vx = nx * boostSpeed;
      this.ball.vy = ny * boostSpeed;

      // Score and animate
      this.score += b.points;
      b.hit = 10;
      this.emitState();
    }
  }

  private checkTargetCollision(t: Target) {
    if (!this.ball || t.lit) return;

    if (
      this.ball.x + this.ball.radius > t.x &&
      this.ball.x - this.ball.radius < t.x + t.width &&
      this.ball.y + this.ball.radius > t.y &&
      this.ball.y - this.ball.radius < t.y + t.height
    ) {
      t.lit = true;
      this.score += t.points;
      this.ball.vy = Math.abs(this.ball.vy) * 0.5;
      this.emitState();
    }
  }

  private updateBumpers() {
    for (const b of this.bumpers) {
      if (b.hit > 0) b.hit--;
    }
  }

  private checkWin() {
    if (this.targets.every(t => t.lit)) {
      this.level++;
      this.score += 1000;

      if (this.level > 5) {
        this.status = 'won';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      } else {
        // Reset targets for next level
        for (const t of this.targets) {
          t.lit = false;
        }
        // Add more bumpers
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.bumpers.push({
          x: w * (0.2 + Math.random() * 0.6),
          y: h * (0.2 + Math.random() * 0.4),
          radius: 15 + Math.random() * 10,
          points: 100 + this.level * 25,
          hit: 0
        });
      }
      this.emitState();
    }
  }

  private loseLife() {
    this.lives--;
    this.emitState();

    if (this.lives <= 0) {
      this.status = 'lost';
      if (this.animationId) cancelAnimationFrame(this.animationId);
    } else {
      this.prepareBall();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Table borders
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.05);
    ctx.lineTo(w * 0.05, h * 0.6);
    ctx.lineTo(w * 0.2, h * 0.95);
    ctx.moveTo(w * 0.85, h * 0.05);
    ctx.lineTo(w * 0.85, h * 0.6);
    ctx.lineTo(w * 0.8, h * 0.95);
    ctx.moveTo(w * 0.05, h * 0.05);
    ctx.lineTo(w * 0.85, h * 0.05);
    ctx.stroke();

    // Launch tube
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.88, h * 0.15, w * 0.08, h * 0.8);

    // Plunger
    if (this.ball && this.ball.x > w * 0.88) {
      ctx.fillStyle = '#c0392b';
      const plungerY = h * 0.85 + this.launchPower;
      ctx.fillRect(w * 0.89, plungerY, w * 0.06, h * 0.1);

      // Launch power indicator
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(w * 0.89, h * 0.85, w * 0.06, this.launchPower);
    }

    // Targets
    for (const t of this.targets) {
      ctx.fillStyle = t.lit ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(t.x, t.y, t.width, t.height);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x, t.y, t.width, t.height);
    }

    // Bumpers
    for (const b of this.bumpers) {
      const scale = b.hit > 0 ? 1.2 : 1;
      const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * scale);
      glow.addColorStop(0, b.hit > 0 ? '#fff' : '#f39c12');
      glow.addColorStop(0.5, b.hit > 0 ? '#f39c12' : '#e67e22');
      glow.addColorStop(1, '#d35400');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Points text
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.points.toString(), b.x, b.y + 4);
    }

    // Flippers
    for (const f of this.flippers) {
      this.drawFlipper(f);
    }

    // Ball
    if (this.ball) {
      const ballGlow = ctx.createRadialGradient(
        this.ball.x - 3, this.ball.y - 3, 0,
        this.ball.x, this.ball.y, this.ball.radius
      );
      ballGlow.addColorStop(0, '#fff');
      ballGlow.addColorStop(0.3, '#c0c0c0');
      ballGlow.addColorStop(1, '#808080');

      ctx.fillStyle = ballGlow;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Level indicator
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LV ${this.level}`, 10, 20);
  }

  private drawFlipper(f: Flipper) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    // Flipper body
    const gradient = ctx.createLinearGradient(0, -8, 0, 8);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(1, '#c0392b');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    if (f.side === 'left') {
      ctx.moveTo(-5, -8);
      ctx.lineTo(f.length, -5);
      ctx.lineTo(f.length, 5);
      ctx.lineTo(-5, 8);
      ctx.arc(-5, 0, 8, Math.PI / 2, -Math.PI / 2, true);
    } else {
      ctx.moveTo(5, -8);
      ctx.lineTo(-f.length, -5);
      ctx.lineTo(-f.length, 5);
      ctx.lineTo(5, 8);
      ctx.arc(5, 0, 8, -Math.PI / 2, Math.PI / 2, true);
    }

    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pivot point
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const centerX = this.canvas.width / 2;

    if (type === 'down') {
      if (x > this.canvas.width * 0.85) {
        this.launchPressed = true;
      } else if (x < centerX) {
        this.leftPressed = true;
      } else {
        this.rightPressed = true;
      }
    } else if (type === 'up') {
      this.leftPressed = false;
      this.rightPressed = false;
      this.launchPressed = false;
    }
  }

  handleKey(key: string, pressed: boolean) {
    if (this.status !== 'playing') return;

    if (key === 'ArrowLeft' || key === 'a' || key === 'z') {
      this.leftPressed = pressed;
    }
    if (key === 'ArrowRight' || key === 'd' || key === '/') {
      this.rightPressed = pressed;
    }
    if (key === ' ' || key === 'ArrowDown' || key === 's') {
      this.launchPressed = pressed;
    }
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const width = Math.min(rect.width, 400);
      this.canvas.width = width;
      this.canvas.height = width * 1.4;
      this.setupTable();
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = 'paused';
    this.leftPressed = false;
    this.rightPressed = false;
    this.launchPressed = false;
    this.launchPower = 0;
    this.setupTable();
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
