/**
 * Time Run Game Logic
 * Game #395 - Time Runner
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
  type: 'dinosaur' | 'knight' | 'robot' | 'portal';
  lane: number;
  era: Era;
  animation?: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'clock' | 'hourglass' | 'slowmo';
  lane: number;
  collected: boolean;
}

export interface TimeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  char: string;
  color: string;
}

export type Era = 'prehistoric' | 'medieval' | 'future' | 'present';

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: TimeParticle[];
  score: number;
  distance: number;
  speed: number;
  timeRemaining: number;
  era: Era;
  eraTimer: number;
  slowMotion: boolean;
  slowMotionTime: number;
  clocksCollected: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 65;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];
const ERAS: Era[] = ['prehistoric', 'medieval', 'present', 'future'];
const ERA_COLORS = {
  prehistoric: '#8B4513',
  medieval: '#4A4A4A',
  present: '#2E86AB',
  future: '#9400D3',
};

export class TimeRunGame {
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
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      timeRemaining: 60000,
      era: 'present',
      eraTimer: 0,
      slowMotion: false,
      slowMotionTime: 0,
      clocksCollected: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 30,
      height: 45,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
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
    const timeScale = this.state.slowMotion ? 0.3 : 1;
    const scaledDt = dt * timeScale;

    this.updateTime(dt);
    this.updateEra(scaledDt);
    this.updatePlayer(scaledDt);
    this.updateObstacles(scaledDt);
    this.updateCollectibles(scaledDt);
    this.updateParticles(scaledDt);
    this.spawnObstacles(scaledDt);
    this.spawnCollectibles(scaledDt);
    this.checkCollisions();
    this.updateScore(scaledDt);
    this.updateSlowMotion(dt);
  }

  private updateTime(dt: number): void {
    this.state.timeRemaining -= dt;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.gameOver();
    }
  }

  private updateEra(dt: number): void {
    this.state.eraTimer += dt;
    if (this.state.eraTimer >= 10000) {
      this.state.eraTimer = 0;
      const currentIndex = ERAS.indexOf(this.state.era);
      this.state.era = ERAS[(currentIndex + 1) % ERAS.length];
      // Era change particles
      for (let i = 0; i < 20; i++) {
        this.state.particles.push({
          x: Math.random() * ARENA_WIDTH,
          y: Math.random() * ARENA_HEIGHT,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 500,
          char: ['0', '1', ':', '-'][Math.floor(Math.random() * 4)],
          color: ERA_COLORS[this.state.era],
        });
      }
    }
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
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      if (obs.animation !== undefined) {
        obs.animation += 0.1;
      }
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) {
        col.x -= speed;
      }
      return col.x > -30 && !col.collected;
    });
  }

  private updateParticles(dt: number): void {
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      return p.life > 0;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(500, 1100 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);

      let type: Obstacle['type'];
      switch (this.state.era) {
        case 'prehistoric':
          type = 'dinosaur';
          break;
        case 'medieval':
          type = 'knight';
          break;
        case 'future':
          type = 'robot';
          break;
        default:
          type = Math.random() > 0.7 ? 'portal' : 'knight';
      }

      let width = 40, height = 45;
      if (type === 'dinosaur') { width = 50; height = 50; }
      if (type === 'knight') { width = 35; height = 50; }
      if (type === 'robot') { width = 40; height = 55; }
      if (type === 'portal') { width = 45; height = 60; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y - height / 2 + 5,
        width,
        height,
        type,
        lane,
        era: this.state.era,
        animation: 0,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 750) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['clock', 'clock', 'clock', 'hourglass', 'slowmo'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 45,
        type,
        lane,
        collected: false,
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

    for (const obs of obstacles) {
      if (obs.lane !== player.lane) continue;
      if (obs.type === 'portal') continue;

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
      if (col.collected) continue;
      const dist = Math.sqrt(Math.pow(col.x - player.x, 2) + Math.pow(col.y - player.y, 2));
      if (dist < 35) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'clock':
        this.state.timeRemaining += 5000;
        this.state.clocksCollected++;
        this.state.score += 30;
        break;
      case 'hourglass':
        this.state.timeRemaining += 10000;
        this.state.score += 75;
        break;
      case 'slowmo':
        this.state.slowMotion = true;
        this.state.slowMotionTime = 5000;
        this.state.score += 50;
        break;
    }
  }

  private updateSlowMotion(dt: number): void {
    if (this.state.slowMotion) {
      this.state.slowMotionTime -= dt;
      if (this.state.slowMotionTime <= 0) {
        this.state.slowMotion = false;
      }
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
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
