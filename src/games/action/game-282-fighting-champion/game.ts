/**
 * Fighting Champion Game Logic
 * Game #282 - Fighting Game with Combos
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
  isBlocking: boolean;
  isAttacking: boolean;
  attackType: 'punch' | 'kick' | 'special' | null;
  attackFrame: number;
  lastAttack: number;
  comboCount: number;
  comboTimer: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'boxer' | 'ninja' | 'champion';
  color: string;
  facing: 'left' | 'right';
  state: 'idle' | 'attacking' | 'blocking';
  isHit: boolean;
  hitFrame: number;
  lastAttack: number;
  attackCooldown: number;
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
  enemy: Enemy | null;
  particles: Particle[];
  score: number;
  round: number;
  wins: number;
  maxCombo: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class FightingChampionGame {
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
      enemy: null,
      particles: [],
      score: 0,
      round: 1,
      wins: 0,
      maxCombo: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 120,
      y: ARENA_HEIGHT - 120,
      width: 35,
      height: 50,
      hp: 120,
      maxHp: 120,
      stamina: 100,
      maxStamina: 100,
      speed: 3.5,
      damage: 15,
      facing: 'right',
      isBlocking: false,
      isAttacking: false,
      attackType: null,
      attackFrame: 0,
      lastAttack: 0,
      comboCount: 0,
      comboTimer: 0,
    };
  }

  private createEnemy(round: number, type: 'boxer' | 'ninja' | 'champion'): Enemy {
    let hp: number, damage: number, color: string, cooldown: number;

    switch (type) {
      case 'champion':
        hp = 180 + round * 25; damage = 30; color = '#8e44ad'; cooldown = 1200;
        break;
      case 'ninja':
        hp = 100 + round * 18; damage = 22; color = '#34495e'; cooldown = 800;
        break;
      default:
        hp = 80 + round * 12; damage = 18; color = '#e67e22'; cooldown = 1000;
    }

    return {
      x: ARENA_WIDTH - 120,
      y: ARENA_HEIGHT - 120,
      width: 35,
      height: 50,
      hp, maxHp: hp, damage, type, color,
      facing: 'left',
      state: 'idle',
      isHit: false,
      hitFrame: 0,
      lastAttack: 0,
      attackCooldown: cooldown,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnEnemy();
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private spawnEnemy(): void {
    const round = this.state.round;
    let type: 'boxer' | 'ninja' | 'champion';

    if (round % 5 === 0) type = 'champion';
    else if (round % 3 === 0) type = 'ninja';
    else type = 'boxer';

    this.state.enemy = this.createEnemy(round, type);
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
    this.updateEnemy(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkRoundComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (!player.isAttacking && !player.isBlocking) {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        player.x -= moveSpeed;
        player.facing = 'left';
      }
      if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        player.x += moveSpeed;
        player.facing = 'right';
      }
    }

    player.x = Math.max(player.width, Math.min(ARENA_WIDTH - player.width, player.x));

    if (player.isBlocking) {
      player.stamina = Math.max(0, player.stamina - 0.3 * (dt / 16));
      if (player.stamina <= 0) player.isBlocking = false;
    } else {
      player.stamina = Math.min(player.maxStamina, player.stamina + 0.2 * (dt / 16));
    }

    if (player.isAttacking) {
      player.attackFrame++;
      const maxFrame = player.attackType === 'special' ? 20 : 12;
      if (player.attackFrame > maxFrame) {
        player.isAttacking = false;
        player.attackFrame = 0;
        player.attackType = null;
      }
    }

    if (player.comboTimer > 0) {
      player.comboTimer--;
      if (player.comboTimer === 0) player.comboCount = 0;
    }
  }

  private updateEnemy(dt: number): void {
    const { player, enemy } = this.state;
    if (!enemy) return;

    const now = performance.now();
    const dx = player.x - enemy.x;
    const distance = Math.abs(dx);

    // AI behavior
    if (enemy.state === 'idle') {
      if (distance > 80) {
        enemy.x += (dx > 0 ? 1 : -1) * (dt / 16);
        enemy.facing = dx > 0 ? 'right' : 'left';
      } else if (now - enemy.lastAttack > enemy.attackCooldown) {
        if (Math.random() < 0.3) {
          enemy.state = 'blocking';
          setTimeout(() => { if (enemy) enemy.state = 'idle'; }, 800);
        } else {
          enemy.state = 'attacking';
          enemy.lastAttack = now;
        }
      }
    }

    if (enemy.state === 'attacking') {
      if (distance < 60 && !player.isBlocking) {
        player.hp -= enemy.damage;
        this.spawnHitParticles(player.x, player.y, '#e74c3c');
        player.comboCount = 0;
      }
      setTimeout(() => { if (enemy) enemy.state = 'idle'; }, 400);
    }

    if (enemy.isHit) {
      enemy.hitFrame++;
      if (enemy.hitFrame > 8) { enemy.isHit = false; enemy.hitFrame = 0; }
    }
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
    const { player, enemy } = this.state;
    if (!enemy || !player.isAttacking) return;

    const hitFrame = player.attackType === 'special' ? [8, 14] : [4, 8];
    if (player.attackFrame < hitFrame[0] || player.attackFrame > hitFrame[1]) return;

    const dx = enemy.x - player.x;
    const distance = Math.abs(dx);
    const isInRange = distance < 65;
    const isFacingEnemy = (player.facing === 'right' && dx > 0) || (player.facing === 'left' && dx < 0);

    if (isInRange && isFacingEnemy) {
      if (enemy.state === 'blocking') {
        this.spawnHitParticles(enemy.x, enemy.y, '#95a5a6');
        return;
      }

      let damage = player.damage;
      if (player.attackType === 'kick') damage *= 1.5;
      if (player.attackType === 'special') damage *= 3;

      damage *= (1 + player.comboCount * 0.2);

      enemy.hp -= damage;
      enemy.isHit = true;
      enemy.hitFrame = 0;
      this.spawnHitParticles(enemy.x, enemy.y, '#f39c12');

      player.comboCount++;
      player.comboTimer = 90;
      if (player.comboCount > this.state.maxCombo) {
        this.state.maxCombo = player.comboCount;
      }

      this.state.score += Math.floor(damage) * player.comboCount;

      if (enemy.hp <= 0) {
        this.defeatEnemy();
      }
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

  private defeatEnemy(): void {
    if (!this.state.enemy) return;
    this.spawnDeathParticles(this.state.enemy.x, this.state.enemy.y);
    const bonusScore = this.state.enemy.type === 'champion' ? 1000 : this.state.enemy.type === 'ninja' ? 500 : 300;
    this.state.score += bonusScore * this.state.round;
    this.state.enemy = null;
    this.state.wins++;
  }

  private spawnDeathParticles(x: number, y: number): void {
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 4),
        vy: Math.sin(angle) * (3 + Math.random() * 4),
        life: 40,
        maxLife: 40,
        color: '#f39c12',
        size: 4 + Math.random() * 5,
      });
    }
  }

  private checkRoundComplete(): void {
    if (!this.state.enemy) {
      this.state.round++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 20);
      this.state.player.stamina = this.state.player.maxStamina;
      this.state.player.x = 120;
      this.state.player.comboCount = 0;
      this.spawnEnemy();
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.stopGameLoop();
    }
  }

  public punch(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();
    if (player.isAttacking || player.isBlocking || now - player.lastAttack < 300) return;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackType = 'punch';
    player.attackFrame = 0;
  }

  public kick(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();
    if (player.isAttacking || player.isBlocking || now - player.lastAttack < 400) return;
    if (player.stamina < 20) return;
    player.stamina -= 20;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackType = 'kick';
    player.attackFrame = 0;
  }

  public special(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();
    if (player.isAttacking || player.isBlocking || now - player.lastAttack < 600) return;
    if (player.stamina < 40) return;
    player.stamina -= 40;
    player.lastAttack = now;
    player.isAttacking = true;
    player.attackType = 'special';
    player.attackFrame = 0;
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.punch();
    if (code === 'KeyK') this.kick();
    if (code === 'KeyL') this.special();
    if (code === 'ShiftLeft' || code === 'KeyB') {
      if (this.state.player.stamina > 10) this.state.player.isBlocking = true;
    }
  }

  public handleKeyUp(code: string): void {
    this.keys.delete(code);
    if (code === 'ShiftLeft' || code === 'KeyB') {
      this.state.player.isBlocking = false;
    }
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
