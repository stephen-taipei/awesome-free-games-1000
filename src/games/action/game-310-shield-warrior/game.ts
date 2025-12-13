/**
 * Shield Warrior Game Engine
 * Game #310
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
  blocking: boolean;
  blockTime: number;
  bashing: boolean;
  bashTime: number;
  bashCooldown: number;
  perfectBlockTimer: number;
  stamina: number;
  maxStamina: number;
  combo: number;
  comboTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'soldier' | 'berserker' | 'champion';
  stunned: boolean;
  stunTimer: number;
  attackCooldown: number;
  attacking: boolean;
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

interface BlockEffect {
  x: number;
  y: number;
  radius: number;
  life: number;
  perfect: boolean;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  blocking: boolean;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class ShieldWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private blockEffects: BlockEffect[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 38, height: 54,
      hp: 100, maxHp: 100, facing: 'right',
      blocking: false, blockTime: 0,
      bashing: false, bashTime: 0, bashCooldown: 0,
      perfectBlockTimer: 0,
      stamina: 100, maxStamina: 100,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('shield_warrior_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('shield_warrior_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
        stamina: this.player.stamina, maxStamina: this.player.maxStamina,
        blocking: this.player.blocking,
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
      if (e.code === 'Space') { e.preventDefault(); this.startBlock(); }
      if (e.code === 'KeyX') { e.preventDefault(); this.shieldBash(); }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.endBlock();
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
    this.blockEffects = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.stamina = this.player.maxStamina;
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
    const count = 3 + this.wave;
    for (let i = 0; i < count; i++) {
      const types: ('soldier' | 'berserker' | 'champion')[] = ['soldier', 'berserker', 'champion'];
      const type = this.wave < 3 ? 'soldier' : types[Math.floor(Math.random() * Math.min(this.wave - 1, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        soldier: { hp: 40, width: 30, height: 46 },
        berserker: { hp: 60, width: 36, height: 50 },
        champion: { hp: 100, width: 42, height: 56 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 10;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 60 + Math.random() * 60,
        attacking: false
      });
    }
  }

  private startBlock() {
    if (this.status !== 'playing' || this.player.stamina < 10) return;
    this.player.blocking = true;
    this.player.blockTime = 0;
    this.player.perfectBlockTimer = 10; // Perfect block window
    this.emitState();
  }

  private endBlock() {
    this.player.blocking = false;
    this.emitState();
  }

  private shieldBash() {
    if (this.status !== 'playing' || this.player.bashing || this.player.bashCooldown > 0 || this.player.stamina < 30) return;
    this.player.bashing = true;
    this.player.bashTime = 0;
    this.player.stamina -= 30;

    const bashRange = 50;
    const bashX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - bashRange;

    let hitCount = 0;
    for (const e of this.enemies) {
      const inRangeX = e.x + e.width > bashX && e.x < bashX + bashRange;
      const inRangeY = Math.abs((e.y + e.height / 2) - (this.player.y + this.player.height / 2)) < 50;

      if (inRangeX && inRangeY) {
        e.hp -= 35;
        e.stunned = true;
        e.stunTimer = 50;
        e.vx = this.player.facing === 'right' ? 12 : -12;
        e.attacking = false;
        hitCount++;

        // Bash particles
        for (let j = 0; j < 6; j++) {
          this.particles.push({
            x: e.x + e.width / 2,
            y: e.y + e.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 5,
            life: 20, maxLife: 20,
            color: '#f1c40f', size: 5
          });
        }

        if (e.hp <= 0) {
          const idx = this.enemies.indexOf(e);
          if (idx >= 0) {
            const points = e.type === 'champion' ? 150 : (e.type === 'berserker' ? 100 : 60);
            this.score += points * (1 + this.player.combo * 0.1);
            this.enemies.splice(idx, 1);
          }
        }
      }
    }

    if (hitCount > 0) {
      this.player.combo += hitCount;
      this.player.comboTimer = 100;
    }

    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      this.saveHighScore();
    }
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'block') {
      if (active) this.startBlock();
      else this.endBlock();
    }
    if (action === 'bash' && active) this.shieldBash();
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
    // Player movement (slower when blocking)
    const baseSpeed = this.player.blocking ? 1.5 : 3.5;
    if (!this.player.bashing) {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        this.player.vx = -baseSpeed;
        if (!this.player.blocking) this.player.facing = 'left';
      } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        this.player.vx = baseSpeed;
        if (!this.player.blocking) this.player.facing = 'right';
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

    // Block stamina drain
    if (this.player.blocking) {
      this.player.blockTime += dt;
      this.player.stamina -= 0.3 * dt;
      if (this.player.stamina <= 0) {
        this.player.stamina = 0;
        this.player.blocking = false;
      }
      this.player.perfectBlockTimer -= dt;
      this.emitState();
    } else {
      // Stamina regen
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 0.4 * dt);
    }

    // Bash animation
    if (this.player.bashing) {
      this.player.bashTime += dt;
      this.player.vx = this.player.facing === 'right' ? 8 : -8;
      if (this.player.bashTime > 15) {
        this.player.bashing = false;
        this.player.bashCooldown = 45;
      }
    }

    // Bash cooldown
    if (this.player.bashCooldown > 0) {
      this.player.bashCooldown -= dt;
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
        const speed = e.type === 'berserker' ? 2.5 : (e.type === 'champion' ? 1.5 : 2);

        if (!e.attacking) {
          if (dist > 0) {
            e.vx = (dx / dist) * speed;
            e.vy = (dy / dist) * speed;
          }

          // Start attack
          if (dist < 45) {
            e.attackCooldown -= dt;
            if (e.attackCooldown <= 0) {
              e.attacking = true;
              e.attackCooldown = 20; // Wind up time
            }
          }
        } else {
          // Attack wind up
          e.attackCooldown -= dt;
          e.vx *= 0.8;
          e.vy *= 0.8;

          if (e.attackCooldown <= 0) {
            // Execute attack
            e.attacking = false;
            e.attackCooldown = e.type === 'berserker' ? 40 : (e.type === 'champion' ? 80 : 60);

            if (dist < 50) {
              const damage = e.type === 'champion' ? 25 : (e.type === 'berserker' ? 18 : 12);

              if (this.player.blocking) {
                // Check block direction
                const blockingRight = this.player.facing === 'right';
                const enemyOnRight = dx > 0;
                const validBlock = blockingRight === enemyOnRight;

                if (validBlock) {
                  // Perfect block
                  const isPerfect = this.player.perfectBlockTimer > 0;
                  this.blockEffects.push({
                    x: this.player.x + (blockingRight ? this.player.width : 0),
                    y: this.player.y + this.player.height / 2,
                    radius: 0,
                    life: 15,
                    perfect: isPerfect
                  });

                  if (isPerfect) {
                    // Perfect block stuns attacker
                    e.stunned = true;
                    e.stunTimer = 40;
                    e.vx = dx < 0 ? 8 : -8;
                    this.score += 50;
                    this.player.combo++;
                    this.player.comboTimer = 100;
                  }

                  this.player.stamina -= damage * 0.5;
                  // Blocked particles
                  for (let j = 0; j < 5; j++) {
                    this.particles.push({
                      x: this.player.x + (blockingRight ? this.player.width : 0),
                      y: this.player.y + this.player.height / 2,
                      vx: (Math.random() - 0.5) * 6,
                      vy: -Math.random() * 4,
                      life: 15, maxLife: 15,
                      color: isPerfect ? '#f1c40f' : '#3498db', size: 4
                    });
                  }
                } else {
                  // Hit from wrong side
                  this.player.hp -= damage;
                }
              } else {
                // Not blocking
                this.player.hp -= damage;
                this.player.vx = dx < 0 ? 5 : -5;
              }
              this.emitState();
              if (this.player.hp <= 0) {
                this.status = 'over';
                this.emitState();
                return;
              }
            }
          }
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = Math.max(0, Math.min(this.canvas.width - e.width, e.x));
      e.y = Math.max(0, Math.min(this.canvas.height - e.height, e.y));
    }

    // Update block effects
    for (let i = this.blockEffects.length - 1; i >= 0; i--) {
      const be = this.blockEffects[i];
      be.radius += 3 * dt;
      be.life -= dt;
      if (be.life <= 0) this.blockEffects.splice(i, 1);
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

    // Background - arena
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#4a4a4a');
    gradient.addColorStop(1, '#2c2c2c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Arena floor
    ctx.fillStyle = '#5d5d5d';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 50, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Block effects
    for (const be of this.blockEffects) {
      const alpha = be.life / 15;
      ctx.strokeStyle = be.perfect
        ? `rgba(241, 196, 15, ${alpha})`
        : `rgba(52, 152, 219, ${alpha})`;
      ctx.lineWidth = be.perfect ? 4 : 2;
      ctx.beginPath();
      ctx.arc(be.x, be.y, be.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.save();
      if (e.stunned) ctx.globalAlpha = 0.7;

      // Attack indicator
      if (e.attacking) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      const colors = { soldier: '#7f8c8d', berserker: '#c0392b', champion: '#8e44ad' };
      ctx.fillStyle = colors[e.type];
      ctx.fillRect(e.x, e.y + 10, e.width, e.height - 10);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 12, 10, 0, Math.PI * 2);
      ctx.fill();

      // Helmet
      ctx.fillStyle = e.type === 'champion' ? '#f1c40f' : '#5d6d7e';
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 10, 12, Math.PI, 0);
      ctx.fill();

      // Weapon
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(e.x + e.width - 5, e.y + 15, 20, 5);

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

    // Body
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(px + 8, py + 16, 22, 28);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 19, py + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(px + 19, py + 10, 12, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 10, py + 44, 8, 12);
    ctx.fillRect(px + 20, py + 44, 8, 12);

    // Shield
    const shieldX = this.player.blocking || this.player.bashing ? px + 28 : px + 24;
    const shieldGlow = this.player.blocking && this.player.perfectBlockTimer > 0;
    if (shieldGlow) {
      ctx.shadowColor = '#f1c40f';
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = this.player.blocking ? '#3498db' : '#2980b9';
    ctx.beginPath();
    ctx.moveTo(shieldX, py + 12);
    ctx.lineTo(shieldX + 18, py + 12);
    ctx.lineTo(shieldX + 18, py + 38);
    ctx.lineTo(shieldX + 9, py + 48);
    ctx.lineTo(shieldX, py + 38);
    ctx.closePath();
    ctx.fill();

    // Shield emblem
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(shieldX + 9, py + 28, 6, 0, Math.PI * 2);
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
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 50);
    }

    // Perfect block hint
    if (this.player.blocking && this.player.perfectBlockTimer > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PERFECT BLOCK READY!', w / 2, h - 20);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
