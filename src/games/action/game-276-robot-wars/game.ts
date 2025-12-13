/**
 * Robot Wars Game Logic
 * Game #276 - Mecha Combat Action Game
 */

export interface Robot {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  speed: number;
  damage: number;
  color: string;
  isPlayer: boolean;
  lastAttack: number;
  attackCooldown: number;
  facing: 'left' | 'right';
  isAttacking: boolean;
  attackFrame: number;
  isHit: boolean;
  hitFrame: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isPlayerProjectile: boolean;
  color: string;
  size: number;
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
  player: Robot;
  enemies: Robot[];
  projectiles: Projectile[];
  particles: Particle[];
  score: number;
  wave: number;
  kills: number;
  combo: number;
  lastKillTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const PLAYER_SPEED = 4;
const ENEMY_SPEED = 1.5;
const ATTACK_COOLDOWN = 500;
const PROJECTILE_SPEED = 8;
const COMBO_TIMEOUT = 2000;

const ENEMY_COLORS = ['#e74c3c', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

export class RobotWarsGame {
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
      projectiles: [],
      particles: [],
      score: 0,
      wave: 1,
      kills: 0,
      combo: 0,
      lastKillTime: 0,
    };
  }

  private createPlayer(): Robot {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      width: 40,
      height: 50,
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      speed: PLAYER_SPEED,
      damage: 25,
      color: '#3498db',
      isPlayer: true,
      lastAttack: 0,
      attackCooldown: ATTACK_COOLDOWN,
      facing: 'right',
      isAttacking: false,
      attackFrame: 0,
      isHit: false,
      hitFrame: 0,
    };
  }

  private createEnemy(wave: number): Robot {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -30 : ARENA_WIDTH + 30;
    const y = 50 + Math.random() * (ARENA_HEIGHT - 100);
    const hpMultiplier = 1 + (wave - 1) * 0.2;
    const damageMultiplier = 1 + (wave - 1) * 0.15;

    return {
      x,
      y,
      width: 35,
      height: 45,
      hp: Math.round(40 * hpMultiplier),
      maxHp: Math.round(40 * hpMultiplier),
      energy: 50,
      maxEnergy: 50,
      speed: ENEMY_SPEED + Math.random() * 0.5,
      damage: Math.round(10 * damageMultiplier),
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      isPlayer: false,
      lastAttack: 0,
      attackCooldown: 1500 + Math.random() * 500,
      facing: side === 'left' ? 'right' : 'left',
      isAttacking: false,
      attackFrame: 0,
      isHit: false,
      hitFrame: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnWave();
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private spawnWave(): void {
    const enemyCount = Math.min(3 + this.state.wave, 8);
    for (let i = 0; i < enemyCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.enemies.push(this.createEnemy(this.state.wave));
        }
      }, i * 500);
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
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.updateCombo();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    // Movement
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      player.x -= moveSpeed;
      player.facing = 'left';
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      player.x += moveSpeed;
      player.facing = 'right';
    }
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      player.y -= moveSpeed;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      player.y += moveSpeed;
    }

    // Boundaries
    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    // Energy regeneration
    player.energy = Math.min(player.maxEnergy, player.energy + 0.05 * (dt / 16));

    // Attack animation
    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 10) {
        player.isAttacking = false;
        player.attackFrame = 0;
      }
    }

    // Hit animation
    if (player.isHit) {
      player.hitFrame++;
      if (player.hitFrame > 8) {
        player.isHit = false;
        player.hitFrame = 0;
      }
    }
  }

  private updateEnemies(dt: number): void {
    const { player, enemies } = this.state;
    const now = performance.now();

    enemies.forEach(enemy => {
      // Move towards player
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 80) {
        const moveSpeed = enemy.speed * (dt / 16);
        enemy.x += (dx / dist) * moveSpeed;
        enemy.y += (dy / dist) * moveSpeed;
      }

      // Update facing
      enemy.facing = dx > 0 ? 'right' : 'left';

      // Attack
      if (dist < 150 && now - enemy.lastAttack > enemy.attackCooldown) {
        this.enemyAttack(enemy);
        enemy.lastAttack = now;
      }

      // Attack animation
      if (enemy.isAttacking) {
        enemy.attackFrame++;
        if (enemy.attackFrame > 10) {
          enemy.isAttacking = false;
          enemy.attackFrame = 0;
        }
      }

      // Hit animation
      if (enemy.isHit) {
        enemy.hitFrame++;
        if (enemy.hitFrame > 8) {
          enemy.isHit = false;
          enemy.hitFrame = 0;
        }
      }
    });
  }

  private enemyAttack(enemy: Robot): void {
    const { player } = this.state;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    enemy.isAttacking = true;
    enemy.attackFrame = 0;

    this.state.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: (dx / dist) * PROJECTILE_SPEED * 0.7,
      vy: (dy / dist) * PROJECTILE_SPEED * 0.7,
      damage: enemy.damage,
      isPlayerProjectile: false,
      color: enemy.color,
      size: 6,
    });
  }

  private updateProjectiles(dt: number): void {
    const speed = dt / 16;
    this.state.projectiles = this.state.projectiles.filter(proj => {
      proj.x += proj.vx * speed;
      proj.y += proj.vy * speed;

      // Remove if out of bounds
      return proj.x > -20 && proj.x < ARENA_WIDTH + 20 &&
             proj.y > -20 && proj.y < ARENA_HEIGHT + 20;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += 0.2 * speed; // gravity
      p.life -= speed;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const { player, enemies, projectiles } = this.state;

    // Player projectiles hitting enemies
    projectiles.forEach((proj, projIdx) => {
      if (proj.isPlayerProjectile) {
        enemies.forEach((enemy, enemyIdx) => {
          if (this.checkHit(proj, enemy)) {
            enemy.hp -= proj.damage;
            enemy.isHit = true;
            enemy.hitFrame = 0;
            this.spawnHitParticles(proj.x, proj.y, enemy.color);
            projectiles.splice(projIdx, 1);

            if (enemy.hp <= 0) {
              this.killEnemy(enemyIdx);
            }
          }
        });
      } else {
        // Enemy projectiles hitting player
        if (this.checkHit(proj, player)) {
          player.hp -= proj.damage;
          player.isHit = true;
          player.hitFrame = 0;
          this.spawnHitParticles(proj.x, proj.y, '#fff');
          projectiles.splice(projIdx, 1);
        }
      }
    });
  }

  private checkHit(proj: Projectile, robot: Robot): boolean {
    return proj.x > robot.x - robot.width / 2 &&
           proj.x < robot.x + robot.width / 2 &&
           proj.y > robot.y - robot.height / 2 &&
           proj.y < robot.y + robot.height / 2;
  }

  private killEnemy(index: number): void {
    const enemy = this.state.enemies[index];
    this.spawnExplosion(enemy.x, enemy.y, enemy.color);
    this.state.enemies.splice(index, 1);
    this.state.kills++;

    // Combo system
    const now = performance.now();
    if (now - this.state.lastKillTime < COMBO_TIMEOUT) {
      this.state.combo++;
    } else {
      this.state.combo = 1;
    }
    this.state.lastKillTime = now;

    // Score with combo multiplier
    const baseScore = 100 * this.state.wave;
    this.state.score += baseScore * this.state.combo;
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 5; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 2 + Math.random() * 4;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  private updateCombo(): void {
    const now = performance.now();
    if (this.state.combo > 0 && now - this.state.lastKillTime > COMBO_TIMEOUT) {
      this.state.combo = 0;
    }
  }

  private checkWaveComplete(): void {
    if (this.state.enemies.length === 0 && this.state.phase === 'playing') {
      this.state.wave++;
      // Heal player between waves
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 20);
      this.spawnWave();
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

    if (now - player.lastAttack < player.attackCooldown) return;
    if (player.energy < 10) return;

    player.lastAttack = now;
    player.energy -= 10;
    player.isAttacking = true;
    player.attackFrame = 0;

    const vx = player.facing === 'right' ? PROJECTILE_SPEED : -PROJECTILE_SPEED;

    this.state.projectiles.push({
      x: player.x + (player.facing === 'right' ? 20 : -20),
      y: player.y,
      vx,
      vy: 0,
      damage: player.damage,
      isPlayerProjectile: true,
      color: '#3498db',
      size: 8,
    });
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);

    if (code === 'Space' || code === 'KeyJ') {
      this.attack();
    }
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

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    this.stopGameLoop();
    this.keys.clear();
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
