/**
 * Doomsday Survival Game Engine
 * Game #290
 */

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

interface Player extends Entity {
  hp: number;
  maxHp: number;
  food: number;
  facing: 'left' | 'right';
  attacking: boolean;
  attackTime: number;
}

interface Zombie extends Entity {
  hp: number;
  speed: number;
  type: 'normal' | 'fast' | 'tank';
}

interface Item extends Entity {
  type: 'food' | 'medkit' | 'ammo';
  value: number;
}

interface GameState {
  score: number;
  highScore: number;
  day: number;
  hp: number;
  maxHp: number;
  food: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class DoomsdaySurvivalGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private zombies: Zombie[] = [];
  private items: Item[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  private score = 0;
  private highScore = 0;
  private day = 1;
  private dayTimer = 0;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';

  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.loadHighScore();
    this.setupControls();
  }

  private createPlayer(): Player {
    return {
      x: 300, y: 300, vx: 0, vy: 0, width: 32, height: 48,
      hp: 100, maxHp: 100, food: 100, facing: 'right', attacking: false, attackTime: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('doomsday_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('doomsday_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, day: this.day,
        hp: this.player.hp, maxHp: this.player.maxHp, food: this.player.food, status: this.status
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.canvas.width = Math.min(rect.width, 600);
    this.canvas.height = 400;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') { e.preventDefault(); this.attack(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  start() {
    this.score = 0;
    this.day = 1;
    this.dayTimer = 0;
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.zombies = [];
    this.items = [];
    this.particles = [];
    this.spawnWave();
    this.spawnItems();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextDay() {
    this.day++;
    this.dayTimer = 0;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.zombies = [];
    this.items = [];
    this.spawnWave();
    this.spawnItems();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private spawnWave() {
    const count = 3 + this.day * 2;
    for (let i = 0; i < count; i++) {
      const type = Math.random() < 0.7 ? 'normal' : (Math.random() < 0.5 ? 'fast' : 'tank');
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -30; }
      else if (side === 1) { x = this.canvas.width + 30; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 30; }
      else { x = -30; y = Math.random() * this.canvas.height; }

      const configs = {
        normal: { hp: 30, speed: 1.5, width: 28, height: 40 },
        fast: { hp: 15, speed: 3, width: 24, height: 36 },
        tank: { hp: 80, speed: 0.8, width: 36, height: 48 },
      };
      const cfg = configs[type];
      this.zombies.push({ x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height, hp: cfg.hp + this.day * 5, speed: cfg.speed, type });
    }
  }

  private spawnItems() {
    const count = 3 + Math.floor(this.day / 2);
    for (let i = 0; i < count; i++) {
      const type = Math.random() < 0.5 ? 'food' : (Math.random() < 0.5 ? 'medkit' : 'ammo');
      this.items.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 50 + Math.random() * (this.canvas.height - 100),
        vx: 0, vy: 0, width: 20, height: 20,
        type, value: type === 'food' ? 20 : (type === 'medkit' ? 30 : 50)
      });
    }
  }

  private attack() {
    if (this.status !== 'playing' || this.player.attacking) return;
    this.player.attacking = true;
    this.player.attackTime = 0;

    const range = 50;
    const ax = this.player.facing === 'right' ? this.player.x + this.player.width : this.player.x - range;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.x + z.width > ax && z.x < ax + range && Math.abs(z.y - this.player.y) < 40) {
        z.hp -= 25;
        z.vx = this.player.facing === 'right' ? 8 : -8;
        for (let j = 0; j < 4; j++) {
          this.particles.push({ x: z.x + z.width / 2, y: z.y + z.height / 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 20, color: '#27ae60' });
        }
        if (z.hp <= 0) {
          this.score += z.type === 'tank' ? 100 : 50;
          if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
          this.zombies.splice(i, 1);
        }
        this.emitState();
      }
    }
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'attack' && active) this.attack();
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
    const speed = 3.5;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) { this.player.vx = -speed; this.player.facing = 'left'; }
    else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) { this.player.vx = speed; this.player.facing = 'right'; }
    else this.player.vx *= 0.8;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) this.player.vy = -speed;
    else if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) this.player.vy = speed;
    else this.player.vy *= 0.8;

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y + this.player.vy * dt));

    if (this.player.attacking) {
      this.player.attackTime += dt;
      if (this.player.attackTime > 15) this.player.attacking = false;
    }

    // Food drain
    this.player.food -= 0.02 * dt;
    if (this.player.food <= 0) { this.player.food = 0; this.player.hp -= 0.1 * dt; this.emitState(); }

    // Update zombies
    for (const z of this.zombies) {
      const dx = this.player.x - z.x;
      const dy = this.player.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) { z.vx = (dx / dist) * z.speed; z.vy = (dy / dist) * z.speed; }
      z.x += z.vx * dt; z.y += z.vy * dt;

      // Attack player
      if (dist < 30 && Math.random() < 0.03) {
        this.player.hp -= 10;
        this.emitState();
        if (this.player.hp <= 0) { this.status = 'over'; this.emitState(); return; }
      }
    }

    // Collect items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (item.type === 'food') this.player.food = Math.min(100, this.player.food + item.value);
        else if (item.type === 'medkit') this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
        else this.score += item.value;
        this.items.splice(i, 1);
        this.emitState();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.2 * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Day timer
    this.dayTimer += dt;
    if (this.dayTimer >= 600 && this.zombies.length === 0) { this.status = 'cleared'; this.emitState(); }
    else if (this.zombies.length === 0 && this.items.length === 0) { this.status = 'cleared'; this.emitState(); }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#2d2d2d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = '#333';
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Items
    for (const item of this.items) {
      ctx.fillStyle = item.type === 'food' ? '#f39c12' : (item.type === 'medkit' ? '#e74c3c' : '#3498db');
      ctx.fillRect(item.x, item.y, item.width, item.height);
    }

    // Zombies
    for (const z of this.zombies) {
      ctx.fillStyle = z.type === 'tank' ? '#8e44ad' : (z.type === 'fast' ? '#e74c3c' : '#27ae60');
      ctx.fillRect(z.x, z.y, z.width, z.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(z.x + 5, z.y + 8, 5, 5);
      ctx.fillRect(z.x + z.width - 10, z.y + 8, 5, 5);
    }

    // Player
    ctx.save();
    if (this.player.facing === 'left') {
      ctx.translate(this.player.x + this.player.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.player.x, 0);
    }
    ctx.fillStyle = '#3498db';
    ctx.fillRect(this.player.x + 6, this.player.y + 14, 20, 26);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(this.player.x + 16, this.player.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(this.player.x + 8, this.player.y + 40, 6, 10);
    ctx.fillRect(this.player.x + 18, this.player.y + 40, 6, 10);
    if (this.player.attacking) {
      ctx.fillStyle = '#7f8c8d';
      ctx.save();
      ctx.translate(this.player.x + 24, this.player.y + 24);
      ctx.rotate(-Math.PI / 4 + (this.player.attackTime / 15) * Math.PI / 2);
      ctx.fillRect(0, -3, 35, 6);
      ctx.restore();
    }
    ctx.restore();

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 20;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
