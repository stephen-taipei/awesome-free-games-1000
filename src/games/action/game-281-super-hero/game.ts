/**
 * Super Hero Game Logic
 * Game #281 - Hero Action with Superpowers
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  facing: 'left' | 'right';
  isFlying: boolean;
  isAttacking: boolean;
  attackFrame: number;
  lastAttack: number;
  superPower: 'laser' | 'strength' | null;
  powerFrame: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'thug' | 'robot' | 'villain';
  color: string;
  vx: number;
  vy: number;
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

export interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  life: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  lasers: Laser[];
  score: number;
  level: number;
  enemiesDefeated: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class SuperHeroGame {
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
      lasers: [],
      score: 0,
      level: 1,
      enemiesDefeated: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: ARENA_HEIGHT - 100,
      width: 35,
      height: 45,
      hp: 150,
      maxHp: 150,
      energy: 100,
      maxEnergy: 100,
      vx: 0,
      vy: 0,
      speed: 4,
      damage: 30,
      facing: 'right',
      isFlying: false,
      isAttacking: false,
      attackFrame: 0,
      lastAttack: 0,
      superPower: null,
      powerFrame: 0,
    };
  }

  private createEnemy(level: number, type: 'thug' | 'robot' | 'villain', xPos: number): Enemy {
    let hp: number, damage: number, color: string, width: number, height: number;

    switch (type) {
      case 'villain':
        hp = 150 + level * 25; damage = 35; color = '#8e44ad'; width = 45; height = 50;
        break;
      case 'robot':
        hp = 90 + level * 18; damage = 25; color = '#34495e'; width = 38; height = 48;
        break;
      default:
        hp = 50 + level * 10; damage = 15; color = '#e67e22'; width = 32; height = 42;
    }

    return {
      x: xPos,
      y: ARENA_HEIGHT - 100,
      width, height, hp, maxHp: hp, damage, type, color,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
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
    const thugCount = 3 + level;
    const robotCount = Math.floor(level / 2);
    const hasVillain = level % 4 === 0;

    for (let i = 0; i < thugCount; i++) {
      this.state.enemies.push(this.createEnemy(level, 'thug', 200 + i * 70 + Math.random() * 30));
    }
    for (let i = 0; i < robotCount; i++) {
      this.state.enemies.push(this.createEnemy(level, 'robot', 220 + i * 90));
    }
    if (hasVillain) {
      this.state.enemies.push(this.createEnemy(level, 'villain', ARENA_WIDTH - 80));
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
    this.updateLasers(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkLevelComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    // Horizontal movement
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      player.vx = -moveSpeed;
      player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      player.vx = moveSpeed;
      player.facing = 'right';
    } else {
      player.vx *= 0.85;
    }

    // Flying
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      if (player.energy > 0) {
        player.isFlying = true;
        player.vy = -moveSpeed * 0.8;
        player.energy -= 0.5 * (dt / 16);
      } else {
        player.isFlying = false;
      }
    } else if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      player.vy = moveSpeed * 0.8;
      player.isFlying = false;
    } else {
      if (!player.isFlying) {
        player.vy = 0;
      } else {
        player.vy *= 0.85;
      }
      player.energy = Math.min(player.maxEnergy, player.energy + 0.3 * (dt / 16));
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 10) {
        player.isAttacking = false;
        player.attackFrame = 0;
      }
    }

    if (player.superPower) {
      player.powerFrame++;
      if (player.powerFrame > 60) {
        player.superPower = null;
        player.powerFrame = 0;
      }
    }
  }

  private updateEnemies(dt: number): void {
    const { player, enemies } = this.state;
    const now = performance.now();

    enemies.forEach(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        const moveSpeed = (enemy.type === 'villain' ? 1.5 : enemy.type === 'robot' ? 1.2 : 1) * (dt / 16);
        enemy.vx = (dx / dist) * moveSpeed;
        enemy.vy = (dy / dist) * moveSpeed * 0.5;

        if (dist < 50 && now - enemy.lastAttack > 1500) {
          player.hp -= enemy.damage;
          enemy.lastAttack = now;
          this.spawnHitParticles(player.x, player.y, '#e74c3c');
        }
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      enemy.x = Math.max(enemy.width / 2, Math.min(ARENA_WIDTH - enemy.width / 2, enemy.x));
      enemy.y = Math.max(enemy.height / 2, Math.min(ARENA_HEIGHT - enemy.height / 2, enemy.y));

      if (enemy.isHit) {
        enemy.hitFrame++;
        if (enemy.hitFrame > 8) { enemy.isHit = false; enemy.hitFrame = 0; }
      }
    });
  }

  private updateLasers(dt: number): void {
    const speed = dt / 16;
    this.state.lasers = this.state.lasers.filter(laser => {
      laser.x += laser.vx * speed;
      laser.y += laser.vy * speed;
      laser.life--;
      return laser.life > 0 && laser.x > 0 && laser.x < ARENA_WIDTH;
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

  private checkCollisions(): void {
    const { player, enemies, lasers } = this.state;

    // Laser collisions
    lasers.forEach((laser, lIdx) => {
      enemies.forEach((enemy, eIdx) => {
        if (Math.abs(laser.x - enemy.x) < enemy.width / 2 + laser.width / 2 &&
            Math.abs(laser.y - enemy.y) < enemy.height / 2 + laser.height / 2) {
          enemy.hp -= laser.damage;
          enemy.isHit = true;
          enemy.hitFrame = 0;
          lasers.splice(lIdx, 1);
          this.spawnHitParticles(enemy.x, enemy.y, '#3498db');

          if (enemy.hp <= 0) {
            this.killEnemy(eIdx);
          }
        }
      });
    });

    // Melee attack collisions
    if (player.isAttacking && player.attackFrame >= 3 && player.attackFrame <= 7) {
      const attackRange = player.superPower === 'strength' ? 80 : 55;
      const attackDamage = player.superPower === 'strength' ? player.damage * 3 : player.damage;
      const attackX = player.x + (player.facing === 'right' ? attackRange / 2 : -attackRange / 2);

      enemies.forEach((enemy, idx) => {
        if (Math.abs(attackX - enemy.x) < attackRange / 2 + enemy.width / 2 &&
            Math.abs(player.y - enemy.y) < 40) {
          enemy.hp -= attackDamage;
          enemy.isHit = true;
          enemy.hitFrame = 0;
          enemy.vx += (player.facing === 'right' ? 5 : -5);
          this.spawnHitParticles(enemy.x, enemy.y, '#f39c12');

          if (enemy.hp <= 0) {
            this.killEnemy(idx);
          }
        }
      });
    }
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private killEnemy(index: number): void {
    const enemy = this.state.enemies[index];
    this.spawnDeathParticles(enemy.x, enemy.y, enemy.color);
    this.state.enemies.splice(index, 1);
    this.state.enemiesDefeated++;

    const baseScore = enemy.type === 'villain' ? 500 : enemy.type === 'robot' ? 200 : 100;
    this.state.score += baseScore * this.state.level;
  }

  private spawnDeathParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 4),
        vy: Math.sin(angle) * (2 + Math.random() * 4),
        life: 35,
        maxLife: 35,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  private checkLevelComplete(): void {
    if (this.state.enemies.length === 0) {
      this.state.level++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 30);
      this.state.player.energy = this.state.player.maxEnergy;
      this.state.player.x = 100;
      this.state.player.y = ARENA_HEIGHT - 100;
      this.spawnLevel();
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
    if (now - player.lastAttack < 500) return;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackFrame = 0;
  }

  public shootLaser(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    if (player.energy < 20) return;

    player.energy -= 20;
    player.superPower = 'laser';
    player.powerFrame = 0;

    const speed = 15;
    this.state.lasers.push({
      x: player.x + (player.facing === 'right' ? 20 : -20),
      y: player.y,
      vx: player.facing === 'right' ? speed : -speed,
      vy: 0,
      width: 20,
      height: 4,
      damage: 40,
      life: 60,
    });
    this.spawnHitParticles(player.x, player.y, '#3498db');
  }

  public superStrength(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    if (player.energy < 30) return;

    player.energy -= 30;
    player.superPower = 'strength';
    player.powerFrame = 0;
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.attack();
    if (code === 'KeyK') this.shootLaser();
    if (code === 'KeyL') this.superStrength();
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
