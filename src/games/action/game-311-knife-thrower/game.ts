/**
 * Knife Thrower Game Engine
 * Game #311
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
  knives: number;
  maxKnives: number;
  reloadTimer: number;
  combo: number;
  comboTimer: number;
  throwing: boolean;
  throwTime: number;
}

interface Knife extends Entity {
  angle: number;
  speed: number;
  damage: number;
  piercing: boolean;
  hitEnemies: Enemy[];
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'thief' | 'bandit' | 'assassin';
  stunned: boolean;
  stunTimer: number;
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
  rotation?: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  knives: number;
  maxKnives: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class KnifeThrowerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private knives: Knife[] = [];
  private particles: Particle[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 32, height: 48,
      hp: 100, maxHp: 100, facing: 'right',
      knives: 6, maxKnives: 6, reloadTimer: 0,
      combo: 0, comboTimer: 0,
      throwing: false, throwTime: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('knife_thrower_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('knife_thrower_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        knives: this.player.knives, maxKnives: this.player.maxKnives,
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
      if (e.code === 'Space') { e.preventDefault(); this.throwKnife(false); }
      if (e.code === 'KeyX') { e.preventDefault(); this.throwKnife(true); }
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
    this.knives = [];
    this.particles = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.player.knives = this.player.maxKnives;
    this.enemies = [];
    this.knives = [];
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
      const types: ('thief' | 'bandit' | 'assassin')[] = ['thief', 'bandit', 'assassin'];
      const type = this.wave < 2 ? 'thief' : types[Math.floor(Math.random() * Math.min(this.wave, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        thief: { hp: 20, width: 26, height: 40 },
        bandit: { hp: 45, width: 32, height: 46 },
        assassin: { hp: 30, width: 28, height: 44 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 5;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0
      });
    }
  }

  private throwKnife(piercing: boolean) {
    if (this.status !== 'playing' || this.player.knives <= 0) return;

    const cost = piercing ? 2 : 1;
    if (this.player.knives < cost) return;

    this.player.knives -= cost;
    this.player.throwing = true;
    this.player.throwTime = 0;

    const angle = this.player.facing === 'right' ? 0 : Math.PI;
    const knifeX = this.player.x + (this.player.facing === 'right' ? this.player.width : 0);
    const knifeY = this.player.y + this.player.height / 2;

    this.knives.push({
      x: knifeX, y: knifeY,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      width: 20, height: 6,
      angle,
      speed: 12,
      damage: piercing ? 40 : 30,
      piercing,
      hitEnemies: []
    });

    // Throw particles
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: knifeX, y: knifeY,
        vx: Math.cos(angle) * 3 + (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 10, maxLife: 10,
        color: '#95a5a6', size: 3
      });
    }

    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'throw' && active) this.throwKnife(false);
    if (action === 'pierce' && active) this.throwKnife(true);
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
    const baseSpeed = 4;
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

    // Throw animation
    if (this.player.throwing) {
      this.player.throwTime += dt;
      if (this.player.throwTime > 8) this.player.throwing = false;
    }

    // Reload knives
    if (this.player.knives < this.player.maxKnives) {
      this.player.reloadTimer += dt;
      if (this.player.reloadTimer >= 30) {
        this.player.knives++;
        this.player.reloadTimer = 0;
        this.emitState();
      }
    }

    // Combo timer
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
        this.emitState();
      }
    }

    // Update knives
    for (let i = this.knives.length - 1; i >= 0; i--) {
      const k = this.knives[i];
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.angle = Math.atan2(k.vy, k.vx);

      // Check if out of bounds
      if (k.x < -50 || k.x > this.canvas.width + 50 || k.y < -50 || k.y > this.canvas.height + 50) {
        this.knives.splice(i, 1);
        continue;
      }

      // Check enemy collision
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (k.hitEnemies.includes(e)) continue;

        const dx = k.x - (e.x + e.width / 2);
        const dy = k.y - (e.y + e.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 25) {
          e.hp -= k.damage;
          e.stunned = true;
          e.stunTimer = 15;
          k.hitEnemies.push(e);
          this.player.combo++;
          this.player.comboTimer = 80;

          // Hit particles
          for (let p = 0; p < 5; p++) {
            this.particles.push({
              x: k.x, y: k.y,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 5,
              life: 20, maxLife: 20,
              color: '#c0392b', size: 4
            });
          }

          if (!k.piercing) {
            // Knife sticks in enemy
            this.particles.push({
              x: e.x + e.width / 2, y: e.y + e.height / 2,
              vx: 0, vy: 0,
              life: 40, maxLife: 40,
              color: '#bdc3c7', size: 8,
              rotation: k.angle
            });
            this.knives.splice(i, 1);
          } else {
            // Piercing knife slows down
            k.vx *= 0.7;
            k.vy *= 0.7;
          }

          if (e.hp <= 0) {
            const points = e.type === 'assassin' ? 80 : (e.type === 'bandit' ? 60 : 40);
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
      if (e.stunned) {
        e.stunTimer -= dt;
        if (e.stunTimer <= 0) e.stunned = false;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'assassin' ? 3 : (e.type === 'bandit' ? 1.8 : 2.2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 30 && e.attackCooldown <= 0) {
          const damage = e.type === 'assassin' ? 15 : (e.type === 'bandit' ? 12 : 8);
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
      if (p.vx !== 0 || p.vy !== 0) p.vy += 0.2 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
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

    // Background - alley
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2c2c2c');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Brick pattern
    ctx.fillStyle = '#3d3d3d';
    for (let x = 0; x < w; x += 35) {
      for (let y = 0; y < h; y += 18) {
        const offset = (Math.floor(y / 18) % 2) * 17;
        ctx.fillRect(x + offset + 1, y + 1, 33, 16);
      }
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save();
      if (e.stunned) ctx.globalAlpha = 0.7;

      const colors = { thief: '#7f8c8d', bandit: '#8e44ad', assassin: '#2c3e50' };
      ctx.fillStyle = colors[e.type];
      ctx.fillRect(e.x + 4, e.y + 12, e.width - 8, e.height - 12);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Hood/mask
      if (e.type === 'assassin') {
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 8, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(e.x + e.width / 2 - 10, e.y + 8, 20, 6);
      } else if (e.type === 'bandit') {
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(e.x + 4, e.y + 8, e.width - 8, 6);
      }

      // HP bar
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 8, e.width, 4);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
      ctx.restore();
    }

    // Knives in flight
    for (const k of this.knives) {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);

      // Knife blade
      ctx.fillStyle = k.piercing ? '#e74c3c' : '#bdc3c7';
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, -3);
      ctx.lineTo(15, 3);
      ctx.closePath();
      ctx.fill();

      // Handle
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(-15, -3, 8, 6);

      if (k.piercing) {
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-15, 0);
        ctx.stroke();
      }

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

    // Body
    ctx.fillStyle = '#34495e';
    ctx.fillRect(px + 6, py + 14, 20, 26);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 16, py + 10, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(px + 16, py + 8, 9, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 8, py + 40, 6, 10);
    ctx.fillRect(px + 18, py + 40, 6, 10);

    // Throwing arm
    const armAngle = this.player.throwing ? -Math.PI / 4 + (this.player.throwTime / 8) * Math.PI / 2 : 0;
    ctx.save();
    ctx.translate(px + 22, py + 20);
    ctx.rotate(armAngle);
    ctx.fillStyle = '#f5d6ba';
    ctx.fillRect(0, -3, 12, 6);

    // Knife in hand
    if (!this.player.throwing && this.player.knives > 0) {
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(10, -4, 12, 2);
      ctx.fillRect(10, 2, 12, 2);
    }
    ctx.restore();

    ctx.restore();

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      if (p.rotation !== undefined) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-8, -2, 16, 4);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Knife count display
    ctx.fillStyle = '#bdc3c7';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    const knifeStr = '🗡️'.repeat(this.player.knives) + '○'.repeat(this.player.maxKnives - this.player.knives);
    ctx.fillText(knifeStr, 10, 25);

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
