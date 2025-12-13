/**
 * Hammer Warrior Game Engine
 * Game #306
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
  chargeLevel: number;
  charging: boolean;
  combo: number;
  comboTimer: number;
  stunned: boolean;
  stunTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'goblin' | 'orc' | 'troll';
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

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  chargeLevel: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class HammerWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 40, height: 56,
      hp: 100, maxHp: 100, facing: 'right',
      attacking: false, attackTime: 0,
      chargeLevel: 0, charging: false,
      combo: 0, comboTimer: 0,
      stunned: false, stunTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('hammer_warrior_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('hammer_warrior_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        chargeLevel: this.player.chargeLevel, combo: this.player.combo,
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
      if (e.code === 'Space') {
        e.preventDefault();
        this.startCharge();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') {
        this.releaseAttack();
      }
    });
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.enemies = [];
    this.particles = [];
    this.shockwaves = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
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
    const count = 2 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const types: ('goblin' | 'orc' | 'troll')[] = ['goblin', 'orc', 'troll'];
      const type = this.wave < 3 ? 'goblin' : types[Math.floor(Math.random() * Math.min(this.wave, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        goblin: { hp: 30, width: 28, height: 36 },
        orc: { hp: 60, width: 36, height: 48 },
        troll: { hp: 120, width: 48, height: 60 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 10;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0
      });
    }
  }

  private startCharge() {
    if (this.status !== 'playing' || this.player.attacking || this.player.stunned) return;
    this.player.charging = true;
  }

  private releaseAttack() {
    if (!this.player.charging) return;
    this.player.charging = false;
    this.performAttack();
  }

  private performAttack() {
    if (this.status !== 'playing' || this.player.attacking || this.player.stunned) return;
    this.player.attacking = true;
    this.player.attackTime = 0;

    const chargeMultiplier = 1 + this.player.chargeLevel;
    const range = 60 + this.player.chargeLevel * 20;
    const damage = 20 * chargeMultiplier;
    const knockback = 8 + this.player.chargeLevel * 4;

    const attackX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - range;

    // Create shockwave for charged attacks
    if (this.player.chargeLevel >= 2) {
      this.shockwaves.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        radius: 0,
        maxRadius: 80 + this.player.chargeLevel * 30,
        life: 20
      });
    }

    let hitCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const inRangeX = e.x + e.width > attackX && e.x < attackX + range;
      const inRangeY = Math.abs((e.y + e.height / 2) - (this.player.y + this.player.height / 2)) < 50;

      if (inRangeX && inRangeY) {
        e.hp -= damage;
        e.stunned = true;
        e.stunTimer = 30 + this.player.chargeLevel * 10;
        e.vx = this.player.facing === 'right' ? knockback : -knockback;
        e.vy = -4;
        hitCount++;

        // Spawn particles
        for (let j = 0; j < 6 + this.player.chargeLevel * 2; j++) {
          this.particles.push({
            x: e.x + e.width / 2,
            y: e.y + e.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 6,
            life: 25,
            maxLife: 25,
            color: this.player.chargeLevel >= 2 ? '#f1c40f' : '#e74c3c',
            size: 4 + this.player.chargeLevel
          });
        }

        if (e.hp <= 0) {
          const points = e.type === 'troll' ? 150 : (e.type === 'orc' ? 100 : 50);
          this.score += points * (1 + this.player.combo * 0.1);
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
      this.player.comboTimer = 120;
    }

    this.player.chargeLevel = 0;
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'attack') {
      if (active) this.startCharge();
      else this.releaseAttack();
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
    // Player movement (slower when charging)
    const baseSpeed = this.player.charging ? 1.5 : 3.5;
    if (!this.player.stunned) {
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
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y + this.player.vy * dt));

    // Charging
    if (this.player.charging && this.player.chargeLevel < 3) {
      this.player.chargeLevel += 0.02 * dt;
      if (this.player.chargeLevel > 3) this.player.chargeLevel = 3;
      this.emitState();
    }

    // Attack animation
    if (this.player.attacking) {
      this.player.attackTime += dt;
      if (this.player.attackTime > 20) this.player.attacking = false;
    }

    // Stun timer
    if (this.player.stunned) {
      this.player.stunTimer -= dt;
      if (this.player.stunTimer <= 0) this.player.stunned = false;
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
        e.vy *= 0.9;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'troll' ? 1 : (e.type === 'orc' ? 1.5 : 2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 40 && e.attackCooldown <= 0) {
          const damage = e.type === 'troll' ? 25 : (e.type === 'orc' ? 15 : 10);
          this.player.hp -= damage;
          this.player.stunned = true;
          this.player.stunTimer = 20;
          this.player.vx = dx < 0 ? 6 : -6;
          e.attackCooldown = 60;
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

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 5 * dt;
      sw.life -= dt;
      if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.3 * dt;
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
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#34495e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground pattern
    ctx.fillStyle = '#3d566e';
    for (let x = 0; x < w; x += 50) {
      for (let y = 0; y < h; y += 50) {
        if ((x + y) % 100 === 0) {
          ctx.fillRect(x, y, 50, 50);
        }
      }
    }

    // Shockwaves
    for (const sw of this.shockwaves) {
      const alpha = sw.life / 20;
      ctx.strokeStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enemies
    for (const e of this.enemies) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height, e.width / 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const colors = { goblin: '#27ae60', orc: '#8e44ad', troll: '#2980b9' };
      ctx.fillStyle = e.stunned ? '#f39c12' : colors[e.type];
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Face
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x + e.width * 0.2, e.y + e.height * 0.2, e.width * 0.2, e.width * 0.15);
      ctx.fillRect(e.x + e.width * 0.6, e.y + e.height * 0.2, e.width * 0.2, e.width * 0.15);

      // HP bar
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 10, e.width, 5);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 10, e.width * (e.hp / e.maxHp), 5);
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
    ctx.ellipse(px + pw / 2, py + ph, pw / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flip if facing left
    if (this.player.facing === 'left') {
      ctx.translate(px + pw, 0);
      ctx.scale(-1, 1);
      ctx.translate(-px, 0);
    }

    // Body
    ctx.fillStyle = this.player.stunned ? '#e74c3c' : '#3498db';
    ctx.fillRect(px + 8, py + 16, 24, 30);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 20, py + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(px + 20, py + 10, 14, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 10, py + 46, 8, 12);
    ctx.fillRect(px + 22, py + 46, 8, 12);

    // Hammer
    const hammerAngle = this.player.attacking
      ? -Math.PI / 2 + (this.player.attackTime / 20) * Math.PI
      : -Math.PI / 4;
    ctx.save();
    ctx.translate(px + 30, py + 28);
    ctx.rotate(hammerAngle);

    // Hammer handle
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, -4, 35, 8);

    // Hammer head
    const chargeGlow = this.player.charging || this.player.chargeLevel > 0;
    if (chargeGlow) {
      ctx.shadowColor = '#f1c40f';
      ctx.shadowBlur = 10 + this.player.chargeLevel * 5;
    }
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(30, -12, 20, 24);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(32, -10, 4, 20);
    ctx.restore();

    ctx.restore();

    // Charge indicator
    if (this.player.charging || this.player.chargeLevel > 0) {
      const chargePercent = this.player.chargeLevel / 3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.player.x - 5, this.player.y - 20, 50, 8);
      ctx.fillStyle = chargePercent >= 1 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(this.player.x - 5, this.player.y - 20, 50 * chargePercent, 8);
    }

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
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
