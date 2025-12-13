interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Player extends Entity {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  facing: 'left' | 'right';
  summoning: boolean;
  summonTime: number;
  summonType: 'wolf' | 'golem' | 'phoenix';
}

type SummonType = 'wolf' | 'golem' | 'phoenix';

interface Summon extends Entity {
  hp: number;
  maxHp: number;
  type: SummonType;
  target: Enemy | null;
  attackCd: number;
  lifeTime: number;
  maxLifeTime: number;
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'slime' | 'orc' | 'demon';
  attackCd: number;
  stunned: number;
  burning: number;
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
  mana: number;
  maxMana: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

const SUMMON_COSTS: Record<SummonType, number> = {
  wolf: 20,
  golem: 40,
  phoenix: 60,
};

const SUMMON_STATS: Record<SummonType, { hp: number; damage: number; speed: number; lifetime: number }> = {
  wolf: { hp: 30, damage: 8, speed: 120, lifetime: 15 },
  golem: { hp: 100, damage: 15, speed: 40, lifetime: 20 },
  phoenix: { hp: 40, damage: 12, speed: 80, lifetime: 12 },
};

export class SummonerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private player: Player;
  private summons: Summon[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private keys: Record<string, boolean> = {};
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private score = 0;
  private highScore = 0;
  private wave = 1;
  private enemiesRemaining = 0;
  private spawnTimer = 0;
  private manaRegen = 0;
  private combo = 0;
  private comboTimer = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.highScore = parseInt(localStorage.getItem('summoner_high') || '0');
    this.setupInput();
    this.gameLoop();
  }

