/**
 * Subway Surfers Game Engine
 * Game #372 - 3D Lane Runner
 */

interface Surfer {
  lane: number;
  y: number; vy: number;
  state: 'run' | 'jump' | 'roll' | 'hit';
  stateTime: number;
  targetLane: number;
  laneX: number;
}

interface Train {
  z: number; lane: number;
  length: number; color: string;
  passed: boolean;
}

interface Coin {
  z: number; lane: number; y: number;
  collected: boolean;
}

interface Powerup {
  z: number; lane: number;
  type: 'magnet' | 'jetpack' | 'multiplier';
  collected: boolean;
}

interface GameState {
  score: number; highScore: number;
  coins: number;
  status: 'idle' | 'playing' | 'over';
}

type StateCallback = (state: GameState) => void;

export class SubwaySurfersGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private surfer: Surfer;
  private trains: Train[] = [];
  private coins: Coin[] = [];
  private powerups: Powerup[] = [];

  private score = 0; private highScore = 0;
  private coinCount = 0;
  private speed = 10;
  private status: 'idle' | 'playing' | 'over' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private laneWidth = 70;
  private lanes = [0, 0, 0];
  private activePowerup: string | null = null;
  private powerupTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.surfer = this.createSurfer();
    this.loadHighScore();
    this.setupControls();
  }

  private createSurfer(): Surfer {
    return {
      lane: 1, y: 0, vy: 0, state: 'run', stateTime: 0,
      targetLane: 1, laneX: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('subway_surfers_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('subway_surfers_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore,
        coins: this.coinCount, status: this.status
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    this.canvas.width = Math.min(container.getBoundingClientRect().width, 600);
    this.canvas.height = 400;
    this.laneWidth = this.canvas.width / 6;
    this.lanes = [
      this.canvas.width / 2 - this.laneWidth,
      this.canvas.width / 2,
      this.canvas.width / 2 + this.laneWidth
    ];
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.keys.add(e.code);
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.moveLeft();
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.moveRight();
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') this.jump();
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.roll();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private moveLeft() {
    if (this.status !== 'playing' || this.surfer.state === 'hit') return;
    if (this.surfer.targetLane > 0) this.surfer.targetLane--;
  }

  private moveRight() {
    if (this.status !== 'playing' || this.surfer.state === 'hit') return;
    if (this.surfer.targetLane < 2) this.surfer.targetLane++;
  }

  private jump() {
    if (this.status !== 'playing' || this.surfer.state === 'hit') return;
    if (this.surfer.y === 0) {
      this.surfer.vy = -20;
      this.surfer.state = 'jump';
      this.surfer.stateTime = 0;
    }
  }

  private roll() {
    if (this.status !== 'playing' || this.surfer.state === 'hit') return;
    if (this.surfer.y === 0 && this.surfer.state !== 'roll') {
      this.surfer.state = 'roll';
      this.surfer.stateTime = 0;
    }
  }

  handleMobile(action: string, active: boolean) {
    if (!active) return;
    if (action === 'left') this.moveLeft();
    if (action === 'right') this.moveRight();
    if (action === 'jump') this.jump();
    if (action === 'roll') this.roll();
  }

  start() {
    this.score = 0; this.coinCount = 0;
    this.speed = 10;
    this.surfer = this.createSurfer();
    this.trains = [];
    this.coins = [];
    this.powerups = [];
    this.spawnTimer = 0;
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnTrain() {
    const lane = Math.floor(Math.random() * 3);
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
    this.trains.push({
      z: 800, lane,
      length: 150 + Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      passed: false
    });
  }

  private spawnCoins() {
    const lane = Math.floor(Math.random() * 3);
    const count = 3 + Math.floor(Math.random() * 4);
    const y = Math.random() < 0.3 ? 50 : 0;
    for (let i = 0; i < count; i++) {
      this.coins.push({ z: 800 + i * 30, lane, y, collected: false });
    }
  }

  private gameLoop() {
    if (this.status !== 'playing') { this.animationId = null; return; }
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 2);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    const s = this.surfer;

    // Lane movement
    const targetX = this.lanes[s.targetLane];
    s.laneX += (targetX - s.laneX) * 0.25 * dt;
    s.lane = s.targetLane;

    // Jump physics
    if (s.state === 'jump') {
      s.vy += 1.0 * dt;
      s.y += s.vy * dt;
      if (s.y >= 0) {
        s.y = 0;
        s.vy = 0;
        s.state = 'run';
      }
    }

    // Roll duration
    s.stateTime += dt;
    if (s.state === 'roll' && s.stateTime > 20) {
      s.state = 'run';
    }

    // Score
    this.score += Math.floor(this.speed * dt * 0.5);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Increase speed
    this.speed = Math.min(20, 10 + this.score * 0.0005);

    // Powerup timer
    if (this.activePowerup) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.activePowerup = null;
      }
    }

    // Spawning
    this.spawnTimer += dt;
    if (this.spawnTimer > 50) {
      this.spawnTrain();
      if (Math.random() < 0.4) this.spawnCoins();
      this.spawnTimer = 0;
    }

    // Update trains
    for (let i = this.trains.length - 1; i >= 0; i--) {
      const t = this.trains[i];
      t.z -= this.speed * dt;

      if (t.z + t.length < -50) {
        this.trains.splice(i, 1);
        continue;
      }

      // Collision
      if (!t.passed && t.z < 100 && t.z + t.length > 30 && t.lane === s.lane) {
        if (s.y > -60 && s.state !== 'roll') {
          s.state = 'hit';
          this.status = 'over';
          this.emitState();
          return;
        }
        t.passed = true;
      }
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z -= this.speed * dt;

      if (c.z < -50) {
        this.coins.splice(i, 1);
        continue;
      }

      // Collection with magnet
      if (!c.collected) {
        let collectRange = 40;
        if (this.activePowerup === 'magnet') collectRange = 150;

        if (c.z < 120 && c.z > 0) {
          const laneDiff = Math.abs(c.lane - s.lane);
          if (laneDiff === 0 || (this.activePowerup === 'magnet' && laneDiff <= 1)) {
            if (Math.abs(c.y - (-s.y)) < collectRange) {
              c.collected = true;
              this.coinCount++;
            }
          }
        }
      }
    }

    // Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.z -= this.speed * dt;

      if (p.z < -50) {
        this.powerups.splice(i, 1);
        continue;
      }

      if (!p.collected && p.z < 100 && p.z > 30 && p.lane === s.lane) {
        p.collected = true;
        this.activePowerup = p.type;
        this.powerupTimer = 300;
      }
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(0.5, '#34495e');
    gradient.addColorStop(1, '#1a252f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // City background
    ctx.fillStyle = '#1a252f';
    for (let i = 0; i < 8; i++) {
      const bx = i * 90;
      const bh = 80 + Math.sin(i) * 40;
      ctx.fillRect(bx, 100, 70, bh);
    }

    // Tracks
    ctx.fillStyle = '#3d566e';
    ctx.fillRect(0, 280, w, h - 280);

    // Rail lines
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = w / 2 + (i - 1.5) * this.laneWidth;
      ctx.beginPath();
      ctx.moveTo(w / 2, 80);
      ctx.lineTo(x, 350);
      ctx.stroke();
    }

    // Cross ties
    ctx.fillStyle = '#5d4e37';
    for (let i = 0; i < 15; i++) {
      const y = 290 + i * 8;
      const scale = 0.5 + i * 0.03;
      ctx.fillRect(w / 2 - 120 * scale, y, 240 * scale, 4);
    }

    // Draw trains (sorted)
    const sortedTrains = [...this.trains].sort((a, b) => b.z - a.z);
    for (const t of sortedTrains) {
      this.drawTrain(t);
    }

    // Draw coins
    for (const c of this.coins) {
      if (c.collected) continue;
      this.drawCoin(c);
    }

    // Draw surfer
    this.drawSurfer();

    // Powerup indicator
    if (this.activePowerup) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.activePowerup.toUpperCase()}: ${Math.ceil(this.powerupTimer / 60)}s`, w / 2, 30);
    }
  }

  private drawTrain(t: Train) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const scale = Math.max(0.1, 1 - t.z / 800);
    const x = w / 2 + (t.lane - 1) * this.laneWidth * scale;
    const y = 270 - 130 * scale;
    const trainW = 50 * scale;
    const trainH = 80 * scale;

    // Train body
    ctx.fillStyle = t.color;
    ctx.fillRect(x - trainW / 2, y - trainH, trainW, trainH);

    // Windows
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x - trainW / 2 + 5 * scale, y - trainH + 10 * scale, trainW - 10 * scale, 20 * scale);

    // Front
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x - trainW / 2, y - trainH, trainW, 8 * scale);
  }

  private drawCoin(c: Coin) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const scale = Math.max(0.1, 1 - c.z / 800);
    const x = w / 2 + (c.lane - 1) * this.laneWidth * scale;
    const y = 270 - 130 * scale - c.y * scale;
    const size = 12 * scale;

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x, y - size, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  private drawSurfer() {
    const ctx = this.ctx;
    const s = this.surfer;
    const x = s.laneX;
    const baseY = 250;
    const y = baseY + s.y;

    ctx.save();

    if (s.state === 'roll') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y - 15, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const legOffset = s.state === 'run' ? Math.sin(Date.now() / 60) * 10 : 0;

      // Body
      ctx.fillStyle = s.state === 'hit' ? '#e74c3c' : '#e67e22';
      ctx.fillRect(x - 12, y - 45, 24, 30);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(x, y - 55, 12, 0, Math.PI * 2);
      ctx.fill();

      // Cap
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y - 60, 12, Math.PI, 0);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x - 8, y - 18, 6, 18 + legOffset);
      ctx.fillRect(x + 2, y - 18, 6, 18 - legOffset);

      // Shoes
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 10, y - 2 + legOffset, 10, 4);
      ctx.fillRect(x, y - 2 - legOffset, 10, 4);
    }

    ctx.restore();
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
