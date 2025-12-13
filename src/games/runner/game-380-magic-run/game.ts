/**
 * Magic Run Game Logic
 * Game #380 - Fantasy Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isCasting: boolean;
  jumpVelocity: number;
  groundY: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'darkspell' | 'creature' | 'barrier' | 'curse';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'mana' | 'spellbook' | 'potion';
  lane: number;
  collected: boolean;
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
  type?: 'star' | 'sparkle' | 'magic';
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  mana: number;
  hasShield: boolean;
  shieldTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class MagicRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private particleTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      mana: 100,
      hasShield: false,
      shieldTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 40,
      height: 55,
      isJumping: false,
      isCasting: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.particleTimer = 0;
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
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
    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.spawnMagicParticles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateShield(dt);
    this.updateMana(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.2;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.8 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Magic trail particles
    if (Math.random() < 0.3) {
      this.state.particles.push({
        x: player.x,
        y: player.y + player.height / 2,
        vx: -2 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 20,
        maxLife: 20,
        color: '#9b59b6',
        size: 3 + Math.random() * 3,
        type: 'magic',
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
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

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(800, 1500 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('darkspell' | 'creature' | 'barrier' | 'curse')[] = ['darkspell', 'creature', 'barrier', 'curse'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 40;
      if (type === 'barrier') { width = 60; height = 70; }
      if (type === 'creature') { width = 50; height = 50; }
      if (type === 'curse') { width = 45; height = 35; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: type === 'curse' ? GROUND_Y - 30 : GROUND_Y - height / 2,
        width,
        height,
        type,
        lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1200) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('mana' | 'spellbook' | 'potion')[] = ['mana', 'mana', 'mana', 'spellbook', 'potion'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 40,
        type,
        lane,
        collected: false,
      });
    }
  }

  private spawnMagicParticles(dt: number): void {
    this.particleTimer += dt;
    if (this.particleTimer >= 100) {
      this.particleTimer = 0;
      // Ambient sparkles
      if (Math.random() < 0.3) {
        this.state.particles.push({
          x: ARENA_WIDTH + 20,
          y: Math.random() * (GROUND_Y - 50),
          vx: -1 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 1,
          life: 40 + Math.random() * 20,
          maxLife: 60,
          color: ['#9b59b6', '#3498db', '#e74c3c', '#f39c12'][Math.floor(Math.random() * 4)],
          size: 2 + Math.random() * 2,
          type: 'sparkle',
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 5,
      right: player.x + player.width / 2 - 5,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
    };

    // Check obstacle collisions
    for (const obs of obstacles) {
      if (obs.lane !== player.lane) continue;
      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {
        if (this.state.hasShield) {
          this.state.hasShield = false;
          this.spawnExplosion(obs.x, obs.y, '#9b59b6');
          obs.x = -100;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && player.y < col.y + 30) {
        col.collected = true;
        this.collectItem(col.type);
        this.spawnCollectEffect(col.x, col.y);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'mana':
        this.state.mana = Math.min(100, this.state.mana + 20);
        this.state.score += 50;
        break;
      case 'spellbook':
        this.state.score += 100;
        this.state.speed = Math.min(12, this.state.speed + 0.5);
        break;
      case 'potion':
        this.state.hasShield = true;
        this.state.shieldTime = 5000;
        this.state.mana = Math.min(100, this.state.mana + 10);
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    // Gradually increase speed
    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(15, this.state.speed + 0.1);
    }
  }

  private updateShield(dt: number): void {
    if (this.state.hasShield) {
      this.state.shieldTime -= dt;
      if (this.state.shieldTime <= 0) {
        this.state.hasShield = false;
      }
    }
  }

  private updateMana(dt: number): void {
    // Slowly regenerate mana
    if (this.state.mana < 100) {
      this.state.mana = Math.min(100, this.state.mana + 0.05 * (dt / 16));
    }
  }

  private spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 3),
        vy: Math.sin(angle) * (3 + Math.random() * 3),
        life: 30,
        maxLife: 30,
        color,
        size: 4 + Math.random() * 4,
        type: 'star',
      });
    }
  }

  private spawnCollectEffect(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 20,
        maxLife: 20,
        color: '#f39c12',
        size: 3,
        type: 'sparkle',
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y, '#e74c3c');
  }

  public moveLeft(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  public moveRight(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
    }
  }

  public jump(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isJumping) {
      this.state.player.isJumping = true;
      this.state.player.jumpVelocity = -15;
    }
  }

  public castSpell(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.mana < 30) return;

    this.state.player.isCasting = true;
    this.state.mana -= 30;

    // Clear obstacles in front of player
    const { player } = this.state;
    this.state.obstacles = this.state.obstacles.filter(obs => {
      if (obs.lane === player.lane && obs.x > player.x && obs.x < player.x + 150) {
        this.spawnExplosion(obs.x, obs.y, '#3498db');
        this.state.score += 25;
        return false;
      }
      return true;
    });

    // Spell cast particles
    for (let i = 0; i < 20; i++) {
      this.state.particles.push({
        x: player.x + 20,
        y: player.y,
        vx: 5 + Math.random() * 5,
        vy: (Math.random() - 0.5) * 8,
        life: 25,
        maxLife: 25,
        color: '#3498db',
        size: 4 + Math.random() * 3,
        type: 'star',
      });
    }

    setTimeout(() => {
      this.state.player.isCasting = false;
    }, 300);
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.jump();
        break;
      case 'KeyE':
      case 'KeyQ':
        this.castSpell();
        break;
    }
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
  }

  private emitState(): void {
    if (this.onStateChange) this.onStateChange(this.state);
  }
}
