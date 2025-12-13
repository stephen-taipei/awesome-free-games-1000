/**
 * Future Warrior Game Engine
 * Game #368 - Future combat action
 */

interface Soldier {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  energy: number; maxEnergy: number;
  shield: number; maxShield: number;
  facing: 'left' | 'right';
  state: 'idle' | 'run' | 'shoot' | 'shield' | 'hurt';
  stateTime: number; grounded: boolean;
  shielding: boolean; shootCooldown: number;
}

interface Robot {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; type: 'drone' | 'mech' | 'tank';
  shootTimer: number; state: 'move' | 'attack';
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; friendly: boolean;
  type: 'laser' | 'missile' | 'plasma';
  life: number; target?: Robot;
}

interface Effect {
  x: number; y: number; type: string; life: number;
}

interface GameState {
  score: number; highScore: number;
  energy: number; maxEnergy: number;
  shield: number; maxShield: number;
  status: 'idle' | 'playing' | 'over';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 340;

export class FutureWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private soldier: Soldier;
  private robots: Robot[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  private score = 0; private highScore = 0;
  private status: 'idle' | 'playing' | 'over' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private difficulty = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.soldier = this.createSoldier();
    this.loadHighScore();
    this.setupControls();
  }

  private createSoldier(): Soldier {
    return {
      x: 100, y: GROUND_Y - 55, vx: 0, vy: 0,
      width: 35, height: 55, energy: 100, maxEnergy: 100,
      shield: 100, maxShield: 100, facing: 'right',
      state: 'idle', stateTime: 0, grounded: true,
      shielding: false, shootCooldown: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('future_warrior_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('future_warrior_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore,
        energy: this.soldier.energy, maxEnergy: this.soldier.maxEnergy,
        shield: this.soldier.shield, maxShield: this.soldier.maxShield,
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
      if (e.code === 'KeyZ') this.shootLaser();
      if (e.code === 'KeyX') this.soldier.shielding = true;
      if (e.code === 'KeyC') this.fireMissile();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyX') this.soldier.shielding = false;
    });
  }

  private shootLaser() {
    if (this.status !== 'playing' || this.soldier.shootCooldown > 0) return;
    if (this.soldier.energy < 5) return;
    this.soldier.energy -= 5;
    this.soldier.shootCooldown = 10;
    this.soldier.state = 'shoot';
    this.soldier.stateTime = 0;
    const dir = this.soldier.facing === 'right' ? 1 : -1;
    this.projectiles.push({
      x: this.soldier.x + (dir > 0 ? this.soldier.width : 0),
      y: this.soldier.y + 20, vx: dir * 15, vy: 0,
      damage: 15, friendly: true, type: 'laser', life: 40
    });
    this.emitState();
  }

