interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

type FormType = 'human' | 'wolf' | 'eagle' | 'bear';

interface Player extends Entity {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  facing: 'left' | 'right';
  form: FormType;
  attackCd: number;
  attacking: boolean;
  transformCd: number;
  dashCd: number;
  dashing: boolean;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'goblin' | 'skeleton' | 'troll';
  attackCd: number;
  stunned: number;
  bleeding: number;
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

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

interface GameState {
  score: number;
  highScore: number;
  wave: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  form: FormType;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

const FORM_STATS: Record<FormType, { speed: number; damage: number; attackSpeed: number; color: string }> = {
  human: { speed: 150, damage: 10, attackSpeed: 0.5, color: '#f39c12' },
  wolf: { speed: 250, damage: 8, attackSpeed: 0.3, color: '#7f8c8d' },
  eagle: { speed: 180, damage: 6, attackSpeed: 0.4, color: '#3498db' },
  bear: { speed: 80, damage: 25, attackSpeed: 1.0, color: '#8b4513' },
};

export class TransformerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private player: Player;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private projectiles: Projectile[] = [];
  private keys: Record<string, boolean> = {};
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private score = 0;
  private highScore = 0;
  private wave = 1;
  private enemiesRemaining = 0;
  private spawnTimer = 0;
  private combo = 0;
  private comboTimer = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.highScore = parseInt(localStorage.getItem('transformer_high') || '0');
    this.setupInput();
    this.gameLoop();
  }

  private createPlayer(): Player {
    return {
      x: 0, y: 0, w: 32, h: 48, vx: 0, vy: 0,
      hp: 100, maxHp: 100, energy: 100, maxEnergy: 100,
      facing: 'right', form: 'human', attackCd: 0, attacking: false,
      transformCd: 0, dashCd: 0, dashing: false,
    };
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.status === 'playing') {
        if (e.code === 'Space') {
          e.preventDefault();
          this.attack();
        } else if (e.code === 'KeyX') {
          e.preventDefault();
          this.transform('wolf');
        } else if (e.code === 'KeyC') {
          e.preventDefault();
          this.transform('eagle');
        } else if (e.code === 'KeyV') {
          e.preventDefault();
          this.transform('bear');
        } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          e.preventDefault();
          this.dash();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  handleMobile(action: string, pressed: boolean) {
    if (action === 'left') this.keys['ArrowLeft'] = pressed;
    else if (action === 'right') this.keys['ArrowRight'] = pressed;
    else if (action === 'up') this.keys['ArrowUp'] = pressed;
    else if (action === 'down') this.keys['ArrowDown'] = pressed;
    else if (action === 'attack' && pressed) this.attack();
    else if (action === 'wolf' && pressed) this.transform('wolf');
    else if (action === 'eagle' && pressed) this.transform('eagle');
    else if (action === 'bear' && pressed) this.transform('bear');
  }

  private transform(form: FormType) {
    if (this.player.transformCd > 0 || this.player.energy < 20) return;
    if (this.player.form === form) {
      // Transform back to human
      this.player.form = 'human';
    } else {
      this.player.form = form;
      this.player.energy -= 20;
    }
    this.player.transformCd = 0.5;
    this.spawnParticles(this.player.x, this.player.y, FORM_STATS[this.player.form].color, 20);
  }

  private attack() {
    if (this.player.attackCd > 0) return;
    const stats = FORM_STATS[this.player.form];
    this.player.attackCd = stats.attackSpeed;
    this.player.attacking = true;
    setTimeout(() => { this.player.attacking = false; }, 150);

    if (this.player.form === 'eagle') {
      // Ranged attack
      const dir = this.player.facing === 'right' ? 1 : -1;
      this.projectiles.push({
        x: this.player.x + dir * 30,
        y: this.player.y - this.player.h / 2,
        vx: dir * 400,
        vy: 0,
        damage: stats.damage,
        life: 1,
      });
    } else {
      // Melee attack
      const range = this.player.form === 'bear' ? 60 : this.player.form === 'wolf' ? 40 : 35;
      const attackX = this.player.x + (this.player.facing === 'right' ? range / 2 : -range / 2);

      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - attackX;
        const dy = e.y - this.player.y;
        if (Math.abs(dx) < range && Math.abs(dy) < 40) {
          e.hp -= stats.damage;
          if (this.player.form === 'wolf') {
            e.bleeding = 3;
          }
          if (this.player.form === 'bear') {
            e.stunned = 1;
            // Knockback
            e.x += (this.player.facing === 'right' ? 1 : -1) * 50;
          }
          this.spawnParticles(e.x, e.y - e.h / 2, stats.color, 5);
        }
      }
    }
  }

