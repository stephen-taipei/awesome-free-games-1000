/**
 * Rainbow Run Game Logic
 * Game #390 - Color Runner
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
  color: string;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cloud' | 'star' | 'bird' | 'gap';
  lane: number;
  color: string;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'colorOrb' | 'sparkle' | 'rainbow';
  lane: number;
  collected: boolean;
  color: string;
}

export interface Sparkle {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  vx: number;
  vy: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  sparkles: Sparkle[];
  score: number;
  distance: number;
  speed: number;
  colors: number;
  currentColor: number;
  colorTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 70;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];
const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

export class RainbowRunGame {
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
      sparkles: [],
      score: 0,
      distance: 0,
      speed: 5,
      colors: 0,
      currentColor: 0,
      colorTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 35,
      height: 45,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      color: RAINBOW_COLORS[0],
    };
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
    this.updateSparkles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateColor(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.18;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.9 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    player.color = RAINBOW_COLORS[this.state.currentColor];
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      if (obs.type === 'bird') {
        obs.y += Math.sin(obs.x * 0.05) * 1.5;
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

  private updateSparkles(dt: number): void {
    this.state.sparkles = this.state.sparkles.filter(s => {
      s.x += s.vx * (dt / 16);
      s.y += s.vy * (dt / 16);
      s.vy += 0.1;
      s.life -= dt;
      return s.life > 0;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1300 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['cloud', 'star', 'bird', 'gap'];
      const type = types[Math.floor(Math.random() * types.length)];
      const color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];

      let width = 45, height = 35;
      if (type === 'star') { width = 40; height = 40; }
      if (type === 'bird') { width = 35; height = 25; }
      if (type === 'gap') { width = 50; height = 80; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: type === 'gap' ? GROUND_Y - 20 : GROUND_Y - height / 2,
        width,
        height,
        type,
        lane,
        color,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 900) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['colorOrb', 'colorOrb', 'sparkle', 'rainbow'];
      const type = types[Math.floor(Math.random() * types.length)];
      const color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 45,
        type,
        lane,
        collected: false,
        color,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 8,
      right: player.x + player.width / 2 - 8,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
    };

    for (const obs of obstacles) {
      if (obs.lane !== player.lane) continue;
      if (obs.type === 'gap') continue;

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
      if (dist < 45 && player.y < col.y + 50) {
        col.collected = true;
        this.collectItem(col);
      }
    }
  }

  private collectItem(col: Collectible): void {
    // Spawn sparkles
    for (let i = 0; i < 8; i++) {
      this.state.sparkles.push({
        x: col.x,
        y: col.y,
        size: Math.random() * 5 + 3,
        color: col.color,
        life: 500,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 2,
      });
    }

    switch (col.type) {
      case 'colorOrb':
        this.state.colors++;
        this.state.score += 50;
        break;
      case 'sparkle':
        this.state.score += 75;
        this.state.speed = Math.min(14, this.state.speed + 0.5);
        break;
      case 'rainbow':
        this.state.colors += 3;
        this.state.score += 150;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }
  }

  private updateColor(dt: number): void {
    this.state.colorTime += dt;
    if (this.state.colorTime >= 1000) {
      this.state.colorTime = 0;
      this.state.currentColor = (this.state.currentColor + 1) % RAINBOW_COLORS.length;
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
      this.state.player.jumpVelocity = -15;
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
