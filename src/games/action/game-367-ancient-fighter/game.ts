/**
 * Ancient Fighter Game Engine
 * Game #367 - Ancient combat action
 */

interface Warrior {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; maxHp: number;
  facing: 'left' | 'right';
  state: 'idle' | 'run' | 'sword' | 'shield' | 'charge' | 'hurt';
  stateTime: number; grounded: boolean;
  shielding: boolean; charging: boolean;
  invincible: number; combo: number; comboTimer: number;
}

interface Enemy {
  x: number; y: number; vx: number;
  width: number; height: number;
  hp: number; type: 'skeleton' | 'mummy' | 'pharaoh';
  attackTimer: number; state: 'idle' | 'attack' | 'hurt';
  stateTime: number;
}

interface Effect {
  x: number; y: number; type: string; life: number;
}

interface GameState {
  score: number; highScore: number; combo: number;
  hp: number; maxHp: number;
  status: 'idle' | 'playing' | 'over';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.7;
const GROUND_Y = 340;

export class AncientFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private warrior: Warrior;
  private enemies: Enemy[] = [];
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
    this.warrior = this.createWarrior();
    this.loadHighScore();
    this.setupControls();
  }

  private createWarrior(): Warrior {
    return {
      x: 100, y: GROUND_Y - 60, vx: 0, vy: 0,
      width: 40, height: 60, hp: 100, maxHp: 100,
      facing: 'right', state: 'idle', stateTime: 0,
      grounded: true, shielding: false, charging: false,
      invincible: 0, combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('ancient_fighter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('ancient_fighter_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, combo: this.warrior.combo,
        hp: this.warrior.hp, maxHp: this.warrior.maxHp, status: this.status
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
      if (e.code === 'KeyZ') this.swordAttack();
      if (e.code === 'KeyX') this.warrior.shielding = true;
      if (e.code === 'KeyC') this.charge();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyX') this.warrior.shielding = false;
    });
  }

  private swordAttack() {
    if (this.status !== 'playing') return;
    if (this.warrior.state === 'sword' || this.warrior.state === 'charge' || this.warrior.shielding) return;
    this.warrior.state = 'sword';
    this.warrior.stateTime = 0;
  }

  private charge() {
    if (this.status !== 'playing') return;
    if (this.warrior.state !== 'idle' && this.warrior.state !== 'run') return;
    this.warrior.state = 'charge';
    this.warrior.stateTime = 0;
    this.warrior.charging = true;
    this.warrior.vx = this.warrior.facing === 'right' ? 15 : -15;
    this.warrior.invincible = 20;
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'jump' && active && this.warrior.grounded) {
      this.warrior.vy = -14;
      this.warrior.grounded = false;
    }
    if (action === 'sword' && active) this.swordAttack();
    if (action === 'shield') this.warrior.shielding = active;
    if (action === 'charge' && active) this.charge();
  }

  start() {
    this.score = 0; this.difficulty = 1;
    this.warrior = this.createWarrior();
    this.enemies = [];
    this.effects = [];
    this.spawnTimer = 0;
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnEnemy() {
    const types: ('skeleton' | 'mummy' | 'pharaoh')[] = ['skeleton', 'mummy', 'pharaoh'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + this.difficulty / 3))];
    const cfg = { skeleton: { hp: 30, w: 30, h: 50 }, mummy: { hp: 50, w: 35, h: 55 }, pharaoh: { hp: 80, w: 40, h: 60 } }[type];
    const fromRight = Math.random() < 0.5;
    this.enemies.push({
      x: fromRight ? this.canvas.width + 20 : -50,
      y: GROUND_Y - cfg.h, vx: 0, width: cfg.w, height: cfg.h,
      hp: cfg.hp, type, attackTimer: 60, state: 'idle', stateTime: 0
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
    const w = this.warrior;
    const speed = w.shielding ? 2 : 4;

    if (!w.charging && w.state !== 'hurt') {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        w.vx = -speed; w.facing = 'left';
      } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        w.vx = speed; w.facing = 'right';
      } else {
        w.vx *= 0.8;
      }

      if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && w.grounded) {
        w.vy = -14;
        w.grounded = false;
      }
    }

    w.vy += GRAVITY * dt;
    w.x += w.vx * dt;
    w.y += w.vy * dt;

    if (w.y >= GROUND_Y - w.height) {
      w.y = GROUND_Y - w.height;
      w.vy = 0;
      w.grounded = true;
    }
    w.x = Math.max(0, Math.min(this.canvas.width - w.width, w.x));

    w.stateTime += dt;
    w.invincible = Math.max(0, w.invincible - dt);
    w.comboTimer -= dt;
    if (w.comboTimer <= 0) w.combo = 0;

    if (w.state === 'sword' && w.stateTime > 18) w.state = 'idle';
    if (w.state === 'charge' && w.stateTime > 25) { w.state = 'idle'; w.charging = false; }
    if (w.state === 'hurt' && w.stateTime > 20) w.state = 'idle';

    if (w.grounded && Math.abs(w.vx) > 0.5 && w.state === 'idle') w.state = 'run';
    if (w.shielding && w.state === 'idle') w.state = 'shield';

    // Sword hit detection
    if (w.state === 'sword' && w.stateTime > 5 && w.stateTime < 15) {
      const range = 60;
      const attackX = w.facing === 'right' ? w.x + w.width : w.x - range;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.state === 'hurt') continue;
        if (e.x + e.width > attackX && e.x < attackX + range && Math.abs(e.y - w.y) < 40) {
          e.hp -= 20 + w.combo * 2;
          e.state = 'hurt';
          e.stateTime = 0;
          e.vx = w.facing === 'right' ? 8 : -8;
          w.combo++;
          w.comboTimer = 90;
          this.effects.push({ x: e.x + e.width / 2, y: e.y + 20, type: 'slash', life: 15 });
          if (e.hp <= 0) {
            this.score += (e.type === 'pharaoh' ? 200 : (e.type === 'mummy' ? 100 : 50)) * (1 + w.combo * 0.1);
            if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
            this.effects.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, type: 'death', life: 20 });
            this.enemies.splice(i, 1);
            this.difficulty += 0.1;
          }
          this.emitState();
        }
      }
    }

    // Charge hit detection
    if (w.charging) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (Math.abs(w.x - e.x) < 50 && Math.abs(w.y - e.y) < 40) {
          e.hp -= 35;
          e.state = 'hurt';
          e.stateTime = 0;
          e.vx = w.facing === 'right' ? 12 : -12;
          this.effects.push({ x: e.x + e.width / 2, y: e.y + 20, type: 'impact', life: 15 });
          if (e.hp <= 0) {
            this.score += (e.type === 'pharaoh' ? 200 : (e.type === 'mummy' ? 100 : 50));
            this.enemies.splice(i, 1);
            this.difficulty += 0.1;
          }
          this.emitState();
        }
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      if (e.state === 'hurt') {
        e.x += e.vx * dt;
        e.vx *= 0.9;
        e.stateTime += dt;
        if (e.stateTime > 15) e.state = 'idle';
        continue;
      }

      const dx = w.x - e.x;
      if (Math.abs(dx) < 50 && Math.abs(w.y - e.y) < 40) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.state = 'attack';
          e.stateTime = 0;
          e.attackTimer = e.type === 'pharaoh' ? 40 : 60;
          // Deal damage
          if (w.invincible <= 0) {
            if (w.shielding && ((w.facing === 'right' && dx < 0) || (w.facing === 'left' && dx > 0))) {
              this.effects.push({ x: w.x + w.width / 2, y: w.y + 20, type: 'block', life: 15 });
            } else {
              const damage = e.type === 'pharaoh' ? 20 : (e.type === 'mummy' ? 15 : 10);
              w.hp -= damage;
              w.state = 'hurt';
              w.stateTime = 0;
              w.invincible = 30;
              w.combo = 0;
              this.emitState();
              if (w.hp <= 0) {
                this.status = 'over';
                this.emitState();
                return;
              }
            }
          }
        }
      } else {
        e.vx = dx > 0 ? 1.5 : -1.5;
        e.x += e.vx * dt;
      }

      e.stateTime += dt;
      if (e.state === 'attack' && e.stateTime > 20) e.state = 'idle';
    }

    // Spawn enemies
    this.spawnTimer += dt;
    if (this.spawnTimer > Math.max(60, 120 - this.difficulty * 5) && this.enemies.length < 6) {
      this.spawnEnemy();
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

    // Ancient Egypt background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#DEB887');
    gradient.addColorStop(1, '#D2691E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Pyramids
    ctx.fillStyle = '#C4A35A';
    ctx.beginPath();
    ctx.moveTo(100, GROUND_Y);
    ctx.lineTo(200, 150);
    ctx.lineTo(300, GROUND_Y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(350, GROUND_Y);
    ctx.lineTo(420, 200);
    ctx.lineTo(490, GROUND_Y);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Draw enemies
    for (const e of this.enemies) this.drawEnemy(e);

    // Draw warrior
    this.drawWarrior();

    // Draw effects
    for (const e of this.effects) {
      const alpha = e.life / 15;
      ctx.globalAlpha = alpha;
      if (e.type === 'slash') {
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.x - 20, e.y - 20);
        ctx.lineTo(e.x + 20, e.y + 20);
        ctx.stroke();
      } else if (e.type === 'impact') {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 30, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'block') {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'death') {
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 40 * (1 - alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Combo display
    if (this.warrior.combo > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.warrior.combo} COMBO!`, w / 2, 80);
    }
  }

  private drawWarrior() {
    const ctx = this.ctx;
    const wr = this.warrior;

    ctx.save();
    if (wr.facing === 'left') {
      ctx.translate(wr.x + wr.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-wr.x, 0);
    }

    if (wr.invincible > 0 && Math.floor(wr.invincible / 3) % 2 === 0) ctx.globalAlpha = 0.5;

    // Body
    ctx.fillStyle = wr.state === 'hurt' ? '#fff' : '#8B4513';
    ctx.fillRect(wr.x + 8, wr.y + 18, wr.width - 16, wr.height - 28);

    // Head
    ctx.fillStyle = '#D2B48C';
    ctx.beginPath();
    ctx.arc(wr.x + wr.width / 2, wr.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(wr.x + wr.width / 2, wr.y + 8, 12, Math.PI, 0);
    ctx.fill();

    // Shield
    if (wr.shielding || wr.state === 'shield') {
      ctx.fillStyle = '#CD853F';
      ctx.beginPath();
      ctx.ellipse(wr.x + wr.width + 5, wr.y + 30, 15, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Sword
    ctx.fillStyle = '#C0C0C0';
    if (wr.state === 'sword') {
      ctx.fillRect(wr.x + wr.width, wr.y + 15, 35, 6);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(wr.x + wr.width - 3, wr.y + 12, 6, 12);
    } else if (!wr.shielding) {
      ctx.fillRect(wr.x + wr.width - 5, wr.y + 25, 6, 25);
    }

    // Legs
    ctx.fillStyle = '#654321';
    const legOffset = wr.state === 'run' ? Math.sin(Date.now() / 80) * 6 : 0;
    ctx.fillRect(wr.x + 10, wr.y + wr.height - 12, 8, 12 + legOffset);
    ctx.fillRect(wr.x + wr.width - 18, wr.y + wr.height - 12, 8, 12 - legOffset);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { skeleton: '#E8E8E8', mummy: '#D4C4A8', pharaoh: '#FFD700' };

    ctx.fillStyle = e.state === 'hurt' ? '#fff' : colors[e.type];
    ctx.fillRect(e.x, e.y + 10, e.width, e.height - 10);

    // Head
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + 8, e.type === 'pharaoh' ? 12 : 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = e.type === 'skeleton' ? '#000' : '#e74c3c';
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2 - 4, e.y + 6, 2, 0, Math.PI * 2);
    ctx.arc(e.x + e.width / 2 + 4, e.y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Pharaoh crown
    if (e.type === 'pharaoh') {
      ctx.fillStyle = '#4169E1';
      ctx.beginPath();
      ctx.moveTo(e.x + e.width / 2 - 12, e.y - 2);
      ctx.lineTo(e.x + e.width / 2, e.y - 18);
      ctx.lineTo(e.x + e.width / 2 + 12, e.y - 2);
      ctx.closePath();
      ctx.fill();
    }

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x, e.y - 8, e.width, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / (e.type === 'pharaoh' ? 80 : (e.type === 'mummy' ? 50 : 30))), 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
