/**
 * Trap Hunter Game Engine
 * Game #313
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
  facing: 'left' | 'right';
  traps: number;
  maxTraps: number;
  placing: boolean;
  combo: number;
  comboTimer: number;
}

interface Trap extends Entity {
  type: 'spike' | 'snare' | 'explosive';
  armed: boolean;
  armTimer: number;
  triggered: boolean;
  triggerTimer: number;
  damage: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'rat' | 'boar' | 'wolf';
  stunned: boolean;
  stunTimer: number;
  snared: boolean;
  snareTimer: number;
  attackCooldown: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  traps: number;
  maxTraps: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class TrapHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private traps: Trap[] = [];
  private particles: Particle[] = [];
  private placedTrapsCount = 0;

  private score = 0;
  private highScore = 0;
  private wave = 1;
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
      x: 300, y: 200, vx: 0, vy: 0, width: 32, height: 48,
      hp: 100, maxHp: 100, facing: 'right',
      traps: 8, maxTraps: 8, placing: false,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('trap_hunter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('trap_hunter_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        traps: this.player.traps, maxTraps: this.player.maxTraps,
        combo: this.player.combo, status: this.status
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
      if (e.code === 'Space') { e.preventDefault(); this.placeTrap('spike'); }
      if (e.code === 'KeyX') { e.preventDefault(); this.placeTrap('snare'); }
      if (e.code === 'KeyC') { e.preventDefault(); this.placeTrap('explosive'); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.enemies = [];
    this.traps = [];
    this.particles = [];
    this.placedTrapsCount = 0;
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.player.traps = this.player.maxTraps;
    this.enemies = [];
    this.traps = [];
    this.placedTrapsCount = 0;
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private spawnWave() {
    const count = 4 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const types: ('rat' | 'boar' | 'wolf')[] = ['rat', 'boar', 'wolf'];
      const type = this.wave < 2 ? 'rat' : types[Math.floor(Math.random() * Math.min(this.wave, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        rat: { hp: 20, width: 24, height: 18 },
        boar: { hp: 60, width: 40, height: 30 },
        wolf: { hp: 35, width: 32, height: 26 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 5;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0,
        snared: false, snareTimer: 0,
        attackCooldown: 0
      });
    }
  }

  private placeTrap(type: 'spike' | 'snare' | 'explosive') {
    if (this.status !== 'playing' || this.player.traps <= 0 || this.placedTrapsCount >= 6) return;

    const cost = type === 'explosive' ? 2 : 1;
    if (this.player.traps < cost) return;

    this.player.traps -= cost;
    this.player.placing = true;
    this.placedTrapsCount++;

    const trapX = this.player.x + (this.player.facing === 'right' ? 40 : -30);
    const trapY = this.player.y + this.player.height - 10;

    const damages = { spike: 40, snare: 10, explosive: 60 };

    this.traps.push({
      x: trapX, y: trapY,
      vx: 0, vy: 0,
      width: 30, height: 20,
      type,
      armed: false,
      armTimer: 30,
      triggered: false,
      triggerTimer: 0,
      damage: damages[type]
    });

    setTimeout(() => { this.player.placing = false; }, 200);
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'spike' && active) this.placeTrap('spike');
    if (action === 'snare' && active) this.placeTrap('snare');
    if (action === 'explosive' && active) this.placeTrap('explosive');
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
    // Player movement
    const baseSpeed = this.player.placing ? 1 : 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.player.vx = -baseSpeed;
      this.player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.vx = baseSpeed;
      this.player.facing = 'right';
    } else {
      this.player.vx *= 0.8;
    }

    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      this.player.vy = -baseSpeed;
    } else if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      this.player.vy = baseSpeed;
    } else {
      this.player.vy *= 0.8;
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y + this.player.vy * dt));

    // Combo timer
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
        this.emitState();
      }
    }

    // Update traps
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];

      if (!t.armed) {
        t.armTimer -= dt;
        if (t.armTimer <= 0) t.armed = true;
        continue;
      }

      if (t.triggered) {
        t.triggerTimer -= dt;
        if (t.triggerTimer <= 0) {
          this.traps.splice(i, 1);
          this.placedTrapsCount--;
        }
        continue;
      }

      // Check enemy trigger
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = (e.x + e.width / 2) - (t.x + t.width / 2);
        const dy = (e.y + e.height / 2) - (t.y + t.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
          t.triggered = true;

          if (t.type === 'spike') {
            t.triggerTimer = 30;
            e.hp -= t.damage;
            e.stunned = true;
            e.stunTimer = 20;
            this.player.combo++;
            this.player.comboTimer = 100;

            // Blood particles
            for (let p = 0; p < 6; p++) {
              this.particles.push({
                x: t.x + t.width / 2, y: t.y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 6,
                life: 20, maxLife: 20,
                color: '#c0392b', size: 4
              });
            }
          } else if (t.type === 'snare') {
            t.triggerTimer = 120;
            e.snared = true;
            e.snareTimer = 100;
            e.hp -= t.damage;
            this.player.combo++;
            this.player.comboTimer = 100;

            // Net particles
            for (let p = 0; p < 8; p++) {
              this.particles.push({
                x: e.x + e.width / 2, y: e.y + e.height / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30, maxLife: 30,
                color: '#8b4513', size: 3
              });
            }
          } else if (t.type === 'explosive') {
            t.triggerTimer = 10;

            // Explosion hits all nearby enemies
            for (let k = this.enemies.length - 1; k >= 0; k--) {
              const e2 = this.enemies[k];
              const edx = (e2.x + e2.width / 2) - (t.x + t.width / 2);
              const edy = (e2.y + e2.height / 2) - (t.y + t.height / 2);
              const edist = Math.sqrt(edx * edx + edy * edy);

              if (edist < 80) {
                e2.hp -= t.damage * (1 - edist / 100);
                e2.stunned = true;
                e2.stunTimer = 30;
                e2.vx = edx / edist * 10;
                e2.vy = edy / edist * 10;
                this.player.combo++;
                this.player.comboTimer = 100;
              }
            }

            // Explosion particles
            for (let p = 0; p < 15; p++) {
              const angle = (p / 15) * Math.PI * 2;
              this.particles.push({
                x: t.x + t.width / 2, y: t.y + t.height / 2,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                life: 25, maxLife: 25,
                color: Math.random() < 0.5 ? '#f39c12' : '#e74c3c',
                size: 6
              });
            }
          }

          if (e.hp <= 0) {
            const points = e.type === 'boar' ? 100 : (e.type === 'wolf' ? 70 : 40);
            this.score += points * (1 + this.player.combo * 0.15);
            if (this.score > this.highScore) {
              this.highScore = Math.floor(this.score);
              this.saveHighScore();
            }
            this.enemies.splice(j, 1);
          }
          this.emitState();
          break;
        }
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      if (e.snared) {
        e.snareTimer -= dt;
        if (e.snareTimer <= 0) e.snared = false;
        e.vx *= 0.95;
        e.vy *= 0.95;
      } else if (e.stunned) {
        e.stunTimer -= dt;
        if (e.stunTimer <= 0) e.stunned = false;
        e.vx *= 0.9;
        e.vy *= 0.9;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'wolf' ? 2.5 : (e.type === 'boar' ? 1.5 : 2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 30 && e.attackCooldown <= 0) {
          const damage = e.type === 'boar' ? 18 : (e.type === 'wolf' ? 12 : 6);
          this.player.hp -= damage;
          e.attackCooldown = 50;
          this.emitState();
          if (this.player.hp <= 0) {
            this.status = 'over';
            this.emitState();
            return;
          }
        }
      }

      e.attackCooldown -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = Math.max(0, Math.min(this.canvas.width - e.width, e.x));
      e.y = Math.max(0, Math.min(this.canvas.height - e.height, e.y));
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Trap regen
    if (this.player.traps < this.player.maxTraps && Math.random() < 0.005) {
      this.player.traps++;
      this.emitState();
    }

    // Check wave clear
    if (this.enemies.length === 0) {
      this.status = 'cleared';
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - forest floor
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2d5a27');
    gradient.addColorStop(1, '#1a3d16');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Grass patches
    ctx.fillStyle = '#3d7a34';
    for (let i = 0; i < 30; i++) {
      const gx = (i * 47) % w;
      const gy = (i * 31) % h;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Traps
    for (const t of this.traps) {
      ctx.save();

      if (!t.armed) {
        ctx.globalAlpha = 0.5;
      }

      if (t.type === 'spike') {
        ctx.fillStyle = t.triggered ? '#7f8c8d' : '#95a5a6';
        // Spikes
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(t.x + i * 7, t.y + 15);
          ctx.lineTo(t.x + i * 7 + 3, t.y - (t.triggered ? 10 : 0));
          ctx.lineTo(t.x + i * 7 + 6, t.y + 15);
          ctx.closePath();
          ctx.fill();
        }
      } else if (t.type === 'snare') {
        ctx.strokeStyle = t.triggered ? '#5d4037' : '#8b4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x + t.width / 2, t.y + t.height / 2, 12, 0, Math.PI * 2);
        ctx.stroke();
        if (!t.triggered) {
          ctx.beginPath();
          ctx.arc(t.x + t.width / 2, t.y + t.height / 2, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = t.triggered ? '#e74c3c' : '#c0392b';
        ctx.beginPath();
        ctx.arc(t.x + t.width / 2, t.y + t.height / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        if (!t.triggered) {
          ctx.fillStyle = '#2c3e50';
          ctx.fillRect(t.x + 12, t.y, 6, 8);
        }
      }

      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save();
      if (e.stunned || e.snared) ctx.globalAlpha = 0.7;

      const colors = { rat: '#7f8c8d', boar: '#6d4c41', wolf: '#546e7a' };
      ctx.fillStyle = colors[e.type];

      // Body
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = e.snared ? '#f39c12' : '#fff';
      ctx.beginPath();
      ctx.arc(e.x + e.width * 0.7, e.y + e.height * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Snare effect
      if (e.snared) {
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          ctx.moveTo(e.x + e.width / 2, e.y + e.height / 2);
          ctx.lineTo(
            e.x + e.width / 2 + Math.cos(angle) * 20,
            e.y + e.height / 2 + Math.sin(angle) * 15
          );
        }
        ctx.stroke();
      }

      // HP bar
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 8, e.width, 4);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
      ctx.restore();
    }

    // Player
    ctx.save();
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, py + ph, pw / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flip if facing left
    if (this.player.facing === 'left') {
      ctx.translate(px + pw, 0);
      ctx.scale(-1, 1);
      ctx.translate(-px, 0);
    }

    // Body - hunter outfit
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(px + 6, py + 14, 20, 26);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 16, py + 10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 6, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 10, py, 12, 6);

    // Legs
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(px + 8, py + 40, 6, 10);
    ctx.fillRect(px + 18, py + 40, 6, 10);

    // Trap in hand when placing
    if (this.player.placing) {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(px + 24, py + 20, 12, 8);
    }

    ctx.restore();

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Trap count
    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Traps: ${this.player.traps}/${this.player.maxTraps} (Placed: ${this.placedTrapsCount}/6)`, 10, 25);

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = '#27ae60';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
