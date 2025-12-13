/**
 * Fruit Ninja Game
 * Game #163 - Touch Canvas
 * Swipe to slice fruits, avoid bombs!
 */

interface Fruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  type: 'apple' | 'orange' | 'watermelon' | 'banana' | 'bomb';
  sliced: boolean;
  sliceAngle: number;
}

interface SliceTrail {
  points: { x: number; y: number; age: number }[];
}

interface SliceEffect {
  x: number;
  y: number;
  type: string;
  timer: number;
  halves: { x: number; y: number; vx: number; vy: number; rotation: number }[];
}

export class FruitNinjaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private fruits: Fruit[] = [];
  private sliceEffects: SliceEffect[] = [];
  private sliceTrail: SliceTrail = { points: [] };

  private spawnTimer = 0;
  private spawnInterval = 80;
  private gravity = 0.25;

  private isSlicing = false;
  private lastX = 0;
  private lastY = 0;

  score = 0;
  lives = 3;
  level = 1;
  combo = 0;
  maxCombo = 0;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  private fruitColors: Record<string, { main: string; inner: string }> = {
    apple: { main: '#e74c3c', inner: '#f5deb3' },
    orange: { main: '#f39c12', inner: '#ffeaa7' },
    watermelon: { main: '#27ae60', inner: '#ff6b6b' },
    banana: { main: '#f1c40f', inner: '#fffacd' },
    bomb: { main: '#2c3e50', inner: '#34495e' }
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.fruits = [];
    this.sliceEffects = [];
    this.sliceTrail = { points: [] };
    this.combo = 0;
    this.spawnInterval = Math.max(40, 80 - this.level * 5);
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

    // Spawn fruits
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnFruit();
    }

    this.updateFruits();
    this.updateSliceEffects();
    this.updateSliceTrail();
    this.checkWin();
  }

  private spawnFruit() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Spawn multiple fruits sometimes
    const count = Math.random() < 0.3 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const types: Fruit['type'][] = ['apple', 'orange', 'watermelon', 'banana'];
      const rand = Math.random();
      let type: Fruit['type'];

      if (rand < 0.1 + this.level * 0.02) {
        type = 'bomb';
      } else {
        type = types[Math.floor(Math.random() * types.length)];
      }

      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? w * 0.1 + Math.random() * w * 0.3 : w * 0.6 + Math.random() * w * 0.3;

      this.fruits.push({
        x,
        y: h + 30,
        vx: (fromLeft ? 1 : -1) * (Math.random() * 2 + 1),
        vy: -(12 + Math.random() * 4 + this.level * 0.5),
        radius: type === 'watermelon' ? 35 : type === 'banana' ? 25 : 28,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type,
        sliced: false,
        sliceAngle: 0
      });
    }
  }

  private updateFruits() {
    const h = this.canvas.height;

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];

      f.x += f.vx;
      f.y += f.vy;
      f.vy += this.gravity;
      f.rotation += f.rotationSpeed;

      // Fell off screen
      if (f.y > h + 100) {
        if (!f.sliced && f.type !== 'bomb') {
          // Missed fruit
          this.lives--;
          this.combo = 0;
          this.emitState();
          if (this.lives <= 0) {
            this.status = 'lost';
            if (this.animationId) cancelAnimationFrame(this.animationId);
          }
        }
        this.fruits.splice(i, 1);
      }
    }
  }

  private updateSliceEffects() {
    for (let i = this.sliceEffects.length - 1; i >= 0; i--) {
      const e = this.sliceEffects[i];
      e.timer--;

      for (const half of e.halves) {
        half.x += half.vx;
        half.y += half.vy;
        half.vy += this.gravity * 0.7;
        half.rotation += 0.1;
      }

      if (e.timer <= 0) {
        this.sliceEffects.splice(i, 1);
      }
    }
  }

  private updateSliceTrail() {
    // Age and remove old points
    for (let i = this.sliceTrail.points.length - 1; i >= 0; i--) {
      this.sliceTrail.points[i].age++;
      if (this.sliceTrail.points[i].age > 10) {
        this.sliceTrail.points.splice(i, 1);
      }
    }
  }

  private checkSlice(x1: number, y1: number, x2: number, y2: number) {
    const sliceSpeed = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (sliceSpeed < 10) return; // Too slow

    let slicedThisFrame = 0;

    for (const f of this.fruits) {
      if (f.sliced) continue;

      // Check if slice line intersects fruit
      const dist = this.pointToLineDistance(f.x, f.y, x1, y1, x2, y2);

      if (dist < f.radius) {
        f.sliced = true;
        f.sliceAngle = Math.atan2(y2 - y1, x2 - x1);

        if (f.type === 'bomb') {
          // Hit bomb - game over
          this.lives = 0;
          this.status = 'lost';
          if (this.animationId) cancelAnimationFrame(this.animationId);
          this.emitState();
          return;
        }

        slicedThisFrame++;
        this.createSliceEffect(f);
      }
    }

    if (slicedThisFrame > 0) {
      this.combo += slicedThisFrame;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      // Combo bonus
      const points = slicedThisFrame * 10 * (1 + Math.floor(this.combo / 5) * 0.5);
      this.score += Math.floor(points);
      this.emitState();
    }
  }

  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  }

  private createSliceEffect(f: Fruit) {
    const angle = f.sliceAngle + Math.PI / 2;
    const speed = 3;

    this.sliceEffects.push({
      x: f.x,
      y: f.y,
      type: f.type,
      timer: 40,
      halves: [
        {
          x: f.x,
          y: f.y,
          vx: Math.cos(angle) * speed + f.vx * 0.5,
          vy: Math.sin(angle) * speed + f.vy * 0.5,
          rotation: f.rotation
        },
        {
          x: f.x,
          y: f.y,
          vx: -Math.cos(angle) * speed + f.vx * 0.5,
          vy: -Math.sin(angle) * speed + f.vy * 0.5,
          rotation: f.rotation + Math.PI
        }
      ]
    });
  }

  private checkWin() {
    const targetScore = this.level * 200;
    if (this.score >= targetScore) {
      this.level++;
      if (this.level > 10) {
        this.status = 'won';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      } else {
        this.spawnInterval = Math.max(35, 80 - this.level * 5);
      }
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Slice trail
    if (this.sliceTrail.points.length > 1) {
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';

      for (let i = 1; i < this.sliceTrail.points.length; i++) {
        const p1 = this.sliceTrail.points[i - 1];
        const p2 = this.sliceTrail.points[i];
        const alpha = 1 - p2.age / 10;
        const width = (1 - p2.age / 10) * 8;

        ctx.lineWidth = width;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Slice effects
    for (const e of this.sliceEffects) {
      const alpha = e.timer / 40;
      const colors = this.fruitColors[e.type];

      for (const half of e.halves) {
        ctx.save();
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        ctx.globalAlpha = alpha;

        // Half fruit
        ctx.fillStyle = colors.main;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = colors.inner;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Juice splash
      ctx.fillStyle = colors.inner;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + e.timer * 0.1;
        const dist = (40 - e.timer) * 2;
        const sx = e.x + Math.cos(angle) * dist;
        const sy = e.y + Math.sin(angle) * dist;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Fruits
    for (const f of this.fruits) {
      if (f.sliced) continue;
      this.drawFruit(f);
    }

    // Combo display
    if (this.combo > 2) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo}x COMBO!`, w / 2, 40);
    }

    // Progress bar
    const targetScore = this.level * 200;
    const progress = Math.min(1, this.score / targetScore);
    ctx.fillStyle = '#333';
    ctx.fillRect(10, h - 20, w - 20, 8);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(10, h - 20, (w - 20) * progress, 8);
  }

  private drawFruit(f: Fruit) {
    const ctx = this.ctx;
    const colors = this.fruitColors[f.type];

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);

    if (f.type === 'bomb') {
      // Bomb body
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fill();

      // Fuse
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -f.radius);
      ctx.quadraticCurveTo(10, -f.radius - 15, 5, -f.radius - 25);
      ctx.stroke();

      // Spark
      if (this.frameCount % 10 < 5) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(5, -f.radius - 25, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Skull
      ctx.fillStyle = '#fff';
      ctx.font = `${f.radius * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', 0, 0);
    } else if (f.type === 'banana') {
      // Banana shape
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.radius, f.radius * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-3, -f.radius * 0.4 - 5, 6, 8);
    } else if (f.type === 'watermelon') {
      // Outer (green)
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fill();

      // Light stripe
      ctx.fillStyle = '#2ecc71';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, (i / 3) * Math.PI, (i / 3 + 0.1) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fill();
      }

      // Inner (red) would show when sliced
    } else {
      // Apple or orange
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-f.radius * 0.3, -f.radius * 0.3, f.radius * 0.3, f.radius * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-2, -f.radius - 8, 4, 10);

      // Leaf (for apple)
      if (f.type === 'apple') {
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.ellipse(5, -f.radius - 5, 8, 4, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      this.isSlicing = true;
      this.lastX = x;
      this.lastY = y;
      this.sliceTrail.points = [{ x, y, age: 0 }];
    } else if (type === 'move' && this.isSlicing) {
      this.sliceTrail.points.push({ x, y, age: 0 });
      this.checkSlice(this.lastX, this.lastY, x, y);
      this.lastX = x;
      this.lastY = y;
    } else if (type === 'up') {
      this.isSlicing = false;
      this.combo = 0; // Reset combo on release
    }
  }

  handleKey(key: string, pressed: boolean) {
    // No keyboard controls
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
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.status = 'paused';
    this.fruits = [];
    this.sliceEffects = [];
    this.sliceTrail = { points: [] };
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
      combo: this.combo,
      status: this.status
    });
  }
}
