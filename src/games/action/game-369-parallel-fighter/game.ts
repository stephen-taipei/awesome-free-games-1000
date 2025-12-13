/**
 * Parallel Fighter Game Engine
 * Game #369 - Parallel world combat
 */

interface Fighter {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; maxHp: number;
  dimension: 0 | 1;
  facing: 'left' | 'right';
  state: 'idle' | 'run' | 'attack' | 'hurt';
  stateTime: number; grounded: boolean;
  invincible: number;
}

interface Enemy {
  x: number; y: number; vx: number;
  width: number; height: number;
  hp: number; dimension: 0 | 1;
  attackTimer: number;
}

interface Portal {
  x: number; y: number; dimension: 0 | 1;
}

interface Effect {
  x: number; y: number; type: string; life: number; dimension: 0 | 1;
}

interface GameState {
  score: number; highScore: number;
  hp: number; maxHp: number;
  activeDimension: 0 | 1;
  status: 'idle' | 'playing' | 'over';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 170; // Each dimension has its own ground

export class ParallelFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fighters: [Fighter, Fighter];
  private enemies: Enemy[] = [];
  private portals: Portal[] = [];
  private effects: Effect[] = [];

  private score = 0; private highScore = 0;
  private activeDimension: 0 | 1 = 0;
  private status: 'idle' | 'playing' | 'over' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.fighters = [this.createFighter(0), this.createFighter(1)];
    this.loadHighScore();
    this.setupControls();
  }

  private createFighter(dimension: 0 | 1): Fighter {
    return {
      x: 80, y: GROUND_Y - 50, vx: 0, vy: 0,
      width: 30, height: 50, hp: 100, maxHp: 100,
      dimension, facing: 'right', state: 'idle',
      stateTime: 0, grounded: true, invincible: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('parallel_fighter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('parallel_fighter_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      const f = this.fighters[this.activeDimension];
      this.onStateChange({
        score: this.score, highScore: this.highScore,
        hp: f.hp, maxHp: f.maxHp,
        activeDimension: this.activeDimension, status: this.status
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
      if (e.code === 'KeyX') this.switchDimension();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private attack() {
    if (this.status !== 'playing') return;
    const f = this.fighters[this.activeDimension];
    if (f.state === 'attack' || f.state === 'hurt') return;
    f.state = 'attack';
    f.stateTime = 0;
  }

  private switchDimension() {
    if (this.status !== 'playing') return;
    this.activeDimension = this.activeDimension === 0 ? 1 : 0;
    this.effects.push({
      x: this.fighters[this.activeDimension].x + 15,
      y: this.fighters[this.activeDimension].y + 25,
      type: 'switch', life: 20, dimension: this.activeDimension
    });
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'jump' && active) {
      const f = this.fighters[this.activeDimension];
      if (f.grounded) { f.vy = -12; f.grounded = false; }
    }
    if (action === 'attack' && active) this.attack();
    if (action === 'switch' && active) this.switchDimension();
  }

  start() {
    this.score = 0;
    this.activeDimension = 0;
    this.fighters = [this.createFighter(0), this.createFighter(1)];
    this.enemies = [];
    this.portals = [];
    this.effects = [];
    this.spawnTimer = 0;
    // Create portals
    for (let i = 0; i < 3; i++) {
      this.portals.push({ x: 150 + i * 180, y: GROUND_Y - 60, dimension: 0 });
      this.portals.push({ x: 150 + i * 180, y: GROUND_Y - 60, dimension: 1 });
    }
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnEnemy(dimension: 0 | 1) {
    const fromRight = Math.random() < 0.5;
    this.enemies.push({
      x: fromRight ? this.canvas.width + 20 : -40,
      y: GROUND_Y - 45, vx: 0, width: 28, height: 45,
      hp: 30, dimension, attackTimer: 60
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
    // Update both fighters
    for (let d = 0; d < 2; d++) {
      const f = this.fighters[d as 0 | 1];
      const isActive = d === this.activeDimension;
      const speed = 4;

      if (isActive && f.state !== 'hurt') {
        if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
          f.vx = -speed; f.facing = 'left';
        } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
          f.vx = speed; f.facing = 'right';
        } else {
          f.vx *= 0.8;
        }

        if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && f.grounded) {
          f.vy = -12;
          f.grounded = false;
        }
      } else if (!isActive) {
        // Inactive fighter mirrors movement slightly delayed
        const active = this.fighters[this.activeDimension];
        f.vx = active.vx * 0.7;
        f.facing = active.facing;
      }

      f.vy += GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      if (f.y >= GROUND_Y - f.height) {
        f.y = GROUND_Y - f.height;
        f.vy = 0;
        f.grounded = true;
      }
      f.x = Math.max(0, Math.min(this.canvas.width - f.width, f.x));

      f.stateTime += dt;
      f.invincible = Math.max(0, f.invincible - dt);

      if (f.state === 'attack' && f.stateTime > 15) f.state = 'idle';
      if (f.state === 'hurt' && f.stateTime > 18) f.state = 'idle';

      if (f.grounded && Math.abs(f.vx) > 0.5 && f.state === 'idle') f.state = 'run';

      // Attack hit detection
      if (f.state === 'attack' && f.stateTime > 5 && f.stateTime < 12) {
        const range = 50;
        const attackX = f.facing === 'right' ? f.x + f.width : f.x - range;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.dimension !== d) continue;
          if (e.x + e.width > attackX && e.x < attackX + range && Math.abs(e.y - f.y) < 35) {
            e.hp -= 20;
            e.vx = f.facing === 'right' ? 8 : -8;
            this.effects.push({ x: e.x + e.width / 2, y: e.y + 20, type: 'hit', life: 12, dimension: d as 0 | 1 });
            if (e.hp <= 0) {
              this.score += 50;
              if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
              this.effects.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, type: 'death', life: 18, dimension: d as 0 | 1 });
              this.enemies.splice(i, 1);
            }
            this.emitState();
          }
        }
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      const f = this.fighters[e.dimension];
      const dx = f.x - e.x;
      e.vx = dx > 0 ? 1.5 : -1.5;
      e.x += e.vx * dt;
      e.vx *= 0.95;

      e.attackTimer -= dt;
      if (e.attackTimer <= 0 && Math.abs(dx) < 45) {
        e.attackTimer = 50;
        if (f.invincible <= 0) {
          f.hp -= 12;
          f.state = 'hurt';
          f.stateTime = 0;
          f.invincible = 25;
          f.vx = dx > 0 ? -5 : 5;
          this.emitState();
          if (f.hp <= 0) {
            // Check if both dead
            if (this.fighters[0].hp <= 0 && this.fighters[1].hp <= 0) {
              this.status = 'over';
              this.emitState();
              return;
            }
            // Switch to other if available
            if (this.fighters[1 - e.dimension].hp > 0) {
              this.activeDimension = (1 - e.dimension) as 0 | 1;
              this.emitState();
            }
          }
        }
      }
    }

    // Spawn enemies
    this.spawnTimer += dt;
    if (this.spawnTimer > 80 && this.enemies.length < 8) {
      this.spawnEnemy(Math.random() < 0.5 ? 0 : 1);
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

    // Draw both dimensions
    for (let d = 0; d < 2; d++) {
      const yOffset = d * (h / 2);
      const isActive = d === this.activeDimension;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, yOffset, w, h / 2);
      ctx.clip();

      // Background
      const gradient = ctx.createLinearGradient(0, yOffset, 0, yOffset + h / 2);
      if (d === 0) {
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(1, '#2d1b4e');
      } else {
        gradient.addColorStop(0, '#0a2e1a');
        gradient.addColorStop(1, '#1b4e2d');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, yOffset, w, h / 2);

      // Ground
      ctx.fillStyle = d === 0 ? '#3d2a5c' : '#2a5c3d';
      ctx.fillRect(0, yOffset + GROUND_Y, w, h / 2 - GROUND_Y);

      // Dimension label
      ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(d === 0 ? 'DIMENSION A' : 'DIMENSION B', 10, yOffset + 20);

      // Active indicator
      if (isActive) {
        ctx.strokeStyle = d === 0 ? '#9b59b6' : '#27ae60';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, yOffset + 2, w - 4, h / 2 - 4);
      }

      // Draw portals
      for (const p of this.portals) {
        if (p.dimension !== d) continue;
        ctx.fillStyle = d === 0 ? 'rgba(155,89,182,0.3)' : 'rgba(39,174,96,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, yOffset + p.y + 30, 20, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = d === 0 ? '#9b59b6' : '#27ae60';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw enemies in this dimension
      for (const e of this.enemies) {
        if (e.dimension !== d) continue;
        this.drawEnemy(e, yOffset);
      }

      // Draw fighter
      this.drawFighter(this.fighters[d as 0 | 1], yOffset, isActive);

      // Draw effects
      for (const e of this.effects) {
        if (e.dimension !== d) continue;
        const alpha = e.life / 15;
        ctx.globalAlpha = alpha;
        if (e.type === 'hit') {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('HIT!', e.x, yOffset + e.y);
        } else if (e.type === 'death') {
          ctx.fillStyle = d === 0 ? '#9b59b6' : '#27ae60';
          ctx.beginPath();
          ctx.arc(e.x, yOffset + e.y, 25, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 'switch') {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, yOffset + e.y, 40 * (1 - alpha), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // Divider line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  private drawFighter(f: Fighter, yOffset: number, isActive: boolean) {
    const ctx = this.ctx;

    ctx.save();
    if (f.facing === 'left') {
      ctx.translate(f.x + f.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-f.x, 0);
    }

    const alpha = isActive ? 1 : 0.6;
    ctx.globalAlpha = f.invincible > 0 && Math.floor(f.invincible / 3) % 2 === 0 ? 0.4 : alpha;

    // Body
    ctx.fillStyle = f.state === 'hurt' ? '#fff' : (f.dimension === 0 ? '#9b59b6' : '#27ae60');
    ctx.fillRect(f.x + 5, yOffset + f.y + 12, f.width - 10, f.height - 18);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, yOffset + f.y + 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = f.dimension === 0 ? '#8e44ad' : '#1e8449';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, yOffset + f.y + 4, 10, Math.PI, 0);
    ctx.fill();

    // Weapon
    if (f.state === 'attack') {
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(f.x + f.width, yOffset + f.y + 15, 25, 5);
    }

    // Legs
    ctx.fillStyle = '#2c3e50';
    const legOffset = f.state === 'run' ? Math.sin(Date.now() / 80) * 5 : 0;
    ctx.fillRect(f.x + 7, yOffset + f.y + f.height - 10, 6, 10 + legOffset);
    ctx.fillRect(f.x + f.width - 13, yOffset + f.y + f.height - 10, 6, 10 - legOffset);

    ctx.globalAlpha = 1;
    ctx.restore();

    // HP bar for this fighter
    if (isActive) {
      const hpPercent = f.hp / f.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(f.x - 5, yOffset + f.y - 12, f.width + 10, 6);
      ctx.fillStyle = hpPercent > 0.3 ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(f.x - 5, yOffset + f.y - 12, (f.width + 10) * hpPercent, 6);
    }
  }

  private drawEnemy(e: Enemy, yOffset: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(e.x, yOffset + e.y + 10, e.width, e.height - 10);

    // Head
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, yOffset + e.y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2 - 3, yOffset + e.y + 6, 2, 0, Math.PI * 2);
    ctx.arc(e.x + e.width / 2 + 3, yOffset + e.y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x, yOffset + e.y - 6, e.width, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(e.x, yOffset + e.y - 6, e.width * (e.hp / 30), 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
