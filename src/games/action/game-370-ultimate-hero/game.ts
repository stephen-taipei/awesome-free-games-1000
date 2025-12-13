/**
 * Ultimate Hero Game Engine
 * Game #370 - Ultimate combat action with transformations
 */

type HeroForm = 'normal' | 'fire' | 'ice' | 'thunder';

interface Hero {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; maxHp: number;
  power: number; maxPower: number;
  form: HeroForm;
  facing: 'left' | 'right';
  state: 'idle' | 'run' | 'attack' | 'transform' | 'ultimate' | 'hurt';
  stateTime: number; grounded: boolean;
  invincible: number; transformTimer: number;
}

interface Boss {
  x: number; y: number; vx: number;
  width: number; height: number;
  hp: number; maxHp: number;
  phase: number; attackTimer: number;
  state: 'idle' | 'attack' | 'hurt' | 'enraged';
}

interface Minion {
  x: number; y: number; vx: number;
  width: number; height: number;
  hp: number; element: 'fire' | 'ice' | 'thunder' | 'dark';
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; friendly: boolean;
  element: HeroForm | 'dark';
  life: number;
}

interface Effect {
  x: number; y: number; type: string; life: number; element?: HeroForm;
}

interface GameState {
  score: number; highScore: number;
  hp: number; maxHp: number;
  power: number; maxPower: number;
  form: HeroForm;
  status: 'idle' | 'playing' | 'over' | 'victory';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 340;

export class UltimateHeroGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hero: Hero;
  private boss: Boss | null = null;
  private minions: Minion[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  private score = 0; private highScore = 0;
  private status: 'idle' | 'playing' | 'over' | 'victory' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.hero = this.createHero();
    this.loadHighScore();
    this.setupControls();
  }

  private createHero(): Hero {
    return {
      x: 80, y: GROUND_Y - 60, vx: 0, vy: 0,
      width: 40, height: 60, hp: 100, maxHp: 100,
      power: 0, maxPower: 100, form: 'normal',
      facing: 'right', state: 'idle', stateTime: 0,
      grounded: true, invincible: 0, transformTimer: 0
    };
  }

  private createBoss(): Boss {
    return {
      x: this.canvas.width - 100, y: GROUND_Y - 80,
      vx: 0, width: 70, height: 80,
      hp: 500, maxHp: 500, phase: 1,
      attackTimer: 60, state: 'idle'
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('ultimate_hero_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('ultimate_hero_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore,
        hp: this.hero.hp, maxHp: this.hero.maxHp,
        power: this.hero.power, maxPower: this.hero.maxPower,
        form: this.hero.form, status: this.status
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
      if (e.code === 'KeyX') this.transform();
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
      y: this.hero.y + 25, vx: dir * 12, vy: 0,
      damage: this.hero.form === 'normal' ? 15 : 25,
      friendly: true, element: this.hero.form, life: 35
    });
  }

  private transform() {
    if (this.status !== 'playing' || this.hero.power < 30) return;
    if (this.hero.state === 'transform') return;
    this.hero.power -= 30;
    this.hero.state = 'transform';
    this.hero.stateTime = 0;
    this.hero.invincible = 30;
    // Cycle forms
    const forms: HeroForm[] = ['normal', 'fire', 'ice', 'thunder'];
    const idx = forms.indexOf(this.hero.form);
    this.hero.form = forms[(idx + 1) % forms.length];
    this.hero.transformTimer = 300; // Form lasts for 5 seconds
    this.effects.push({ x: this.hero.x + 20, y: this.hero.y + 30, type: 'transform', life: 25, element: this.hero.form });
    this.emitState();
  }

