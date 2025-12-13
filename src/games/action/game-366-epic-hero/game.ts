/**
 * Epic Hero Game Engine
 * Game #366 - Epic combat action
 */

interface Hero {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; maxHp: number;
  mana: number; maxMana: number;
  facing: 'left' | 'right';
  state: 'idle' | 'run' | 'attack' | 'skill' | 'ultimate' | 'hurt';
  stateTime: number; grounded: boolean;
  invincible: number;
}

interface Enemy {
  x: number; y: number; vx: number;
  width: number; height: number;
  hp: number; maxHp: number;
  type: 'minion' | 'elite' | 'boss';
  attackTimer: number;
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; friendly: boolean;
  type: 'normal' | 'skill' | 'ultimate';
  life: number;
}

interface Effect {
  x: number; y: number; type: string; life: number; maxLife: number;
}

interface GameState {
  score: number; highScore: number; wave: number;
  hp: number; maxHp: number; mana: number; maxMana: number;
  status: 'idle' | 'playing' | 'over' | 'victory';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 340;

export class EpicHeroGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hero: Hero;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  private score = 0; private highScore = 0; private wave = 1;
  private status: 'idle' | 'playing' | 'over' | 'victory' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private waveTimer = 0;
  private maxWaves = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.hero = this.createHero();
    this.loadHighScore();
    this.setupControls();
  }

  private createHero(): Hero {
    return {
      x: 100, y: GROUND_Y - 60, vx: 0, vy: 0,
      width: 40, height: 60, hp: 100, maxHp: 100,
      mana: 100, maxMana: 100, facing: 'right',
      state: 'idle', stateTime: 0, grounded: true, invincible: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('epic_hero_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('epic_hero_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.hero.hp, maxHp: this.hero.maxHp,
        mana: this.hero.mana, maxMana: this.hero.maxMana,
        status: this.status
      });
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
      if (e.code === 'KeyX') this.skill();
      if (e.code === 'KeyC') this.ultimate();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private attack() {
    if (this.status !== 'playing') return;
    if (this.hero.state !== 'idle' && this.hero.state !== 'run') return;
    this.hero.state = 'attack';
    this.hero.stateTime = 0;
    const dir = this.hero.facing === 'right' ? 1 : -1;
    this.projectiles.push({
      x: this.hero.x + (dir > 0 ? this.hero.width : 0),
      y: this.hero.y + 20, vx: dir * 10, vy: 0,
      damage: 15, friendly: true, type: 'normal', life: 30
    });
  }

  private skill() {
    if (this.status !== 'playing' || this.hero.mana < 25) return;
    if (this.hero.state !== 'idle' && this.hero.state !== 'run') return;
    this.hero.mana -= 25;
    this.hero.state = 'skill';
    this.hero.stateTime = 0;
    const dir = this.hero.facing === 'right' ? 1 : -1;
    for (let i = -1; i <= 1; i++) {
      this.projectiles.push({
        x: this.hero.x + this.hero.width / 2,
        y: this.hero.y + 20, vx: dir * 12, vy: i * 3,
        damage: 20, friendly: true, type: 'skill', life: 40
      });
    }
    this.effects.push({ x: this.hero.x, y: this.hero.y, type: 'skill', life: 20, maxLife: 20 });
    this.emitState();
  }

  private ultimate() {
    if (this.status !== 'playing' || this.hero.mana < 60) return;
    if (this.hero.state !== 'idle' && this.hero.state !== 'run') return;
    this.hero.mana -= 60;
    this.hero.state = 'ultimate';
    this.hero.stateTime = 0;
    this.hero.invincible = 60;
    // Create massive attack
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.projectiles.push({
        x: this.hero.x + this.hero.width / 2,
        y: this.hero.y + this.hero.height / 2,
        vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
        damage: 40, friendly: true, type: 'ultimate', life: 50
      });
    }
    this.effects.push({ x: this.hero.x + this.hero.width / 2, y: this.hero.y + this.hero.height / 2, type: 'ultimate', life: 30, maxLife: 30 });
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'jump' && active && this.hero.grounded) {
      this.hero.vy = -15;
      this.hero.grounded = false;
    }
    if (action === 'attack' && active) this.attack();
    if (action === 'skill' && active) this.skill();
    if (action === 'ultimate' && active) this.ultimate();
  }

  start() {
    this.score = 0; this.wave = 1; this.waveTimer = 0;
    this.hero = this.createHero();
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const type = i === count - 1 && this.wave % 3 === 0 ? 'boss' : (Math.random() < 0.7 ? 'minion' : 'elite');
      const cfg = { minion: { hp: 20, w: 30, h: 40 }, elite: { hp: 50, w: 35, h: 45 }, boss: { hp: 150, w: 50, h: 60 } }[type];
      this.enemies.push({
        x: this.canvas.width + 50 + i * 80, y: GROUND_Y - cfg.h,
        vx: 0, width: cfg.w, height: cfg.h,
        hp: cfg.hp + this.wave * 5, maxHp: cfg.hp + this.wave * 5,
        type, attackTimer: 60 + Math.random() * 60
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
    // Hero movement
    const speed = 5;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.hero.vx = -speed; this.hero.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.hero.vx = speed; this.hero.facing = 'right';
    } else {
      this.hero.vx *= 0.8;
    }

    if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && this.hero.grounded) {
      this.hero.vy = -15;
      this.hero.grounded = false;
    }

    this.hero.vy += GRAVITY * dt;
    this.hero.x += this.hero.vx * dt;
    this.hero.y += this.hero.vy * dt;

    if (this.hero.y >= GROUND_Y - this.hero.height) {
      this.hero.y = GROUND_Y - this.hero.height;
      this.hero.vy = 0;
      this.hero.grounded = true;
    }
    this.hero.x = Math.max(0, Math.min(this.canvas.width - this.hero.width, this.hero.x));

    this.hero.stateTime += dt;
    this.hero.invincible = Math.max(0, this.hero.invincible - dt);
    if ((this.hero.state === 'attack' && this.hero.stateTime > 15) ||
        (this.hero.state === 'skill' && this.hero.stateTime > 20) ||
        (this.hero.state === 'ultimate' && this.hero.stateTime > 40) ||
        (this.hero.state === 'hurt' && this.hero.stateTime > 20)) {
      this.hero.state = 'idle';
    }

    if (this.hero.grounded && Math.abs(this.hero.vx) > 0.5 && this.hero.state === 'idle') {
      this.hero.state = 'run';
    }

    // Mana regen
    this.hero.mana = Math.min(this.hero.maxMana, this.hero.mana + 0.05 * dt);

    // Update enemies
    for (const e of this.enemies) {
      const dx = this.hero.x - e.x;
      e.vx = dx > 0 ? 1.5 : -1.5;
      e.x += e.vx * dt;

      e.attackTimer -= dt;
      if (e.attackTimer <= 0 && Math.abs(dx) < 200) {
        const dir = dx > 0 ? 1 : -1;
        this.projectiles.push({
          x: e.x + (dir > 0 ? e.width : 0),
          y: e.y + e.height / 2, vx: dir * 5, vy: 0,
          damage: e.type === 'boss' ? 20 : 10, friendly: false, type: 'normal', life: 60
        });
        e.attackTimer = e.type === 'boss' ? 40 : 60;
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0 || p.x < -50 || p.x > this.canvas.width + 50) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.friendly) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (p.x > e.x && p.x < e.x + e.width && p.y > e.y && p.y < e.y + e.height) {
            e.hp -= p.damage;
            this.effects.push({ x: p.x, y: p.y, type: 'hit', life: 15, maxLife: 15 });
            if (p.type !== 'ultimate') this.projectiles.splice(i, 1);
            if (e.hp <= 0) {
              this.score += e.type === 'boss' ? 500 : (e.type === 'elite' ? 150 : 50);
              if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
              this.effects.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, type: 'explosion', life: 20, maxLife: 20 });
              this.enemies.splice(j, 1);
            }
            this.emitState();
            break;
          }
        }
      } else if (this.hero.invincible <= 0) {
        if (p.x > this.hero.x && p.x < this.hero.x + this.hero.width &&
            p.y > this.hero.y && p.y < this.hero.y + this.hero.height) {
          this.hero.hp -= p.damage;
          this.hero.state = 'hurt';
          this.hero.stateTime = 0;
          this.hero.invincible = 30;
          this.projectiles.splice(i, 1);
          this.emitState();
          if (this.hero.hp <= 0) {
            this.status = 'over';
            this.emitState();
            return;
          }
        }
      }
    }

    // Update effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }

    // Wave management
    if (this.enemies.length === 0) {
      this.waveTimer += dt;
      if (this.waveTimer > 60) {
        this.wave++;
        this.waveTimer = 0;
        if (this.wave > this.maxWaves) {
          this.status = 'victory';
          this.emitState();
          return;
        }
        this.spawnWave();
        this.emitState();
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Epic background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#2d1b4e');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 73 + Date.now() / 100) % w;
      const sy = (i * 37) % (GROUND_Y - 50);
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 500 + i) * 0.2;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#3d2a5c';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    ctx.fillStyle = '#5a3d7a';
    ctx.fillRect(0, GROUND_Y, w, 4);

    // Draw enemies
    for (const e of this.enemies) this.drawEnemy(e);

    // Draw hero
    this.drawHero();

    // Draw projectiles
    for (const p of this.projectiles) {
      if (p.type === 'ultimate') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#f1c40f');
        gradient.addColorStop(1, '#e74c3c');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'skill') {
        ctx.fillStyle = p.friendly ? '#3498db' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.friendly ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(p.x - 8, p.y - 3, 16, 6);
      }
    }

    // Draw effects
    for (const e of this.effects) {
      const alpha = e.life / e.maxLife;
      ctx.globalAlpha = alpha;
      if (e.type === 'hit') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HIT!', e.x, e.y - 10);
      } else if (e.type === 'explosion') {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 40);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#f1c40f');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 40, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'ultimate') {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 80);
        gradient.addColorStop(0, 'rgba(241,196,15,0.8)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 80, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Wave indicator
    if (this.enemies.length === 0 && this.wave < this.maxWaves) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Wave ${this.wave + 1} incoming...`, w / 2, h / 2);
    }
  }

  private drawHero() {
    const ctx = this.ctx;
    const h = this.hero;

    ctx.save();
    if (h.facing === 'left') {
      ctx.translate(h.x + h.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-h.x, 0);
    }

    // Invincibility flash
    if (h.invincible > 0 && Math.floor(h.invincible / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Cape
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.moveTo(h.x + 5, h.y + 15);
    ctx.lineTo(h.x - 10, h.y + h.height);
    ctx.lineTo(h.x + 15, h.y + h.height);
    ctx.closePath();
    ctx.fill();

    // Body armor
    ctx.fillStyle = h.state === 'hurt' ? '#fff' : '#3498db';
    ctx.fillRect(h.x + 8, h.y + 18, h.width - 16, h.height - 28);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 8, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(h.x + h.width / 2 - 3, h.y - 8, 6, 12);

    // Sword
    ctx.fillStyle = '#bdc3c7';
    if (h.state === 'attack') {
      ctx.fillRect(h.x + h.width, h.y + 15, 30, 6);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(h.x + h.width - 3, h.y + 12, 6, 12);
    } else {
      ctx.fillRect(h.x + h.width - 5, h.y + 20, 6, 25);
    }

    // Legs
    ctx.fillStyle = '#2c3e50';
    const legOffset = h.state === 'run' ? Math.sin(Date.now() / 80) * 6 : 0;
    ctx.fillRect(h.x + 10, h.y + h.height - 12, 8, 12 + legOffset);
    ctx.fillRect(h.x + h.width - 18, h.y + h.height - 12, 8, 12 - legOffset);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { minion: '#c0392b', elite: '#8e44ad', boss: '#2c3e50' };

    // Body
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y + 10, e.width, e.height - 10);

    // Head
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + 8, e.type === 'boss' ? 12 : 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2 - 3, e.y + 6, 2, 0, Math.PI * 2);
    ctx.arc(e.x + e.width / 2 + 3, e.y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Boss crown
    if (e.type === 'boss') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(e.x + e.width / 2 - 10, e.y - 2);
      ctx.lineTo(e.x + e.width / 2 - 5, e.y - 12);
      ctx.lineTo(e.x + e.width / 2, e.y - 5);
      ctx.lineTo(e.x + e.width / 2 + 5, e.y - 12);
      ctx.lineTo(e.x + e.width / 2 + 10, e.y - 2);
      ctx.closePath();
      ctx.fill();
    }

    // HP bar
    const hpPercent = e.hp / e.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x, e.y - 8, e.width, 5);
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(e.x, e.y - 8, e.width * hpPercent, 5);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
