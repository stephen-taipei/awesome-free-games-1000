/**
 * Balloon Pop Game
 * Game #162 - Canvas Shooter
 * Shoot floating balloons before they escape!
 */

interface Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  points: number;
  type: 'normal' | 'small' | 'fast' | 'bonus';
}

interface Dart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

interface PopEffect {
  x: number;
  y: number;
  radius: number;
  color: string;
  timer: number;
  particles: { x: number; y: number; vx: number; vy: number; }[];
}

export class BalloonPopGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private balloons: Balloon[] = [];
  private darts: Dart[] = [];
  private popEffects: PopEffect[] = [];

  private spawnTimer = 0;
  private spawnInterval = 60;
  private maxDarts = 3;
  private dartCooldown = 0;

  private mouseX = 0;
  private mouseY = 0;
  private aiming = false;

  score = 0;
  lives = 10;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  private colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e91e63'];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.balloons = [];
    this.darts = [];
    this.popEffects = [];
    this.spawnInterval = Math.max(30, 60 - this.level * 5);
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
    this.dartCooldown = Math.max(0, this.dartCooldown - 1);

    // Spawn balloons
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnBalloon();
    }

    this.updateBalloons();
    this.updateDarts();
    this.updatePopEffects();
    this.checkCollisions();
    this.checkWin();
  }

  private spawnBalloon() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const rand = Math.random();
    let type: Balloon['type'] = 'normal';
    let radius = 25 + Math.random() * 15;
    let speed = 1 + Math.random() * 0.5 + this.level * 0.1;
    let points = 10;

    if (rand < 0.15) {
      type = 'small';
      radius = 15 + Math.random() * 8;
      speed *= 1.3;
      points = 30;
    } else if (rand < 0.25) {
      type = 'fast';
      speed *= 2;
      points = 20;
    } else if (rand < 0.3) {
      type = 'bonus';
      radius = 35 + Math.random() * 10;
      speed *= 0.7;
      points = 50;
    }

    this.balloons.push({
      x: Math.random() * (w - 80) + 40,
      y: h + radius,
      radius,
      color: type === 'bonus' ? '#ffd700' : this.colors[Math.floor(Math.random() * this.colors.length)],
      speed,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
      points,
      type
    });
  }

  private updateBalloons() {
    const h = this.canvas.height;

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];

      // Float upward
      b.y -= b.speed;

      // Wobble side to side
      b.wobble += b.wobbleSpeed;
      b.x += Math.sin(b.wobble) * 0.5;

      // Escaped
      if (b.y + b.radius < 0) {
        this.balloons.splice(i, 1);
        if (b.type !== 'bonus') {
          this.lives--;
          this.emitState();
          if (this.lives <= 0) {
            this.status = 'lost';
            if (this.animationId) cancelAnimationFrame(this.animationId);
          }
        }
      }
    }
  }

  private updateDarts() {
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];

      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.1; // Gravity

      // Out of bounds
      if (d.y > this.canvas.height + 50 || d.y < -50 ||
        d.x < -50 || d.x > this.canvas.width + 50) {
        this.darts.splice(i, 1);
      }
    }
  }

  private updatePopEffects() {
    for (let i = this.popEffects.length - 1; i >= 0; i--) {
      const p = this.popEffects[i];
      p.timer--;

      // Update particles
      for (const particle of p.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
      }

      if (p.timer <= 0) {
        this.popEffects.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];

      for (let j = this.balloons.length - 1; j >= 0; j--) {
        const b = this.balloons[j];

        const dx = d.x - b.x;
        const dy = d.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + 5) {
          // Pop!
          this.score += b.points;
          this.createPopEffect(b);
          this.balloons.splice(j, 1);
          this.darts.splice(i, 1);
          this.emitState();
          break;
        }
      }
    }
  }

  private createPopEffect(b: Balloon) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      particles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2) - 2
      });
    }

    this.popEffects.push({
      x: b.x,
      y: b.y,
      radius: b.radius,
      color: b.color,
      timer: 20,
      particles
    });
  }

  private checkWin() {
    const targetScore = this.level * 300;
    if (this.score >= targetScore) {
      this.level++;
      if (this.level > 10) {
        this.status = 'won';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      } else {
        this.spawnInterval = Math.max(25, 60 - this.level * 5);
      }
      this.emitState();
    }
  }

  private shootDart(targetX: number, targetY: number) {
    if (this.dartCooldown > 0) return;
    if (this.darts.length >= this.maxDarts) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dart starts from bottom center
    const startX = w / 2;
    const startY = h - 30;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = 15;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    this.darts.push({
      x: startX,
      y: startY,
      vx,
      vy,
      active: true
    });

    this.dartCooldown = 15;
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(0.7, '#e0f7fa');
    skyGradient.addColorStop(1, '#b2ebf2');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.drawCloud(w * 0.2, h * 0.15, 40);
    this.drawCloud(w * 0.7, h * 0.1, 50);
    this.drawCloud(w * 0.5, h * 0.25, 35);

    // Pop effects
    for (const p of this.popEffects) {
      const alpha = p.timer / 20;

      // Particles
      ctx.fillStyle = p.color;
      for (const particle of p.particles) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Balloons
    for (const b of this.balloons) {
      this.drawBalloon(b);
    }

    // Darts
    for (const d of this.darts) {
      this.drawDart(d);
    }

    // Aiming line
    if (this.aiming) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(w / 2, h - 30);
      ctx.lineTo(this.mouseX, this.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shooter platform
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(w / 2 - 30, h - 20, 60, 20);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(w / 2 - 25, h - 15, 50, 10);

    // Target score indicator
    const targetScore = this.level * 300;
    const progress = Math.min(1, this.score / targetScore);
    ctx.fillStyle = '#333';
    ctx.fillRect(10, h - 25, w - 20, 10);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(10, h - 25, (w - 20) * progress, 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, h - 25, w - 20, 10);

    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.score}/${targetScore}`, w / 2, h - 17);

    // Darts remaining
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    for (let i = 0; i < this.maxDarts - this.darts.length; i++) {
      this.drawMiniDart(15 + i * 20, 20);
    }
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.7, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, y + size * 0.1, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x - size * 0.5, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBalloon(b: Balloon) {
    const ctx = this.ctx;

    // String
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.radius);
    ctx.quadraticCurveTo(
      b.x + Math.sin(b.wobble * 2) * 10,
      b.y + b.radius + 20,
      b.x,
      b.y + b.radius + 40
    );
    ctx.stroke();

    // Balloon body
    const gradient = ctx.createRadialGradient(
      b.x - b.radius * 0.3,
      b.y - b.radius * 0.3,
      0,
      b.x,
      b.y,
      b.radius
    );
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.3, b.color);
    gradient.addColorStop(1, this.darkenColor(b.color, 0.3));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tie
    ctx.fillStyle = this.darkenColor(b.color, 0.4);
    ctx.beginPath();
    ctx.moveTo(b.x - 5, b.y + b.radius);
    ctx.lineTo(b.x + 5, b.y + b.radius);
    ctx.lineTo(b.x, b.y + b.radius + 8);
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, b.radius * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bonus star
    if (b.type === 'bonus') {
      ctx.fillStyle = '#fff';
      ctx.font = `${b.radius * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('*', b.x, b.y);
    }
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - amount));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  private drawDart(d: Dart) {
    const ctx = this.ctx;
    const angle = Math.atan2(d.vy, d.vx);

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(angle);

    // Dart body
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -4);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Dart tip
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(15, -2);
    ctx.lineTo(15, 2);
    ctx.closePath();
    ctx.fill();

    // Feathers
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-18, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawMiniDart(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x - 5, y - 3);
    ctx.lineTo(x - 5, y + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x + 8, y - 1);
    ctx.lineTo(x + 8, y + 1);
    ctx.closePath();
    ctx.fill();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    this.mouseX = x;
    this.mouseY = y;

    if (type === 'down') {
      this.aiming = true;
    } else if (type === 'up' && this.aiming) {
      this.aiming = false;
      this.shootDart(x, y);
    } else if (type === 'move') {
      // Update aim
    }
  }

  handleKey(key: string, pressed: boolean) {
    // No keyboard controls needed
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, 450);
      this.canvas.width = size;
      this.canvas.height = size;
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 10;
    this.level = 1;
    this.status = 'paused';
    this.balloons = [];
    this.darts = [];
    this.popEffects = [];
    this.spawnTimer = 0;
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
