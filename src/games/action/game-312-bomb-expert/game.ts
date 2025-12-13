/**
 * Bomb Expert Game Engine
 * Game #312
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
  bombs: number;
  maxBombs: number;
  reloadTimer: number;
  combo: number;
  comboTimer: number;
}

interface Bomb extends Entity {
  timer: number;
  radius: number;
  damage: number;
  type: 'normal' | 'sticky' | 'cluster';
  stuck: boolean;
  stuckTo?: Enemy;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  damage: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'grunt' | 'heavy' | 'speed';
  stunned: boolean;
  stunTimer: number;
  attackCooldown: number;
  onFire: boolean;
  fireTimer: number;
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
  bombs: number;
  maxBombs: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class BombExpertGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
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
      bombs: 5, maxBombs: 5, reloadTimer: 0,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('bomb_expert_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('bomb_expert_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        bombs: this.player.bombs, maxBombs: this.player.maxBombs,
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
      if (e.code === 'Space') { e.preventDefault(); this.throwBomb('normal'); }
      if (e.code === 'KeyX') { e.preventDefault(); this.throwBomb('sticky'); }
      if (e.code === 'KeyC') { e.preventDefault(); this.throwBomb('cluster'); }
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
    this.bombs = [];
    this.explosions = [];
    this.particles = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.bombs = this.player.maxBombs;
    this.enemies = [];
    this.bombs = [];
    this.explosions = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const types: ('grunt' | 'heavy' | 'speed')[] = ['grunt', 'heavy', 'speed'];
      const type = this.wave < 2 ? 'grunt' : types[Math.floor(Math.random() * Math.min(this.wave, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        grunt: { hp: 35, width: 28, height: 42 },
        heavy: { hp: 80, width: 40, height: 50 },
        speed: { hp: 25, width: 24, height: 38 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 8;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0,
        onFire: false, fireTimer: 0
      });
    }
  }

  private throwBomb(type: 'normal' | 'sticky' | 'cluster') {
    if (this.status !== 'playing' || this.player.bombs <= 0) return;

    const cost = type === 'cluster' ? 2 : 1;
    if (this.player.bombs < cost) return;

    this.player.bombs -= cost;

    const throwSpeed = 8;
    const angle = this.player.facing === 'right' ? 0 : Math.PI;

    this.bombs.push({
      x: this.player.x + (this.player.facing === 'right' ? this.player.width : 0),
      y: this.player.y + this.player.height / 2 - 10,
      vx: Math.cos(angle) * throwSpeed,
      vy: -4,
      width: 16, height: 16,
      timer: type === 'sticky' ? 120 : 60,
      radius: type === 'cluster' ? 60 : 80,
      damage: type === 'cluster' ? 30 : 50,
      type,
      stuck: false
    });

    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'bomb' && active) this.throwBomb('normal');
    if (action === 'sticky' && active) this.throwBomb('sticky');
    if (action === 'cluster' && active) this.throwBomb('cluster');
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

  private createExplosion(x: number, y: number, radius: number, damage: number) {
    this.explosions.push({
      x, y, radius: 0, maxRadius: radius, life: 20, damage
    });

    // Explosion particles
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 4),
        vy: Math.sin(angle) * (3 + Math.random() * 4),
        life: 25, maxLife: 25,
        color: Math.random() < 0.5 ? '#f39c12' : '#e74c3c',
        size: 6 + Math.random() * 4
      });
    }

    // Check enemy damage
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = (e.x + e.width / 2) - x;
      const dy = (e.y + e.height / 2) - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const damageMultiplier = 1 - (dist / radius) * 0.5;
        e.hp -= damage * damageMultiplier;
        e.stunned = true;
        e.stunTimer = 30;
        e.onFire = true;
        e.fireTimer = 60;

        // Knockback
        if (dist > 0) {
          e.vx = (dx / dist) * 8;
          e.vy = (dy / dist) * 8;
        }

        this.player.combo++;
        this.player.comboTimer = 100;

        if (e.hp <= 0) {
          const points = e.type === 'heavy' ? 100 : (e.type === 'speed' ? 60 : 50);
          this.score += points * (1 + this.player.combo * 0.1);
          if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            this.saveHighScore();
          }
          this.enemies.splice(i, 1);
        }
        this.emitState();
      }
    }

    // Check player damage
    const playerDx = (this.player.x + this.player.width / 2) - x;
    const playerDy = (this.player.y + this.player.height / 2) - y;
    const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
    if (playerDist < radius * 0.6) {
      this.player.hp -= damage * 0.3;
      this.emitState();
    }
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

    // Reload bombs
    if (this.player.bombs < this.player.maxBombs) {
      this.player.reloadTimer += dt;
      if (this.player.reloadTimer >= 50) {
        this.player.bombs++;
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

    // Update bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];

      if (b.stuck && b.stuckTo) {
        b.x = b.stuckTo.x + b.stuckTo.width / 2;
        b.y = b.stuckTo.y + b.stuckTo.height / 2;
      } else {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 0.3 * dt; // Gravity

        // Bounce off ground
        if (b.y > this.canvas.height - 20) {
          b.y = this.canvas.height - 20;
          b.vy = -b.vy * 0.5;
          b.vx *= 0.8;
        }

        // Sticky bomb sticks to enemies
        if (b.type === 'sticky' && !b.stuck) {
          for (const e of this.enemies) {
            const dx = b.x - (e.x + e.width / 2);
            const dy = b.y - (e.y + e.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 25) {
              b.stuck = true;
              b.stuckTo = e;
              b.vx = 0;
              b.vy = 0;
              break;
            }
          }
        }
      }

      b.timer -= dt;
      if (b.timer <= 0) {
        this.createExplosion(b.x, b.y, b.radius, b.damage);

        // Cluster bomb creates smaller explosions
        if (b.type === 'cluster') {
          for (let j = 0; j < 4; j++) {
            const angle = (j / 4) * Math.PI * 2;
            const dist = 40;
            setTimeout(() => {
              this.createExplosion(
                b.x + Math.cos(angle) * dist,
                b.y + Math.sin(angle) * dist,
                40, 25
              );
            }, j * 100);
          }
        }

        this.bombs.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.radius += (exp.maxRadius - exp.radius) * 0.3;
      exp.life -= dt;
      if (exp.life <= 0) this.explosions.splice(i, 1);
    }

    // Update enemies
    for (const e of this.enemies) {
      // Fire damage
      if (e.onFire) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) e.onFire = false;
        if (Math.random() < 0.05) {
          e.hp -= 1;
          this.particles.push({
            x: e.x + Math.random() * e.width,
            y: e.y + Math.random() * e.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3,
            life: 15, maxLife: 15,
            color: '#f39c12', size: 4
          });
        }
      }

      if (e.stunned) {
        e.stunTimer -= dt;
        if (e.stunTimer <= 0) e.stunned = false;
        e.vx *= 0.9;
        e.vy *= 0.9;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'speed' ? 3 : (e.type === 'heavy' ? 1.2 : 2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 30 && e.attackCooldown <= 0) {
          const damage = e.type === 'heavy' ? 18 : (e.type === 'speed' ? 8 : 12);
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

      // Check if enemy died from fire
      if (e.hp <= 0) {
        const idx = this.enemies.indexOf(e);
        if (idx >= 0) {
          this.score += 30;
          this.enemies.splice(idx, 1);
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.1 * dt;
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

    // Background - industrial
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#3d3d3d');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Metal floor pattern
    ctx.fillStyle = '#4a4a4a';
    for (let x = 0; x < w; x += 50) {
      ctx.fillRect(x + 2, 0, 2, h);
    }
    for (let y = 0; y < h; y += 50) {
      ctx.fillRect(0, y + 2, w, 2);
    }

    // Explosions
    for (const exp of this.explosions) {
      const alpha = exp.life / 20;
      const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      grad.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
      grad.addColorStop(0.5, `rgba(255, 100, 50, ${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(100, 50, 50, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save();
      if (e.stunned) ctx.globalAlpha = 0.7;
      if (e.onFire) {
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 15;
      }

      const colors = { grunt: '#7f8c8d', heavy: '#2c3e50', speed: '#27ae60' };
      ctx.fillStyle = colors[e.type];
      ctx.fillRect(e.x, e.y + 10, e.width, e.height - 10);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 10, e.type === 'heavy' ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 8, e.width, 4);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
      ctx.restore();
    }

    // Bombs
    for (const b of this.bombs) {
      ctx.save();
      const flash = b.timer < 30 && Math.floor(b.timer / 5) % 2 === 0;

      ctx.fillStyle = b.type === 'sticky' ? '#9b59b6' : (b.type === 'cluster' ? '#e74c3c' : '#2c3e50');
      ctx.beginPath();
      ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Fuse
      if (flash) {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
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

    // Body with bomb vest
    ctx.fillStyle = '#34495e';
    ctx.fillRect(px + 6, py + 14, 20, 26);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(px + 8, py + 18, 16, 8);

    // Head with goggles
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 16, py + 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 8, py + 6, 16, 6);

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 8, py + 40, 6, 10);
    ctx.fillRect(px + 18, py + 40, 6, 10);

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

    // Bomb count
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    const bombStr = '💣'.repeat(this.player.bombs) + '○'.repeat(this.player.maxBombs - this.player.bombs);
    ctx.fillText(bombStr, 10, 25);

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
