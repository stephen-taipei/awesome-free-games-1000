/**
 * Arena Fighter Game Engine
 * Game #288
 *
 * Fight waves of enemies in the arena!
 */

interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  atk: number;
  facing: 'left' | 'right';
  state: 'idle' | 'walk' | 'attack' | 'hurt' | 'jump';
  stateTime: number;
  grounded: boolean;
}

interface Enemy extends Fighter {
  type: 'warrior' | 'archer' | 'mage' | 'champion';
  color: string;
  ai: { nextAction: number; pattern: number };
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

const GRAVITY = 0.6;
const GROUND_Y = 320;

export class ArenaFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Fighter;
  private enemies: Enemy[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; text?: string }[] = [];

  private score = 0;
  private highScore = 0;
  private wave = 1;
  private combo = 0;
  private comboTimer = 0;
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

  private createPlayer(): Fighter {
    return {
      x: 100,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      width: 40,
      height: 60,
      hp: 100,
      maxHp: 100,
      atk: 20,
      facing: 'right',
      state: 'idle',
      stateTime: 0,
      grounded: true,
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('arena_fighter_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('arena_fighter_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        wave: this.wave,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        combo: this.combo,
        status: this.status,
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
      if (e.code === 'KeyZ') this.attack();
      if (e.code === 'KeyX') this.jump();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.player = this.createPlayer();
    this.enemies = [];
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
    const count = 2 + Math.floor(this.wave * 0.5);
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    const types: Array<'warrior' | 'archer' | 'mage' | 'champion'> = ['warrior', 'archer', 'mage'];
    if (this.wave >= 5 && Math.random() < 0.15) types.push('champion');

    const type = types[Math.floor(Math.random() * types.length)];
    const configs = {
      warrior: { hp: 40, atk: 10, color: '#e74c3c', width: 36, height: 54 },
      archer: { hp: 25, atk: 8, color: '#27ae60', width: 32, height: 50 },
      mage: { hp: 30, atk: 15, color: '#9b59b6', width: 34, height: 52 },
      champion: { hp: 100, atk: 25, color: '#f1c40f', width: 44, height: 64 },
    };
    const config = configs[type];
    const side = Math.random() < 0.5 ? 'left' : 'right';

    this.enemies.push({
      x: side === 'left' ? -50 : this.canvas.width + 50,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      width: config.width,
      height: config.height,
      hp: config.hp + this.wave * 5,
      maxHp: config.hp + this.wave * 5,
      atk: config.atk + this.wave,
      facing: side === 'left' ? 'right' : 'left',
      state: 'walk',
      stateTime: 0,
      grounded: true,
      type,
      color: config.color,
      ai: { nextAction: 60, pattern: 0 },
    });
  }

  private attack() {
    if (this.status !== 'playing') return;
    if (this.player.state === 'attack') return;

    this.player.state = 'attack';
    this.player.stateTime = 0;

    // Check hits
    const attackRange = 50;
    const attackX = this.player.facing === 'right'
      ? this.player.x + this.player.width
      : this.player.x - attackRange;

    for (const enemy of this.enemies) {
      if (enemy.x + enemy.width > attackX && enemy.x < attackX + attackRange) {
        if (Math.abs(enemy.y - this.player.y) < 40) {
          const damage = this.player.atk + Math.floor(this.combo / 3) * 5;
          enemy.hp -= damage;
          enemy.state = 'hurt';
          enemy.stateTime = 0;
          enemy.vx = this.player.facing === 'right' ? 8 : -8;

          this.combo++;
          this.comboTimer = 120;

          // Damage particles
          this.particles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y,
            vx: 0,
            vy: -2,
            life: 40,
            color: '#fff',
            text: `-${damage}`,
          });

          for (let i = 0; i < 4; i++) {
            this.particles.push({
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 4,
              life: 20,
              color: enemy.color,
            });
          }
        }
      }
    }

    this.emitState();
  }

  private jump() {
    if (this.status !== 'playing') return;
    if (!this.player.grounded) return;

    this.player.vy = -14;
    this.player.grounded = false;
    this.player.state = 'jump';
  }

  handleMobileControl(action: string) {
    if (action === 'left') this.keys.add('ArrowLeft');
    if (action === 'right') this.keys.add('ArrowRight');
    if (action === 'attack') this.attack();
    if (action === 'jump') this.jump();
  }

  releaseMobileControl(action: string) {
    if (action === 'left') this.keys.delete('ArrowLeft');
    if (action === 'right') this.keys.delete('ArrowRight');
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
      if (this.player.grounded && this.player.state !== 'attack') {
        this.player.state = 'walk';
      }
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.vx = speed;
      this.player.facing = 'right';
      if (this.player.grounded && this.player.state !== 'attack') {
        this.player.state = 'walk';
      }
    } else {
      this.player.vx *= 0.8;
      if (this.player.grounded && this.player.state !== 'attack') {
        this.player.state = 'idle';
      }
    }

