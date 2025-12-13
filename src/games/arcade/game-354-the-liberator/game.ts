/**
 * The Liberator Game
 * Game #354 - Liberation Combat
 * Rescue imprisoned companions and fight for freedom!
 */

interface Player {
  x: number;
  y: number;
  speed: number;
  health: number;
  maxHealth: number;
  hopeEnergy: number; // Energy for special abilities
  maxHopeEnergy: number;
}

interface Prisoner {
  x: number;
  y: number;
  rescued: boolean;
  liberationProgress: number; // 0-100, progress to rescue
  isBeingRescued: boolean;
}

interface Companion {
  x: number;
  y: number;
  target: Enemy | null;
  attackCooldown: number;
  angle: number; // For orbital movement around player
}

interface Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  type: 'guard' | 'warden' | 'elite';
  speed: number;
  attackCooldown: number;
  stunned: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  damage: number;
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

type Ability = 'break-chains' | 'hope-light' | 'freedom-dash';

export class LiberatorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player: Player = {
    x: 0, y: 0, speed: 3, health: 100, maxHealth: 100,
    hopeEnergy: 0, maxHopeEnergy: 100
  };

  private prisoners: Prisoner[] = [];
  private companions: Companion[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];

  private keys: Record<string, boolean> = {};
  private mousePos = { x: 0, y: 0 };
  private activeAbility: Ability | null = null;
  private abilityCooldowns: Record<Ability, number> = {
    'break-chains': 0,
    'hope-light': 0,
    'freedom-dash': 0
  };

  score = 0;
  rescued = 0;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupLevel();
  }

  private setupLevel() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.prisoners = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];

    // Reset player
    this.player.x = w / 2;
    this.player.y = h / 2;
    this.player.health = this.player.maxHealth;
    this.player.hopeEnergy = 50;

    // Spawn prisoners (3-5 per level)
    const prisonerCount = 3 + Math.min(this.level, 2);
    for (let i = 0; i < prisonerCount; i++) {
      const angle = (Math.PI * 2 * i) / prisonerCount;
      const distance = 200 + Math.random() * 150;
      this.prisoners.push({
        x: w / 2 + Math.cos(angle) * distance,
        y: h / 2 + Math.sin(angle) * distance,
        rescued: false,
        liberationProgress: 0,
        isBeingRescued: false
      });
    }

    // Spawn enemies (guards, wardens, elites)
    const enemyCount = 4 + this.level * 2;
    for (let i = 0; i < enemyCount; i++) {
      const types: Enemy['type'][] = ['guard', 'guard', 'warden', 'elite'];
      const type = types[Math.min(Math.floor(Math.random() * (this.level + 1)), types.length - 1)];

      const healthMap = { guard: 30, warden: 50, elite: 80 };
      const speedMap = { guard: 1.5, warden: 1.2, elite: 2 };

      const edge = Math.floor(Math.random() * 4);
      let x, y;
      switch (edge) {
        case 0: x = Math.random() * w; y = -20; break;
        case 1: x = w + 20; y = Math.random() * h; break;
        case 2: x = Math.random() * w; y = h + 20; break;
        default: x = -20; y = Math.random() * h; break;
      }

      this.enemies.push({
        x, y,
        health: healthMap[type],
        maxHealth: healthMap[type],
        type,
        speed: speedMap[type],
        attackCooldown: 0,
        stunned: 0
      });
    }
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.gameLoop();
    this.emitState();
  }

  private gameLoop() {
    if (this.status !== 'playing') return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 16) {
      this.lastTime = now;
      this.update();
      this.draw();
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;

    this.updatePlayer();
    this.updatePrisoners();
    this.updateCompanions();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateParticles();
    this.updateAbilities();
    this.checkCollisions();
    this.checkWin();
  }

  private updatePlayer() {
    const p = this.player;

    // Movement
    let dx = 0, dy = 0;
    if (this.keys['ArrowUp'] || this.keys['w']) dy = -1;
    if (this.keys['ArrowDown'] || this.keys['s']) dy = 1;
    if (this.keys['ArrowLeft'] || this.keys['a']) dx = -1;
    if (this.keys['ArrowRight'] || this.keys['d']) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      p.x = Math.max(20, Math.min(this.canvas.width - 20, p.x + dx * p.speed));
      p.y = Math.max(20, Math.min(this.canvas.height - 20, p.y + dy * p.speed));
    }

    // Hope energy regeneration
    p.hopeEnergy = Math.min(p.maxHopeEnergy, p.hopeEnergy + 0.1);

    // Auto-shoot at nearest enemy
    if (this.frameCount % 20 === 0) {
      const nearest = this.findNearestEnemy(p.x, p.y);
      if (nearest && this.getDistance(p.x, p.y, nearest.x, nearest.y) < 300) {
        this.shootProjectile(p.x, p.y, nearest.x, nearest.y, true, 10);
      }
    }
  }

  private updatePrisoners() {
    const p = this.player;
    const rescueRange = 60;

    for (const prisoner of this.prisoners) {
      if (prisoner.rescued) continue;

      const dist = this.getDistance(p.x, p.y, prisoner.x, prisoner.y);

      if (dist < rescueRange) {
        prisoner.isBeingRescued = true;
        prisoner.liberationProgress += 1;

        if (prisoner.liberationProgress >= 100) {
          prisoner.rescued = true;
          this.rescued++;
          this.score += 200;

          // Add companion
          this.companions.push({
            x: prisoner.x,
            y: prisoner.y,
            target: null,
            attackCooldown: 0,
            angle: Math.random() * Math.PI * 2
          });

          // Hope energy bonus
          this.player.hopeEnergy = Math.min(
            this.player.maxHopeEnergy,
            this.player.hopeEnergy + 30
          );

          // Particle effect
          this.createRescueEffect(prisoner.x, prisoner.y);

          this.emitState();
        }
      } else {
        prisoner.isBeingRescued = false;
        prisoner.liberationProgress = Math.max(0, prisoner.liberationProgress - 0.5);
      }
    }
  }

  private updateCompanions() {
    const p = this.player;

    for (const comp of this.companions) {
      // Orbit around player
      comp.angle += 0.03;
      const orbitRadius = 80 + Math.sin(this.frameCount * 0.05) * 10;
      const targetX = p.x + Math.cos(comp.angle) * orbitRadius;
      const targetY = p.y + Math.sin(comp.angle) * orbitRadius;

      comp.x += (targetX - comp.x) * 0.1;
      comp.y += (targetY - comp.y) * 0.1;

      // Attack enemies
      comp.attackCooldown--;
      if (comp.attackCooldown <= 0) {
        const nearest = this.findNearestEnemy(comp.x, comp.y);
        if (nearest && this.getDistance(comp.x, comp.y, nearest.x, nearest.y) < 250) {
          this.shootProjectile(comp.x, comp.y, nearest.x, nearest.y, true, 8);
          comp.attackCooldown = 40;
        }
      }
    }
  }

  private updateEnemies() {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      // Move towards player or prisoners
      let targetX = p.x;
      let targetY = p.y;

      // Wardens target prisoners
      if (e.type === 'warden') {
        const unrescued = this.prisoners.find(pr => !pr.rescued && pr.isBeingRescued);
        if (unrescued) {
          targetX = unrescued.x;
          targetY = unrescued.y;
        }
      }

      const dx = targetX - e.x;
      const dy = targetY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 50) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }

      // Attack
      e.attackCooldown--;
      if (e.attackCooldown <= 0 && dist < 200) {
        this.shootProjectile(e.x, e.y, p.x, p.y, false, e.type === 'elite' ? 15 : 10);
        e.attackCooldown = e.type === 'elite' ? 50 : 80;
      }

      // Remove if dead
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
        this.score += e.type === 'guard' ? 50 : e.type === 'warden' ? 100 : 200;
        this.createDeathEffect(e.x, e.y, '#ff4444');
        this.emitState();
      }
    }
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Remove if out of bounds
      if (
        proj.x < 0 || proj.x > this.canvas.width ||
        proj.y < 0 || proj.y > this.canvas.height
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateAbilities() {
    // Decrease cooldowns
    for (const key in this.abilityCooldowns) {
      if (this.abilityCooldowns[key as Ability] > 0) {
        this.abilityCooldowns[key as Ability]--;
      }
    }
  }

  private checkCollisions() {
    const p = this.player;

    // Projectiles vs targets
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (proj.fromPlayer) {
        // Hit enemies
        for (const e of this.enemies) {
          if (this.getDistance(proj.x, proj.y, e.x, e.y) < 15) {
            e.health -= proj.damage;
            this.projectiles.splice(i, 1);
            this.createHitEffect(proj.x, proj.y, '#ffaa00');
            break;
          }
        }
      } else {
        // Hit player
        if (this.getDistance(proj.x, proj.y, p.x, p.y) < 20) {
          p.health -= proj.damage;
          this.projectiles.splice(i, 1);
          this.createHitEffect(proj.x, proj.y, '#ff4444');

          if (p.health <= 0) {
            this.status = 'lost';
            if (this.animationId) cancelAnimationFrame(this.animationId);
            this.emitState();
          } else {
            this.emitState();
          }
        }

        // Hit companions
        for (const comp of this.companions) {
          if (this.getDistance(proj.x, proj.y, comp.x, comp.y) < 15) {
            this.projectiles.splice(i, 1);
            this.createHitEffect(proj.x, proj.y, '#ffaa00');
            break;
          }
        }
      }
    }

    // Enemies vs player direct contact
    for (const e of this.enemies) {
      if (this.getDistance(p.x, p.y, e.x, e.y) < 30) {
        p.health -= 0.2;
        if (p.health <= 0) {
          this.status = 'lost';
          if (this.animationId) cancelAnimationFrame(this.animationId);
          this.emitState();
        }
      }
    }
  }

  private checkWin() {
    const allRescued = this.prisoners.every(pr => pr.rescued);
    const noEnemies = this.enemies.length === 0;

    if (allRescued && noEnemies) {
      this.level++;
      if (this.level > 10) {
        this.status = 'won';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      } else {
        setTimeout(() => this.setupLevel(), 1000);
      }
      this.emitState();
    }
  }

  private shootProjectile(
    x: number, y: number,
    targetX: number, targetY: number,
    fromPlayer: boolean,
    damage: number
  ) {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 5;

    this.projectiles.push({
      x, y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      fromPlayer,
      damage
    });
  }

  private findNearestEnemy(x: number, y: number): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const e of this.enemies) {
      const dist = this.getDistance(x, y, e.x, e.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }

    return nearest;
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createRescueEffect(x: number, y: number) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: '#ffd700',
        size: 3 + Math.random() * 3
      });
    }
  }

  private createHitEffect(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 10,
        maxLife: 25,
        color,
        size: 2 + Math.random() * 2
      });
    }
  }

  private createDeathEffect(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  useAbility(ability: Ability) {
    if (this.status !== 'playing') return;
    if (this.abilityCooldowns[ability] > 0) return;

    switch (ability) {
      case 'break-chains':
        this.useBreakChains();
        break;
      case 'hope-light':
        this.useHopeLight();
        break;
      case 'freedom-dash':
        this.useFreedomDash();
        break;
    }
  }

  private useBreakChains() {
    const cost = 30;
    if (this.player.hopeEnergy < cost) return;

    this.player.hopeEnergy -= cost;
    this.abilityCooldowns['break-chains'] = 300;

    // Damage all enemies in range and stun them
    const range = 150;
    for (const e of this.enemies) {
      const dist = this.getDistance(this.player.x, this.player.y, e.x, e.y);
      if (dist < range) {
        e.health -= 20;
        e.stunned = 60;
        this.createHitEffect(e.x, e.y, '#ffff00');
      }
    }

    this.createRescueEffect(this.player.x, this.player.y);
    this.emitState();
  }

  private useHopeLight() {
    const cost = 40;
    if (this.player.hopeEnergy < cost) return;

    this.player.hopeEnergy -= cost;
    this.abilityCooldowns['hope-light'] = 400;

    // Heal player and boost liberation progress
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);

    for (const prisoner of this.prisoners) {
      if (!prisoner.rescued) {
        prisoner.liberationProgress = Math.min(100, prisoner.liberationProgress + 20);
      }
    }

    // Create golden aura
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 100;
      this.particles.push({
        x: this.player.x + Math.cos(angle) * radius,
        y: this.player.y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 40,
        maxLife: 40,
        color: '#ffd700',
        size: 4
      });
    }

    this.emitState();
  }

  private useFreedomDash() {
    const cost = 20;
    if (this.player.hopeEnergy < cost) return;

    this.player.hopeEnergy -= cost;
    this.abilityCooldowns['freedom-dash'] = 200;

    // Dash towards mouse position
    const dx = this.mousePos.x - this.player.x;
    const dy = this.mousePos.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dashDist = 150;

    if (dist > 0) {
      this.player.x += (dx / dist) * dashDist;
      this.player.y += (dy / dist) * dashDist;

      // Keep in bounds
      this.player.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.x));
      this.player.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.y));

      // Damage enemies in path
      for (const e of this.enemies) {
        if (this.getDistance(this.player.x, this.player.y, e.x, e.y) < 50) {
          e.health -= 15;
          this.createHitEffect(e.x, e.y, '#00ffff');
        }
      }
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw prisoners
    for (const prisoner of this.prisoners) {
      if (prisoner.rescued) continue;

      const x = prisoner.x;
      const y = prisoner.y;

      // Chains
      ctx.strokeStyle = prisoner.isBeingRescued ? '#888' : '#444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 15, y - 10);
      ctx.lineTo(x - 20, y - 20);
      ctx.moveTo(x + 15, y - 10);
      ctx.lineTo(x + 20, y - 20);
      ctx.stroke();

      // Body
      ctx.fillStyle = prisoner.isBeingRescued ? '#60a0ff' : '#4080c0';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Liberation progress
      if (prisoner.liberationProgress > 0) {
        const barWidth = 40;
        const barHeight = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - barWidth / 2, y + 25, barWidth, barHeight);

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(
          x - barWidth / 2,
          y + 25,
          (barWidth * prisoner.liberationProgress) / 100,
          barHeight
        );
      }
    }

    // Draw enemies
    for (const e of this.enemies) {
      const colors = { guard: '#ff4444', warden: '#ff8844', elite: '#ff44ff' };

      // Stun effect
      if (e.stunned > 0) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = colors[e.type];
      ctx.beginPath();
      if (e.type === 'elite') {
        // Triangle for elite
        ctx.moveTo(e.x, e.y - 15);
        ctx.lineTo(e.x - 13, e.y + 10);
        ctx.lineTo(e.x + 13, e.y + 10);
        ctx.closePath();
      } else {
        // Square for guard/warden
        const size = e.type === 'warden' ? 15 : 12;
        ctx.rect(e.x - size, e.y - size, size * 2, size * 2);
      }
      ctx.fill();

      // Health bar
      const barWidth = 30;
      const barHeight = 3;
      ctx.fillStyle = '#400';
      ctx.fillRect(e.x - barWidth / 2, e.y - 25, barWidth, barHeight);

      ctx.fillStyle = '#f44';
      ctx.fillRect(
        e.x - barWidth / 2,
        e.y - 25,
        (barWidth * e.health) / e.maxHealth,
        barHeight
      );
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      ctx.fillStyle = proj.fromPlayer ? '#ffd700' : '#ff4444';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.strokeStyle = proj.fromPlayer ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(proj.x - proj.vx * 3, proj.y - proj.vy * 3);
      ctx.stroke();
    }

    // Draw companions
    for (const comp of this.companions) {
      ctx.fillStyle = '#00ff88';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(comp.x, comp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Halo
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(comp.x, comp.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw player (The Liberator)
    this.drawPlayer();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Aura
    const pulse = 1 + Math.sin(this.frameCount * 0.1) * 0.1;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30 * pulse);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cape (freedom symbol)
    ctx.fillStyle = '#4080ff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 15, p.y + 20);
    ctx.lineTo(p.x, p.y + 15);
    ctx.lineTo(p.x + 15, p.y + 20);
    ctx.closePath();
    ctx.fill();

    // Symbol (broken chain)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x - 5, p.y, 4, 0, Math.PI * 2);
    ctx.arc(p.x + 5, p.y, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Health bar
    const barWidth = 40;
    const barHeight = 4;
    ctx.fillStyle = '#400';
    ctx.fillRect(p.x - barWidth / 2, p.y - 35, barWidth, barHeight);

    ctx.fillStyle = '#4f4';
    ctx.fillRect(
      p.x - barWidth / 2,
      p.y - 35,
      (barWidth * p.health) / p.maxHealth,
      barHeight
    );

    // Hope energy bar
    ctx.fillStyle = '#440';
    ctx.fillRect(p.x - barWidth / 2, p.y - 30, barWidth, barHeight);

    ctx.fillStyle = '#fd7';
    ctx.fillRect(
      p.x - barWidth / 2,
      p.y - 30,
      (barWidth * p.hopeEnergy) / p.maxHopeEnergy,
      barHeight
    );
  }

  handleKey(key: string, pressed: boolean) {
    this.keys[key] = pressed;

    if (pressed && this.status === 'playing') {
      if (key === '1') this.useAbility('break-chains');
      if (key === '2') this.useAbility('hope-light');
      if (key === '3') this.useAbility('freedom-dash');
    }
  }

  handleMouse(x: number, y: number) {
    this.mousePos = { x, y };
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 500;
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.rescued = 0;
    this.level = 1;
    this.status = 'paused';
    this.keys = {};
    this.setupLevel();
    this.draw();
    this.emitState();
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
    this.emitState();
  }

  private emitState() {
    this.onStateChange?.({
      score: this.score,
      rescued: this.rescued,
      level: this.level,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      hopeEnergy: this.player.hopeEnergy,
      maxHopeEnergy: this.player.maxHopeEnergy,
      status: this.status,
      abilityCooldowns: { ...this.abilityCooldowns }
    });
  }
}
