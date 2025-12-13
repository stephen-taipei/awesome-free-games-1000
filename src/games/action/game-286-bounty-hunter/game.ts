/**
 * Bounty Hunter Game Engine
 * Game #286
 *
 * Hunt down wanted targets and collect bounties!
 */

interface Point {
  x: number;
  y: number;
}

interface Entity extends Point {
  width: number;
  height: number;
  vx: number;
  vy: number;
}

interface Target extends Entity {
  hp: number;
  maxHp: number;
  bounty: number;
  speed: number;
  color: string;
  type: 'grunt' | 'runner' | 'boss';
  stunned: number;
}

interface Player extends Entity {
  hp: number;
  maxHp: number;
  attackCooldown: number;
  attackRange: number;
  facing: 'left' | 'right';
  isAttacking: boolean;
  attackFrame: number;
}

interface GameState {
  score: number;
  highScore: number;
  level: number;
  hp: number;
  maxHp: number;
  targetsLeft: number;
  status: 'idle' | 'playing' | 'over' | 'win';
}

type StateCallback = (state: GameState) => void;
type MessageCallback = (msg: string) => void;

export class BountyHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private targets: Target[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  private score = 0;
  private highScore = 0;
  private level = 1;
  private status: 'idle' | 'playing' | 'over' | 'win' = 'idle';

  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private onMessage: MessageCallback | null = null;
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
      x: 100,
      y: 300,
      width: 32,
      height: 48,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      attackCooldown: 0,
      attackRange: 60,
      facing: 'right',
      isAttacking: false,
      attackFrame: 0,
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('bounty_hunter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('bounty_hunter_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }
  setOnMessage(cb: MessageCallback) { this.onMessage = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        level: this.level,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        targetsLeft: this.targets.length,
        status: this.status,
      });
    }
  }

  private showMessage(msg: string) {
    if (this.onMessage) this.onMessage(msg);
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = Math.min(rect.height, 400);
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.attack();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Touch/click controls
    this.canvas.addEventListener('click', (e) => {
      if (this.status !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < this.player.x) {
        this.player.facing = 'left';
      } else {
        this.player.facing = 'right';
      }
      this.attack();
    });
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.player = this.createPlayer();
    this.player.x = 100;
    this.player.y = this.canvas.height - 80;
    this.targets = [];
    this.particles = [];
    this.spawnTargets();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
    this.player.x = 100;
    this.targets = [];
    this.particles = [];
    this.spawnTargets();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private spawnTargets() {
    const count = 2 + this.level;
    for (let i = 0; i < count; i++) {
      const type = this.getRandomTargetType();
      this.targets.push(this.createTarget(type));
    }
  }

  private getRandomTargetType(): 'grunt' | 'runner' | 'boss' {
    const rand = Math.random();
    if (this.level >= 3 && rand < 0.15) return 'boss';
    if (rand < 0.4) return 'runner';
    return 'grunt';
  }

  private createTarget(type: 'grunt' | 'runner' | 'boss'): Target {
    const configs = {
      grunt: { hp: 30, bounty: 100, speed: 1.5, color: '#e74c3c', width: 28, height: 40 },
      runner: { hp: 20, bounty: 150, speed: 3, color: '#f39c12', width: 24, height: 36 },
      boss: { hp: 100, bounty: 500, speed: 1, color: '#8e44ad', width: 40, height: 56 },
    };
    const config = configs[type];
    return {
      x: 200 + Math.random() * (this.canvas.width - 300),
      y: this.canvas.height - 60 - config.height / 2,
      width: config.width,
      height: config.height,
      vx: (Math.random() - 0.5) * config.speed * 2,
      vy: 0,
      hp: config.hp + this.level * 5,
      maxHp: config.hp + this.level * 5,
      bounty: config.bounty + this.level * 20,
      speed: config.speed,
      color: config.color,
      type,
      stunned: 0,
    };
  }

  private attack() {
    if (this.status !== 'playing' || this.player.attackCooldown > 0) return;

    this.player.isAttacking = true;
    this.player.attackFrame = 0;
    this.player.attackCooldown = 20;

    // Check hit
    const attackX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - this.player.attackRange;

    for (const target of this.targets) {
      if (target.stunned > 0) continue;

      const targetCenterX = target.x + target.width / 2;
      const targetCenterY = target.y + target.height / 2;

      if (targetCenterX >= attackX &&
          targetCenterX <= attackX + this.player.attackRange &&
          Math.abs(targetCenterY - (this.player.y + this.player.height / 2)) < 50) {
        // Hit!
        const damage = 15 + Math.floor(Math.random() * 10);
        target.hp -= damage;
        target.stunned = 15;
        target.vx = this.player.facing === 'right' ? 5 : -5;

        // Particles
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: targetCenterX,
            y: targetCenterY,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4,
            life: 20,
            color: target.color,
          });
        }
      }
    }
  }

  private gameLoop() {
    if (this.status !== 'playing') {
      this.animationId = null;
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 2);
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Player movement
    const speed = 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.player.vx = -speed;
      this.player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.vx = speed;
      this.player.facing = 'right';
    } else {
      this.player.vx *= 0.8;
    }

    this.player.x += this.player.vx * dt;
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));

    // Attack cooldown
    if (this.player.attackCooldown > 0) this.player.attackCooldown -= dt;
    if (this.player.isAttacking) {
      this.player.attackFrame += dt;
      if (this.player.attackFrame > 15) {
        this.player.isAttacking = false;
        this.player.attackFrame = 0;
      }
    }

    // Update targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];

      if (target.stunned > 0) {
        target.stunned -= dt;
        target.vx *= 0.9;
      } else {
        // AI: Move toward or away from player
        const dx = this.player.x - target.x;
        if (target.type === 'runner') {
          // Runners try to escape
          target.vx = dx > 0 ? -target.speed : target.speed;
        } else {
          // Others approach to attack
          if (Math.abs(dx) > 50) {
            target.vx = dx > 0 ? target.speed : -target.speed;
          } else {
            // Attack player
            if (Math.random() < 0.02) {
              this.player.hp -= 5 + (target.type === 'boss' ? 10 : 0);
              this.showMessage('Ouch!');
              this.emitState();
            }
          }
        }
      }

      target.x += target.vx * dt;
      target.x = Math.max(0, Math.min(this.canvas.width - target.width, target.x));

      // Check if target is defeated
      if (target.hp <= 0) {
        this.score += target.bounty;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.saveHighScore();
        }
        this.targets.splice(i, 1);

        // Death particles
        for (let j = 0; j < 10; j++) {
          this.particles.push({
            x: target.x + target.width / 2,
            y: target.y + target.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -Math.random() * 6,
            life: 30,
            color: '#ffd700',
          });
        }
        this.emitState();
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

    // Check win/lose
    if (this.player.hp <= 0) {
      this.status = 'over';
      this.emitState();
      return;
    }

    if (this.targets.length === 0) {
      this.status = 'win';
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
    gradient.addColorStop(1, '#1a252f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, h - 40, w, 40);

    // Draw targets
    for (const target of this.targets) {
      this.drawTarget(target);
    }

    // Draw player
    this.drawPlayer();

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    if (p.facing === 'left') {
      ctx.translate(p.x + p.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-p.x, 0);
    }

    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(p.x + 8, p.y + 16, 16, 24);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(p.x + 16, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(p.x + 4, p.y + 2, 24, 6);
    ctx.fillRect(p.x + 8, p.y - 4, 16, 8);

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(p.x + 8, p.y + 40, 6, 10);
    ctx.fillRect(p.x + 18, p.y + 40, 6, 10);

    // Arm/Weapon
    if (p.isAttacking) {
      ctx.fillStyle = '#7f8c8d';
      ctx.save();
      ctx.translate(p.x + 24, p.y + 24);
      ctx.rotate(-Math.PI / 4 + (p.attackFrame / 15) * Math.PI / 2);
      ctx.fillRect(0, -3, 40, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(p.x + 24, p.y + 20, 30, 4);
    }

    ctx.restore();
  }

  private drawTarget(target: Target) {
    const ctx = this.ctx;
    const t = target;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(t.x + t.width / 2, this.canvas.height - 38, t.width / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = t.stunned > 0 ? '#fff' : t.color;
    ctx.fillRect(t.x, t.y, t.width, t.height);

    // Face
    ctx.fillStyle = '#fff';
    ctx.fillRect(t.x + 4, t.y + 8, 6, 6);
    ctx.fillRect(t.x + t.width - 10, t.y + 8, 6, 6);

    ctx.fillStyle = '#000';
    ctx.fillRect(t.x + 6, t.y + 10, 2, 3);
    ctx.fillRect(t.x + t.width - 8, t.y + 10, 2, 3);

    // HP bar
    const hpPercent = t.hp / t.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(t.x, t.y - 10, t.width, 6);
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(t.x, t.y - 10, t.width * hpPercent, 6);

    // Bounty indicator
    if (t.type === 'boss') {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', t.x + t.width / 2, t.y - 14);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
