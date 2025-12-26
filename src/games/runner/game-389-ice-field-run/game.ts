/**
 * Ice Field Run Game Logic
 * Game #389 - Ice Runner
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
  slideVelocity: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'iceberg' | 'seal' | 'crack' | 'snowDrift';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'fish' | 'warmth' | 'slide';
  lane: number;
  collected: boolean;
}

export interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  snowflakes: Snowflake[];
  score: number;
  distance: number;
  speed: number;
  fish: number;
  cold: number;
  hasWarmth: boolean;
  warmthTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 60;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class IceFieldRunGame {
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
      snowflakes: this.createSnowflakes(),
      score: 0,
      distance: 0,
      speed: 5,
      fish: 0,
      cold: 0,
      hasWarmth: false,
      warmthTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 40,
      height: 45,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      slideVelocity: 0,
    };
  }

  private createSnowflakes(): Snowflake[] {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 50; i++) {
      flakes.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 1.5 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    return flakes;
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
    this.updateSnowflakes(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateCold(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];

    // Slippery ice physics
    const diff = targetX - player.x;
    player.slideVelocity += diff * 0.01;
    player.slideVelocity *= 0.95;
    player.x += player.slideVelocity * (dt / 16);

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.85 * (dt / 16);
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

  private updateSnowflakes(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.snowflakes.forEach(flake => {
      flake.x -= speed * 0.4;
      flake.y += flake.speed * (dt / 16);
      flake.wobble += 0.03;
      flake.x += Math.sin(flake.wobble) * 0.3;

      if (flake.y > ARENA_HEIGHT) {
        flake.y = -10;
        flake.x = Math.random() * ARENA_WIDTH;
      }
      if (flake.x < 0) {
        flake.x = ARENA_WIDTH;
      }
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(650, 1350 - this.state.distance / 45);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['iceberg', 'seal', 'crack', 'snowDrift'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 50;
      if (type === 'seal') { width = 50; height = 30; }
      if (type === 'crack') { width = 45; height = 12; }
      if (type === 'snowDrift') { width = 55; height = 35; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y - height / 2 + 5,
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
      const types: Collectible['type'][] = ['fish', 'fish', 'fish', 'warmth', 'slide'];
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
      left: player.x - player.width / 2 + 10,
      right: player.x + player.width / 2 - 10,
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
      if (dist < 45 && player.y < col.y + 45) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'fish':
        this.state.fish++;
        this.state.score += 40;
        break;
      case 'warmth':
        this.state.hasWarmth = true;
        this.state.warmthTime = 4000;
        this.state.cold = Math.max(0, this.state.cold - 25);
        break;
      case 'slide':
        this.state.speed = Math.min(14, this.state.speed + 1);
        this.state.score += 60;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 450 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }
  }

  private updateCold(dt: number): void {
    if (this.state.hasWarmth) {
      this.state.warmthTime -= dt;
      if (this.state.warmthTime <= 0) {
        this.state.hasWarmth = false;
      }
    } else {
      this.state.cold += dt * 0.004;
      if (this.state.cold >= 100) {
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