    // Physics
    this.player.x += this.player.vx * dt;
    this.player.vy += GRAVITY * dt;
    this.player.y += this.player.vy * dt;

    if (this.player.y >= GROUND_Y) {
      this.player.y = GROUND_Y;
      this.player.vy = 0;
      this.player.grounded = true;
      if (this.player.state === 'jump') this.player.state = 'idle';
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));

    // Attack state timer
    this.player.stateTime += dt;
    if (this.player.state === 'attack' && this.player.stateTime > 20) {
      this.player.state = 'idle';
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.emitState();
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // AI
      enemy.ai.nextAction -= dt;
      if (enemy.ai.nextAction <= 0 && enemy.state !== 'hurt') {
        const dx = this.player.x - enemy.x;
        const dist = Math.abs(dx);

        if (dist < 60) {
          // Attack
          enemy.state = 'attack';
          enemy.stateTime = 0;
          enemy.ai.nextAction = 60;

          // Deal damage
          if (this.player.state !== 'jump' || Math.random() < 0.3) {
            this.player.hp -= enemy.atk;
            this.player.state = 'hurt';
            this.player.stateTime = 0;
            this.emitState();

            if (this.player.hp <= 0) {
              this.status = 'over';
              this.emitState();
              return;
            }
          }
        } else {
          // Move toward player
          enemy.facing = dx > 0 ? 'right' : 'left';
          enemy.vx = enemy.facing === 'right' ? 2 : -2;
          enemy.state = 'walk';
          enemy.ai.nextAction = 20;
        }
      }

      // Physics
      enemy.x += enemy.vx * dt;
      enemy.vx *= 0.95;
      enemy.vy += GRAVITY * dt;
      enemy.y += enemy.vy * dt;

      if (enemy.y >= GROUND_Y) {
        enemy.y = GROUND_Y;
        enemy.vy = 0;
      }

      enemy.stateTime += dt;
      if (enemy.state === 'hurt' && enemy.stateTime > 15) {
        enemy.state = 'idle';
      }
      if (enemy.state === 'attack' && enemy.stateTime > 25) {
        enemy.state = 'idle';
      }

      // Check death
      if (enemy.hp <= 0) {
        const points = enemy.type === 'champion' ? 500 : 100;
        this.score += points + this.combo * 10;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.saveHighScore();
        }
        this.enemies.splice(i, 1);
        this.emitState();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.text) p.vy += 0.2 * dt;
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
    gradient.addColorStop(0, '#34495e');
    gradient.addColorStop(1, '#2c3e50');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Arena floor
    ctx.fillStyle = '#5d6d7e';
    ctx.fillRect(0, GROUND_Y + 60, w, h - GROUND_Y - 60);

    // Arena lines
    ctx.strokeStyle = '#839192';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 60);
    ctx.lineTo(w, GROUND_Y + 60);
    ctx.stroke();

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawFighter(enemy, enemy.color);
    }

    // Draw player
    this.drawFighter(this.player, '#3498db');

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 40;
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Combo display
    if (this.combo > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo} COMBO!`, w / 2, 50);
    }
  }

  private drawFighter(fighter: Fighter, color: string) {
    const ctx = this.ctx;
    const f = fighter;

    ctx.save();
    if (f.facing === 'left') {
      ctx.translate(f.x + f.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-f.x, 0);
    }

    // Body
    ctx.fillStyle = f.state === 'hurt' ? '#fff' : color;
    ctx.fillRect(f.x + 8, f.y + 16, f.width - 16, f.height - 32);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, f.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2c3e50';
    const legOffset = Math.sin(f.stateTime * 0.3) * (f.state === 'walk' ? 5 : 0);
    ctx.fillRect(f.x + 10, f.y + f.height - 20, 8, 18 + legOffset);
    ctx.fillRect(f.x + f.width - 18, f.y + f.height - 20, 8, 18 - legOffset);

    // Arms
    ctx.fillStyle = f.state === 'hurt' ? '#fff' : color;
    if (f.state === 'attack') {
      ctx.save();
      ctx.translate(f.x + f.width - 4, f.y + 24);
      ctx.rotate(-Math.PI / 4 + (f.stateTime / 20) * Math.PI / 2);
      ctx.fillRect(0, -4, 30, 8);
      ctx.restore();
    } else {
      ctx.fillRect(f.x + f.width - 4, f.y + 20, 20, 6);
    }

    ctx.restore();

    // HP bar (for enemies)
    if ((fighter as Enemy).type) {
      const hpPercent = f.hp / f.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(f.x, f.y - 12, f.width, 6);
      ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(f.x, f.y - 12, f.width * hpPercent, 6);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