  private fireMissile() {
    if (this.status !== 'playing' || this.soldier.energy < 30) return;
    this.soldier.energy -= 30;
    const dir = this.soldier.facing === 'right' ? 1 : -1;
    // Find nearest enemy
    let target: Robot | undefined;
    let minDist = Infinity;
    for (const r of this.robots) {
      const dist = Math.abs(r.x - this.soldier.x);
      if (dist < minDist) { minDist = dist; target = r; }
    }
    this.projectiles.push({
      x: this.soldier.x + this.soldier.width / 2,
      y: this.soldier.y, vx: dir * 8, vy: -5,
      damage: 40, friendly: true, type: 'missile', life: 120, target
    });
    this.effects.push({ x: this.soldier.x + this.soldier.width / 2, y: this.soldier.y + 30, type: 'smoke', life: 15 });
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'jump' && active && this.soldier.grounded) {
      this.soldier.vy = -14;
      this.soldier.grounded = false;
    }
    if (action === 'laser' && active) this.shootLaser();
    if (action === 'shield') this.soldier.shielding = active;
    if (action === 'missile' && active) this.fireMissile();
  }

  start() {
    this.score = 0; this.difficulty = 1;
    this.soldier = this.createSoldier();
    this.robots = [];
    this.projectiles = [];
    this.effects = [];
    this.spawnTimer = 0;
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnRobot() {
    const types: ('drone' | 'mech' | 'tank')[] = ['drone', 'mech', 'tank'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + this.difficulty / 4))];
    const cfg = { drone: { hp: 20, w: 30, h: 25 }, mech: { hp: 50, w: 40, h: 55 }, tank: { hp: 80, w: 60, h: 40 } }[type];
    const fromRight = Math.random() < 0.5;
    const y = type === 'drone' ? 100 + Math.random() * 80 : GROUND_Y - cfg.h;
    this.robots.push({
      x: fromRight ? this.canvas.width + 20 : -50,
      y, vx: 0, vy: 0, width: cfg.w, height: cfg.h,
      hp: cfg.hp, type, shootTimer: 60, state: 'move'
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
    const s = this.soldier;
    const speed = s.shielding ? 2 : 5;

    if (s.state !== 'hurt') {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        s.vx = -speed; s.facing = 'left';
      } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        s.vx = speed; s.facing = 'right';
      } else {
        s.vx *= 0.8;
      }

      if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && s.grounded) {
        s.vy = -14;
        s.grounded = false;
      }
    }

    s.vy += GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (s.y >= GROUND_Y - s.height) {
      s.y = GROUND_Y - s.height;
      s.vy = 0;
      s.grounded = true;
    }
    s.x = Math.max(0, Math.min(this.canvas.width - s.width, s.x));

    s.stateTime += dt;
    s.shootCooldown = Math.max(0, s.shootCooldown - dt);

    if (s.state === 'shoot' && s.stateTime > 12) s.state = 'idle';
    if (s.state === 'hurt' && s.stateTime > 20) s.state = 'idle';

    if (s.grounded && Math.abs(s.vx) > 0.5 && s.state === 'idle') s.state = 'run';
    if (s.shielding) s.state = 'shield';

    // Energy regen
    s.energy = Math.min(s.maxEnergy, s.energy + 0.1 * dt);
    // Shield regen when not shielding
    if (!s.shielding) s.shield = Math.min(s.maxShield, s.shield + 0.05 * dt);
    this.emitState();

    // Update robots
    for (const r of this.robots) {
      const dx = s.x - r.x;

      if (r.type === 'drone') {
        r.vy = Math.sin(Date.now() / 300) * 0.8;
        r.vx = dx > 0 ? 2 : -2;
      } else {
        r.vx = dx > 0 ? 1.5 : -1.5;
      }

      r.x += r.vx * dt;
      r.y += r.vy * dt;

      // Shooting
      r.shootTimer -= dt;
      if (r.shootTimer <= 0 && Math.abs(dx) < 400) {
        const dir = dx > 0 ? 1 : -1;
        this.projectiles.push({
          x: r.x + (dir > 0 ? r.width : 0),
          y: r.y + r.height / 2, vx: dir * 6, vy: 0,
          damage: r.type === 'tank' ? 20 : 10, friendly: false,
          type: 'plasma', life: 60
        });
        r.shootTimer = r.type === 'tank' ? 50 : 70;
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Missile homing
      if (p.type === 'missile' && p.target && this.robots.includes(p.target)) {
        const t = p.target;
        const dx = t.x + t.width / 2 - p.x;
        const dy = t.y + t.height / 2 - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          p.vx += (dx / dist) * 0.8;
          p.vy += (dy / dist) * 0.8;
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 10) { p.vx = (p.vx / speed) * 10; p.vy = (p.vy / speed) * 10; }
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0 || p.x < -50 || p.x > this.canvas.width + 50 || p.y < -50 || p.y > this.canvas.height + 50) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.friendly) {
        for (let j = this.robots.length - 1; j >= 0; j--) {
          const r = this.robots[j];
          if (p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height) {
            r.hp -= p.damage;
            this.effects.push({ x: p.x, y: p.y, type: p.type === 'missile' ? 'explosion' : 'spark', life: 15 });
            this.projectiles.splice(i, 1);
            if (r.hp <= 0) {
              this.score += r.type === 'tank' ? 200 : (r.type === 'mech' ? 100 : 50);
              if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
              this.effects.push({ x: r.x + r.width / 2, y: r.y + r.height / 2, type: 'explosion', life: 25 });
              this.robots.splice(j, 1);
              this.difficulty += 0.1;
            }
            this.emitState();
            break;
          }
        }
      } else {
        if (p.x > s.x && p.x < s.x + s.width && p.y > s.y && p.y < s.y + s.height) {
          if (s.shielding && s.shield > 0) {
            s.shield -= p.damage;
            this.effects.push({ x: s.x + s.width / 2, y: s.y + 20, type: 'shieldHit', life: 15 });
            if (s.shield < 0) s.shield = 0;
          } else {
            s.energy -= p.damage;
            s.state = 'hurt';
            s.stateTime = 0;
            if (s.energy <= 0) {
              this.status = 'over';
              this.emitState();
              return;
            }
          }
          this.projectiles.splice(i, 1);
          this.emitState();
        }
      }
    }

    // Spawn robots
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(50, 100 - this.difficulty * 4) && this.robots.length < 8) {
      this.spawnRobot();
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
    const w = this.canvas.width; const h = this.canvas.height;

    // Futuristic city background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Neon grid
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Buildings
    ctx.fillStyle = '#1a1a2e';
    for (let i = 0; i < 5; i++) {
      const bh = 100 + Math.sin(i * 2) * 50;
      ctx.fillRect(i * 130, GROUND_Y - bh, 100, bh);
      // Windows
      ctx.fillStyle = '#00ffff';
      for (let wy = GROUND_Y - bh + 10; wy < GROUND_Y - 10; wy += 20) {
        for (let wx = i * 130 + 10; wx < i * 130 + 90; wx += 25) {
          if (Math.random() > 0.3) ctx.fillRect(wx, wy, 10, 10);
        }
      }
      ctx.fillStyle = '#1a1a2e';
    }

    // Ground
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(w, GROUND_Y);
    ctx.stroke();

    // Draw robots
    for (const r of this.robots) this.drawRobot(r);

    // Draw soldier
    this.drawSoldier();

    // Draw projectiles
    for (const p of this.projectiles) {
      if (p.type === 'laser') {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2, p.y);
        ctx.stroke();
      } else if (p.type === 'missile') {
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(p.x + 10, p.y);
        ctx.lineTo(p.x - 10, p.y - 5);
        ctx.lineTo(p.x - 10, p.y + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#ff0066';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw effects
    for (const e of this.effects) {
      const alpha = e.life / 15;
      ctx.globalAlpha = alpha;
      if (e.type === 'explosion') {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 40);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#ff6600');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 40, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'spark') {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'shieldHit') {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawSoldier() {
    const ctx = this.ctx;
    const s = this.soldier;

    ctx.save();
    if (s.facing === 'left') {
      ctx.translate(s.x + s.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-s.x, 0);
    }

    // Shield effect
    if (s.shielding && s.shield > 0) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(s.x + s.width / 2, s.y + s.height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Body armor
    ctx.fillStyle = s.state === 'hurt' ? '#fff' : '#2c3e50';
    ctx.fillRect(s.x + 5, s.y + 15, s.width - 10, s.height - 25);

    // Helmet
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.arc(s.x + s.width / 2, s.y + 10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(s.x + 8, s.y + 6, s.width - 16, 8);

    // Arm cannon
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(s.x + s.width - 3, s.y + 18, 15, 10);
    ctx.fillStyle = s.state === 'shoot' ? '#00ff00' : '#2ecc71';
    ctx.beginPath();
    ctx.arc(s.x + s.width + 12, s.y + 23, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#1a252f';
    const legOffset = s.state === 'run' ? Math.sin(Date.now() / 80) * 5 : 0;
    ctx.fillRect(s.x + 8, s.y + s.height - 12, 8, 12 + legOffset);
    ctx.fillRect(s.x + s.width - 16, s.y + s.height - 12, 8, 12 - legOffset);

    ctx.restore();
  }

  private drawRobot(r: Robot) {
    const ctx = this.ctx;

    if (r.type === 'drone') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.ellipse(r.x + r.width / 2, r.y + r.height / 2, r.width / 2, r.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Propellers
      ctx.strokeStyle = '#bdc3c7';
      ctx.lineWidth = 2;
      const angle = Date.now() / 20;
      ctx.beginPath();
      ctx.moveTo(r.x + r.width / 2 - 20 * Math.cos(angle), r.y);
      ctx.lineTo(r.x + r.width / 2 + 20 * Math.cos(angle), r.y);
      ctx.stroke();
      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(r.x + r.width / 2, r.y + r.height / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (r.type === 'mech') {
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(r.x + 5, r.y + 15, r.width - 10, r.height - 20);
      // Head
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(r.x + 10, r.y, r.width - 20, 18);
      // Eyes
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(r.x + 12, r.y + 5, 6, 6);
      ctx.fillRect(r.x + r.width - 18, r.y + 5, 6, 6);
      // Legs
      ctx.fillStyle = '#5b2c6f';
      ctx.fillRect(r.x + 8, r.y + r.height - 8, 10, 8);
      ctx.fillRect(r.x + r.width - 18, r.y + r.height - 8, 10, 8);
    } else {
      // Tank
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(r.x, r.y + 15, r.width, r.height - 15);
      // Turret
      ctx.fillStyle = '#229954';
      ctx.fillRect(r.x + 15, r.y, 30, 18);
      // Cannon
      ctx.fillRect(r.x - 15, r.y + 6, 20, 8);
      // Tracks
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(r.x, r.y + r.height - 8, r.width, 8);
    }

    // HP bar
    const maxHp = r.type === 'tank' ? 80 : (r.type === 'mech' ? 50 : 20);
    ctx.fillStyle = '#333';
    ctx.fillRect(r.x, r.y - 8, r.width, 4);
    ctx.fillStyle = r.hp > maxHp * 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(r.x, r.y - 8, r.width * (r.hp / maxHp), 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
