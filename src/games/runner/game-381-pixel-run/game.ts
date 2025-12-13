/**
 * Pixel Run Game Logic
 * Game #381 - Retro Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  jumpVelocity: number;
  groundY: number;
  animFrame: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'block' | 'spike' | 'gap' | 'mushroom';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'powerup' | 'oneup';
  lane: number;
  collected: boolean;
  animFrame: number;
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
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  coins: number;
  lives: number;
  hasPowerUp: boolean;
  powerUpTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class PixelRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private animationTimer: number = 0;

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
      coins: 0,
      lives: 3,
      hasPowerUp: false,
      powerUpTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 32,
      height: 32,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      animFrame: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.animationTimer = 0;
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
    this.checkCollisions();
    this.updateScore(dt);
    this.updatePowerUp(dt);
    this.updateAnimation(dt);
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

    // Pixel dust particles
    if (Math.random() < 0.2 && !player.isJumping) {
      this.state.particles.push({
        x: player.x - 16 + Math.random() * 8,
        y: player.y + 16,
        vx: -2 - Math.random() * 2,
        vy: -Math.random() * 2,
        life: 15,
        maxLife: 15,
        color: '#8b8b8b',
        size: 4,
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

  private updateAnimation(dt: number): void {
    this.animationTimer += dt;
    if (this.animationTimer >= 150) {
      this.animationTimer = 0;
      this.state.player.animFrame = (this.state.player.animFrame + 1) % 4;
      this.state.collectibles.forEach(col => {
        col.animFrame = (col.animFrame + 1) % 4;
      });
    }
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(700, 1400 - this.state.distance / 60);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('block' | 'spike' | 'gap' | 'mushroom')[] = ['block', 'spike', 'gap', 'mushroom'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 32, height = 32;
      let y = GROUND_Y;

      if (type === 'spike') {
        height = 24;
        y = GROUND_Y + 8;
      } else if (type === 'gap') {
        width = 64;
        height = 16;
        y = GROUND_Y + 24;
      } else if (type === 'mushroom') {
        width = 32;
        height = 40;
        y = GROUND_Y - 4;
      }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y,
        width,
        height,
        type,
        lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1000) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('coin' | 'powerup' | 'oneup')[] = ['coin', 'coin', 'coin', 'coin', 'powerup', 'oneup'];
      const type = types[Math.floor(Math.random() * types.length)];

      const yOffset = type === 'coin' ? -60 - Math.random() * 40 : -50;

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y + yOffset,
        type,
        lane,
        collected: false,
        animFrame: 0,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 4,
      right: player.x + player.width / 2 - 4,
      top: player.y - player.height / 2 + 4,
      bottom: player.y + player.height / 2 - 4,
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
        if (this.state.hasPowerUp) {
          this.state.hasPowerUp = false;
          this.spawnPixelExplosion(obs.x, obs.y, '#ff6b35');
          obs.x = -100;
        } else {
          this.loseLife();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.sqrt(Math.pow(col.x - player.x, 2) + Math.pow(col.y - player.y, 2));
      if (dist < 40) {
        col.collected = true;
        this.collectItem(col.type, col.x, col.y);
      }
    }
  }

  private collectItem(type: string, x: number, y: number): void {
    switch (type) {
      case 'coin':
        this.state.coins++;
        this.state.score += 100;
        this.spawnPixelExplosion(x, y, '#ffd700');
        break;
      case 'powerup':
        this.state.hasPowerUp = true;
        this.state.powerUpTime = 5000;
        this.state.score += 200;
        this.spawnPixelExplosion(x, y, '#00ff00');
        break;
      case 'oneup':
        this.state.lives = Math.min(9, this.state.lives + 1);
        this.state.score += 500;
        this.spawnPixelExplosion(x, y, '#ff69b4');
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    // Gradually increase speed
    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(12, this.state.speed + 0.1);
    }
  }

  private updatePowerUp(dt: number): void {
    if (this.state.hasPowerUp) {
      this.state.powerUpTime -= dt;
      if (this.state.powerUpTime <= 0) {
        this.state.hasPowerUp = false;
      }
    }
  }

  private spawnPixelExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 20,
        maxLife: 20,
        color,
        size: 6,
      });
    }
  }

  private loseLife(): void {
    this.state.lives--;
    if (this.state.lives <= 0) {
      this.gameOver();
    } else {
      this.spawnPixelExplosion(this.state.player.x, this.state.player.y, '#ff0000');
      // Brief invincibility
      this.state.hasPowerUp = true;
      this.state.powerUpTime = 1500;
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnPixelExplosion(this.state.player.x, this.state.player.y, '#ff0000');
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
      this.state.player.jumpVelocity = -16;
    }
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