  private createPlayer(): Player {
    return {
      x: 0, y: 0, w: 32, h: 48, vx: 0, vy: 0,
      hp: 100, maxHp: 100, mana: 100, maxMana: 100,
      facing: 'right', summoning: false, summonTime: 0, summonType: 'wolf',
    };
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.status === 'playing') {
        if (e.code === 'Space') {
          e.preventDefault();
          this.startSummon('wolf');
        } else if (e.code === 'KeyX') {
          e.preventDefault();
          this.startSummon('golem');
        } else if (e.code === 'KeyC') {
          e.preventDefault();
          this.startSummon('phoenix');
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (['Space', 'KeyX', 'KeyC'].includes(e.code)) {
        this.player.summoning = false;
      }
    });
  }

  handleMobile(action: string, pressed: boolean) {
    if (action === 'left') this.keys['ArrowLeft'] = pressed;
    else if (action === 'right') this.keys['ArrowRight'] = pressed;
    else if (action === 'up') this.keys['ArrowUp'] = pressed;
    else if (action === 'down') this.keys['ArrowDown'] = pressed;
    else if (action === 'wolf' && pressed) this.startSummon('wolf');
    else if (action === 'golem' && pressed) this.startSummon('golem');
    else if (action === 'phoenix' && pressed) this.startSummon('phoenix');
    if (['wolf', 'golem', 'phoenix'].includes(action) && !pressed) {
      this.player.summoning = false;
    }
  }

  private startSummon(type: SummonType) {
    if (this.player.mana >= SUMMON_COSTS[type] && this.summons.length < 5) {
      this.player.summoning = true;
      this.player.summonType = type;
      this.player.summonTime = 0;
    }
  }

  private spawnSummon(type: SummonType) {
    const stats = SUMMON_STATS[type];
    const offset = this.player.facing === 'right' ? 50 : -50;
    const summon: Summon = {
      x: this.player.x + offset,
      y: this.player.y,
      w: type === 'golem' ? 40 : 28,
      h: type === 'golem' ? 50 : 32,
      vx: 0, vy: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      type,
      target: null,
      attackCd: 0,
      lifeTime: stats.lifetime,
      maxLifeTime: stats.lifetime,
    };
    this.summons.push(summon);
    this.player.mana -= SUMMON_COSTS[type];
    this.spawnParticles(summon.x, summon.y, this.getSummonColor(type), 15);
  }

  private getSummonColor(type: SummonType): string {
    switch (type) {
      case 'wolf': return '#7f8c8d';
      case 'golem': return '#8b4513';
      case 'phoenix': return '#e74c3c';
    }
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
    this.summons = [];
    this.enemies = [];
    this.particles = [];
    this.startWave();
    this.emitState();
  }

  nextWave() {
    this.status = 'playing';
    this.wave++;
    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
    this.player.mana = this.player.maxMana;
    this.startWave();
    this.emitState();
  }

  private startWave() {
    this.enemiesRemaining = 5 + this.wave * 3;
    this.spawnTimer = 0;
  }

  private spawnEnemy() {
    const types: Array<'slime' | 'orc' | 'demon'> = ['slime', 'orc', 'demon'];
    const type = types[Math.min(Math.floor(Math.random() * (1 + this.wave / 3)), 2)];
    const fromLeft = Math.random() < 0.5;
    const stats = { slime: { hp: 20, w: 24 }, orc: { hp: 40, w: 30 }, demon: { hp: 60, w: 36 } };
    const s = stats[type];
    this.enemies.push({
      x: fromLeft ? -s.w : this.width + s.w,
      y: this.height - 60 - Math.random() * 40,
      w: s.w, h: s.w * 1.2,
      vx: 0, vy: 0,
      hp: s.hp + this.wave * 5,
      maxHp: s.hp + this.wave * 5,
      type, attackCd: 0, stunned: 0, burning: 0,
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
      mana: this.player.mana,
      maxMana: this.player.maxMana,
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
    // Player movement
    const speed = 150;
    this.player.vx = 0;
    this.player.vy = 0;
    if (this.keys['ArrowLeft']) { this.player.vx = -speed; this.player.facing = 'left'; }
    if (this.keys['ArrowRight']) { this.player.vx = speed; this.player.facing = 'right'; }
    if (this.keys['ArrowUp']) this.player.vy = -speed;
    if (this.keys['ArrowDown']) this.player.vy = speed;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    this.player.x = Math.max(this.player.w / 2, Math.min(this.width - this.player.w / 2, this.player.x));
    this.player.y = Math.max(this.height / 2, Math.min(this.height - this.player.h / 2, this.player.y));

    // Summoning
    if (this.player.summoning) {
      this.player.summonTime += dt;
      if (this.player.summonTime >= 0.5) {
        this.spawnSummon(this.player.summonType);
        this.player.summoning = false;
        this.player.summonTime = 0;
      }
    }

    // Mana regen
    this.manaRegen += dt;
    if (this.manaRegen >= 0.5) {
      this.manaRegen = 0;
      this.player.mana = Math.min(this.player.mana + 2, this.player.maxMana);
    }

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

    // Update summons
    for (const s of this.summons) {
      s.lifeTime -= dt;
      s.attackCd -= dt;

      // Find target
      if (!s.target || s.target.hp <= 0) {
        s.target = this.enemies.reduce((closest, e) => {
          if (e.hp <= 0) return closest;
          const d = Math.hypot(e.x - s.x, e.y - s.y);
          if (!closest || d < Math.hypot(closest.x - s.x, closest.y - s.y)) return e;
          return closest;
        }, null as Enemy | null);
      }

      if (s.target) {
        const dx = s.target.x - s.x;
        const dy = s.target.y - s.y;
        const dist = Math.hypot(dx, dy);
        const stats = SUMMON_STATS[s.type];

        if (dist > 30) {
          s.vx = (dx / dist) * stats.speed;
          s.vy = (dy / dist) * stats.speed;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        } else if (s.attackCd <= 0) {
          // Attack
          s.attackCd = s.type === 'wolf' ? 0.5 : s.type === 'golem' ? 1.2 : 0.8;
          s.target.hp -= stats.damage;
          if (s.type === 'phoenix') {
            s.target.burning = 3;
          }
          if (s.type === 'golem') {
            s.target.stunned = 0.5;
          }
          this.spawnParticles(s.target.x, s.target.y, this.getSummonColor(s.type), 5);
        }
      }
    }
    this.summons = this.summons.filter(s => s.lifeTime > 0 && s.hp > 0);

    // Update enemies
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.attackCd -= dt;

      // Burning damage
      if (e.burning > 0) {
        e.burning -= dt;
        e.hp -= 5 * dt;
        if (Math.random() < 0.1) {
          this.spawnParticles(e.x, e.y - e.h / 2, '#f39c12', 2);
        }
      }

      if (e.stunned > 0) {
        e.stunned -= dt;
        continue;
      }

      // Find nearest target (player or summon)
      let target: { x: number; y: number } = this.player;
      let minDist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      for (const s of this.summons) {
        const d = Math.hypot(s.x - e.x, s.y - e.y);
        if (d < minDist) {
          minDist = d;
          target = s;
        }
      }

      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);
      const speed = e.type === 'slime' ? 50 : e.type === 'orc' ? 70 : 90;

      if (dist > 25) {
        e.vx = (dx / dist) * speed;
        e.vy = (dy / dist) * speed;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.attackCd <= 0) {
        e.attackCd = 1;
        const damage = e.type === 'slime' ? 5 : e.type === 'orc' ? 10 : 15;
        if (target === this.player) {
          this.player.hp -= damage;
        } else {
          (target as Summon).hp -= damage;
        }
        this.spawnParticles(target.x, target.y, '#e74c3c', 5);
      }
    }

    // Check enemy deaths
    for (const e of this.enemies) {
      if (e.hp <= 0 && e.maxHp > 0) {
        this.combo++;
        this.comboTimer = 2;
        const points = (e.type === 'slime' ? 10 : e.type === 'orc' ? 20 : 30) * (1 + this.combo * 0.1);
        this.score += points;
        this.spawnParticles(e.x, e.y, '#e74c3c', 10);
        e.maxHp = 0; // Mark as scored
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0 || e.maxHp > 0);
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
        localStorage.setItem('summoner_high', this.highScore.toString());
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

    // Summons
    for (const s of this.summons) {
      ctx.save();
      ctx.translate(s.x, s.y);

      // Lifetime indicator
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-s.w / 2, -s.h - 8, s.w, 4);
      ctx.fillStyle = this.getSummonColor(s.type);
      ctx.fillRect(-s.w / 2, -s.h - 8, s.w * (s.lifeTime / s.maxLifeTime), 4);

      if (s.type === 'wolf') {
        // Wolf body
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h / 2);
        // Head
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(-s.w / 2 - 8, -s.h / 2 - 5, 16, 12);
        // Eyes
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-s.w / 2 - 5, -s.h / 2 - 2, 3, 3);
      } else if (s.type === 'golem') {
        // Golem body
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-s.w / 2, -s.h, s.w, s.h);
        // Face
        ctx.fillStyle = '#5d3a1a';
        ctx.fillRect(-s.w / 4, -s.h + 10, s.w / 2, 8);
        // Eyes
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-s.w / 4, -s.h + 5, 5, 5);
        ctx.fillRect(s.w / 4 - 5, -s.h + 5, 5, 5);
      } else {
        // Phoenix body
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(0, -s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(-s.w / 2, -s.h / 2);
        ctx.lineTo(-s.w, -s.h);
        ctx.lineTo(-s.w / 2, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s.w / 2, -s.h / 2);
        ctx.lineTo(s.w, -s.h);
        ctx.lineTo(s.w / 2, 0);
        ctx.fill();
        // Fire trail
        if (Math.random() < 0.3) {
          this.spawnParticles(s.x, s.y, '#f39c12', 1);
        }
      }

      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      ctx.save();
      ctx.translate(e.x, e.y);

      // HP bar
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-e.w / 2, -e.h - 8, e.w, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-e.w / 2, -e.h - 8, e.w * (e.hp / e.maxHp), 4);

      if (e.stunned > 0) {
        ctx.globalAlpha = 0.5;
      }

      if (e.type === 'slime') {
        ctx.fillStyle = e.burning > 0 ? '#e67e22' : '#27ae60';
        ctx.beginPath();
        ctx.ellipse(0, -e.h / 3, e.w / 2, e.h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -e.h / 3, 4, 4);
        ctx.fillRect(2, -e.h / 3, 4, 4);
      } else if (e.type === 'orc') {
        ctx.fillStyle = e.burning > 0 ? '#e67e22' : '#2ecc71';
        ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
        // Face
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-e.w / 3, -e.h + 8, e.w * 2 / 3, 10);
        // Tusks
        ctx.fillStyle = '#fff';
        ctx.fillRect(-e.w / 3, -e.h + 15, 4, 6);
        ctx.fillRect(e.w / 3 - 4, -e.h + 15, 4, 6);
      } else {
        ctx.fillStyle = e.burning > 0 ? '#e67e22' : '#8e44ad';
        ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);
        // Horns
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(-e.w / 2, -e.h);
        ctx.lineTo(-e.w / 2 - 8, -e.h - 15);
        ctx.lineTo(-e.w / 4, -e.h);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.w / 2, -e.h);
        ctx.lineTo(e.w / 2 + 8, -e.h - 15);
        ctx.lineTo(e.w / 4, -e.h);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-e.w / 4, -e.h + 10, 5, 5);
        ctx.fillRect(e.w / 4 - 5, -e.h + 10, 5, 5);
      }

      ctx.restore();
    }

    // Player
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    if (this.player.facing === 'left') ctx.scale(-1, 1);

    // Robe
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(-this.player.w / 2, 0);
    ctx.lineTo(0, -this.player.h);
    ctx.lineTo(this.player.w / 2, 0);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -this.player.h + 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.arc(0, -this.player.h + 8, 12, Math.PI, Math.PI * 2);
    ctx.fill();

    // Staff
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(10, -this.player.h + 5, 4, this.player.h - 5);
    // Staff orb
    ctx.fillStyle = this.player.summoning ? this.getSummonColor(this.player.summonType) : '#9b59b6';
    ctx.beginPath();
    ctx.arc(12, -this.player.h, 8, 0, Math.PI * 2);
    ctx.fill();

    // Summoning effect
    if (this.player.summoning) {
      ctx.strokeStyle = this.getSummonColor(this.player.summonType);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 30 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
      ctx.stroke();
      // Magic particles
      const angle = Date.now() / 200;
      for (let i = 0; i < 6; i++) {
        const a = angle + (i * Math.PI * 2) / 6;
        const r = 25;
        ctx.fillStyle = this.getSummonColor(this.player.summonType);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Combo display
    if (this.combo > 1) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo} COMBO!`, this.width / 2, 80);
    }

    // Summon count
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Summons: ${this.summons.length}/5`, 10, 25);
  }
}
