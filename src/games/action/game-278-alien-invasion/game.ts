/**
 * Alien Invasion Game Logic
 * Game #278 - Sci-fi Action Shooter
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  lastShot: number;
  shootCooldown: number;
  weaponLevel: number;
}

export interface Alien {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'grunt' | 'shooter' | 'boss';
  color: string;
  lastShot: number;
  shootCooldown: number;
  isHit: boolean;
  hitFrame: number;
  pattern: number;
  patternTime: number;
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

export interface PowerUp {
  x: number;
  y: number;
  type: 'health' | 'shield' | 'weapon';
  vy: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  aliens: Alien[];
  projectiles: Projectile[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  wave: number;
  kills: number;
  bossDefeated: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const PLAYER_SPEED = 5;
const PROJECTILE_SPEED = 10;

export class AlienInvasionGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private keys: Set<string> = new Set();
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private autoShoot: boolean = true;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      aliens: [],
      projectiles: [],
      particles: [],
      powerUps: [],
      score: 0,
      wave: 1,
      kills: 0,
      bossDefeated: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT - 50,
      width: 40,
      height: 35,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 50,
      speed: PLAYER_SPEED,
      lastShot: 0,
      shootCooldown: 200,
      weaponLevel: 1,
    };
  }

  private createAlien(wave: number, type: 'grunt' | 'shooter' | 'boss' = 'grunt'): Alien {
    const x = 30 + Math.random() * (ARENA_WIDTH - 60);
    const y = -50;

    let hp: number, speed: number, damage: number, color: string;
    let width: number, height: number, shootCooldown: number;

    switch (type) {
      case 'boss':
        hp = 200 + wave * 50;
        speed = 0.5;
        damage = 30;
        color = '#8e44ad';
        width = 80;
        height = 60;
        shootCooldown = 800;
        break;
      case 'shooter':
        hp = 30 + wave * 5;
        speed = 1;
        damage = 15;
        color = '#e74c3c';
        width = 35;
        height = 30;
        shootCooldown = 1500;
        break;
      default:
        hp = 20 + wave * 3;
        speed = 1.5 + wave * 0.1;
        damage = 10;
        color = '#27ae60';
        width = 30;
        height = 25;
        shootCooldown = 0; // doesn't shoot
    }

    return {
      x,
      y,
      width,
      height,
      hp,
      maxHp: hp,
      speed,
      damage,
      type,
      color,
      lastShot: 0,
      shootCooldown,
      isHit: false,
      hitFrame: 0,
      pattern: Math.floor(Math.random() * 3),
      patternTime: 0,
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
    const gruntCount = 4 + wave * 2;
    const shooterCount = Math.floor(wave / 2);
    const hasBoss = wave % 5 === 0;

    // Spawn grunts
    for (let i = 0; i < gruntCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.aliens.push(this.createAlien(wave, 'grunt'));
        }
      }, i * 400);
    }

    // Spawn shooters
    for (let i = 0; i < shooterCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.aliens.push(this.createAlien(wave, 'shooter'));
        }
      }, gruntCount * 400 + i * 600);
    }

    // Spawn boss
    if (hasBoss) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          const boss = this.createAlien(wave, 'boss');
          boss.x = ARENA_WIDTH / 2;
          this.state.aliens.push(boss);
        }
      }, (gruntCount + shooterCount) * 500 + 1000);
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
    this.updateAliens(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updatePowerUps(dt);
    this.checkCollisions();
    this.checkWaveComplete();
    this.checkGameOver();
    this.regenerateShield(dt);
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
    player.y = Math.max(ARENA_HEIGHT / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    // Auto-shoot
    if (this.autoShoot) {
      const now = performance.now();
      if (now - player.lastShot > player.shootCooldown) {
        this.shoot();
      }
    }
  }

  private updateAliens(dt: number): void {
    const now = performance.now();
    const { player, aliens } = this.state;

    aliens.forEach(alien => {
      alien.patternTime += dt;

      // Movement patterns
      switch (alien.pattern) {
        case 0: // Straight down
          alien.y += alien.speed * (dt / 16);
          break;
        case 1: // Sine wave
          alien.y += alien.speed * (dt / 16);
          alien.x += Math.sin(alien.patternTime * 0.003) * 2;
          break;
        case 2: // Zigzag
          alien.y += alien.speed * (dt / 16);
          if (Math.floor(alien.patternTime / 500) % 2 === 0) {
            alien.x += alien.speed * (dt / 16);
          } else {
            alien.x -= alien.speed * (dt / 16);
          }
          break;
      }

      // Boss special movement
      if (alien.type === 'boss') {
        alien.y = Math.min(80, alien.y);
        alien.x = ARENA_WIDTH / 2 + Math.sin(alien.patternTime * 0.001) * 150;
      }

      // Keep in bounds
      alien.x = Math.max(alien.width / 2, Math.min(ARENA_WIDTH - alien.width / 2, alien.x));

      // Shooting
      if ((alien.type === 'shooter' || alien.type === 'boss') && now - alien.lastShot > alien.shootCooldown) {
        this.alienShoot(alien);
        alien.lastShot = now;
      }

      // Hit animation
      if (alien.isHit) {
        alien.hitFrame++;
        if (alien.hitFrame > 6) {
          alien.isHit = false;
          alien.hitFrame = 0;
        }
      }
    });

    // Remove aliens that are off screen
    this.state.aliens = aliens.filter(a => a.y < ARENA_HEIGHT + 50);
  }

  private alienShoot(alien: Alien): void {
    const { player } = this.state;
    const dx = player.x - alien.x;
    const dy = player.y - alien.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (alien.type === 'boss') {
      // Boss shoots multiple projectiles
      for (let i = -1; i <= 1; i++) {
        this.state.projectiles.push({
          x: alien.x + i * 25,
          y: alien.y + alien.height / 2,
          vx: (dx / dist) * 5 + i * 2,
          vy: 6,
          damage: alien.damage,
          isPlayerProjectile: false,
          color: '#9b59b6',
          size: 8,
        });
      }
    } else {
      this.state.projectiles.push({
        x: alien.x,
        y: alien.y + alien.height / 2,
        vx: (dx / dist) * 4,
        vy: 5,
        damage: alien.damage,
        isPlayerProjectile: false,
        color: '#e74c3c',
        size: 6,
      });
    }
  }

  private shoot(): void {
    const { player } = this.state;
    const now = performance.now();

    player.lastShot = now;

    const baseProjectile = {
      y: player.y - player.height / 2,
      vy: -PROJECTILE_SPEED,
      damage: 20 + player.weaponLevel * 5,
      isPlayerProjectile: true,
      color: '#3498db',
      size: 6,
    };

    switch (player.weaponLevel) {
      case 1:
        this.state.projectiles.push({ ...baseProjectile, x: player.x, vx: 0 });
        break;
      case 2:
        this.state.projectiles.push({ ...baseProjectile, x: player.x - 8, vx: 0 });
        this.state.projectiles.push({ ...baseProjectile, x: player.x + 8, vx: 0 });
        break;
      case 3:
      default:
        this.state.projectiles.push({ ...baseProjectile, x: player.x, vx: 0 });
        this.state.projectiles.push({ ...baseProjectile, x: player.x - 15, vx: -1 });
        this.state.projectiles.push({ ...baseProjectile, x: player.x + 15, vx: 1 });
        break;
    }
  }

  private updateProjectiles(dt: number): void {
    const speed = dt / 16;
    this.state.projectiles = this.state.projectiles.filter(proj => {
      proj.x += proj.vx * speed;
      proj.y += proj.vy * speed;
      return proj.x > -20 && proj.x < ARENA_WIDTH + 20 &&
             proj.y > -20 && proj.y < ARENA_HEIGHT + 20;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private updatePowerUps(dt: number): void {
    const speed = dt / 16;
    const { player, powerUps } = this.state;

    this.state.powerUps = powerUps.filter(pu => {
      pu.y += pu.vy * speed;

      // Check collection
      const dx = player.x - pu.x;
      const dy = player.y - pu.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        switch (pu.type) {
          case 'health':
            player.hp = Math.min(player.maxHp, player.hp + 25);
            break;
          case 'shield':
            player.shield = Math.min(player.maxShield, player.shield + 25);
            break;
          case 'weapon':
            player.weaponLevel = Math.min(3, player.weaponLevel + 1);
            break;
        }
        return false;
      }

      return pu.y < ARENA_HEIGHT + 20;
    });
  }

  private regenerateShield(dt: number): void {
    const { player } = this.state;
    if (player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + 0.02 * (dt / 16));
    }
  }

  private checkCollisions(): void {
    const { player, aliens, projectiles } = this.state;

    // Player projectiles hitting aliens
    projectiles.forEach((proj, projIdx) => {
      if (proj.isPlayerProjectile) {
        aliens.forEach((alien, alienIdx) => {
          if (this.checkHit(proj, alien)) {
            alien.hp -= proj.damage;
            alien.isHit = true;
            alien.hitFrame = 0;
            this.spawnHitParticles(proj.x, proj.y, alien.color);
            projectiles.splice(projIdx, 1);

            if (alien.hp <= 0) {
              this.killAlien(alienIdx);
            }
          }
        });
      } else {
        // Enemy projectiles hitting player
        if (this.checkHitPlayer(proj, player)) {
          this.damagePlayer(proj.damage);
          this.spawnHitParticles(proj.x, proj.y, '#fff');
          projectiles.splice(projIdx, 1);
        }
      }
    });

    // Aliens colliding with player
    aliens.forEach((alien, idx) => {
      if (this.checkAlienPlayerCollision(alien, player)) {
        this.damagePlayer(alien.damage);
        alien.hp -= 50;
        if (alien.hp <= 0) {
          this.killAlien(idx);
        }
      }
    });
  }

  private checkHit(proj: Projectile, alien: Alien): boolean {
    return proj.x > alien.x - alien.width / 2 &&
           proj.x < alien.x + alien.width / 2 &&
           proj.y > alien.y - alien.height / 2 &&
           proj.y < alien.y + alien.height / 2;
  }

  private checkHitPlayer(proj: Projectile, player: Player): boolean {
    return proj.x > player.x - player.width / 2 &&
           proj.x < player.x + player.width / 2 &&
           proj.y > player.y - player.height / 2 &&
           proj.y < player.y + player.height / 2;
  }

  private checkAlienPlayerCollision(alien: Alien, player: Player): boolean {
    return Math.abs(alien.x - player.x) < (alien.width + player.width) / 2 &&
           Math.abs(alien.y - player.y) < (alien.height + player.height) / 2;
  }

  private damagePlayer(damage: number): void {
    const { player } = this.state;

    if (player.shield > 0) {
      const shieldDamage = Math.min(player.shield, damage);
      player.shield -= shieldDamage;
      damage -= shieldDamage;
    }

    player.hp -= damage;
  }

  private killAlien(index: number): void {
    const alien = this.state.aliens[index];

    // Drop power-up
    if (Math.random() < (alien.type === 'boss' ? 1 : 0.15)) {
      const types: Array<'health' | 'shield' | 'weapon'> = ['health', 'shield', 'weapon'];
      this.state.powerUps.push({
        x: alien.x,
        y: alien.y,
        type: types[Math.floor(Math.random() * types.length)],
        vy: 1.5,
      });
    }

    this.spawnExplosion(alien.x, alien.y, alien.color);
    this.state.aliens.splice(index, 1);
    this.state.kills++;

    if (alien.type === 'boss') {
      this.state.bossDefeated++;
      this.state.score += 1000 * this.state.wave;
    } else {
      this.state.score += (alien.type === 'shooter' ? 150 : 100) * this.state.wave;
    }
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
        life: 30,
        maxLife: 30,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  private checkWaveComplete(): void {
    if (this.state.aliens.length === 0 && this.state.phase === 'playing') {
      this.state.wave++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 15);
      this.spawnWave();
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.stopGameLoop();
    }
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
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
