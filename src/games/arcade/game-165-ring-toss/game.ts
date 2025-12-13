/**
 * Ring Toss Game
 * Game #165 - Physics Arc
 * Throw rings to land on pegs and score points!
 */

interface Ring {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  landed: boolean;
  landedPeg: Peg | null;
  color: string;
}

interface Peg {
  x: number;
  y: number;
  height: number;
  radius: number;
  points: number;
  color: string;
  hasRing: boolean;
}

export class RingTossGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private rings: Ring[] = [];
  private pegs: Peg[] = [];
  private currentRing: Ring | null = null;

  private gravity = 0.3;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;
  private isDragging = false;

  private ringsPerRound = 5;
  private ringsRemaining = 5;

  score = 0;
  lives = 3;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  private ringColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupLevel();
  }

  private setupLevel() {
    this.pegs = [];
    this.rings = [];
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Create peg layout based on level
    const pegConfigs = [
      // Level 1: Simple layout
      [
        { x: 0.5, y: 0.5, points: 50 }
      ],
      // Level 2: Three pegs
      [
        { x: 0.3, y: 0.55, points: 30 },
        { x: 0.5, y: 0.45, points: 50 },
        { x: 0.7, y: 0.55, points: 30 }
      ],
      // Level 3+: More pegs
      [
        { x: 0.2, y: 0.6, points: 20 },
        { x: 0.35, y: 0.5, points: 40 },
        { x: 0.5, y: 0.4, points: 100 },
        { x: 0.65, y: 0.5, points: 40 },
        { x: 0.8, y: 0.6, points: 20 }
      ]
    ];

    const config = pegConfigs[Math.min(this.level - 1, pegConfigs.length - 1)];

    for (const p of config) {
      this.pegs.push({
        x: w * p.x,
        y: h * p.y,
        height: 40 + Math.random() * 20,
        radius: 8,
        points: p.points,
        color: p.points >= 100 ? '#ffd700' : p.points >= 40 ? '#c0c0c0' : '#cd7f32',
        hasRing: false
      });
    }

    this.ringsRemaining = this.ringsPerRound;
    this.prepareRing();
  }

  private prepareRing() {
    if (this.ringsRemaining <= 0) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.currentRing = {
      x: w * 0.5,
      y: h * 0.85,
      vx: 0,
      vy: 0,
      radius: 25,
      rotation: 0,
      rotationSpeed: 0,
      landed: false,
      landedPeg: null,
      color: this.ringColors[Math.floor(Math.random() * this.ringColors.length)]
    };
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
    this.updateRings();
    this.checkRoundEnd();
  }

  private updateRings() {
    const h = this.canvas.height;

    // Update thrown rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];

      if (!ring.landed) {
        ring.vy += this.gravity;
        ring.x += ring.vx;
        ring.y += ring.vy;
        ring.rotation += ring.rotationSpeed;

        // Air resistance
        ring.vx *= 0.99;
        ring.rotationSpeed *= 0.98;

        // Check landing on pegs
        for (const peg of this.pegs) {
          if (peg.hasRing) continue;

          const dx = ring.x - peg.x;
          const dy = ring.y - (peg.y - peg.height);
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Ring lands on peg
          if (dist < ring.radius + peg.radius && ring.vy > 0) {
            // Check if ring is coming down on peg correctly
            if (Math.abs(dx) < ring.radius * 0.5) {
              ring.landed = true;
              ring.landedPeg = peg;
              ring.x = peg.x;
              ring.y = peg.y - peg.height + 5;
              ring.vx = 0;
              ring.vy = 0;
              peg.hasRing = true;
              this.score += peg.points;
              this.emitState();
            } else {
              // Bounce off
              ring.vx = dx * 0.3;
              ring.vy = -Math.abs(ring.vy) * 0.3;
            }
          }
        }

        // Fell off screen
        if (ring.y > h + 50) {
          this.rings.splice(i, 1);
        }
      }
    }
  }

  private checkRoundEnd() {
    // All rings thrown and settled
    if (this.ringsRemaining <= 0 && !this.currentRing && this.rings.every(r => r.landed || r.y > this.canvas.height)) {
      const targetScore = this.level * 50;
      const roundScore = this.pegs.filter(p => p.hasRing).reduce((sum, p) => sum + p.points, 0);

      if (roundScore >= targetScore) {
        this.level++;
        if (this.level > 5) {
          this.status = 'won';
          if (this.animationId) cancelAnimationFrame(this.animationId);
        } else {
          this.setupLevel();
        }
      } else {
        this.lives--;
        if (this.lives <= 0) {
          this.status = 'lost';
          if (this.animationId) cancelAnimationFrame(this.animationId);
        } else {
          this.setupLevel();
        }
      }
      this.emitState();
    }
  }

  private throwRing() {
    if (!this.currentRing || !this.dragStart || !this.dragCurrent) return;

    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;

    // Calculate throw power (capped)
    const power = Math.min(20, Math.sqrt(dx * dx + dy * dy) * 0.15);

    if (power > 2) {
      const angle = Math.atan2(dy, dx);

      this.currentRing.vx = Math.cos(angle) * power;
      this.currentRing.vy = Math.sin(angle) * power;
      this.currentRing.rotationSpeed = (Math.random() - 0.5) * 0.3;

      this.rings.push(this.currentRing);
      this.currentRing = null;
      this.ringsRemaining--;

      // Prepare next ring after delay
      setTimeout(() => {
        if (this.ringsRemaining > 0 && this.status === 'playing') {
          this.prepareRing();
        }
      }, 500);
    }

    this.dragStart = null;
    this.dragCurrent = null;
    this.isDragging = false;

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - carnival style
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#1a5276');
    bgGradient.addColorStop(1, '#154360');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Decorative stripes
    ctx.fillStyle = '#1a6b8f';
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i + 20 + h * 0.1, h);
      ctx.lineTo(i + h * 0.1, h);
      ctx.closePath();
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, h * 0.7, w, 10);

    // Pegs
    for (const peg of this.pegs) {
      this.drawPeg(peg);
    }

    // Thrown rings
    for (const ring of this.rings) {
      this.drawRing(ring);
    }

    // Current ring (ready to throw)
    if (this.currentRing) {
      this.drawRing(this.currentRing);

      // Drag indicator
      if (this.isDragging && this.dragStart && this.dragCurrent) {
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const power = Math.min(20, Math.sqrt(dx * dx + dy * dy) * 0.15);

        // Arrow showing throw direction
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.currentRing.x, this.currentRing.y);
        ctx.lineTo(this.currentRing.x + dx * 0.5, this.currentRing.y + dy * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Power indicator
        ctx.fillStyle = power > 15 ? '#e74c3c' : power > 8 ? '#f39c12' : '#2ecc71';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Power: ${Math.floor(power * 5)}%`, w / 2, h - 50);
      }
    }

    // Rings remaining indicator
    ctx.fillStyle = '#fff';
    for (let i = 0; i < this.ringsRemaining; i++) {
      ctx.beginPath();
      ctx.arc(30 + i * 25, 30, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Target score
    const targetScore = this.level * 50;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Target: ${targetScore}`, w - 20, 25);

    // Instructions
    if (this.currentRing && !this.isDragging) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Drag to aim and release to throw', w / 2, h - 20);
    }
  }

  private drawPeg(peg: Peg) {
    const ctx = this.ctx;

    // Base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(peg.x - 15, peg.y, 30, 10);

    // Pole
    ctx.fillStyle = peg.color;
    ctx.fillRect(peg.x - peg.radius, peg.y - peg.height, peg.radius * 2, peg.height);

    // Top cap
    ctx.fillStyle = peg.color;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y - peg.height, peg.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // Point label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(peg.points.toString(), peg.x, peg.y + 22);
  }

  private drawRing(ring: Ring) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.rotate(ring.rotation);

    // Ring shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(3, 3, ring.radius, ring.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ring outer
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, ring.radius, ring.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ring highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -2, ring.radius - 2, ring.radius * 0.25, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down' && this.currentRing) {
      this.isDragging = true;
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    } else if (type === 'move' && this.isDragging) {
      this.dragCurrent = { x, y };
    } else if (type === 'up' && this.isDragging) {
      this.throwRing();
    }
  }

  handleKey(key: string, pressed: boolean) {
    // No keyboard controls for this game
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
    this.lives = 3;
    this.level = 1;
    this.status = 'paused';
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
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
      rings: this.ringsRemaining,
      status: this.status
    });
  }
}
