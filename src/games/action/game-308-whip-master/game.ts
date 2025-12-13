/**
 * Whip Master Game Engine
 * Game #308
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
  whipAngle: number;
  grabbing: boolean;
  grabbedEnemy: Enemy | null;
  combo: number;
  comboTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'bat' | 'skeleton' | 'vampire';
  stunned: boolean;
  stunTimer: number;
  attackCooldown: number;
  grabbed: boolean;
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

interface WhipSegment {
  x: number;
  y: number;
  angle: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  combo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class WhipMasterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private whipSegments: WhipSegment[] = [];

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
      x: 300, y: 300, vx: 0, vy: 0, width: 32, height: 52,
      hp: 100, maxHp: 100, facing: 'right',
      attacking: false, attackTime: 0, whipAngle: 0,
      grabbing: false, grabbedEnemy: null,
      combo: 0, comboTimer: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('whip_master_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('whip_master_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        hp: this.player.hp, maxHp: this.player.maxHp,
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
      if (e.code === 'Space') { e.preventDefault(); this.whipAttack(); }
      if (e.code === 'KeyX') { e.preventDefault(); this.throwGrabbed(); }
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
    this.whipSegments = [];
    this.spawnWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
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
    const count = 4 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const types: ('bat' | 'skeleton' | 'vampire')[] = ['bat', 'skeleton', 'vampire'];
      const type = this.wave < 2 ? 'bat' : types[Math.floor(Math.random() * Math.min(this.wave, 3))];
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * this.canvas.width; y = -40; }
      else if (side === 1) { x = this.canvas.width + 40; y = Math.random() * this.canvas.height; }
      else if (side === 2) { x = Math.random() * this.canvas.width; y = this.canvas.height + 40; }
      else { x = -40; y = Math.random() * this.canvas.height; }

      const configs = {
        bat: { hp: 15, width: 24, height: 20 },
        skeleton: { hp: 40, width: 28, height: 44 },
        vampire: { hp: 70, width: 32, height: 50 },
      };
      const cfg = configs[type];
      const hpBonus = this.wave * 5;
      this.enemies.push({
        x, y, vx: 0, vy: 0, width: cfg.width, height: cfg.height,
        hp: cfg.hp + hpBonus, maxHp: cfg.hp + hpBonus, type,
        stunned: false, stunTimer: 0, attackCooldown: 0, grabbed: false
      });
    }
  }

  private whipAttack() {
    if (this.status !== 'playing' || this.player.attacking) return;
    this.player.attacking = true;
    this.player.attackTime = 0;
    this.player.whipAngle = this.player.facing === 'right' ? -Math.PI / 3 : Math.PI + Math.PI / 3;

    // Generate whip segments
    this.whipSegments = [];
    const segmentCount = 12;
    const baseX = this.player.x + (this.player.facing === 'right' ? this.player.width : 0);
    const baseY = this.player.y + 20;
    for (let i = 0; i < segmentCount; i++) {
      this.whipSegments.push({
        x: baseX,
        y: baseY,
        angle: this.player.whipAngle
      });
    }
  }

  private throwGrabbed() {
    if (!this.player.grabbedEnemy) return;
    const e = this.player.grabbedEnemy;
    e.grabbed = false;
    e.vx = this.player.facing === 'right' ? 20 : -20;
    e.vy = -5;
    e.stunned = true;
    e.stunTimer = 40;
    this.player.grabbedEnemy = null;
    this.player.grabbing = false;

    // Damage on throw
    e.hp -= 15;
    if (e.hp <= 0) {
      const idx = this.enemies.indexOf(e);
      if (idx >= 0) {
        this.score += 80;
        this.enemies.splice(idx, 1);
      }
    }
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'up') active ? this.keys.add('ArrowUp') : this.keys.delete('ArrowUp');
    if (action === 'down') active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    if (action === 'attack' && active) this.whipAttack();
    if (action === 'throw' && active) this.throwGrabbed();
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
    const baseSpeed = this.player.grabbing ? 2.5 : 4;
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

    // Whip attack animation
    if (this.player.attacking) {
      this.player.attackTime += dt;
      const progress = this.player.attackTime / 25;
      const swingAngle = Math.sin(progress * Math.PI) * (Math.PI * 0.8);
      this.player.whipAngle = this.player.facing === 'right'
        ? -Math.PI / 3 + swingAngle
        : Math.PI + Math.PI / 3 - swingAngle;

      // Update whip segments
      const baseX = this.player.x + (this.player.facing === 'right' ? this.player.width : 0);
      const baseY = this.player.y + 20;
      const whipLength = 100;

      for (let i = 0; i < this.whipSegments.length; i++) {
        const t = i / (this.whipSegments.length - 1);
        const segAngle = this.player.whipAngle + Math.sin(t * Math.PI * 2 + this.player.attackTime * 0.5) * 0.2;
        this.whipSegments[i].x = baseX + Math.cos(segAngle) * whipLength * t;
        this.whipSegments[i].y = baseY + Math.sin(segAngle) * whipLength * t;
        this.whipSegments[i].angle = segAngle;
      }

      // Check hits at peak of swing
      if (this.player.attackTime > 10 && this.player.attackTime < 15) {
        const tipX = this.whipSegments[this.whipSegments.length - 1].x;
        const tipY = this.whipSegments[this.whipSegments.length - 1].y;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.grabbed) continue;
          const dx = tipX - (e.x + e.width / 2);
          const dy = tipY - (e.y + e.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 40) {
            e.hp -= 25;
            e.stunned = true;
            e.stunTimer = 25;
            this.player.combo++;
            this.player.comboTimer = 90;

            // Particles
            for (let j = 0; j < 4; j++) {
              this.particles.push({
                x: tipX, y: tipY,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4,
                life: 20, maxLife: 20,
                color: '#8b4513', size: 4
              });
            }

            // Grab small enemies
            if (e.type === 'bat' && !this.player.grabbing && e.hp > 0) {
              e.grabbed = true;
              this.player.grabbing = true;
              this.player.grabbedEnemy = e;
            }

            if (e.hp <= 0) {
              const points = e.type === 'vampire' ? 100 : (e.type === 'skeleton' ? 60 : 30);
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
      }

      if (this.player.attackTime > 25) {
        this.player.attacking = false;
        this.whipSegments = [];
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

    // Update grabbed enemy
    if (this.player.grabbedEnemy) {
      const e = this.player.grabbedEnemy;
      e.x = this.player.x + (this.player.facing === 'right' ? 40 : -30);
      e.y = this.player.y - 10;
    }

    // Update enemies
    for (const e of this.enemies) {
      if (e.grabbed) continue;

      if (e.stunned) {
        e.stunTimer -= dt;
        if (e.stunTimer <= 0) e.stunned = false;
        e.vx *= 0.9;
        e.vy *= 0.9;
      } else {
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = e.type === 'bat' ? 3 : (e.type === 'vampire' ? 1.8 : 1.5);
        if (dist > 0) {
          e.vx = (dx / dist) * speed;
          e.vy = (dy / dist) * speed;
        }

        // Attack player
        if (dist < 30 && e.attackCooldown <= 0) {
          const damage = e.type === 'vampire' ? 18 : (e.type === 'skeleton' ? 12 : 6);
          this.player.hp -= damage;
          e.attackCooldown = 45;
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

    // Background - gothic castle
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a0a0a');
    gradient.addColorStop(1, '#2d1f1f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stone brick pattern
    ctx.fillStyle = '#3d2828';
    for (let x = 0; x < w; x += 40) {
      for (let y = 0; y < h; y += 25) {
        const offset = (Math.floor(y / 25) % 2) * 20;
        ctx.fillRect(x + offset + 1, y + 1, 38, 23);
      }
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.grabbed) continue;

      ctx.save();
      if (e.stunned) ctx.globalAlpha = 0.7;

      if (e.type === 'bat') {
        ctx.fillStyle = '#4a4a4a';
        // Wings
        ctx.beginPath();
        ctx.ellipse(e.x + 5, e.y + 10, 12, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(e.x + e.width - 5, e.y + 10, 12, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(e.x + 8, e.y + 6, 3, 3);
        ctx.fillRect(e.x + 13, e.y + 6, 3, 3);
      } else if (e.type === 'skeleton') {
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(e.x + 6, e.y, e.width - 12, e.height);
        // Skull
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(e.x + 9, e.y + 6, 4, 4);
        ctx.fillRect(e.x + 15, e.y + 6, 4, 4);
      } else {
        // Vampire
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(e.x, e.y + 15, e.width, e.height - 15);
        // Cape
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 15);
        ctx.lineTo(e.x - 5, e.y + e.height);
        ctx.lineTo(e.x + e.width + 5, e.y + e.height);
        ctx.lineTo(e.x + e.width, e.y + 15);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2, e.y + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(e.x + 10, e.y + 6, 4, 4);
        ctx.fillRect(e.x + 18, e.y + 6, 4, 4);
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

    // Body
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 4, py + 16, 24, 28);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(px + 16, py + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(px + 16, py + 8, 10, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#34495e';
    ctx.fillRect(px + 6, py + 44, 8, 10);
    ctx.fillRect(px + 18, py + 44, 8, 10);

    // Arm holding whip
    ctx.fillStyle = '#f5d6ba';
    ctx.fillRect(px + 24, py + 18, 8, 6);

    ctx.restore();

    // Whip
    if (this.whipSegments.length > 0) {
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.whipSegments[0].x, this.whipSegments[0].y);
      for (let i = 1; i < this.whipSegments.length; i++) {
        ctx.lineTo(this.whipSegments[i].x, this.whipSegments[i].y);
      }
      ctx.stroke();

      // Whip tip
      const tip = this.whipSegments[this.whipSegments.length - 1];
      ctx.fillStyle = '#d4ac0d';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grabbed enemy
    if (this.player.grabbedEnemy) {
      const e = this.player.grabbedEnemy;
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
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
