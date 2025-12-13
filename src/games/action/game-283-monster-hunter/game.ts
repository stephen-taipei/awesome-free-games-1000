/**
 * Monster Hunter Game Logic
 * Game #283 - Boss Battle Game
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  facing: 'left' | 'right';
  isRolling: boolean;
  rollFrame: number;
  isAttacking: boolean;
  attackFrame: number;
  lastAttack: number;
  invulnerable: boolean;
}

export interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'dragon' | 'golem' | 'hydra' | 'demon';
  color: string;
  phase: number;
  state: 'idle' | 'charging' | 'attacking' | 'special';
  attackPattern: number;
  isHit: boolean;
  hitFrame: number;
  lastAttack: number;
  moveTimer: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  color: string;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  boss: Boss | null;
  projectiles: Projectile[];
  particles: Particle[];
  score: number;
  bossNumber: number;
  bossesDefeated: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class MonsterHunterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private keys: Set<string> = new Set();
  private gameLoop: number | null = null;
  private lastTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      boss: null,
      projectiles: [],
      particles: [],
      score: 0,
      bossNumber: 1,
      bossesDefeated: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: ARENA_HEIGHT - 100,
      width: 30,
      height: 40,
      hp: 100,
      maxHp: 100,
      vx: 0,
      vy: 0,
      speed: 4,
      damage: 20,
      facing: 'right',
      isRolling: false,
      rollFrame: 0,
      isAttacking: false,
      attackFrame: 0,
      lastAttack: 0,
      invulnerable: false,
    };
  }

  private createBoss(bossNum: number): Boss {
    const types: ('dragon' | 'golem' | 'hydra' | 'demon')[] = ['dragon', 'golem', 'hydra', 'demon'];
    const type = types[(bossNum - 1) % 4];
    let hp: number, damage: number, color: string, width: number, height: number;

    switch (type) {
      case 'demon':
        hp = 250 + bossNum * 40; damage = 35; color = '#8e44ad'; width = 70; height = 80;
        break;
      case 'hydra':
        hp = 220 + bossNum * 35; damage = 30; color = '#16a085'; width = 75; height = 75;
        break;
      case 'golem':
        hp = 300 + bossNum * 30; damage = 40; color = '#95a5a6'; width = 80; height = 90;
        break;
      default:
        hp = 200 + bossNum * 35; damage = 32; color = '#e74c3c'; width = 75; height = 85;
    }

    return {
      x: ARENA_WIDTH - 120,
      y: ARENA_HEIGHT - 150,
      width, height, hp, maxHp: hp, damage, type, color,
      phase: 1,
      state: 'idle',
      attackPattern: 0,
      isHit: false,
      hitFrame: 0,
      lastAttack: 0,
      moveTimer: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnBoss();
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private spawnBoss(): void {
    this.state.boss = this.createBoss(this.state.bossNumber);
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      if (this.state.phase !== 'playing') return;
      const dt = Math.min(time - this.lastTime, 50);
      this.lastTime = time;
      this.update(dt);
      this.emitState();
      this.gameLoop = requestAnimationFrame(loop);
    };
    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkBossDefeated();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (!player.isRolling && !player.isAttacking) {
      player.vx = 0;
      player.vy = 0;

      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        player.vx = -moveSpeed;
        player.facing = 'left';
      }
      if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        player.vx = moveSpeed;
        player.facing = 'right';
      }
      if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
        player.vy = -moveSpeed;
      }
      if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
        player.vy = moveSpeed;
      }
    }

    if (player.isRolling) {
      player.rollFrame++;
      const rollSpeed = 8 * (dt / 16);
      player.vx = (player.facing === 'right' ? 1 : -1) * rollSpeed;
      player.invulnerable = player.rollFrame < 20;

      if (player.rollFrame > 30) {
        player.isRolling = false;
        player.rollFrame = 0;
        player.invulnerable = false;
      }
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 15) {
        player.isAttacking = false;
        player.attackFrame = 0;
      }
    }
  }

  private updateBoss(dt: number): void {
    const { boss } = this.state;
    if (!boss) return;

    const now = performance.now();
    boss.moveTimer += dt;

    // Boss phase transition
    if (boss.hp < boss.maxHp * 0.5 && boss.phase === 1) {
      boss.phase = 2;
      boss.attackPattern = 0;
    }

    // Boss AI
    if (boss.state === 'idle') {
      if (now - boss.lastAttack > 2000) {
        boss.state = 'charging';
        boss.lastAttack = now;
        boss.attackPattern = (boss.attackPattern + 1) % 3;

        setTimeout(() => {
          if (boss) {
            boss.state = boss.phase === 2 && Math.random() < 0.3 ? 'special' : 'attacking';
            this.executeBossAttack();
          }
        }, 800);
      }
    }

    if (boss.state === 'attacking' || boss.state === 'special') {
      setTimeout(() => { if (boss) boss.state = 'idle'; }, 600);
    }

    if (boss.isHit) {
      boss.hitFrame++;
      if (boss.hitFrame > 10) {
        boss.isHit = false;
        boss.hitFrame = 0;
      }
    }
  }

  private executeBossAttack(): void {
    const { boss, player } = this.state;
    if (!boss) return;

    switch (boss.attackPattern) {
      case 0: // Projectile barrage
        for (let i = 0; i < (boss.phase === 2 ? 5 : 3); i++) {
          const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (Math.random() - 0.5) * 0.5;
          this.state.projectiles.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            width: 15,
            height: 15,
            damage: boss.damage * 0.6,
            color: boss.color,
            life: 120,
          });
        }
        break;
      case 1: // Sweeping projectiles
        const count = boss.phase === 2 ? 8 : 5;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          this.state.projectiles.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            width: 12,
            height: 12,
            damage: boss.damage * 0.5,
            color: boss.color,
            life: 150,
          });
        }
        break;
      case 2: // Charge attack indicator
        if (Math.abs(player.x - boss.x) < 100) {
          setTimeout(() => {
            if (player && boss && Math.abs(player.x - boss.x) < 120 && !player.invulnerable) {
              player.hp -= boss.damage;
              this.spawnHitParticles(player.x, player.y, '#e74c3c');
            }
          }, 500);
        }
        break;
    }
  }

  private updateProjectiles(dt: number): void {
    const speed = dt / 16;
    this.state.projectiles = this.state.projectiles.filter(proj => {
      proj.x += proj.vx * speed;
      proj.y += proj.vy * speed;
      proj.life--;
      return proj.life > 0 && proj.x > 0 && proj.x < ARENA_WIDTH && proj.y > 0 && proj.y < ARENA_HEIGHT;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += 0.2 * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const { player, boss, projectiles } = this.state;

    // Projectile hits player
    if (!player.invulnerable) {
      projectiles.forEach((proj, idx) => {
        if (Math.abs(proj.x - player.x) < player.width / 2 + proj.width / 2 &&
            Math.abs(proj.y - player.y) < player.height / 2 + proj.height / 2) {
          player.hp -= proj.damage;
          projectiles.splice(idx, 1);
          this.spawnHitParticles(player.x, player.y, '#e74c3c');
        }
      });
    }

    // Player attacks boss
    if (boss && player.isAttacking && player.attackFrame >= 5 && player.attackFrame <= 10) {
      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isInRange = dist < 70;
      const isFacing = (player.facing === 'right' && dx > 0) || (player.facing === 'left' && dx < 0);

      if (isInRange && isFacing) {
        boss.hp -= player.damage;
        boss.isHit = true;
        boss.hitFrame = 0;
        this.spawnHitParticles(boss.x, boss.y, '#f39c12');
        this.state.score += 10;
      }
    }
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        maxLife: 30,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private checkBossDefeated(): void {
    const { boss } = this.state;
    if (boss && boss.hp <= 0) {
      this.spawnDeathParticles(boss.x, boss.y, boss.color);
      const bonusScore = boss.type === 'demon' ? 2000 : boss.type === 'golem' ? 1800 : 1500;
      this.state.score += bonusScore * this.state.bossNumber;
      this.state.bossesDefeated++;
      this.state.boss = null;
      this.state.bossNumber++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 30);
      setTimeout(() => this.spawnBoss(), 2000);
    }
  }

  private spawnDeathParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 5),
        vy: Math.sin(angle) * (4 + Math.random() * 5),
        life: 50,
        maxLife: 50,
        color,
        size: 5 + Math.random() * 6,
      });
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.stopGameLoop();
    }
  }

  public attack(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();
    if (player.isAttacking || player.isRolling || now - player.lastAttack < 400) return;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackFrame = 0;
  }

  public roll(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    if (player.isRolling || player.isAttacking) return;
    player.isRolling = true;
    player.rollFrame = 0;
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.attack();
    if (code === 'ShiftLeft' || code === 'KeyK') this.roll();
  }

  public handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); this.keys.clear(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
