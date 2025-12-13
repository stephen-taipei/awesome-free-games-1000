/**
 * Pixel Knight Game Engine
 * Game #292 - Retro-style action platformer
 */

interface Entity {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
}

interface Knight extends Entity {
  hp: number; maxHp: number; facing: 'left' | 'right';
  grounded: boolean; attacking: boolean; attackTime: number;
}

interface Enemy extends Entity {
  hp: number; type: 'slime' | 'bat' | 'skeleton';
  color: string;
}

interface Coin extends Entity {
  collected: boolean;
}

interface GameState {
  score: number; highScore: number; level: number;
  hp: number; maxHp: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 320;

export class PixelKnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private knight: Knight;
  private enemies: Enemy[] = [];
  private coins: Coin[] = [];
  private platforms: { x: number; y: number; w: number }[] = [];

  private score = 0; private highScore = 0; private level = 1;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.knight = this.createKnight();
    this.loadHighScore();
    this.setupControls();
  }

  private createKnight(): Knight {
    return { x: 50, y: GROUND_Y - 32, vx: 0, vy: 0, width: 24, height: 32, hp: 100, maxHp: 100, facing: 'right', grounded: true, attacking: false, attackTime: 0 };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('pixel_knight_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('pixel_knight_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, highScore: this.highScore, level: this.level, hp: this.knight.hp, maxHp: this.knight.maxHp, status: this.status });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    this.canvas.width = Math.min(container.getBoundingClientRect().width, 600);
    this.canvas.height = 400;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyZ') this.attack();
      if (e.code === 'KeyX') this.jump();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private attack() {
    if (this.status !== 'playing' || this.knight.attacking) return;
    this.knight.attacking = true;
    this.knight.attackTime = 0;

    const range = 40;
    const ax = this.knight.facing === 'right' ? this.knight.x + this.knight.width : this.knight.x - range;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.x + e.width > ax && e.x < ax + range && Math.abs(e.y - this.knight.y) < 40) {
        e.hp -= 30;
        if (e.hp <= 0) {
          this.score += 50;
          if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
          this.enemies.splice(i, 1);
        }
        this.emitState();
      }
    }
  }

  private jump() {
    if (this.status !== 'playing' || !this.knight.grounded) return;
    this.knight.vy = -14;
    this.knight.grounded = false;
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'attack' && active) this.attack();
    if (action === 'jump' && active) this.jump();
  }

  start() {
    this.score = 0; this.level = 1;
    this.knight = this.createKnight();
    this.generateLevel();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    this.knight.hp = Math.min(this.knight.maxHp, this.knight.hp + 20);
    this.knight.x = 50; this.knight.y = GROUND_Y - 32;
    this.generateLevel();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) { this.lastTime = performance.now(); this.gameLoop(); }
  }

  private generateLevel() {
    this.enemies = [];
    this.coins = [];
    this.platforms = [
      { x: 150, y: 250, w: 80 },
      { x: 300, y: 200, w: 100 },
      { x: 450, y: 270, w: 80 },
    ];

    const enemyCount = 2 + this.level;
    for (let i = 0; i < enemyCount; i++) {
      const type = Math.random() < 0.5 ? 'slime' : (Math.random() < 0.5 ? 'bat' : 'skeleton');
      const configs = { slime: { hp: 20, w: 24, h: 20, color: '#27ae60' }, bat: { hp: 15, w: 20, h: 16, color: '#8e44ad' }, skeleton: { hp: 40, w: 24, h: 32, color: '#bdc3c7' } };
      const cfg = configs[type];
      this.enemies.push({
        x: 200 + Math.random() * 300, y: type === 'bat' ? 150 + Math.random() * 100 : GROUND_Y - cfg.h,
        vx: (Math.random() - 0.5) * 2, vy: 0, width: cfg.w, height: cfg.h, hp: cfg.hp + this.level * 5, type, color: cfg.color
      });
    }

    for (let i = 0; i < 5 + this.level; i++) {
      this.coins.push({ x: 100 + Math.random() * 400, y: 100 + Math.random() * 180, vx: 0, vy: 0, width: 12, height: 12, collected: false });
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
    const speed = 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) { this.knight.vx = -speed; this.knight.facing = 'left'; }
    else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) { this.knight.vx = speed; this.knight.facing = 'right'; }
    else this.knight.vx *= 0.8;

    this.knight.vy += GRAVITY * dt;
    this.knight.x += this.knight.vx * dt;
    this.knight.y += this.knight.vy * dt;

    if (this.knight.y >= GROUND_Y - this.knight.height) {
      this.knight.y = GROUND_Y - this.knight.height;
      this.knight.vy = 0;
      this.knight.grounded = true;
    }

    for (const p of this.platforms) {
      if (this.knight.vy > 0 && this.knight.x + this.knight.width > p.x && this.knight.x < p.x + p.w &&
          this.knight.y + this.knight.height > p.y && this.knight.y + this.knight.height < p.y + 15) {
        this.knight.y = p.y - this.knight.height;
        this.knight.vy = 0;
        this.knight.grounded = true;
      }
    }

    this.knight.x = Math.max(0, Math.min(this.canvas.width - this.knight.width, this.knight.x));

    if (this.knight.attacking) {
      this.knight.attackTime += dt;
      if (this.knight.attackTime > 15) this.knight.attacking = false;
    }

    for (const e of this.enemies) {
      e.x += e.vx * dt;
      if (e.x < 100 || e.x > this.canvas.width - 100) e.vx *= -1;

      const dx = this.knight.x - e.x;
      const dy = this.knight.y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30 && !this.knight.attacking) {
        if (Math.random() < 0.02) {
          this.knight.hp -= 10;
          this.emitState();
          if (this.knight.hp <= 0) { this.status = 'over'; this.emitState(); return; }
        }
      }
    }

    for (const c of this.coins) {
      if (!c.collected) {
        const dx = this.knight.x - c.x; const dy = this.knight.y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          c.collected = true;
          this.score += 10;
          if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
          this.emitState();
        }
      }
    }

    if (this.enemies.length === 0 && this.coins.every(c => c.collected)) {
      this.status = 'cleared';
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Platforms
    ctx.fillStyle = '#5d4037';
    for (const p of this.platforms) ctx.fillRect(p.x, p.y, p.w, 15);

    // Coins
    ctx.fillStyle = '#f1c40f';
    for (const c of this.coins) {
      if (!c.collected) {
        ctx.beginPath();
        ctx.arc(c.x + 6, c.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.width, e.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x + 4, e.y + 4, 4, 4);
      ctx.fillRect(e.x + e.width - 8, e.y + 4, 4, 4);
    }

    // Knight (pixel style)
    ctx.save();
    if (this.knight.facing === 'left') {
      ctx.translate(this.knight.x + this.knight.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.knight.x, 0);
    }

    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(this.knight.x + 4, this.knight.y + 12, 16, 12);

    // Head/Helmet
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(this.knight.x + 4, this.knight.y, 16, 12);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(this.knight.x + 8, this.knight.y + 4, 8, 4);

    // Legs
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(this.knight.x + 4, this.knight.y + 24, 6, 8);
    ctx.fillRect(this.knight.x + 14, this.knight.y + 24, 6, 8);

    // Sword
    if (this.knight.attacking) {
      ctx.fillStyle = '#bdc3c7';
      ctx.save();
      ctx.translate(this.knight.x + 20, this.knight.y + 14);
      ctx.rotate(-Math.PI / 4 + (this.knight.attackTime / 15) * Math.PI / 2);
      ctx.fillRect(0, -2, 24, 4);
      ctx.restore();
    } else {
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(this.knight.x + 20, this.knight.y + 10, 4, 16);
    }

    ctx.restore();
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