  private ultimate() {
    if (this.status !== 'playing' || this.hero.power < 70) return;
    if (this.hero.form === 'normal') return;
    this.hero.power -= 70;
    this.hero.state = 'ultimate';
    this.hero.stateTime = 0;
    this.hero.invincible = 40;
    // Create massive attack based on form
    const dir = this.hero.facing === 'right' ? 1 : -1;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.projectiles.push({
        x: this.hero.x + this.hero.width / 2,
        y: this.hero.y + this.hero.height / 2,
        vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
        damage: 50, friendly: true, element: this.hero.form, life: 50
      });
    }
    this.effects.push({ x: this.hero.x + 20, y: this.hero.y + 30, type: 'ultimate', life: 35, element: this.hero.form });
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'jump' && active && this.hero.grounded) {
      this.hero.vy = -14;
      this.hero.grounded = false;
    }
    if (action === 'attack' && active) this.attack();
    if (action === 'transform' && active) this.transform();
    if (action === 'ultimate' && active) this.ultimate();
  }

  start() {
    this.score = 0;
    this.hero = this.createHero();
    this.boss = this.createBoss();
    this.minions = [];
    this.projectiles = [];
    this.effects = [];
    this.spawnTimer = 0;
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnMinion() {
    const elements: ('fire' | 'ice' | 'thunder' | 'dark')[] = ['fire', 'ice', 'thunder', 'dark'];
    const element = elements[Math.floor(Math.random() * elements.length)];
    const fromRight = Math.random() < 0.5;
    this.minions.push({
      x: fromRight ? this.canvas.width + 20 : -30,
      y: GROUND_Y - 40, vx: 0, width: 25, height: 40, hp: 20, element
    });
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
    const h = this.hero;
    const speed = 5;

    if (h.state !== 'hurt' && h.state !== 'transform' && h.state !== 'ultimate') {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        h.vx = -speed; h.facing = 'left';
      } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        h.vx = speed; h.facing = 'right';
      } else {
        h.vx *= 0.8;
      }

      if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && h.grounded) {
        h.vy = -14;
        h.grounded = false;
      }
    }

    h.vy += GRAVITY * dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;

    if (h.y >= GROUND_Y - h.height) {
      h.y = GROUND_Y - h.height;
      h.vy = 0;
      h.grounded = true;
    }
    h.x = Math.max(0, Math.min(this.canvas.width - h.width, h.x));

    h.stateTime += dt;
    h.invincible = Math.max(0, h.invincible - dt);
    h.transformTimer -= dt;

    if (h.transformTimer <= 0 && h.form !== 'normal') {
      h.form = 'normal';
      this.emitState();
    }

    if ((h.state === 'attack' && h.stateTime > 15) ||
        (h.state === 'transform' && h.stateTime > 20) ||
        (h.state === 'ultimate' && h.stateTime > 35) ||
        (h.state === 'hurt' && h.stateTime > 18)) {
      h.state = 'idle';
    }

    if (h.grounded && Math.abs(h.vx) > 0.5 && h.state === 'idle') h.state = 'run';

    // Power regen
    h.power = Math.min(h.maxPower, h.power + 0.08 * dt);

    // Update boss
    if (this.boss) {
      const b = this.boss;
      const dx = h.x - b.x;

      // Movement
      if (Math.abs(dx) > 150) {
        b.vx = dx > 0 ? 1.5 : -1.5;
      } else {
        b.vx *= 0.9;
      }
      b.x += b.vx * dt;

      // Attack
      b.attackTimer -= dt;
      if (b.attackTimer <= 0 && b.state !== 'hurt') {
        b.state = 'attack';
        const dir = dx > 0 ? 1 : -1;
        // Boss shoots based on phase
        const shots = b.phase;
        for (let i = 0; i < shots; i++) {
          this.projectiles.push({
            x: b.x + (dir > 0 ? b.width : 0),
            y: b.y + 30 + i * 15, vx: dir * 6, vy: (i - shots / 2) * 0.5,
            damage: 15, friendly: false, element: 'dark', life: 70
          });
        }
        b.attackTimer = b.state === 'enraged' ? 30 : 50;
      }

      // Enrage at low HP
      if (b.hp < b.maxHp * 0.3 && b.state !== 'enraged') {
        b.state = 'enraged';
        b.phase = 4;
      }
    }

    // Update minions
    for (const m of this.minions) {
      const dx = h.x - m.x;
      m.vx = dx > 0 ? 2 : -2;
      m.x += m.vx * dt;

      // Contact damage
      if (h.invincible <= 0 &&
          Math.abs(m.x - h.x) < 35 && Math.abs(m.y - h.y) < 40) {
        h.hp -= 8;
        h.state = 'hurt';
        h.stateTime = 0;
        h.invincible = 25;
        h.vx = dx > 0 ? -6 : 6;
        this.emitState();
        if (h.hp <= 0) {
          this.status = 'over';
          this.emitState();
          return;
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0 || p.x < -50 || p.x > this.canvas.width + 50 || p.y < -50 || p.y > this.canvas.height + 50) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.friendly) {
        // Hit minions
        for (let j = this.minions.length - 1; j >= 0; j--) {
          const m = this.minions[j];
          if (p.x > m.x && p.x < m.x + m.width && p.y > m.y && p.y < m.y + m.height) {
            // Elemental bonus
            const bonus = (p.element === 'fire' && m.element === 'ice') ||
                         (p.element === 'ice' && m.element === 'thunder') ||
                         (p.element === 'thunder' && m.element === 'fire') ? 2 : 1;
            m.hp -= p.damage * bonus;
            this.effects.push({ x: m.x + m.width / 2, y: m.y + 15, type: 'hit', life: 12, element: p.element as HeroForm });
            if (m.hp <= 0) {
              this.score += 30;
              this.minions.splice(j, 1);
            }
            if (p.element !== h.form) this.projectiles.splice(i, 1);
            this.emitState();
            break;
          }
        }

        // Hit boss
        if (this.boss) {
          const b = this.boss;
          if (p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height) {
            b.hp -= p.damage;
            b.state = 'hurt';
            this.effects.push({ x: p.x, y: p.y, type: 'hit', life: 12, element: p.element as HeroForm });
            this.projectiles.splice(i, 1);
            this.score += 10;
            if (b.hp <= 0) {
              this.score += 1000;
              if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
              this.effects.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, type: 'bossDeath', life: 50 });
              this.boss = null;
              this.status = 'victory';
            }
            this.emitState();
          }
        }
      } else {
        // Hit hero
        if (h.invincible <= 0 &&
            p.x > h.x && p.x < h.x + h.width && p.y > h.y && p.y < h.y + h.height) {
          h.hp -= p.damage;
          h.state = 'hurt';
          h.stateTime = 0;
          h.invincible = 25;
          this.projectiles.splice(i, 1);
          this.emitState();
          if (h.hp <= 0) {
            this.status = 'over';
            this.emitState();
            return;
          }
        }
      }
    }

    // Spawn minions
    this.spawnTimer += dt;
    if (this.spawnTimer > 100 && this.minions.length < 6) {
      this.spawnMinion();
      this.spawnTimer = 0;
    }

    // Update effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const hh = this.canvas.height;

    // Epic background
    const gradient = ctx.createLinearGradient(0, 0, 0, hh);
    gradient.addColorStop(0, '#0a0015');
    gradient.addColorStop(0.5, '#1a0030');
    gradient.addColorStop(1, '#0a0015');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, hh);

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 73) % w;
      const sy = (i * 47) % (GROUND_Y - 30);
      ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 400 + i) * 0.15;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ground with energy effect
    ctx.fillStyle = '#1a0030';
    ctx.fillRect(0, GROUND_Y, w, hh - GROUND_Y);
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(w, GROUND_Y);
    ctx.stroke();

    // Draw boss
    if (this.boss) this.drawBoss();

    // Draw minions
    for (const m of this.minions) this.drawMinion(m);

    // Draw hero
    this.drawHero();

    // Draw projectiles
    for (const p of this.projectiles) {
      const colors = { normal: '#fff', fire: '#e74c3c', ice: '#3498db', thunder: '#f1c40f', dark: '#8e44ad' };
      ctx.fillStyle = colors[p.element];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.element === 'dark' ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (p.friendly && this.hero.form !== 'normal') {
        ctx.strokeStyle = colors[p.element];
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw effects
    for (const e of this.effects) {
      const alpha = e.life / 25;
      ctx.globalAlpha = alpha;
      const colors = { normal: '#fff', fire: '#e74c3c', ice: '#3498db', thunder: '#f1c40f' };
      if (e.type === 'hit') {
        ctx.fillStyle = colors[e.element || 'normal'];
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HIT!', e.x, e.y);
      } else if (e.type === 'transform' || e.type === 'ultimate') {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.type === 'ultimate' ? 80 : 50);
        gradient.addColorStop(0, colors[e.element || 'normal']);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.type === 'ultimate' ? 80 : 50, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'bossDeath') {
        const size = 100 * (1 - alpha);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Boss HP bar at top
    if (this.boss) {
      ctx.fillStyle = '#333';
      ctx.fillRect(w * 0.2, 10, w * 0.6, 12);
      ctx.fillStyle = this.boss.state === 'enraged' ? '#e74c3c' : '#8e44ad';
      ctx.fillRect(w * 0.2, 10, w * 0.6 * (this.boss.hp / this.boss.maxHp), 12);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.2, 10, w * 0.6, 12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', w / 2, 20);
    }
  }

  private drawHero() {
    const ctx = this.ctx;
    const h = this.hero;
    const colors = { normal: '#9b59b6', fire: '#e74c3c', ice: '#3498db', thunder: '#f1c40f' };

    ctx.save();
    if (h.facing === 'left') {
      ctx.translate(h.x + h.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-h.x, 0);
    }

    if (h.invincible > 0 && Math.floor(h.invincible / 3) % 2 === 0) ctx.globalAlpha = 0.5;

    // Aura for transformed states
    if (h.form !== 'normal') {
      ctx.fillStyle = colors[h.form];
      ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 100) * 0.1;
      ctx.beginPath();
      ctx.ellipse(h.x + h.width / 2, h.y + h.height / 2, 35, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = h.invincible > 0 ? 0.5 : 1;
    }

    // Body
    ctx.fillStyle = h.state === 'hurt' ? '#fff' : colors[h.form];
    ctx.fillRect(h.x + 8, h.y + 18, h.width - 16, h.height - 28);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet with form color
    ctx.fillStyle = colors[h.form];
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 8, 12, Math.PI, 0);
    ctx.fill();

    // Form symbol on chest
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const symbols = { normal: 'U', fire: 'F', ice: 'I', thunder: 'T' };
    ctx.fillText(symbols[h.form], h.x + h.width / 2, h.y + 38);

    // Arms/weapon
    if (h.state === 'attack') {
      ctx.fillStyle = colors[h.form];
      ctx.fillRect(h.x + h.width, h.y + 20, 25, 8);
    }

    // Legs
    ctx.fillStyle = '#2c3e50';
    const legOffset = h.state === 'run' ? Math.sin(Date.now() / 80) * 5 : 0;
    ctx.fillRect(h.x + 10, h.y + h.height - 12, 8, 12 + legOffset);
    ctx.fillRect(h.x + h.width - 18, h.y + h.height - 12, 8, 12 - legOffset);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawBoss() {
    const ctx = this.ctx;
    const b = this.boss!;

    // Body
    ctx.fillStyle = b.state === 'hurt' ? '#fff' : (b.state === 'enraged' ? '#c0392b' : '#2c3e50');
    ctx.fillRect(b.x + 10, b.y + 20, b.width - 20, b.height - 30);

    // Head
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2, b.y + 15, 18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = b.state === 'enraged' ? '#e74c3c' : '#8e44ad';
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2 - 8, b.y + 12, 5, 0, Math.PI * 2);
    ctx.arc(b.x + b.width / 2 + 8, b.y + 12, 5, 0, Math.PI * 2);
    ctx.fill();

    // Crown
    ctx.fillStyle = '#8e44ad';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x + 15 + i * 10, b.y);
      ctx.lineTo(b.x + 20 + i * 10, b.y - 15);
      ctx.lineTo(b.x + 25 + i * 10, b.y);
      ctx.fill();
    }

    // Arms
    ctx.fillStyle = '#34495e';
    ctx.fillRect(b.x - 10, b.y + 30, 15, 35);
    ctx.fillRect(b.x + b.width - 5, b.y + 30, 15, 35);
  }

  private drawMinion(m: Minion) {
    const ctx = this.ctx;
    const colors = { fire: '#e74c3c', ice: '#3498db', thunder: '#f1c40f', dark: '#8e44ad' };

    ctx.fillStyle = colors[m.element];
    ctx.fillRect(m.x, m.y + 8, m.width, m.height - 8);

    // Head
    ctx.beginPath();
    ctx.arc(m.x + m.width / 2, m.y + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(m.x + m.width / 2, m.y + 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(m.x, m.y - 6, m.width, 4);
    ctx.fillStyle = colors[m.element];
    ctx.fillRect(m.x, m.y - 6, m.width * (m.hp / 20), 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
