/**
 * Flying Run Game Logic
 * Game #384 - Flying Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  rotation: number;
  isFlying: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cloud' | 'bird' | 'plane' | 'island';
  speed: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'feather' | 'wind' | 'ring';
  collected: boolean;
  rotation: number;
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
  altitude: number;
  speed: number;
  feathers: number;
  hasBoosted: boolean;
  boostTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const GRAVITY = 0.4;
const FLY_POWER = -8;
const MAX_VELOCITY = 12;
const MIN_ALTITUDE = 50;
const MAX_ALTITUDE = ARENA_HEIGHT - 50;

export class FlyingRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private keyPressed: Set<string> = new Set();

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
      altitude: 200,
      speed: 5,
      feathers: 0,
      hasBoosted: false,
      boostTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: 200,
      width: 45,
      height: 35,
      velocityY: 0,
      rotation: 0,
      isFlying: false,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.keyPressed.clear();
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
    this.updateBoost(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const speed = dt / 16;

    // Apply gravity and flying
    if (this.keyPressed.has('up') || player.isFlying) {
      player.velocityY = FLY_POWER;
      player.isFlying = true;
    } else {
      player.velocityY += GRAVITY * speed;
      player.isFlying = false;
    }

    // Limit velocity
    player.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, player.velocityY));

    // Update position
    player.y += player.velocityY * speed;

    // Boundary check
    if (player.y < MIN_ALTITUDE) {
      player.y = MIN_ALTITUDE;
      player.velocityY = 0;
    }
    if (player.y > MAX_ALTITUDE) {
      player.y = MAX_ALTITUDE;
      player.velocityY = 0;
    }

    // Update rotation based on velocity
    player.rotation = (player.velocityY / MAX_VELOCITY) * 0.3;

    // Update altitude display
    this.state.altitude = Math.max(0, ARENA_HEIGHT - player.y);

    // Wind trail particles
    if (Math.random() < 0.4) {
      this.state.particles.push({
        x: player.x - 20,
        y: player.y + (Math.random() - 0.5) * 10,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1,
        life: 20,
        maxLife: 20,
        color: player.isFlying ? '#87ceeb' : '#b0c4de',
        size: 3 + Math.random() * 2,
      });
    }

    // Jetpack particles when flying
    if (player.isFlying) {
      this.state.particles.push({
        x: player.x - 15,
        y: player.y + 10,
        vx: -4 - Math.random() * 3,
        vy: 2 + Math.random() * 2,
        life: 15,
        maxLife: 15,
        color: '#ffa500',
        size: 4 + Math.random() * 3,
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
      if (!col.collected) {
        col.x -= speed;
        col.rotation += 0.05;
      }
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
    const spawnInterval = Math.max(700, 1400 - this.state.distance / 60);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const types: ('cloud' | 'bird' | 'plane' | 'island')[] = ['cloud', 'cloud', 'bird', 'plane', 'island'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 50, height = 40;
      let y = MIN_ALTITUDE + Math.random() * (MAX_ALTITUDE - MIN_ALTITUDE - height);

      switch (type) {
        case 'cloud':
          width = 60 + Math.random() * 40;
          height = 40 + Math.random() * 20;
          break;
        case 'bird':
          width = 35;
          height = 25;
          y = MIN_ALTITUDE + Math.random() * 200;
          break;
        case 'plane':
          width = 70;
          height = 30;
          y = MIN_ALTITUDE + 50 + Math.random() * 100;
          break;
        case 'island':
          width = 80;
          height = 60;
          y = MAX_ALTITUDE - height;
          break;
      }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y,
        width,
        height,
        type,
        speed: 1 + Math.random() * 0.5,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1000) {
      this.collectibleTimer = 0;
      const types: ('feather' | 'wind' | 'ring')[] = ['feather', 'feather', 'feather', 'wind', 'ring'];
      const type = types[Math.floor(Math.random() * types.length)];
      const y = MIN_ALTITUDE + Math.random() * (MAX_ALTITUDE - MIN_ALTITUDE - 50);

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y,
        type,
        collected: false,
        rotation: 0,
      });
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
      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {
        if (this.state.hasBoosted) {
          this.state.hasBoosted = false;
          this.spawnExplosion(obs.x, obs.y);
          obs.x = -200; // Remove obstacle
        } else {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 35) {
        col.collected = true;
        this.collectItem(col.type, col.x, col.y);
      }
    }
  }

  private collectItem(type: string, x: number, y: number): void {
    switch (type) {
      case 'feather':
        this.state.feathers++;
        this.state.score += 50;
        this.spawnCollectParticles(x, y, '#fff8dc');
        break;
      case 'wind':
        this.state.score += 100;
        this.state.speed = Math.min(10, this.state.speed + 0.3);
        this.spawnCollectParticles(x, y, '#87ceeb');
        break;
      case 'ring':
        this.state.score += 200;
        this.state.hasBoosted = true;
        this.state.boostTime = 3000;
        this.spawnCollectParticles(x, y, '#ffd700');
        break;
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 20,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    // Gradually increase speed
    if (this.state.distance % 600 < this.state.speed) {
      this.state.speed = Math.min(12, this.state.speed + 0.08);
    }
  }

  private updateBoost(dt: number): void {
    if (this.state.hasBoosted) {
      this.state.boostTime -= dt;
      if (this.state.boostTime <= 0) {
        this.state.hasBoosted = false;
      }
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 4),
        vy: Math.sin(angle) * (4 + Math.random() * 4),
        life: 30,
        maxLife: 30,
        color: ['#ff6b35', '#ffa500', '#ffd700'][Math.floor(Math.random() * 3)],
        size: 4 + Math.random() * 5,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  public flyUp(): void {
    if (this.state.phase !== 'playing') return;
    this.keyPressed.add('up');
    this.state.player.isFlying = true;
  }

  public flyDown(): void {
    if (this.state.phase !== 'playing') return;
    this.keyPressed.delete('up');
    this.state.player.isFlying = false;
  }

  public boost(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.feathers >= 5) {
      this.state.feathers -= 5;
      this.state.hasBoosted = true;
      this.state.boostTime = 3000;
    }
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.flyUp();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.boost();
        break;
    }
  }

  public handleKeyUp(code: string): void {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.flyDown();
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
    this.keyPressed.clear();
  }

  private emitState(): void {
    if (this.onStateChange) this.onStateChange(this.state);
  }
}
