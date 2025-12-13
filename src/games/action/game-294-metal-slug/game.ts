/**
 * Metal Slug Game Engine
 * Game #294 - Classic run and gun
 */

interface Soldier {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  facing: 'left' | 'right'; state: 'idle' | 'run' | 'jump' | 'shoot' | 'crouch';
  grounded: boolean; shootCooldown: number;
}

interface Enemy {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  type: 'soldier' | 'tank' | 'helicopter';
  hp: number; facing: 'left' | 'right';
  shootTimer: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  friendly: boolean; type: 'normal' | 'heavy' | 'grenade';
  life: number;
}

interface Explosion {
  x: number; y: number; radius: number; life: number;
}

interface GameState {
  score: number; highScore: number;
  lives: number; ammo: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.6;
const GROUND_Y = 340;

export class MetalSlugGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Soldier;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];

  private score = 0; private highScore = 0;
  private lives = 3; private ammo = 50;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private scrollX = 0;
  private levelLength = 2000;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.loadHighScore();
    this.setupControls();
  }

  private createPlayer(): Soldier {
    return {
      x: 60, y: GROUND_Y - 48, vx: 0, vy: 0,
      width: 28, height: 48, facing: 'right',
      state: 'idle', grounded: true, shootCooldown: 0
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('metal_slug_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() { localStorage.setItem('metal_slug_highscore', this.highScore.toString()); }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, highScore: this.highScore, lives: this.lives, ammo: this.ammo, status: this.status });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    this.canvas.width = Math.min(container.getBoundingClientRect().width, 600);
    this.canvas.height = 400;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyZ') this.shoot();
      if (e.code === 'KeyX') this.jump();
      if (e.code === 'KeyC') this.throwGrenade();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private shoot() {
    if (this.status !== 'playing' || this.player.shootCooldown > 0) return;
    if (this.ammo <= 0) return;
    this.ammo--;
    this.player.state = 'shoot';
    this.player.shootCooldown = 8;
    const dir = this.player.facing === 'right' ? 1 : -1;
    this.bullets.push({
      x: this.player.x + (dir > 0 ? this.player.width : 0),
      y: this.player.y + 18,
      vx: dir * 12, vy: 0,
      friendly: true, type: 'normal', life: 60
    });
    this.emitState();
  }

  private jump() {
    if (this.status !== 'playing' || !this.player.grounded) return;
    this.player.vy = -14;
    this.player.grounded = false;
    this.player.state = 'jump';
  }

  private throwGrenade() {
    if (this.status !== 'playing') return;
    const dir = this.player.facing === 'right' ? 1 : -1;
    this.bullets.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y,
      vx: dir * 6, vy: -8,
      friendly: true, type: 'grenade', life: 60
    });
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('ArrowLeft') : this.keys.delete('ArrowLeft');
    if (action === 'right') active ? this.keys.add('ArrowRight') : this.keys.delete('ArrowRight');
    if (action === 'shoot' && active) this.shoot();
    if (action === 'jump' && active) this.jump();
    if (action === 'grenade' && active) this.throwGrenade();
    if (action === 'crouch') {
      active ? this.keys.add('ArrowDown') : this.keys.delete('ArrowDown');
    }
  }

  start() {
    this.score = 0; this.lives = 3; this.ammo = 50;
    this.scrollX = 0; this.spawnTimer = 0;
    this.player = this.createPlayer();
    this.enemies = [];
    this.bullets = [];
    this.explosions = [];
    this.spawnInitialEnemies();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnInitialEnemies() {
    for (let i = 0; i < 8; i++) {
      this.spawnEnemy(400 + i * 200);
    }
  }

  private spawnEnemy(x: number) {
    const rand = Math.random();
    let type: 'soldier' | 'tank' | 'helicopter';
    let hp: number, w: number, h: number;

    if (rand < 0.6) {
      type = 'soldier'; hp = 1; w = 24; h = 40;
    } else if (rand < 0.85) {
      type = 'tank'; hp = 5; w = 60; h = 40;
    } else {
      type = 'helicopter'; hp = 3; w = 50; h = 30;
    }

    const y = type === 'helicopter' ? 80 + Math.random() * 60 : GROUND_Y - h;
    this.enemies.push({
      x, y, vx: 0, vy: 0, width: w, height: h,
      type, hp, facing: 'left', shootTimer: 60 + Math.random() * 60
    });
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
    const speed = 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.player.vx = -speed; this.player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.vx = speed; this.player.facing = 'right';
    } else {
      this.player.vx *= 0.7;
    }

    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      this.player.state = 'crouch';
    }

    // Apply gravity
    this.player.vy += GRAVITY * dt;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Ground collision
    if (this.player.y >= GROUND_Y - this.player.height) {
      this.player.y = GROUND_Y - this.player.height;
      this.player.vy = 0;
      this.player.grounded = true;
      if (this.player.state === 'jump') this.player.state = 'idle';
    }

    // Screen bounds
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
    this.player.shootCooldown -= dt;

    // Scroll
    if (this.player.x > this.canvas.width * 0.6 && this.scrollX < this.levelLength - this.canvas.width) {
      const scroll = this.player.x - this.canvas.width * 0.6;
      this.scrollX += scroll;
      this.player.x = this.canvas.width * 0.6;
    }

    // Update state
    if (this.player.grounded && Math.abs(this.player.vx) > 0.5 && this.player.state !== 'crouch') {
      this.player.state = 'run';
    } else if (this.player.grounded && this.player.state !== 'crouch') {
      this.player.state = 'idle';
    }

    // Spawn enemies
    this.spawnTimer += dt;
    if (this.spawnTimer > 120 && this.enemies.length < 10) {
      this.spawnEnemy(this.scrollX + this.canvas.width + 50);
      this.spawnTimer = 0;
    }

    // Update enemies
    for (const e of this.enemies) {
      const screenX = e.x - this.scrollX;
      if (screenX < -100 || screenX > this.canvas.width + 200) continue;

      if (e.type === 'helicopter') {
        e.vy = Math.sin(Date.now() / 500) * 0.5;
        e.vx = -1;
      } else if (e.type === 'tank') {
        e.vx = -0.5;
      } else {
        const dx = this.player.x + this.scrollX - e.x;
        e.vx = dx > 0 ? 1 : -1;
        e.facing = dx > 0 ? 'right' : 'left';
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.type !== 'helicopter') {
        e.y = Math.min(GROUND_Y - e.height, e.y);
      }

      // Enemy shooting
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && screenX > 0 && screenX < this.canvas.width) {
        const dir = e.facing === 'right' ? 1 : -1;
        this.bullets.push({
          x: e.x + (dir > 0 ? e.width : 0),
          y: e.y + e.height / 2,
          vx: dir * 6, vy: e.type === 'helicopter' ? 3 : 0,
          friendly: false, type: e.type === 'tank' ? 'heavy' : 'normal', life: 80
        });
        e.shootTimer = e.type === 'tank' ? 90 : 60;
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.type === 'grenade') {
        b.vy += 0.3 * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Grenade hits ground
      if (b.type === 'grenade' && b.y >= GROUND_Y - 10) {
        this.explosions.push({ x: b.x, y: GROUND_Y, radius: 60, life: 20 });
        // Damage nearby enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dist = Math.hypot(e.x - b.x, e.y - b.y);
          if (dist < 80) {
            e.hp -= 3;
            if (e.hp <= 0) {
              this.score += e.type === 'tank' ? 200 : (e.type === 'helicopter' ? 150 : 50);
              this.explosions.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, radius: 40, life: 15 });
              this.enemies.splice(j, 1);
            }
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.life <= 0 || b.x < this.scrollX - 50 || b.x > this.scrollX + this.canvas.width + 50) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.friendly) {
        // Hit enemy
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (b.x > e.x && b.x < e.x + e.width && b.y > e.y && b.y < e.y + e.height) {
            e.hp--;
            this.bullets.splice(i, 1);
            if (e.hp <= 0) {
              this.score += e.type === 'tank' ? 200 : (e.type === 'helicopter' ? 150 : 50);
              if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
              this.explosions.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, radius: 40, life: 15 });
              this.enemies.splice(j, 1);
              // Drop ammo
              if (Math.random() < 0.3) this.ammo += 10;
            }
            this.emitState();
            break;
          }
        }
      } else {
        // Hit player
        const px = this.player.x + this.scrollX;
        if (b.x > px && b.x < px + this.player.width && b.y > this.player.y && b.y < this.player.y + this.player.height) {
          this.bullets.splice(i, 1);
          this.lives--;
          this.emitState();
          if (this.lives <= 0) {
            this.status = 'over';
            this.emitState();
            return;
          }
          // Respawn
          this.player.x = 60;
        }
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].life -= dt;
      if (this.explosions[i].life <= 0) this.explosions.splice(i, 1);
    }

    // Win condition
    if (this.scrollX >= this.levelLength - this.canvas.width && this.enemies.length === 0) {
      this.status = 'cleared';
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#E0F6FF');
    gradient.addColorStop(1, '#98D8C8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Mountains (parallax)
    ctx.fillStyle = '#6B8E23';
    for (let i = 0; i < 6; i++) {
      const mx = i * 200 - (this.scrollX * 0.3) % 200;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + 100, 150);
      ctx.lineTo(mx + 200, GROUND_Y);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, GROUND_Y, w, 8);

    // Draw enemies
    for (const e of this.enemies) {
      const screenX = e.x - this.scrollX;
      if (screenX < -100 || screenX > w + 100) continue;
      this.drawEnemy(e, screenX);
    }

    // Draw player
    this.drawPlayer();

    // Draw bullets
    for (const b of this.bullets) {
      const screenX = b.x - this.scrollX;
      if (b.type === 'grenade') {
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(screenX, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = b.friendly ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(screenX - 6, b.y - 2, 12, 4);
      }
    }

    // Draw explosions
    for (const ex of this.explosions) {
      const screenX = ex.x - this.scrollX;
      const alpha = ex.life / 20;
      ctx.globalAlpha = alpha;
      const gradient = ctx.createRadialGradient(screenX, ex.y, 0, screenX, ex.y, ex.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, '#f1c40f');
      gradient.addColorStop(0.6, '#e74c3c');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, ex.y, ex.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
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
    ctx.fillStyle = '#2E7D32';
    const bodyHeight = p.state === 'crouch' ? p.height * 0.6 : p.height - 16;
    const bodyY = p.state === 'crouch' ? p.y + p.height * 0.4 : p.y + 16;
    ctx.fillRect(p.x + 4, bodyY, p.width - 8, bodyHeight - 8);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 6, 10, Math.PI, 0);
    ctx.fill();

    // Gun
    ctx.fillStyle = '#37474F';
    ctx.fillRect(p.x + p.width - 2, bodyY + 8, 16, 6);

    // Legs
    if (p.state !== 'crouch') {
      ctx.fillStyle = '#1B5E20';
      const legOffset = p.state === 'run' ? Math.sin(Date.now() / 80) * 6 : 0;
      ctx.fillRect(p.x + 6, p.y + p.height - 12, 6, 12 + legOffset);
      ctx.fillRect(p.x + p.width - 12, p.y + p.height - 12, 6, 12 - legOffset);
    }

    ctx.restore();
  }

  private drawEnemy(e: Enemy, screenX: number) {
    const ctx = this.ctx;

    if (e.type === 'soldier') {
      ctx.save();
      if (e.facing === 'left') {
        ctx.translate(screenX + e.width, 0);
        ctx.scale(-1, 1);
        ctx.translate(-screenX, 0);
      }
      // Body
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(screenX + 4, e.y + 12, e.width - 8, e.height - 20);
      // Head
      ctx.fillStyle = '#FFCC80';
      ctx.beginPath();
      ctx.arc(screenX + e.width / 2, e.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      // Hat
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(screenX + 2, e.y, e.width - 4, 8);
      ctx.restore();
    } else if (e.type === 'tank') {
      // Tank body
      ctx.fillStyle = '#455A64';
      ctx.fillRect(screenX, e.y + 15, e.width, e.height - 15);
      // Turret
      ctx.fillStyle = '#37474F';
      ctx.fillRect(screenX + 15, e.y, 30, 18);
      // Cannon
      ctx.fillRect(screenX - 15, e.y + 8, 20, 6);
      // Wheels
      ctx.fillStyle = '#263238';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(screenX + 10 + i * 15, e.y + e.height - 5, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'helicopter') {
      // Body
      ctx.fillStyle = '#546E7A';
      ctx.beginPath();
      ctx.ellipse(screenX + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.fillRect(screenX + e.width - 5, e.y + e.height / 2 - 3, 15, 6);
      // Rotor
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2;
      const rotorAngle = Date.now() / 30;
      ctx.beginPath();
      ctx.moveTo(screenX + e.width / 2 - 30 * Math.cos(rotorAngle), e.y - 5);
      ctx.lineTo(screenX + e.width / 2 + 30 * Math.cos(rotorAngle), e.y - 5);
      ctx.stroke();
      // Cockpit
      ctx.fillStyle = '#81D4FA';
      ctx.beginPath();
      ctx.ellipse(screenX + 12, e.y + e.height / 2, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP bar
    const hpPercent = e.hp / (e.type === 'tank' ? 5 : (e.type === 'helicopter' ? 3 : 1));
    ctx.fillStyle = '#333';
    ctx.fillRect(screenX, e.y - 8, e.width, 4);
    ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : '#f44336';
    ctx.fillRect(screenX, e.y - 8, e.width * hpPercent, 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
