/**
 * Shadow Assassin Game Logic
 * Game #280 - Stealth Action Game
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  stealth: number;
  maxStealth: number;
  speed: number;
  damage: number;
  facing: 'left' | 'right';
  isHidden: boolean;
  isAttacking: boolean;
  attackFrame: number;
  lastAttack: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'guard' | 'elite' | 'boss';
  color: string;
  facing: 'left' | 'right';
  state: 'patrol' | 'alert' | 'attack';
  patrolStart: number;
  patrolEnd: number;
  visionRange: number;
  isHit: boolean;
  hitFrame: number;
  lastAttack: number;
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
  enemies: Enemy[];
  particles: Particle[];
  score: number;
  level: number;
  kills: number;
  stealthKills: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class ShadowAssassinGame {
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
      enemies: [],
      particles: [],
      score: 0,
      level: 1,
      kills: 0,
      stealthKills: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: ARENA_HEIGHT - 60,
      width: 30,
      height: 40,
      hp: 100,
      maxHp: 100,
      stealth: 100,
      maxStealth: 100,
      speed: 3,
      damage: 50,
      facing: 'right',
      isHidden: false,
      isAttacking: false,
      attackFrame: 0,
      lastAttack: 0,
    };
  }

  private createEnemy(level: number, type: 'guard' | 'elite' | 'boss', xPos: number): Enemy {
    let hp: number, damage: number, color: string, width: number, height: number, visionRange: number;

    switch (type) {
      case 'boss':
        hp = 200 + level * 30; damage = 40; color = '#8e44ad'; width = 50; height = 55; visionRange = 150;
        break;
      case 'elite':
        hp = 80 + level * 15; damage = 25; color = '#e74c3c'; width = 35; height = 45; visionRange = 120;
        break;
      default:
        hp = 40 + level * 8; damage = 15; color = '#636e72'; width = 30; height = 40; visionRange = 100;
    }

    const patrolWidth = 80 + Math.random() * 60;
    return {
      x: xPos,
      y: ARENA_HEIGHT - 60,
      width, height, hp, maxHp: hp, damage, type, color,
      facing: Math.random() > 0.5 ? 'left' : 'right',
      state: 'patrol',
      patrolStart: Math.max(50, xPos - patrolWidth / 2),
      patrolEnd: Math.min(ARENA_WIDTH - 50, xPos + patrolWidth / 2),
      visionRange,
      isHit: false,
      hitFrame: 0,
      lastAttack: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnLevel();
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private spawnLevel(): void {
    const level = this.state.level;
    const guardCount = 2 + level;
    const eliteCount = Math.floor(level / 2);
    const hasBoss = level % 3 === 0;

    for (let i = 0; i < guardCount; i++) {
      this.state.enemies.push(this.createEnemy(level, 'guard', 120 + i * 80));
    }
    for (let i = 0; i < eliteCount; i++) {
      this.state.enemies.push(this.createEnemy(level, 'elite', 150 + i * 100));
    }
    if (hasBoss) {
      this.state.enemies.push(this.createEnemy(level, 'boss', ARENA_WIDTH - 80));
    }
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
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkLevelComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = (player.isHidden ? player.speed * 0.5 : player.speed) * (dt / 16);

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) { player.x -= moveSpeed; player.facing = 'left'; }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) { player.x += moveSpeed; player.facing = 'right'; }

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));

    // Stealth management
    if (this.keys.has('ShiftLeft') || this.keys.has('KeyC')) {
      if (player.stealth > 0) {
        player.isHidden = true;
        player.stealth -= 0.5 * (dt / 16);
      } else {
        player.isHidden = false;
      }
    } else {
      player.isHidden = false;
      player.stealth = Math.min(player.maxStealth, player.stealth + 0.2 * (dt / 16));
    }

    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 12) { player.isAttacking = false; player.attackFrame = 0; }
    }
  }

  private updateEnemies(dt: number): void {
    const { player, enemies } = this.state;
    const now = performance.now();

    enemies.forEach(enemy => {
      const dx = player.x - enemy.x;
      const canSeePlayer = !player.isHidden && Math.abs(dx) < enemy.visionRange &&
                           ((dx > 0 && enemy.facing === 'right') || (dx < 0 && enemy.facing === 'left'));

      if (canSeePlayer) {
        enemy.state = 'alert';
        enemy.facing = dx > 0 ? 'right' : 'left';

        if (Math.abs(dx) < 40) {
          enemy.state = 'attack';
          if (now - enemy.lastAttack > 1000) {
            player.hp -= enemy.damage;
            enemy.lastAttack = now;
            this.spawnHitParticles(player.x, player.y);
          }
        } else {
          enemy.x += (dx > 0 ? 1.5 : -1.5) * (dt / 16);
        }
      } else {
        enemy.state = 'patrol';
        const patrolSpeed = 0.8 * (dt / 16);
        if (enemy.facing === 'right') {
          enemy.x += patrolSpeed;
          if (enemy.x >= enemy.patrolEnd) enemy.facing = 'left';
        } else {
          enemy.x -= patrolSpeed;
          if (enemy.x <= enemy.patrolStart) enemy.facing = 'right';
        }
      }

      if (enemy.isHit) {
        enemy.hitFrame++;
        if (enemy.hitFrame > 8) { enemy.isHit = false; enemy.hitFrame = 0; }
      }
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed; p.y += p.vy * speed; p.vy += 0.1 * speed; p.life -= speed;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const { player, enemies } = this.state;
    if (player.isAttacking && player.attackFrame >= 4 && player.attackFrame <= 8) {
      const attackRange = 50;
      const attackX = player.x + (player.facing === 'right' ? attackRange / 2 : -attackRange / 2);

      enemies.forEach((enemy, idx) => {
        if (Math.abs(attackX - enemy.x) < attackRange && Math.abs(player.y - enemy.y) < 40) {
          const isStealthKill = player.isHidden || enemy.state === 'patrol';
          const damage = isStealthKill ? player.damage * 3 : player.damage;
          enemy.hp -= damage;
          enemy.isHit = true; enemy.hitFrame = 0;
          this.spawnHitParticles(enemy.x, enemy.y);

          if (enemy.hp <= 0) {
            this.killEnemy(idx, isStealthKill);
          }
        }
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 25, maxLife: 25, color: '#1a1a1a', size: 3 + Math.random() * 3,
      });
    }
  }

  private killEnemy(index: number, stealthKill: boolean): void {
    const enemy = this.state.enemies[index];
    this.spawnDeathParticles(enemy.x, enemy.y);
    this.state.enemies.splice(index, 1);
    this.state.kills++;
    if (stealthKill) this.state.stealthKills++;

    const baseScore = enemy.type === 'boss' ? 500 : enemy.type === 'elite' ? 200 : 100;
    this.state.score += baseScore * (stealthKill ? 2 : 1) * this.state.level;
  }

  private spawnDeathParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y, vx: Math.cos(angle) * (2 + Math.random() * 3), vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 30, maxLife: 30, color: '#1a1a1a', size: 4 + Math.random() * 4,
      });
    }
  }

  private checkLevelComplete(): void {
    if (this.state.enemies.length === 0) {
      this.state.level++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 20);
      this.state.player.x = 50;
      this.spawnLevel();
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) { this.state.phase = 'defeat'; this.stopGameLoop(); }
  }

  public attack(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();
    if (now - player.lastAttack < 400) return;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackFrame = 0;
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.attack();
  }

  public handleKeyUp(code: string): void { this.keys.delete(code); }

  private stopGameLoop(): void {
    if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; }
  }

  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); this.keys.clear(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
