/**
 * Dragon Warrior Game Logic
 * Game #279 - Fantasy Action Game - Slay Dragons!
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  speed: number;
  damage: number;
  facing: 'left' | 'right';
  isAttacking: boolean;
  attackFrame: number;
  lastAttack: number;
  isRolling: boolean;
  rollFrame: number;
  invincible: boolean;
}

export interface Dragon {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'small' | 'medium' | 'boss';
  color: string;
  lastAttack: number;
  attackCooldown: number;
  isHit: boolean;
  hitFrame: number;
  state: 'idle' | 'attacking' | 'flying';
  stateTimer: number;
}

export interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
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
  player: Player;
  dragons: Dragon[];
  fireballs: Fireball[];
  particles: Particle[];
  score: number;
  wave: number;
  kills: number;
  dragonsSlain: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const PLAYER_SPEED = 4;
const ATTACK_COOLDOWN = 400;
const ROLL_DURATION = 20;

export class DragonWarriorGame {
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
      dragons: [],
      fireballs: [],
      particles: [],
      score: 0,
      wave: 1,
      kills: 0,
      dragonsSlain: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT - 60,
      width: 35,
      height: 45,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      speed: PLAYER_SPEED,
      damage: 30,
      facing: 'right',
      isAttacking: false,
      attackFrame: 0,
      lastAttack: 0,
      isRolling: false,
      rollFrame: 0,
      invincible: false,
    };
  }

  private createDragon(wave: number, type: 'small' | 'medium' | 'boss' = 'small'): Dragon {
    const x = 50 + Math.random() * (ARENA_WIDTH - 100);
    const y = -60;

    let hp: number, damage: number, color: string;
    let width: number, height: number, cooldown: number;

    switch (type) {
      case 'boss':
        hp = 300 + wave * 50;
        damage = 35;
        color = '#8e44ad';
        width = 100;
        height = 80;
        cooldown = 1200;
        break;
      case 'medium':
        hp = 80 + wave * 15;
        damage = 20;
        color = '#e74c3c';
        width = 60;
        height = 50;
        cooldown = 1800;
        break;
      default:
        hp = 40 + wave * 8;
        damage = 12;
        color = '#27ae60';
        width = 45;
        height = 40;
        cooldown = 2500;
    }

    return {
      x,
      y,
      width,
      height,
      hp,
      maxHp: hp,
      damage,
      type,
      color,
      lastAttack: 0,
      attackCooldown: cooldown,
      isHit: false,
      hitFrame: 0,
      state: 'flying',
      stateTimer: 0,
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
    const smallCount = 2 + wave;
    const mediumCount = Math.floor(wave / 2);
    const hasBoss = wave % 3 === 0;

    for (let i = 0; i < smallCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.dragons.push(this.createDragon(wave, 'small'));
        }
      }, i * 600);
    }

    for (let i = 0; i < mediumCount; i++) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.dragons.push(this.createDragon(wave, 'medium'));
        }
      }, smallCount * 600 + i * 800);
    }

    if (hasBoss) {
      setTimeout(() => {
        if (this.state.phase === 'playing') {
          this.state.dragons.push(this.createDragon(wave, 'boss'));
        }
      }, (smallCount + mediumCount) * 700 + 1500);
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
    this.updateDragons(dt);
    this.updateFireballs(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkWaveComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (!player.isRolling) {
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
    } else {
      const rollSpeed = moveSpeed * 2;
      player.x += player.facing === 'right' ? rollSpeed : -rollSpeed;
      player.rollFrame++;
      if (player.rollFrame >= ROLL_DURATION) {
        player.isRolling = false;
        player.rollFrame = 0;
        player.invincible = false;
      }
    }

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    // Stamina regen
    player.stamina = Math.min(player.maxStamina, player.stamina + 0.1 * (dt / 16));

    // Attack animation
    if (player.isAttacking) {
      player.attackFrame++;
      if (player.attackFrame > 15) {
        player.isAttacking = false;
        player.attackFrame = 0;
      }
    }
  }

  private updateDragons(dt: number): void {
    const { player, dragons } = this.state;
    const now = performance.now();

    dragons.forEach(dragon => {
      dragon.stateTimer += dt;

      // Movement based on state
      if (dragon.state === 'flying') {
        dragon.y += 0.5 * (dt / 16);
        if (dragon.y > 80) {
          dragon.state = 'idle';
          dragon.stateTimer = 0;
        }
      } else if (dragon.state === 'idle') {
        // Hover and occasionally swoop
        dragon.y += Math.sin(dragon.stateTimer * 0.003) * 0.3;

        if (dragon.type === 'boss') {
          dragon.x = ARENA_WIDTH / 2 + Math.sin(dragon.stateTimer * 0.001) * 120;
        }

        // Attack
        if (now - dragon.lastAttack > dragon.attackCooldown) {
          this.dragonAttack(dragon);
          dragon.lastAttack = now;
        }
      }

      dragon.x = Math.max(dragon.width / 2, Math.min(ARENA_WIDTH - dragon.width / 2, dragon.x));

      if (dragon.isHit) {
        dragon.hitFrame++;
        if (dragon.hitFrame > 8) {
          dragon.isHit = false;
          dragon.hitFrame = 0;
        }
      }
    });
  }

  private dragonAttack(dragon: Dragon): void {
    const { player } = this.state;
    const dx = player.x - dragon.x;
    const dy = player.y - dragon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const count = dragon.type === 'boss' ? 5 : dragon.type === 'medium' ? 3 : 1;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.3;
      this.state.fireballs.push({
        x: dragon.x,
        y: dragon.y + dragon.height / 2,
        vx: (dx / dist) * 5 + spread * 2,
        vy: (dy / dist) * 5,
        damage: dragon.damage,
        size: dragon.type === 'boss' ? 15 : 10,
      });
    }

    this.spawnFireParticles(dragon.x, dragon.y + dragon.height / 2);
  }

  private spawnFireParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 20,
        maxLife: 20,
        color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private updateFireballs(dt: number): void {
    const speed = dt / 16;
    this.state.fireballs = this.state.fireballs.filter(fb => {
      fb.x += fb.vx * speed;
      fb.y += fb.vy * speed;
      return fb.x > -20 && fb.x < ARENA_WIDTH + 20 &&
             fb.y > -20 && fb.y < ARENA_HEIGHT + 20;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += 0.1 * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const { player, dragons, fireballs } = this.state;

    // Player attack hitting dragons
    if (player.isAttacking && player.attackFrame >= 5 && player.attackFrame <= 10) {
      const attackRange = 60;
      const attackX = player.x + (player.facing === 'right' ? attackRange / 2 : -attackRange / 2);

      dragons.forEach((dragon, idx) => {
        const dx = Math.abs(attackX - dragon.x);
        const dy = Math.abs(player.y - dragon.y);
        if (dx < attackRange && dy < 60) {
          dragon.hp -= player.damage;
          dragon.isHit = true;
          dragon.hitFrame = 0;
          this.spawnHitParticles(dragon.x, dragon.y);

          if (dragon.hp <= 0) {
            this.killDragon(idx);
          }
        }
      });
    }

    // Fireballs hitting player
    if (!player.invincible) {
      fireballs.forEach((fb, idx) => {
        const dx = Math.abs(fb.x - player.x);
        const dy = Math.abs(fb.y - player.y);
        if (dx < player.width / 2 + fb.size && dy < player.height / 2 + fb.size) {
          player.hp -= fb.damage;
          fireballs.splice(idx, 1);
          this.spawnHitParticles(player.x, player.y);
        }
      });
    }

    // Dragons colliding with player
    if (!player.invincible) {
      dragons.forEach(dragon => {
        const dx = Math.abs(dragon.x - player.x);
        const dy = Math.abs(dragon.y - player.y);
        if (dx < (dragon.width + player.width) / 2 && dy < (dragon.height + player.height) / 2) {
          player.hp -= dragon.damage / 2;
          player.invincible = true;
          setTimeout(() => { player.invincible = false; }, 500);
        }
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 25,
        maxLife: 25,
        color: '#fff',
        size: 3 + Math.random() * 3,
      });
    }
  }

  private killDragon(index: number): void {
    const dragon = this.state.dragons[index];
    this.spawnExplosion(dragon.x, dragon.y, dragon.color);
    this.state.dragons.splice(index, 1);
    this.state.kills++;
    this.state.dragonsSlain++;

    const multiplier = dragon.type === 'boss' ? 10 : dragon.type === 'medium' ? 3 : 1;
    this.state.score += 100 * multiplier * this.state.wave;

    // Heal on kill
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 5);
  }

  private spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 4;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 35,
        maxLife: 35,
        color: Math.random() > 0.5 ? color : '#f39c12',
        size: 5 + Math.random() * 5,
      });
    }
  }

  private checkWaveComplete(): void {
    if (this.state.dragons.length === 0 && this.state.phase === 'playing') {
      this.state.wave++;
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

    if (now - player.lastAttack < ATTACK_COOLDOWN) return;
    if (player.isRolling) return;

    player.lastAttack = now;
    player.isAttacking = true;
    player.attackFrame = 0;
  }

  public roll(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;

    if (player.isRolling || player.stamina < 25) return;

    player.stamina -= 25;
    player.isRolling = true;
    player.rollFrame = 0;
    player.invincible = true;
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
