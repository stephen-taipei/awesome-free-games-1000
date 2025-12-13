/**
 * Temple Run Game Engine
 * Game #371 - Endless runner
 */

interface Runner {
  lane: number; // 0, 1, 2 (left, center, right)
  y: number; vy: number;
  state: 'run' | 'jump' | 'slide' | 'hit';
  stateTime: number;
  targetLane: number;
  laneX: number;
}

interface Obstacle {
  z: number; lane: number;
  type: 'pillar' | 'fire' | 'gap' | 'low';
  passed: boolean;
}

interface Coin {
  z: number; lane: number;
  collected: boolean;
  y: number;
}

interface GameState {
  score: number; highScore: number;
  coins: number; distance: number;
  status: 'idle' | 'playing' | 'over';
}

type StateCallback = (state: GameState) => void;

export class TempleRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private runner: Runner;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];

  private score = 0; private highScore = 0;
  private coinCount = 0; private distance = 0;
  private speed = 8;
  private status: 'idle' | 'playing' | 'over' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private laneWidth = 80;
  private lanes = [0, 0, 0];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.runner = this.createRunner();
    this.loadHighScore();
    this.setupControls();
  }

  private createRunner(): Runner {
    return {
      lane: 1, y: 0, vy: 0, state: 'run', stateTime: 0,
      targetLane: 1, laneX: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('temple_run_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('temple_run_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore,
        coins: this.coinCount, distance: Math.floor(this.distance),
        status: this.status
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    this.canvas.width = Math.min(container.getBoundingClientRect().width, 600);
    this.canvas.height = 400;
    this.laneWidth = this.canvas.width / 5;
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
        if (e.code === 'ArrowDown' || e.code === 'KeyS') this.slide();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private moveLeft() {
    if (this.status !== 'playing' || this.runner.state === 'hit') return;
    if (this.runner.targetLane > 0) this.runner.targetLane--;
  }

  private moveRight() {
    if (this.status !== 'playing' || this.runner.state === 'hit') return;
    if (this.runner.targetLane < 2) this.runner.targetLane++;
  }

  private jump() {
    if (this.status !== 'playing' || this.runner.state === 'hit') return;
    if (this.runner.y === 0) {
      this.runner.vy = -18;
      this.runner.state = 'jump';
      this.runner.stateTime = 0;
    }
  }

  private slide() {
    if (this.status !== 'playing' || this.runner.state === 'hit') return;
    if (this.runner.y === 0 && this.runner.state !== 'slide') {
      this.runner.state = 'slide';
      this.runner.stateTime = 0;
    }
  }

  handleMobile(action: string, active: boolean) {
    if (!active) return;
    if (action === 'left') this.moveLeft();
    if (action === 'right') this.moveRight();
    if (action === 'jump') this.jump();
    if (action === 'slide') this.slide();
  }

  start() {
    this.score = 0; this.coinCount = 0; this.distance = 0;
    this.speed = 8;
    this.runner = this.createRunner();
    this.obstacles = [];
    this.coins = [];
    this.spawnTimer = 0;
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnObstacle() {
    const types: ('pillar' | 'fire' | 'gap' | 'low')[] = ['pillar', 'fire', 'gap', 'low'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    this.obstacles.push({ z: 800, lane, type, passed: false });
  }

  private spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    const y = Math.random() < 0.3 ? 60 : 0;
    this.coins.push({ z: 800, lane, collected: false, y });
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
    const r = this.runner;

    // Lane movement
    const targetX = this.lanes[r.targetLane];
    r.laneX += (targetX - r.laneX) * 0.2 * dt;
    r.lane = r.targetLane;

    // Jump physics
    if (r.state === 'jump') {
      r.vy += 0.8 * dt;
      r.y += r.vy * dt;
      if (r.y >= 0) {
        r.y = 0;
        r.vy = 0;
        r.state = 'run';
      }
    }

    // Slide duration
    r.stateTime += dt;
    if (r.state === 'slide' && r.stateTime > 25) {
      r.state = 'run';
    }

    // Update distance and score
    this.distance += this.speed * dt * 0.1;
    this.score = Math.floor(this.distance) + this.coinCount * 10;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    // Increase speed
    this.speed = 8 + this.distance * 0.01;

    // Spawn obstacles and coins
    this.spawnTimer += dt;
    if (this.spawnTimer > 40) {
      this.spawnObstacle();
      if (Math.random() < 0.5) this.spawnCoin();
      this.spawnTimer = 0;
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z -= this.speed * dt;

      if (o.z < -100) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Collision detection
      if (!o.passed && o.z < 100 && o.z > 20 && o.lane === r.lane) {
        let hit = false;
        if (o.type === 'pillar' || o.type === 'fire') {
          if (r.y > -40) hit = true;
        } else if (o.type === 'gap') {
          if (r.y > -50) hit = true;
        } else if (o.type === 'low') {
          if (r.state !== 'slide') hit = true;
        }

        if (hit) {
          r.state = 'hit';
          this.status = 'over';
          this.emitState();
          return;
        }
        o.passed = true;
      }
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z -= this.speed * dt;

      if (c.z < -100) {
        this.coins.splice(i, 1);
        continue;
      }

      // Collection
      if (!c.collected && c.z < 100 && c.z > 20 && c.lane === r.lane) {
        if (Math.abs(c.y - (-r.y)) < 40) {
          c.collected = true;
          this.coinCount++;
          this.emitState();
        }
      }
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#2d1b4e');
    gradient.addColorStop(1, '#4a2c6e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Temple background
    ctx.fillStyle = '#3d2a5c';
    for (let i = 0; i < 5; i++) {
      const bx = i * 140 - (this.distance * 2) % 140;
      ctx.fillRect(bx, 50, 100, 200);
      ctx.fillStyle = '#5a3d7a';
      ctx.fillRect(bx + 10, 80, 30, 40);
      ctx.fillRect(bx + 60, 80, 30, 40);
      ctx.fillStyle = '#3d2a5c';
    }

    // Ground
    ctx.fillStyle = '#2d1b4e';
    ctx.fillRect(0, 280, w, h - 280);

    // Draw lanes (perspective)
    ctx.strokeStyle = '#5a3d7a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = w / 2 + (i - 1.5) * this.laneWidth;
      ctx.beginPath();
      ctx.moveTo(w / 2, 100);
      ctx.lineTo(x, 350);
      ctx.stroke();
    }

    // Draw obstacles (sorted by z)
    const sortedObs = [...this.obstacles].sort((a, b) => b.z - a.z);
    for (const o of sortedObs) {
      this.drawObstacle(o);
    }

    // Draw coins
    for (const c of this.coins) {
      if (c.collected) continue;
      this.drawCoin(c);
    }

    // Draw runner
    this.drawRunner();
  }

  private drawObstacle(o: Obstacle) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const scale = Math.max(0.1, 1 - o.z / 800);
    const x = w / 2 + (o.lane - 1) * this.laneWidth * scale;
    const y = 280 - 150 * scale;
    const size = 60 * scale;

    if (o.type === 'pillar') {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x - size / 2, y - size * 2, size, size * 2);
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(x - size / 2 - 5, y - size * 2, size + 10, 15);
    } else if (o.type === 'fire') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(x, y - size * 1.5);
      ctx.lineTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size / 3, y);
      ctx.lineTo(x + size / 3, y);
      ctx.closePath();
      ctx.fill();
    } else if (o.type === 'gap') {
      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(x - size, y - 10, size * 2, 30);
    } else if (o.type === 'low') {
      ctx.fillStyle = '#654321';
      ctx.fillRect(x - size / 2, y - size * 0.8, size, size * 0.5);
      ctx.fillStyle = '#8B4513';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - size / 2 + i * size / 3, y - size * 1.2, 5, size * 0.4);
      }
    }
  }

  private drawCoin(c: Coin) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const scale = Math.max(0.1, 1 - c.z / 800);
    const x = w / 2 + (c.lane - 1) * this.laneWidth * scale;
    const y = 280 - 150 * scale - c.y * scale;
    const size = 15 * scale;

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x, y - size, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  private drawRunner() {
    const ctx = this.ctx;
    const r = this.runner;
    const x = r.laneX;
    const baseY = 260;
    const y = baseY + r.y;

    ctx.save();

    if (r.state === 'slide') {
      // Sliding pose
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x - 25, y - 15, 50, 20);
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(x + 20, y - 10, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Running/jumping pose
      const legOffset = r.state === 'run' ? Math.sin(Date.now() / 80) * 8 : 0;

      // Body
      ctx.fillStyle = r.state === 'hit' ? '#e74c3c' : '#3498db';
      ctx.fillRect(x - 15, y - 50, 30, 35);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(x, y - 60, 12, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x - 10, y - 18, 8, 18 + legOffset);
      ctx.fillRect(x + 2, y - 18, 8, 18 - legOffset);
    }

    ctx.restore();
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
