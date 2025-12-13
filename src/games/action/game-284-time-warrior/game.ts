/**
 * Time Warrior Game Logic
 * Game #284 - Time Manipulation Combat
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  timeEnergy: number;
  maxTimeEnergy: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  facing: 'left' | 'right';
  isAttacking: boolean;
  attackFrame: number;
  lastAttack: number;
  isDashing: boolean;
  dashFrame: number;
  invulnerable: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'soldier' | 'guardian' | 'chrono';
  color: string;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  state: 'idle' | 'chasing' | 'attacking';
  isHit: boolean;
  hitFrame: number;
  lastAttack: number;
  isFrozen: boolean;
  frozenTime: number;
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

export interface TimeEffect {
  type: 'slow' | 'freeze';
  duration: number;
  radius: number;
  x: number;
  y: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  timeEffect: TimeEffect | null;
  score: number;
  wave: number;
  enemiesDefeated: number;
  timeSlowActive: boolean;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class TimeWarriorGame {
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
      timeEffect: null,
      score: 0,
      wave: 1,
      enemiesDefeated: 0,
      timeSlowActive: false,
    };
  }

  private createPlayer(): Player {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      width: 32,
      height: 42,
      hp: 100,
      maxHp: 100,
      timeEnergy: 100,
      maxTimeEnergy: 100,
      vx: 0,
      vy: 0,
      speed: 4,
      damage: 25,
      facing: 'right',
      isAttacking: false,
      attackFrame: 0,
      lastAttack: 0,
      isDashing: false,
      dashFrame: 0,
      invulnerable: false,
    };
  }

  private createEnemy(wave: number, type: 'soldier' | 'guardian' | 'chrono', xPos: number, yPos: number): Enemy {
    let hp: number, damage: number, color: string, width: number, height: number;

    switch (type) {
      case 'chrono':
        hp = 120 + wave * 20; damage = 30; color = '#9b59b6'; width = 38; height = 48;
        break;
      case 'guardian':
        hp = 90 + wave * 15; damage = 22; color = '#34495e'; width = 36; height = 46;
        break;
      default:
        hp = 50 + wave * 10; damage = 15; color = '#e67e22'; width = 32; height = 42;
    }

    return {
      x: xPos,
      y: yPos,
      width, height, hp, maxHp: hp, damage, type, color,
      vx: 0, vy: 0,
      facing: 'left',
      state: 'idle',
      isHit: false,
      hitFrame: 0,
      lastAttack: 0,
      isFrozen: false,
      frozenTime: 0,
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
    const wave = this.state.wave;
    const soldierCount = 3 + wave;
    const guardianCount = Math.floor(wave / 2);
    const hasChrono = wave % 3 === 0;

    for (let i = 0; i < soldierCount; i++) {
      const side = Math.random() > 0.5;
      this.state.enemies.push(this.createEnemy(wave, 'soldier',
        side ? 50 : ARENA_WIDTH - 50,
        60 + i * 60
      ));
    }
    for (let i = 0; i < guardianCount; i++) {
      this.state.enemies.push(this.createEnemy(wave, 'guardian',
        Math.random() * ARENA_WIDTH,
        60 + i * 80
      ));
    }
    if (hasChrono) {
      this.state.enemies.push(this.createEnemy(wave, 'chrono', ARENA_WIDTH / 2, 80));
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
    this.updateTimeEffect(dt);
    this.checkCollisions();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (!player.isDashing && !player.isAttacking) {
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

    if (player.isDashing) {
      player.dashFrame++;
      const dashSpeed = 12 * (dt / 16);
      player.vx = (player.facing === 'right' ? 1 : -1) * dashSpeed;
      player.invulnerable = player.dashFrame < 15;

      if (player.dashFrame > 20) {
        player.isDashing = false;
        player.dashFrame = 0;
        player.invulnerable = false;
        player.vx = 0;
      }
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 12) {
        player.isAttacking = false;
        player.attackFrame = 0;
      }
    }

    if (!this.state.timeSlowActive) {
      player.timeEnergy = Math.min(player.maxTimeEnergy, player.timeEnergy + 0.15 * (dt / 16));
    }
  }

  private updateEnemies(dt: number): void {
    const { player, enemies, timeSlowActive } = this.state;
    const now = performance.now();
    const slowFactor = timeSlowActive ? 0.3 : 1;

    enemies.forEach(enemy => {
      if (enemy.isFrozen) {
        enemy.frozenTime--;
        if (enemy.frozenTime <= 0) {
          enemy.isFrozen = false;
        }
        return;
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 250) {
        enemy.state = 'chasing';
        const speed = (enemy.type === 'chrono' ? 2.5 : enemy.type === 'guardian' ? 1.8 : 1.5) * slowFactor * (dt / 16);
        enemy.vx = (dx / dist) * speed;
        enemy.vy = (dy / dist) * speed;
        enemy.facing = dx > 0 ? 'right' : 'left';

        if (dist < 50 && now - enemy.lastAttack > 1500) {
          enemy.state = 'attacking';
          if (!player.invulnerable) {
            player.hp -= enemy.damage;
            this.spawnHitParticles(player.x, player.y, '#e74c3c');
          }
          enemy.lastAttack = now;
        }
      } else {
        enemy.state = 'idle';
        enemy.vx *= 0.9;
        enemy.vy *= 0.9;
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      enemy.x = Math.max(enemy.width / 2, Math.min(ARENA_WIDTH - enemy.width / 2, enemy.x));
      enemy.y = Math.max(enemy.height / 2, Math.min(ARENA_HEIGHT - enemy.height / 2, enemy.y));

      if (enemy.isHit) {
        enemy.hitFrame++;
        if (enemy.hitFrame > 8) {
          enemy.isHit = false;
          enemy.hitFrame = 0;
        }
      }
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += 0.15 * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private updateTimeEffect(dt: number): void {
    if (this.state.timeEffect) {
      this.state.timeEffect.duration -= dt / 16;
      if (this.state.timeEffect.duration <= 0) {
        this.state.timeEffect = null;
        this.state.timeSlowActive = false;
      }
    }
  }

  private checkCollisions(): void {
    const { player, enemies } = this.state;

    if (player.isAttacking && player.attackFrame >= 4 && player.attackFrame <= 8) {
      const attackRange = 60;
      const attackX = player.x + (player.facing === 'right' ? attackRange / 2 : -attackRange / 2);

      enemies.forEach((enemy, idx) => {
        if (Math.abs(attackX - enemy.x) < attackRange / 2 + enemy.width / 2 &&
            Math.abs(player.y - enemy.y) < 40) {
          enemy.hp -= player.damage;
          enemy.isHit = true;
          enemy.hitFrame = 0;
          this.spawnHitParticles(enemy.x, enemy.y, '#3498db');

          if (enemy.hp <= 0) {
            this.killEnemy(idx);
          }
        }
      });
    }
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 10; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 25,
        maxLife: 25,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private killEnemy(index: number): void {
    const enemy = this.state.enemies[index];
    this.spawnDeathParticles(enemy.x, enemy.y, enemy.color);
    this.state.enemies.splice(index, 1);
    this.state.enemiesDefeated++;

    const baseScore = enemy.type === 'chrono' ? 500 : enemy.type === 'guardian' ? 200 : 100;
    this.state.score += baseScore * this.state.wave;
  }

  private spawnDeathParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 4),
        vy: Math.sin(angle) * (3 + Math.random() * 4),
        life: 35,
        maxLife: 35,
        color,
        size: 4 + Math.random() * 5,
      });
    }
  }

  private checkWaveComplete(): void {
    if (this.state.enemies.length === 0) {
      this.state.wave++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 25);
      this.state.player.timeEnergy = this.state.player.maxTimeEnergy;
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
    if (player.isAttacking || player.isDashing || now - player.lastAttack < 350) return;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackFrame = 0;
  }

  public teleportDash(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    if (player.isDashing || player.isAttacking || player.timeEnergy < 25) return;
    player.timeEnergy -= 25;
    player.isDashing = true;
    player.dashFrame = 0;
    this.spawnHitParticles(player.x, player.y, '#3498db');
  }

  public timeSlow(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    if (player.timeEnergy < 40 || this.state.timeSlowActive) return;
    player.timeEnergy -= 40;
    this.state.timeSlowActive = true;
    this.state.timeEffect = { type: 'slow', duration: 180, radius: 300, x: player.x, y: player.y };
  }

  public timeFreeze(): void {
    if (this.state.phase !== 'playing') return;
    const { player, enemies } = this.state;
    if (player.timeEnergy < 50) return;
    player.timeEnergy -= 50;

    enemies.forEach(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        enemy.isFrozen = true;
        enemy.frozenTime = 120;
      }
    });

    this.state.timeEffect = { type: 'freeze', duration: 30, radius: 150, x: player.x, y: player.y };
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.attack();
    if (code === 'KeyK') this.teleportDash();
    if (code === 'KeyL') this.timeSlow();
    if (code === 'KeyI') this.timeFreeze();
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
