/**
 * Spear Knight Game Engine
 * Game #307
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
  attacking: boolean;
  attackTime: number;
  thrustDistance: number;
  dashing: boolean;
  dashCooldown: number;
  combo: number;
  comboTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'skeleton' | 'knight' | 'giant';
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
}

interface SpearTrail {
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  dashCooldown: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class SpearKnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private spearTrails: SpearTrail[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 36, height: 52,
      hp: 100, maxHp: 100, facing: 'right',
      attacking: false, attackTime: 0, thrustDistance: 0,
      dashing: false, dashCooldown: 0,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('spear_knight_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('spear_knight_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        dashCooldown: this.player.dashCooldown, combo: this.player.combo,
        status: this.status
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
      if (e.code === 'Space') { e.preventDefault(); this.thrust(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); this.dash(); }
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
    this.particles = [];
    this.spearTrails = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.enemies = [];
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
      const types: ('skeleton' | 'knight' | 'giant')[] = ['skeleton', 'knight', 'giant'];
      const type = this.wave < 3 ? 'skeleton' : types[Math.floor(Math.random() * Math.min(this.wave - 1, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        skeleton: { hp: 25, width: 26, height: 38 },
        knight: { hp: 55, width: 34, height: 46 },
        giant: { hp: 100, width: 44, height: 58 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 8;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0
      });
    }
  }

  private thrust() {
    if (this.status !== 'playing' || this.player.attacking) return;
    this.player.attacking = true;
    this.player.attackTime = 0;
    this.player.thrustDistance = 0;

    const range = 80;
    const damage = 30;

    const attackX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - range;

    // Add spear trail
    this.spearTrails.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      angle: this.player.facing === 'right' ? 0 : Math.PI,
      length: range,
      life: 15
    });

    let hitCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const inRangeX = e.x + e.width > attackX && e.x < attackX + range;
      const inRangeY = Math.abs((e.y + e.height / 2) - (this.player.y + this.player.height / 2)) < 35;

      if (inRangeX && inRangeY) {
        e.hp -= damage;
        e.stunned = true;
        e.stunTimer = 20;
        e.vx = this.player.facing === 'right' ? 10 : -10;
        hitCount++;

        // Spawn particles
        for (let j = 0; j < 5; j++) {
          this.particles.push({
            x: e.x + e.width / 2,
            y: e.y + e.height / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 5,
            life: 20,
            maxLife: 20,
            color: '#bdc3c7',
            size: 4
          });
        }

        if (e.hp <= 0) {
          const points = e.type === 'giant' ? 120 : (e.type === 'knight' ? 80 : 40);
          this.score += points * (1 + this.player.combo * 0.15);
          if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            this.saveHighScore();
          }
          this.enemies.splice(i, 1);
        }
      }
    }

    if (hitCount > 0) {
      this.player.combo += hitCount;
      this.player.comboTimer = 90;
    }
    this.emitState();
  }

  private dash() {
    if (this.status !== 'playing' || this.player.dashing || this.player.dashCooldown > 0) return;
    this.player.dashing = true;
    const dashSpeed = 15;
    this.player.vx = this.player.facing === 'right' ? dashSpeed : -dashSpeed;

    // Spawn dash particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2 + (Math.random() - 0.5) * 30,
        vx: -this.player.vx * 0.3,
        vy: (Math.random() - 0.5) * 2,
        life: 15,
        maxLife: 15,
        color: '#3498db',
        size: 6
      });
    }

    setTimeout(() => {
      this.player.dashing = false;
      this.player.dashCooldown = 60;
    }, 150);
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'attack' && active) this.thrust();
    if (action === 'dash' && active) this.dash();
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
    const baseSpeed = this.player.dashing ? 0 : 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      if (!this.player.dashing) this.player.vx = -baseSpeed;
      this.player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      if (!this.player.dashing) this.player.vx = baseSpeed;
      this.player.facing = 'right';
    } else if (!this.player.dashing) {
      this.player.vx *= 0.8;
    }

    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      if (!this.player.dashing) this.player.vy = -baseSpeed;
    } else if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      if (!this.player.dashing) this.player.vy = baseSpeed;
    } else if (!this.player.dashing) {
      this.player.vy *= 0.8;
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y + this.player.vy * dt));

    // Dash cooldown
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown -= dt;
      if (this.player.dashCooldown < 0) this.player.dashCooldown = 0;
      this.emitState();
    }

    // Attack animation
    if (this.player.attacking) {
      this.player.attackTime += dt;
      this.player.thrustDistance = Math.sin((this.player.attackTime / 15) * Math.PI) * 30;
      if (this.player.attackTime > 15) this.player.attacking = false;
    }

    // Combo timer
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
        this.emitState();
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      if (e.stunned) {
        e.stunTimer -= dt;
        if (e.stunTimer <= 0) e.stunned = false;
        e.vx *= 0.9;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'giant' ? 1.2 : (e.type === 'knight' ? 1.8 : 2.2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 35 && e.attackCooldown <= 0 && !this.player.dashing) {
          const damage = e.type === 'giant' ? 20 : (e.type === 'knight' ? 12 : 8);
          this.player.hp -= damage;
          this.player.vx = dx < 0 ? 5 : -5;
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

    // Update spear trails
    for (let i = this.spearTrails.length - 1; i >= 0; i--) {
      this.spearTrails[i].life -= dt;
      if (this.spearTrails[i].life <= 0) this.spearTrails.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
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

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stone floor pattern
    ctx.fillStyle = '#1f2f4a';
    for (let x = 0; x < w; x += 60) {
      for (let y = 0; y < h; y += 60) {
        ctx.fillRect(x + 2, y + 2, 56, 56);
      }
    }

    // Spear trails
    for (const trail of this.spearTrails) {
      const alpha = trail.life / 15;
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.angle);
      ctx.fillStyle = `rgba(192, 192, 192, ${alpha * 0.5})`;
      ctx.fillRect(0, -3, trail.length, 6);
      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height, e.width / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const colors = { skeleton: '#bdc3c7', knight: '#7f8c8d', giant: '#6c3483' };
      ctx.fillStyle = e.stunned ? '#f39c12' : colors[e.type];

      // Draw different enemy shapes
      if (e.type === 'skeleton') {
        ctx.fillRect(e.x + 4, e.y, e.width - 8, e.height);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(e.x + 8, e.y + 10, 4, 4);
        ctx.fillRect(e.x + e.width - 12, e.y + 10, 4, 4);
      } else if (e.type === 'knight') {
        ctx.fillRect(e.x, e.y + 8, e.width, e.height - 8);
        ctx.fillStyle = '#5d6d7e';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = '#512e5f';
        ctx.fillRect(e.x + 8, e.y + 12, 10, 8);
        ctx.fillRect(e.x + e.width - 18, e.y + 12, 10, 8);
      }

      // HP bar
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 8, e.width, 4);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
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

    // Armor body
    ctx.fillStyle = this.player.dashing ? '#5dade2' : '#2980b9';
    ctx.fillRect(px + 6, py + 18, 24, 26);

    // Head with helmet
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(px + 18, py + 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 18, py + 14, 8, 0, Math.PI);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 8, py + 44, 8, 10);
    ctx.fillRect(px + 20, py + 44, 8, 10);

    // Spear
    const spearOffset = this.player.thrustDistance;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(px + 28 + spearOffset, py + 22, 50, 5);
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.moveTo(px + 78 + spearOffset, py + 24);
    ctx.lineTo(px + 95 + spearOffset, py + 24);
    ctx.lineTo(px + 78 + spearOffset, py + 18);
    ctx.lineTo(px + 78 + spearOffset, py + 30);
    ctx.closePath();
    ctx.fill();

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

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }

    // Dash ready indicator
    if (this.player.dashCooldown <= 0) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('DASH READY', w / 2, h - 20);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
