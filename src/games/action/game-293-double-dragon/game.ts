/**
 * Double Dragon Game Engine
 * Game #293 - Classic beat 'em up
 */

interface Fighter {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number; hp: number; maxHp: number;
  facing: 'left' | 'right'; state: 'idle' | 'walk' | 'punch' | 'kick' | 'hurt';
  stateTime: number; grounded: boolean;
}

interface Enemy extends Fighter {
  type: 'thug' | 'punk' | 'boss';
  ai: { nextAction: number };
}

interface GameState {
  score: number; highScore: number; stage: number;
  hp: number; maxHp: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.5;
const GROUND_Y = 320;

export class DoubleDragonGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Fighter;
  private enemies: Enemy[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; text?: string }[] = [];

  private score = 0; private highScore = 0; private stage = 1;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private scrollX = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.loadHighScore();
    this.setupControls();
  }

  private createPlayer(): Fighter {
    return { x: 80, y: GROUND_Y - 48, vx: 0, vy: 0, width: 32, height: 48, hp: 100, maxHp: 100, facing: 'right', state: 'idle', stateTime: 0, grounded: true };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('double_dragon_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('double_dragon_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, highScore: this.highScore, stage: this.stage, hp: this.player.hp, maxHp: this.player.maxHp, status: this.status });
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
      if (e.code === 'KeyZ') this.punch();
      if (e.code === 'KeyX') this.kick();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private punch() {
    if (this.status !== 'playing' || this.player.state === 'punch' || this.player.state === 'kick') return;
    this.player.state = 'punch';
    this.player.stateTime = 0;
    this.checkHit(20, 45);
  }

  private kick() {
    if (this.status !== 'playing' || this.player.state === 'punch' || this.player.state === 'kick') return;
    this.player.state = 'kick';
    this.player.stateTime = 0;
    this.checkHit(25, 55);
  }

  private checkHit(damage: number, range: number) {
    const ax = this.player.facing === 'right' ? this.player.x + this.player.width : this.player.x - range;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.x + e.width > ax && e.x < ax + range && Math.abs(e.y - this.player.y) < 30) {
        e.hp -= damage;
        e.state = 'hurt';
        e.stateTime = 0;
        e.vx = this.player.facing === 'right' ? 6 : -6;
        this.particles.push({ x: e.x + e.width / 2, y: e.y, vx: 0, vy: -2, life: 30, text: `-${damage}` });
        if (e.hp <= 0) {
          this.score += e.type === 'boss' ? 500 : 100;
          if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
          this.enemies.splice(i, 1);
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
    if (action === 'punch' && active) this.punch();
    if (action === 'kick' && active) this.kick();
  }

  start() {
    this.score = 0; this.stage = 1; this.scrollX = 0;
    this.player = this.createPlayer();
    this.spawnEnemies();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextStage() {
    this.stage++;
    this.scrollX = 0;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.x = 80;
    this.spawnEnemies();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) { this.lastTime = performance.now(); this.gameLoop(); }
  }

  private spawnEnemies() {
    this.enemies = [];
    const count = 3 + this.stage * 2;
    for (let i = 0; i < count; i++) {
      const type = i === count - 1 && this.stage % 3 === 0 ? 'boss' : (Math.random() < 0.5 ? 'thug' : 'punk');
      const configs = { thug: { hp: 40, w: 30, h: 46 }, punk: { hp: 30, w: 28, h: 44 }, boss: { hp: 120, w: 38, h: 52 } };
      const cfg = configs[type];
      this.enemies.push({
        x: 300 + i * 150 + Math.random() * 100, y: GROUND_Y - cfg.h,
        vx: 0, vy: 0, width: cfg.w, height: cfg.h, hp: cfg.hp + this.stage * 10, maxHp: cfg.hp + this.stage * 10,
        facing: 'left', state: 'idle', stateTime: 0, grounded: true, type, ai: { nextAction: 30 + Math.random() * 30 }
      });
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
    const speed = 3;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) { this.player.vx = -speed; this.player.facing = 'left'; }
    else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) { this.player.vx = speed; this.player.facing = 'right'; }
    else this.player.vx *= 0.7;

    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) this.player.vy = -speed * 0.7;
    else if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) this.player.vy = speed * 0.7;
    else this.player.vy *= 0.7;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    this.player.y = Math.max(200, Math.min(GROUND_Y - this.player.height, this.player.y));
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));

    this.player.stateTime += dt;
    if ((this.player.state === 'punch' || this.player.state === 'kick') && this.player.stateTime > 18) {
      this.player.state = 'idle';
    }

    for (const e of this.enemies) {
      e.ai.nextAction -= dt;
      if (e.ai.nextAction <= 0 && e.state !== 'hurt') {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        if (Math.abs(dx) < 50 && Math.abs(dy) < 30) {
          e.state = Math.random() < 0.5 ? 'punch' : 'kick';
          e.stateTime = 0;
          if (Math.random() < 0.5) {
            this.player.hp -= e.type === 'boss' ? 15 : 8;
            this.player.state = 'hurt';
            this.player.stateTime = 0;
            this.emitState();
            if (this.player.hp <= 0) { this.status = 'over'; this.emitState(); return; }
          }
          e.ai.nextAction = 40;
        } else {
          e.vx = dx > 0 ? 1.5 : -1.5;
          e.vy = dy > 0 ? 0.8 : -0.8;
          e.facing = dx > 0 ? 'right' : 'left';
          e.state = 'walk';
          e.ai.nextAction = 20;
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.y = Math.max(200, Math.min(GROUND_Y - e.height, e.y));
      e.stateTime += dt;
      if (e.state === 'hurt' && e.stateTime > 15) e.state = 'idle';
      if ((e.state === 'punch' || e.state === 'kick') && e.stateTime > 20) e.state = 'idle';
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.enemies.length === 0) { this.status = 'cleared'; this.emitState(); }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Street
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Buildings (background)
    ctx.fillStyle = '#0f0f1a';
    for (let i = 0; i < 5; i++) {
      const bx = i * 150 - (this.scrollX % 150);
      ctx.fillRect(bx, 100, 80, GROUND_Y - 100);
      ctx.fillStyle = '#1a1a2e';
      for (let wy = 120; wy < GROUND_Y - 20; wy += 30) {
        ctx.fillRect(bx + 10, wy, 15, 20);
        ctx.fillRect(bx + 55, wy, 15, 20);
      }
      ctx.fillStyle = '#0f0f1a';
    }

    // Draw enemies
    for (const e of this.enemies) this.drawFighter(e, e.type === 'boss' ? '#8e44ad' : '#e74c3c');

    // Draw player
    this.drawFighter(this.player, '#3498db');

    // Particles
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      if (p.text) ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawFighter(f: Fighter, color: string) {
    const ctx = this.ctx;
    ctx.save();
    if (f.facing === 'left') {
      ctx.translate(f.x + f.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-f.x, 0);
    }

    ctx.fillStyle = f.state === 'hurt' ? '#fff' : color;
    ctx.fillRect(f.x + 6, f.y + 14, f.width - 12, f.height - 24);

    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, f.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(f.x + 8, f.y + f.height - 12, 6, 12);
    ctx.fillRect(f.x + f.width - 14, f.y + f.height - 12, 6, 12);

    if (f.state === 'punch') {
      ctx.fillStyle = '#f5d6ba';
      ctx.fillRect(f.x + f.width - 2, f.y + 18, 20, 8);
    } else if (f.state === 'kick') {
      ctx.fillStyle = '#2c3e50';
      ctx.save();
      ctx.translate(f.x + f.width - 8, f.y + f.height - 8);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(0, -4, 20, 8);
      ctx.restore();
    }

    ctx.restore();

    // HP bar for enemies
    if ((f as any).type) {
      const hpPercent = f.hp / f.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(f.x, f.y - 10, f.width, 5);
      ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(f.x, f.y - 10, f.width * hpPercent, 5);
    }
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
