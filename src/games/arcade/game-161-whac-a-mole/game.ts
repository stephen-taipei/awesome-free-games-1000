/**
 * Whac-A-Mole Game
 * Game #161 - DOM Events
 * Classic arcade: Hit the moles as they pop up!
 */

interface Mole {
  index: number;
  visible: boolean;
  type: 'normal' | 'golden' | 'bomb';
  timer: number;
  hit: boolean;
  popHeight: number;
}

export class WhacAMoleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gridCols = 3;
  private gridRows = 3;
  private holes: Mole[] = [];

  private spawnTimer = 0;
  private spawnInterval = 60;
  private moleUpTime = 90;
  private maxMolesUp = 2;

  private timeRemaining = 60;
  private lastSecond = 0;

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
    this.setupGame();
  }

  private setupGame() {
    this.holes = [];
    for (let i = 0; i < this.gridCols * this.gridRows; i++) {
      this.holes.push({
        index: i,
        visible: false,
        type: 'normal',
        timer: 0,
        hit: false,
        popHeight: 0
      });
    }

    this.timeRemaining = 60;
    this.spawnInterval = Math.max(30, 60 - this.level * 5);
    this.moleUpTime = Math.max(40, 90 - this.level * 8);
    this.maxMolesUp = Math.min(4, 2 + Math.floor(this.level / 2));
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.lastSecond = Math.floor(this.lastTime / 1000);
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

      // Update timer every second
      const currentSecond = Math.floor(now / 1000);
      if (currentSecond > this.lastSecond) {
        this.lastSecond = currentSecond;
        this.timeRemaining--;
        this.emitState();

        if (this.timeRemaining <= 0) {
          this.checkWinCondition();
        }
      }
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;

    // Spawn moles
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.trySpawnMole();
    }

    // Update moles
    for (const mole of this.holes) {
      if (mole.visible) {
        // Animate pop up/down
        if (!mole.hit) {
          mole.timer++;
          if (mole.timer < 10) {
            mole.popHeight = Math.min(1, mole.popHeight + 0.15);
          } else if (mole.timer > this.moleUpTime - 10) {
            mole.popHeight = Math.max(0, mole.popHeight - 0.15);
          }

          if (mole.timer >= this.moleUpTime) {
            mole.visible = false;
            mole.popHeight = 0;
            // Missed a mole (not a bomb)
            if (mole.type !== 'bomb') {
              // No penalty for missing
            }
          }
        } else {
          // Hit animation
          mole.popHeight = Math.max(0, mole.popHeight - 0.2);
          if (mole.popHeight <= 0) {
            mole.visible = false;
            mole.hit = false;
          }
        }
      }
    }
  }

  private trySpawnMole() {
    const activeMoles = this.holes.filter(m => m.visible).length;
    if (activeMoles >= this.maxMolesUp) return;

    // Find empty holes
    const emptyHoles = this.holes.filter(m => !m.visible);
    if (emptyHoles.length === 0) return;

    const hole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
    hole.visible = true;
    hole.timer = 0;
    hole.hit = false;
    hole.popHeight = 0;

    // Determine mole type
    const rand = Math.random();
    if (rand < 0.1) {
      hole.type = 'golden'; // 10% golden
    } else if (rand < 0.2) {
      hole.type = 'bomb'; // 10% bomb
    } else {
      hole.type = 'normal';
    }
  }

  private checkWinCondition() {
    if (this.timeRemaining <= 0) {
      const targetScore = this.level * 500;
      if (this.score >= targetScore) {
        this.level++;
        if (this.level > 10) {
          this.status = 'won';
          if (this.animationId) cancelAnimationFrame(this.animationId);
        } else {
          this.setupGame();
        }
      } else {
        this.status = 'lost';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  private whack(mole: Mole) {
    if (!mole.visible || mole.hit) return;

    mole.hit = true;

    if (mole.type === 'bomb') {
      this.lives--;
      this.emitState();
      if (this.lives <= 0) {
        this.status = 'lost';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      }
    } else {
      const points = mole.type === 'golden' ? 200 : 50;
      this.score += points;
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - grass
    const grassGradient = ctx.createLinearGradient(0, 0, 0, h);
    grassGradient.addColorStop(0, '#7ec850');
    grassGradient.addColorStop(1, '#5a9c32');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw grass texture
    ctx.fillStyle = '#6ab844';
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % w;
      const y = (i * 23) % h;
      ctx.fillRect(x, y, 2, 8);
    }

    // Calculate hole positions
    const holeWidth = w * 0.25;
    const holeHeight = h * 0.12;
    const startX = w * 0.1;
    const startY = h * 0.2;
    const spacingX = w * 0.3;
    const spacingY = h * 0.25;

    // Draw holes and moles
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const index = row * this.gridCols + col;
        const mole = this.holes[index];
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;

        // Draw mole first (behind hole)
        if (mole.visible) {
          this.drawMole(x + holeWidth / 2, y + holeHeight * 0.3, mole, holeWidth * 0.35);
        }

        // Draw hole (dirt mound)
        this.drawHole(x, y, holeWidth, holeHeight);
      }
    }

    // Draw timer bar
    const timerWidth = (this.timeRemaining / 60) * (w - 40);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, h - 30, w - 40, 15);
    ctx.fillStyle = this.timeRemaining < 10 ? '#e74c3c' : '#3498db';
    ctx.fillRect(20, h - 30, timerWidth, 15);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, h - 30, w - 40, 15);

    // Timer text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.timeRemaining}s`, w / 2, h - 18);

    // Target score
    const targetScore = this.level * 500;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Target: ${targetScore}`, w - 20, 20);
  }

  private drawHole(x: number, y: number, width: number, height: number) {
    const ctx = this.ctx;

    // Hole shadow (dark ellipse)
    ctx.fillStyle = '#2d1810';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height * 0.5, width / 2, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dirt mound
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height, width / 2 + 5, height * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Dirt highlight
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height - 3, width / 2, height * 0.3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  private drawMole(cx: number, cy: number, mole: Mole, size: number) {
    const ctx = this.ctx;
    const popOffset = (1 - mole.popHeight) * size * 1.5;
    const y = cy + popOffset;

    // Clip to hide mole below hole level
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - size * 1.5, cy - size * 2, size * 3, size * 1.8);
    ctx.clip();

    // Mole body color based on type
    let bodyColor = '#8B4513';
    let noseColor = '#ff69b4';

    if (mole.type === 'golden') {
      bodyColor = '#ffd700';
      noseColor = '#ff4500';
    } else if (mole.type === 'bomb') {
      bodyColor = '#2c3e50';
      noseColor = '#e74c3c';
    }

    // Hit effect
    if (mole.hit) {
      ctx.globalAlpha = 0.6;
    }

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx, y, size, size * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = mole.type === 'bomb' ? '#34495e' : '#deb887';
    ctx.beginPath();
    ctx.ellipse(cx, y - size * 0.3, size * 0.7, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (mole.type === 'bomb') {
      // Draw bomb
      ctx.fillStyle = '#e74c3c';
      ctx.font = `bold ${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', cx, y - size * 0.2);

      // Fuse
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, y - size);
      ctx.quadraticCurveTo(cx + size * 0.5, y - size * 1.3, cx + size * 0.3, y - size * 1.5);
      ctx.stroke();

      // Spark
      if (this.frameCount % 10 < 5) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(cx + size * 0.3, y - size * 1.5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(cx - size * 0.25, y - size * 0.4, size * 0.2, size * 0.25, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + size * 0.25, y - size * 0.4, size * 0.2, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx - size * 0.25, y - size * 0.35, size * 0.08, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.25, y - size * 0.35, size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = noseColor;
      ctx.beginPath();
      ctx.ellipse(cx, y - size * 0.1, size * 0.15, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Whiskers
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(cx + i * size * 0.2, y - size * 0.05);
        ctx.lineTo(cx + i * size * 0.6, y - size * 0.1);
        ctx.moveTo(cx + i * size * 0.2, y);
        ctx.lineTo(cx + i * size * 0.6, y + size * 0.05);
        ctx.stroke();
      }

      // Ears
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(cx - size * 0.5, y - size * 0.7, size * 0.2, size * 0.25, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + size * 0.5, y - size * 0.7, size * 0.2, size * 0.25, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Golden sparkle
      if (mole.type === 'golden' && this.frameCount % 20 < 10) {
        ctx.fillStyle = '#fff';
        ctx.font = `${size * 0.4}px Arial`;
        ctx.fillText('*', cx - size * 0.6, y - size * 0.8);
        ctx.fillText('*', cx + size * 0.5, y - size * 0.5);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;
    if (type !== 'down') return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    const holeWidth = w * 0.25;
    const holeHeight = h * 0.12;
    const startX = w * 0.1;
    const startY = h * 0.2;
    const spacingX = w * 0.3;
    const spacingY = h * 0.25;

    // Check which hole was clicked
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const hx = startX + col * spacingX;
        const hy = startY + row * spacingY;

        // Expand hit area
        if (
          x >= hx - 10 &&
          x <= hx + holeWidth + 10 &&
          y >= hy - holeHeight &&
          y <= hy + holeHeight
        ) {
          const index = row * this.gridCols + col;
          this.whack(this.holes[index]);
          return;
        }
      }
    }
  }

  handleKey(key: string, pressed: boolean) {
    if (this.status !== 'playing' || !pressed) return;

    // Number keys 1-9 for quick hits
    const num = parseInt(key);
    if (num >= 1 && num <= 9) {
      const index = num - 1;
      if (index < this.holes.length) {
        this.whack(this.holes[index]);
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
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = 'paused';
    this.spawnTimer = 0;
    this.setupGame();
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
      time: this.timeRemaining,
      status: this.status
    });
  }
}
