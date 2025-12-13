/**
 * Claw Hunter Game Engine
 * Game #309
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
  slashCount: number;
  dashing: boolean;
  dashCooldown: number;
  rage: number;
  rageMode: boolean;
  combo: number;
  comboTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'wolf' | 'bear' | 'lion';
  stunned: boolean;
  stunTimer: number;
  attackCooldown: number;
  bleeding: boolean;
  bleedTimer: number;
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

interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  size: number;
  life: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  rage: number;
  rageMode: boolean;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class ClawHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private slashEffects: SlashEffect[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 36, height: 50,
      hp: 100, maxHp: 100, facing: 'right',
      attacking: false, attackTime: 0, slashCount: 0,
      dashing: false, dashCooldown: 0,
      rage: 0, rageMode: false,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('claw_hunter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('claw_hunter_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        rage: this.player.rage, rageMode: this.player.rageMode,
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
      if (e.code === 'Space') { e.preventDefault(); this.clawAttack(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); this.dash(); }
      if (e.code === 'KeyX') { e.preventDefault(); this.activateRage(); }
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
    this.slashEffects = [];
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
      const types: ('wolf' | 'bear' | 'lion')[] = ['wolf', 'bear', 'lion'];
      const type = this.wave < 3 ? 'wolf' : types[Math.floor(Math.random() * Math.min(this.wave - 1, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        wolf: { hp: 30, width: 32, height: 28 },
        bear: { hp: 80, width: 44, height: 40 },
        lion: { hp: 55, width: 38, height: 34 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 8;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0,
        bleeding: false, bleedTimer: 0
      });
    }
  }

  private clawAttack() {
    if (this.status !== 'playing' || this.player.attacking) return;
    this.player.attacking = true;
    this.player.attackTime = 0;
    this.player.slashCount++;

    const damage = this.player.rageMode ? 40 : 25;
    const range = 55;

    const attackX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - range;

    // Slash effect
    const slashAngle = (this.player.slashCount % 2 === 0 ? -1 : 1) * Math.PI / 4;
    this.slashEffects.push({
      x: this.player.x + (this.player.facing === 'right' ? this.player.width + 20 : -20),
      y: this.player.y + this.player.height / 2,
      angle: this.player.facing === 'right' ? slashAngle : Math.PI + slashAngle,
      size: this.player.rageMode ? 60 : 45,
      life: 10
    });

    let hitCount = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const inRangeX = e.x + e.width > attackX && e.x < attackX + range;
      const inRangeY = Math.abs((e.y + e.height / 2) - (this.player.y + this.player.height / 2)) < 45;

      if (inRangeX && inRangeY) {
        e.hp -= damage;
        e.stunned = true;
        e.stunTimer = 15;
        e.bleeding = true;
        e.bleedTimer = 60;
        hitCount++;

        // Build rage
        this.player.rage = Math.min(100, this.player.rage + 10);

        // Blood particles
        for (let j = 0; j < 6; j++) {
          this.particles.push({
            x: e.x + e.width / 2,
            y: e.y + e.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 6,
            life: 25, maxLife: 25,
            color: '#c0392b', size: 5
          });
        }

        if (e.hp <= 0) {
          const points = e.type === 'bear' ? 120 : (e.type === 'lion' ? 90 : 50);
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
      this.player.comboTimer = 80;
    }
    this.emitState();
  }

  private dash() {
    if (this.status !== 'playing' || this.player.dashing || this.player.dashCooldown > 0) return;
    this.player.dashing = true;
    const dashSpeed = this.player.rageMode ? 20 : 14;
    this.player.vx = this.player.facing === 'right' ? dashSpeed : -dashSpeed;

    // Dash particles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2 + (Math.random() - 0.5) * 30,
        vx: -this.player.vx * 0.2,
        vy: (Math.random() - 0.5) * 2,
        life: 12, maxLife: 12,
        color: this.player.rageMode ? '#e74c3c' : '#f39c12', size: 5
      });
    }

    setTimeout(() => {
      this.player.dashing = false;
      this.player.dashCooldown = 40;
    }, 120);
  }

  private activateRage() {
    if (this.player.rage < 100 || this.player.rageMode) return;
    this.player.rageMode = true;
    this.player.rage = 100;

    // Rage activation particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 30, maxLife: 30,
        color: '#e74c3c', size: 6
      });
    }
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'attack' && active) this.clawAttack();
    if (action === 'dash' && active) this.dash();
    if (action === 'rage' && active) this.activateRage();
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
    const baseSpeed = this.player.dashing ? 0 : (this.player.rageMode ? 5 : 4);
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
    }

    // Attack animation
    if (this.player.attacking) {
      this.player.attackTime += dt;
      if (this.player.attackTime > 12) this.player.attacking = false;
    }

    // Rage drain
    if (this.player.rageMode) {
      this.player.rage -= 0.5 * dt;
      if (this.player.rage <= 0) {
        this.player.rage = 0;
        this.player.rageMode = false;
      }
      this.emitState();
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
      // Bleeding damage
      if (e.bleeding) {
        e.bleedTimer -= dt;
        if (e.bleedTimer <= 0) e.bleeding = false;
        if (Math.random() < 0.05) {
          e.hp -= 1;
          this.particles.push({
            x: e.x + Math.random() * e.width,
            y: e.y + Math.random() * e.height,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2,
            life: 15, maxLife: 15,
            color: '#c0392b', size: 3
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
        const speed = e.type === 'wolf' ? 2.5 : (e.type === 'lion' ? 2 : 1.2);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 35 && e.attackCooldown <= 0 && !this.player.dashing) {
          const damage = e.type === 'bear' ? 20 : (e.type === 'lion' ? 15 : 10);
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

      // Check if enemy died from bleeding
      if (e.hp <= 0) {
        const idx = this.enemies.indexOf(e);
        if (idx >= 0) {
          this.score += 30;
          this.enemies.splice(idx, 1);
        }
      }
    }

    // Update slash effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      this.slashEffects[i].life -= dt;
      if (this.slashEffects[i].life <= 0) this.slashEffects.splice(i, 1);
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

    // Background - forest
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a3320');
    gradient.addColorStop(1, '#0d1f12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Grass pattern
    ctx.fillStyle = '#1e4528';
    for (let x = 0; x < w; x += 30) {
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.arc(x + Math.random() * 15, y + Math.random() * 15, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save();
      if (e.stunned) ctx.globalAlpha = 0.7;
      if (e.bleeding) ctx.shadowColor = '#c0392b';
      if (e.bleeding) ctx.shadowBlur = 10;

      if (e.type === 'wolf') {
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(e.x, e.y + 8, e.width, e.height - 8);
        ctx.beginPath();
        ctx.arc(e.x + e.width - 5, e.y + 14, 10, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = '#5d6d7e';
        ctx.beginPath();
        ctx.moveTo(e.x + e.width - 12, e.y + 4);
        ctx.lineTo(e.x + e.width - 6, e.y + 10);
        ctx.lineTo(e.x + e.width - 2, e.y + 4);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'bear') {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(e.x, e.y + 10, e.width, e.height - 10);
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + 8, 6, 0, Math.PI * 2);
        ctx.arc(e.x + e.width - 8, e.y + 8, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#d4a06a';
        ctx.fillRect(e.x, e.y + 8, e.width, e.height - 8);
        ctx.beginPath();
        ctx.arc(e.x + e.width - 5, e.y + 16, 12, 0, Math.PI * 2);
        ctx.fill();
        // Mane
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(e.x + e.width - 5, e.y + 14, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a06a';
        ctx.beginPath();
        ctx.arc(e.x + e.width - 5, e.y + 16, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // HP bar
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(e.x, e.y - 8, e.width, 4);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
      ctx.restore();
    }

    // Slash effects
    for (const slash of this.slashEffects) {
      const alpha = slash.life / 10;
      ctx.save();
      ctx.translate(slash.x, slash.y);
      ctx.rotate(slash.angle);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-slash.size / 2, -slash.size / 3);
      ctx.quadraticCurveTo(0, 0, slash.size / 2, slash.size / 3);
      ctx.stroke();
      ctx.strokeStyle = `rgba(231, 76, 60, ${alpha * 0.5})`;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }

    // Player
    ctx.save();
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // Rage aura
    if (this.player.rageMode) {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + ph / 2, 40, 0, Math.PI * 2);
      ctx.fill();
    }

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
    ctx.fillStyle = this.player.rageMode ? '#c0392b' : '#2c3e50';
    ctx.fillRect(px + 6, py + 16, 24, 26);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 18, py + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Wild hair
    ctx.fillStyle = this.player.rageMode ? '#c0392b' : '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 8);
    ctx.lineTo(px + 5, py);
    ctx.lineTo(px + 12, py + 6);
    ctx.lineTo(px + 18, py);
    ctx.lineTo(px + 24, py + 6);
    ctx.lineTo(px + 31, py);
    ctx.lineTo(px + 28, py + 8);
    ctx.arc(px + 18, py + 12, 10, -Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Legs
    ctx.fillStyle = '#34495e';
    ctx.fillRect(px + 8, py + 42, 8, 10);
    ctx.fillRect(px + 20, py + 42, 8, 10);

    // Claws
    const clawOffset = this.player.attacking ? Math.sin(this.player.attackTime * 0.5) * 10 : 0;
    ctx.fillStyle = this.player.rageMode ? '#e74c3c' : '#bdc3c7';
    // Right claw
    ctx.beginPath();
    ctx.moveTo(px + 30, py + 22);
    ctx.lineTo(px + 40 + clawOffset, py + 18);
    ctx.lineTo(px + 38 + clawOffset, py + 22);
    ctx.lineTo(px + 45 + clawOffset, py + 22);
    ctx.lineTo(px + 38 + clawOffset, py + 26);
    ctx.lineTo(px + 40 + clawOffset, py + 30);
    ctx.lineTo(px + 30, py + 28);
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
      ctx.fillStyle = this.player.rageMode ? '#e74c3c' : '#f39c12';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }

    // Rage indicator
    if (this.player.rage >= 100 && !this.player.rageMode) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('RAGE READY! Press X', w / 2, h - 20);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
