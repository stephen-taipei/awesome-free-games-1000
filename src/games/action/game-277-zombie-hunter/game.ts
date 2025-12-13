/**
 * Zombie Hunter Game Logic
 * Game #277 - Survival Action Game
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  speed: number;
  facing: 'left' | 'right';
  isReloading: boolean;
  reloadTimer: number;
  lastShot: number;
  shootCooldown: number;
}

export interface Zombie {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'normal' | 'fast' | 'tank';
  color: string;
  lastAttack: number;
  isHit: boolean;
  hitFrame: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
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

export interface Pickup {
  x: number;
  y: number;
  type: 'health' | 'ammo';
  amount: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  zombies: Zombie[];
  bullets: Bullet[];
  particles: Particle[];
  pickups: Pickup[];
  score: number;
  wave: number;
  kills: number;
  headshots: number;
  zombiesRemaining: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const PLAYER_SPEED = 3.5;
const BULLET_SPEED = 12;
const SHOOT_COOLDOWN = 150;
const RELOAD_TIME = 1500;

export class ZombieHunterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private keys: Set<string> = new Set();
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private gameLoop: number | null = null;
  private lastTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      zombies: [],
      bullets: [],
      particles: [],
      pickups: [],
      score: 0,
      wave: 1,
      kills: 0,
      headshots: 0,
      zombiesRemaining: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      width: 30,
      height: 40,
      hp: 100,
      maxHp: 100,
      ammo: 30,
      maxAmmo: 30,
      speed: PLAYER_SPEED,
      facing: 'right',
      isReloading: false,
      reloadTimer: 0,
      lastShot: 0,
      shootCooldown: SHOOT_COOLDOWN,
    };
  }

  private createZombie(wave: number): Zombie {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: x = -30; y = Math.random() * ARENA_HEIGHT; break;
      case 1: x = ARENA_WIDTH + 30; y = Math.random() * ARENA_HEIGHT; break;
      case 2: x = Math.random() * ARENA_WIDTH; y = -30; break;
      default: x = Math.random() * ARENA_WIDTH; y = ARENA_HEIGHT + 30; break;
    }

    const typeRoll = Math.random();
    let type: 'normal' | 'fast' | 'tank';
    let hp: number, speed: number, damage: number, color: string;

    if (typeRoll < 0.6) {
      type = 'normal';
      hp = 30 + wave * 5;
      speed = 1 + wave * 0.1;
      damage = 10;
      color = '#4a7c59';
    } else if (typeRoll < 0.85) {
      type = 'fast';
      hp = 20 + wave * 3;
      speed = 2.5 + wave * 0.15;
      damage = 8;
      color = '#8b4513';
    } else {
      type = 'tank';
      hp = 80 + wave * 15;
      speed = 0.6 + wave * 0.05;
      damage = 25;
      color = '#2d3436';
    }

    return {
      x,
      y,
      width: type === 'tank' ? 45 : type === 'fast' ? 25 : 30,
      height: type === 'tank' ? 55 : type === 'fast' ? 35 : 40,
      hp,
      maxHp: hp,
      speed,
      damage,
      type,
      color,
      lastAttack: 0,
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
    const zombieCount = 5 + this.state.wave * 3;
    this.state.zombiesRemaining = zombieCount;

    for (let i = 0; i < zombieCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.zombies.push(this.createZombie(this.state.wave));
        }
      }, i * 300);
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
    this.updateZombies(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      player.x -= moveSpeed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      player.x += moveSpeed;
    }
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      player.y -= moveSpeed;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      player.y += moveSpeed;
    }

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    player.facing = this.mousePos.x > player.x ? 'right' : 'left';

    if (player.isReloading) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        player.isReloading = false;
        player.ammo = player.maxAmmo;
      }
    }
  }

  private updateZombies(dt: number): void {
    const { player, zombies } = this.state;
    const now = performance.now();

    zombies.forEach(zombie => {
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = zombie.speed * (dt / 16);

      if (dist > 25) {
        zombie.x += (dx / dist) * moveSpeed;
        zombie.y += (dy / dist) * moveSpeed;
      }

      // Attack player on contact
      if (dist < 30 && now - zombie.lastAttack > 1000) {
        player.hp -= zombie.damage;
        zombie.lastAttack = now;
        this.spawnBloodParticles(player.x, player.y);
      }

      if (zombie.isHit) {
        zombie.hitFrame++;
        if (zombie.hitFrame > 6) {
          zombie.isHit = false;
          zombie.hitFrame = 0;
        }
      }
    });
  }

  private updateBullets(dt: number): void {
    const speed = dt / 16;
    this.state.bullets = this.state.bullets.filter(bullet => {
      bullet.x += bullet.vx * speed;
      bullet.y += bullet.vy * speed;
      return bullet.x > -10 && bullet.x < ARENA_WIDTH + 10 &&
             bullet.y > -10 && bullet.y < ARENA_HEIGHT + 10;
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
    const { bullets, zombies, player, pickups } = this.state;

    // Bullets hitting zombies
    bullets.forEach((bullet, bulletIdx) => {
      zombies.forEach((zombie, zombieIdx) => {
        if (this.checkHit(bullet, zombie)) {
          const headshot = bullet.y < zombie.y - zombie.height / 4;
          const damage = headshot ? bullet.damage * 2 : bullet.damage;

          zombie.hp -= damage;
          zombie.isHit = true;
          zombie.hitFrame = 0;

          this.spawnBloodParticles(bullet.x, bullet.y);
          bullets.splice(bulletIdx, 1);

          if (headshot) {
            this.state.headshots++;
          }

          if (zombie.hp <= 0) {
            this.killZombie(zombieIdx);
          }
        }
      });
    });

    // Player collecting pickups
    pickups.forEach((pickup, idx) => {
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        if (pickup.type === 'health') {
          player.hp = Math.min(player.maxHp, player.hp + pickup.amount);
        } else {
          player.ammo = Math.min(player.maxAmmo, player.ammo + pickup.amount);
        }
        pickups.splice(idx, 1);
      }
    });
  }

  private checkHit(bullet: Bullet, zombie: Zombie): boolean {
    return bullet.x > zombie.x - zombie.width / 2 &&
           bullet.x < zombie.x + zombie.width / 2 &&
           bullet.y > zombie.y - zombie.height / 2 &&
           bullet.y < zombie.y + zombie.height / 2;
  }

  private killZombie(index: number): void {
    const zombie = this.state.zombies[index];

    // Chance to drop pickup
    if (Math.random() < 0.2) {
      this.state.pickups.push({
        x: zombie.x,
        y: zombie.y,
        type: Math.random() < 0.5 ? 'health' : 'ammo',
        amount: Math.random() < 0.5 ? 20 : 15,
      });
    }

    this.spawnDeathParticles(zombie.x, zombie.y, zombie.color);
    this.state.zombies.splice(index, 1);
    this.state.kills++;
    this.state.zombiesRemaining--;

    const scoreMultiplier = zombie.type === 'tank' ? 3 : zombie.type === 'fast' ? 1.5 : 1;
    this.state.score += Math.round(100 * scoreMultiplier * this.state.wave);
  }

  private spawnBloodParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 25,
        maxLife: 25,
        color: '#8b0000',
        size: 3 + Math.random() * 3,
      });
    }
  }

  private spawnDeathParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 35,
        maxLife: 35,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  private checkWaveComplete(): void {
    if (this.state.zombiesRemaining <= 0 && this.state.zombies.length === 0) {
      this.state.wave++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 25);
      this.state.player.ammo = this.state.player.maxAmmo;
      this.spawnWave();
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.stopGameLoop();
    }
  }

  public shoot(targetX: number, targetY: number): void {
    if (this.state.phase !== 'playing') return;

    const { player } = this.state;
    const now = performance.now();

    if (now - player.lastShot < player.shootCooldown) return;
    if (player.isReloading) return;
    if (player.ammo <= 0) {
      this.reload();
      return;
    }

    player.lastShot = now;
    player.ammo--;

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.state.bullets.push({
      x: player.x,
      y: player.y,
      vx: (dx / dist) * BULLET_SPEED,
      vy: (dy / dist) * BULLET_SPEED,
      damage: 25,
    });
  }

  public reload(): void {
    const { player } = this.state;
    if (player.isReloading || player.ammo === player.maxAmmo) return;

    player.isReloading = true;
    player.reloadTimer = RELOAD_TIME;
  }

  public setMousePos(x: number, y: number): void {
    this.mousePos = { x, y };
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'KeyR') {
      this.reload();
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
