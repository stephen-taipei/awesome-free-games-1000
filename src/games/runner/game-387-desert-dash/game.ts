/**
 * Desert Dash Game Logic
 * Game #387 - Desert Runner
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
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cactus' | 'rock' | 'snake' | 'tumbleweed';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'gem' | 'water' | 'speed';
  lane: number;
  collected: boolean;
}

export interface SandParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  sandParticles: SandParticle[];
  score: number;
  distance: number;
  speed: number;
  gems: number;
  heat: number;
  hasWater: boolean;
  waterTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 60;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class DesertDashGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      obstacles: [],
      collectibles: [],
      sandParticles: this.createSandParticles(),
      score: 0,
      distance: 0,
      speed: 5,
      gems: 0,
      heat: 0,
      hasWater: false,
      waterTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 35,
      height: 50,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  private createSandParticles(): SandParticle[] {
    const particles: SandParticle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 3 + 2,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }
    return particles;
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
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
    this.updateSandParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateHeat(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.15;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.9 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      if (obs.type === 'tumbleweed') {
        obs.y += Math.sin(obs.x * 0.05) * 0.5;
      }
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

  private updateSandParticles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.sandParticles.forEach(p => {
      p.x -= p.speed * speed * 0.5;
      if (p.x < 0) {
        p.x = ARENA_WIDTH;
        p.y = Math.random() * ARENA_HEIGHT;
      }
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1300 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['cactus', 'rock', 'snake', 'tumbleweed'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 30, height = 50;
      if (type === 'rock') { width = 40; height = 30; }
      if (type === 'snake') { width = 45; height = 15; }
      if (type === 'tumbleweed') { width = 35; height = 35; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y - height / 2,
        width,
        height,
        type,
        lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1100) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['gem', 'gem', 'water', 'speed'];
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

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 8,
      right: player.x + player.width / 2 - 8,
      top: player.y - player.height / 2 + 8,
      bottom: player.y + player.height / 2 - 5,
    };

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
        this.gameOver();
        return;
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && player.y < col.y + 40) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'gem':
        this.state.gems++;
        this.state.score += 50;
        break;
      case 'water':
        this.state.hasWater = true;
        this.state.waterTime = 5000;
        this.state.heat = Math.max(0, this.state.heat - 30);
        break;
      case 'speed':
        this.state.speed = Math.min(15, this.state.speed + 1);
        this.state.score += 75;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(15, this.state.speed + 0.1);
    }
  }

  private updateHeat(dt: number): void {
    if (this.state.hasWater) {
      this.state.waterTime -= dt;
      if (this.state.waterTime <= 0) {
        this.state.hasWater = false;
      }
    } else {
      this.state.heat += dt * 0.005;
      if (this.state.heat >= 100) {
        this.gameOver();
      }
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
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
      this.state.player.jumpVelocity = -14;
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