  private dash() {
    if (this.player.dashCd > 0 || this.player.energy < 15) return;
    if (this.player.form === 'bear') return; // Bear can't dash

    this.player.dashing = true;
    this.player.dashCd = this.player.form === 'wolf' ? 0.8 : 1.2;
    this.player.energy -= 15;

    const dir = this.player.facing === 'right' ? 1 : -1;
    const dashDist = this.player.form === 'wolf' ? 120 : 80;
    this.player.x += dir * dashDist;
    this.player.x = Math.max(this.player.w / 2, Math.min(this.width - this.player.w / 2, this.player.x));

    this.spawnParticles(this.player.x, this.player.y, FORM_STATS[this.player.form].color, 10);
    setTimeout(() => { this.player.dashing = false; }, 100);
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = Math.min(rect.width * 0.75, 450);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.player.x = this.width / 2;
    this.player.y = this.height - 80;
  }

  start() {
    this.status = 'playing';
    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.player = this.createPlayer();
    this.player.x = this.width / 2;
    this.player.y = this.height - 80;
    this.enemies = [];
    this.particles = [];
    this.projectiles = [];
    this.startWave();
    this.emitState();
  }

  nextWave() {
    this.status = 'playing';
    this.wave++;
    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
    this.player.energy = this.player.maxEnergy;
    this.startWave();
    this.emitState();
  }

  private startWave() {
    this.enemiesRemaining = 5 + this.wave * 3;
    this.spawnTimer = 0;
  }

  private spawnEnemy() {
    const types: Array<'goblin' | 'skeleton' | 'troll'> = ['goblin', 'skeleton', 'troll'];
    const type = types[Math.min(Math.floor(Math.random() * (1 + this.wave / 3)), 2)];
    const fromLeft = Math.random() < 0.5;
    const stats = { goblin: { hp: 25, w: 24 }, skeleton: { hp: 35, w: 28 }, troll: { hp: 60, w: 40 } };
    const s = stats[type];
    this.enemies.push({
      x: fromLeft ? -s.w : this.width + s.w,
      y: this.height - 60 - Math.random() * 40,
      w: s.w, h: s.w * 1.3,
      vx: 0, vy: 0,
      hp: s.hp + this.wave * 5,
      maxHp: s.hp + this.wave * 5,
      type, attackCd: 0, stunned: 0, bleeding: 0,
    });
  }

  setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    this.onStateChange?.({
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      energy: this.player.energy,
      maxEnergy: this.player.maxEnergy,
      form: this.player.form,
      status: this.status,
    });
  }

  private gameLoop = () => {
    const now = performance.now();
    const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
    this.lastTime = now;
    if (this.status === 'playing') this.update(dt);
    this.draw();
    requestAnimationFrame(this.gameLoop);
  };
  private lastTime = 0;

  private update(dt: number) {
    const stats = FORM_STATS[this.player.form];

    // Player movement
    this.player.vx = 0;
    this.player.vy = 0;
    if (this.keys['ArrowLeft']) { this.player.vx = -stats.speed; this.player.facing = 'left'; }
    if (this.keys['ArrowRight']) { this.player.vx = stats.speed; this.player.facing = 'right'; }
    if (this.keys['ArrowUp']) this.player.vy = -stats.speed;
    if (this.keys['ArrowDown']) this.player.vy = stats.speed;

    if (!this.player.dashing) {
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
    }
    this.player.x = Math.max(this.player.w / 2, Math.min(this.width - this.player.w / 2, this.player.x));
    this.player.y = Math.max(this.height / 2, Math.min(this.height - this.player.h / 2, this.player.y));

    // Cooldowns
    this.player.attackCd = Math.max(0, this.player.attackCd - dt);
    this.player.transformCd = Math.max(0, this.player.transformCd - dt);
    this.player.dashCd = Math.max(0, this.player.dashCd - dt);

    // Energy regen (faster in human form)
    const regenRate = this.player.form === 'human' ? 8 : 3;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + regenRate * dt);

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Spawn enemies
    if (this.enemiesRemaining > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= 1.5) {
        this.spawnTimer = 0;
        this.spawnEnemy();
        this.enemiesRemaining--;
      }
    }

    // Update projectiles
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Check hit
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - p.x;
        const dy = (e.y - e.h / 2) - p.y;
        if (Math.abs(dx) < e.w / 2 + 10 && Math.abs(dy) < e.h / 2 + 10) {
          e.hp -= p.damage;
          p.life = 0;
          this.spawnParticles(p.x, p.y, '#3498db', 5);
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0 && p.x > 0 && p.x < this.width);

    // Update enemies
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.attackCd -= dt;

      // Bleeding damage
      if (e.bleeding > 0) {
        e.bleeding -= dt;
        e.hp -= 4 * dt;
        if (Math.random() < 0.1) {
          this.spawnParticles(e.x, e.y - e.h / 2, '#c0392b', 2);
        }
      }

      if (e.stunned > 0) {
        e.stunned -= dt;
        continue;
      }

      // Move toward player
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      const speed = e.type === 'goblin' ? 80 : e.type === 'skeleton' ? 60 : 40;

      if (dist > 30) {
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.attackCd <= 0) {
        e.attackCd = e.type === 'troll' ? 1.5 : 1;
        const damage = e.type === 'goblin' ? 8 : e.type === 'skeleton' ? 12 : 20;
        // Bear form takes less damage
        const finalDamage = this.player.form === 'bear' ? damage * 0.5 : damage;
        this.player.hp -= finalDamage;
        this.spawnParticles(this.player.x, this.player.y, '#e74c3c', 5);
      }
    }

    // Check enemy deaths
    for (const e of this.enemies) {
      if (e.hp <= 0 && e.maxHp > 0) {
        this.combo++;
        this.comboTimer = 2;
        const points = (e.type === 'goblin' ? 10 : e.type === 'skeleton' ? 20 : 35) * (1 + this.combo * 0.1);
        this.score += points;
        this.spawnParticles(e.x, e.y, '#e74c3c', 12);
        e.maxHp = 0;
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Check game over
    if (this.player.hp <= 0) {
      this.status = 'over';
      if (this.score > this.highScore) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem('transformer_high', this.highScore.toString());
      }
      this.emitState();
    }

    // Check wave clear
    if (this.enemies.length === 0 && this.enemiesRemaining === 0) {
      this.status = 'cleared';
      this.emitState();
    }

    this.emitState();
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Ground
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, this.height - 40, this.width, 40);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Projectiles
    for (const p of this.projectiles) {
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
      ctx.beginPath();
      ctx.ellipse(p.x - p.vx * 0.02, p.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      ctx.save();
      ctx.translate(e.x, e.y);

      // HP bar
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-e.w / 2, -e.h - 8, e.w, 4);
      ctx.fillStyle = e.bleeding > 0 ? '#c0392b' : '#e74c3c';
      ctx.fillRect(-e.w / 2, -e.h - 8, e.w * (e.hp / e.maxHp), 4);

      if (e.stunned > 0) ctx.globalAlpha = 0.5;

      if (e.type === 'goblin') {
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
        // Face
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-e.w / 3, -e.h + 5, e.w * 2 / 3, 8);
        // Eyes
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-5, -e.h + 8, 4, 4);
        ctx.fillRect(2, -e.h + 8, 4, 4);
      } else if (e.type === 'skeleton') {
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
        // Skull
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.arc(0, -e.h + 12, 10, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-6, -e.h + 10, 5, 5);
        ctx.fillRect(2, -e.h + 10, 5, 5);
      } else {
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
        // Face
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(-e.w / 3, -e.h + 8, e.w * 2 / 3, 12);
        // Tusks
        ctx.fillStyle = '#fff';
        ctx.fillRect(-e.w / 3 - 3, -e.h + 15, 5, 10);
        ctx.fillRect(e.w / 3 - 2, -e.h + 15, 5, 10);
      }

      ctx.restore();
    }

    // Player
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    if (this.player.facing === 'left') ctx.scale(-1, 1);

    const formColor = FORM_STATS[this.player.form].color;

    if (this.player.form === 'human') {
      // Human body
      ctx.fillStyle = formColor;
      ctx.fillRect(-this.player.w / 2, -this.player.h, this.player.w, this.player.h);
      // Head
      ctx.fillStyle = '#ffeaa7';
      ctx.beginPath();
      ctx.arc(0, -this.player.h + 5, 12, 0, Math.PI * 2);
      ctx.fill();
      // Hair
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(0, -this.player.h + 2, 12, Math.PI, Math.PI * 2);
      ctx.fill();
      // Sword
      if (this.player.attacking) {
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(15, -this.player.h + 15, 30, 4);
        ctx.fillRect(15, -this.player.h + 10, 4, 20);
      } else {
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(12, -this.player.h + 5, 4, 35);
      }
    } else if (this.player.form === 'wolf') {
      // Wolf body
      ctx.fillStyle = formColor;
      ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w * 1.2, this.player.h / 2);
      // Head
      ctx.fillStyle = '#95a5a6';
      ctx.beginPath();
      ctx.moveTo(this.player.w / 2, -this.player.h / 2);
      ctx.lineTo(this.player.w / 2 + 20, -this.player.h / 3);
      ctx.lineTo(this.player.w / 2, 0);
      ctx.fill();
      // Ears
      ctx.fillStyle = formColor;
      ctx.beginPath();
      ctx.moveTo(this.player.w / 2 + 5, -this.player.h / 2);
      ctx.lineTo(this.player.w / 2 + 12, -this.player.h / 2 - 15);
      ctx.lineTo(this.player.w / 2 + 18, -this.player.h / 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.player.w / 2 + 10, -this.player.h / 3, 4, 4);
      // Claws effect when attacking
      if (this.player.attacking) {
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(this.player.w / 2 + 20, -this.player.h / 3 + i * 8);
          ctx.lineTo(this.player.w / 2 + 40, -this.player.h / 3 + i * 8 - 5);
          ctx.stroke();
        }
      }
    } else if (this.player.form === 'eagle') {
      // Eagle body
      ctx.fillStyle = formColor;
      ctx.beginPath();
      ctx.ellipse(0, -this.player.h / 2, this.player.w / 2, this.player.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wingFlap = Math.sin(Date.now() / 100) * 0.3;
      ctx.fillStyle = '#2980b9';
      ctx.save();
      ctx.rotate(-0.5 + wingFlap);
      ctx.beginPath();
      ctx.ellipse(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(0.5 - wingFlap);
      ctx.beginPath();
      ctx.ellipse(this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Beak
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.moveTo(this.player.w / 3, -this.player.h / 2);
      ctx.lineTo(this.player.w / 3 + 15, -this.player.h / 2 + 5);
      ctx.lineTo(this.player.w / 3, -this.player.h / 2 + 10);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(this.player.w / 4, -this.player.h / 2 - 2, 4, 4);
    } else {
      // Bear body
      ctx.fillStyle = formColor;
      ctx.fillRect(-this.player.w * 0.6, -this.player.h, this.player.w * 1.2, this.player.h);
      // Head
      ctx.fillStyle = '#5d3a1a';
      ctx.beginPath();
      ctx.arc(0, -this.player.h + 10, 18, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillStyle = formColor;
      ctx.beginPath();
      ctx.arc(-12, -this.player.h - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, -this.player.h - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      // Snout
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.ellipse(0, -this.player.h + 18, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-8, -this.player.h + 8, 5, 5);
      ctx.fillRect(4, -this.player.h + 8, 5, 5);
      // Claw swipe when attacking
      if (this.player.attacking) {
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(this.player.w * 0.6 + 10, -this.player.h + i * 12);
          ctx.lineTo(this.player.w * 0.6 + 40, -this.player.h + i * 12 - 8);
          ctx.stroke();
        }
      }
    }

    // Dash effect
    if (this.player.dashing) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = formColor;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.3 / i;
        ctx.fillRect(-this.player.w / 2 - i * 15, -this.player.h, this.player.w, this.player.h);
      }
    }

    ctx.restore();

    // UI
    // Combo display
    if (this.combo > 1) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo} COMBO!`, this.width / 2, 80);
    }

    // Form indicator
    ctx.fillStyle = FORM_STATS[this.player.form].color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Form: ${this.player.form.toUpperCase()}`, 10, 25);
  }
}
