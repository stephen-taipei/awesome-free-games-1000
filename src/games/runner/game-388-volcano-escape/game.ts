/**
 * Volcano Escape Game Logic
 * Game #388 - Lava Runner
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
  type: 'lavaPool' | 'fallingRock' | 'fireball' | 'crack';
  lane: number;
  vy?: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'crystal' | 'shield' | 'speedBoost';
  lane: number;
  collected: boolean;
}

export interface LavaParticle {
  x: number;
  y: number;
  size: number;
  vy: number;
  life: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  lavaParticles: LavaParticle[];
  score: number;
  distance: number;
  speed: number;
  crystals: number;
  lavaLevel: number;
  hasShield: boolean;
  shieldTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 70;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class VolcanoEscapeGame {
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
      lavaParticles: [],
      score: 0,
      distance: 0,
      speed: 5,
      crystals: 0,
      lavaLevel: 0,
      hasShield: false,
      shieldTime: 0,
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
    this.updateLavaParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.spawnLavaParticles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateLavaLevel(dt);
    this.updateShield(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.18;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.95 * (dt / 16);
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
      if (obs.type === 'fallingRock' && obs.vy !== undefined) {
        obs.y += obs.vy * (dt / 16);
        obs.vy += 0.3;
      }
      if (obs.type === 'fireball') {
        obs.y += Math.sin(obs.x * 0.03) * 2;
      }
      return obs.x > -obs.width && obs.y < ARENA_HEIGHT + 50;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateLavaParticles(dt: number): void {
    this.state.lavaParticles = this.state.lavaParticles.filter(p => {
      p.y += p.vy * (dt / 16);
      p.vy += 0.1;
      p.life -= dt;
      return p.life > 0 && p.y < ARENA_HEIGHT;
    });
  }

  private spawnLavaParticles(dt: number): void {
    this.particleTimer += dt;
    if (this.particleTimer >= 100) {
      this.particleTimer = 0;
      for (let i = 0; i < 3; i++) {
        this.state.lavaParticles.push({
          x: Math.random() * ARENA_WIDTH,
          y: ARENA_HEIGHT + 10,
          size: Math.random() * 8 + 4,
          vy: -(Math.random() * 3 + 2),
          life: 1500,
        });
      }
    }
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(500, 1200 - this.state.distance / 40);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['lavaPool', 'fallingRock', 'fireball', 'crack'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 20, y = GROUND_Y, vy: number | undefined;

      switch (type) {
        case 'lavaPool':
          width = 50; height = 15; y = GROUND_Y + 10;
          break;
        case 'fallingRock':
          width = 35; height = 35; y = -50; vy = 2;
          break;
        case 'fireball':
          width = 25; height = 25; y = GROUND_Y - 50;
          break;
        case 'crack':
          width = 45; height = 10; y = GROUND_Y + 15;
          break;
      }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y,
        width,
        height,
        type,
        lane,
        vy,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1200) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['crystal', 'crystal', 'crystal', 'shield', 'speedBoost'];
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
      left: player.x - player.width / 2 + 8,
      right: player.x + player.width / 2 - 8,
      top: player.y - player.height / 2 + 8,
      bottom: player.y + player.height / 2 - 5,
    };

    for (const obs of obstacles) {
      if (obs.lane !== player.lane && obs.type !== 'fallingRock') continue;

      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (obs.type === 'fallingRock') {
        const dist = Math.sqrt(Math.pow(obs.x - player.x, 2) + Math.pow(obs.y - player.y, 2));
        if (dist < 35) {
          if (this.state.hasShield) {
            this.state.hasShield = false;
            obs.y = ARENA_HEIGHT + 100;
          } else {
            this.gameOver();
            return;
          }
        }
        continue;
      }

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {
        if (this.state.hasShield) {
          this.state.hasShield = false;
          obs.x = -100;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && player.y < col.y + 50) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'crystal':
        this.state.crystals++;
        this.state.score += 60;
        break;
      case 'shield':
        this.state.hasShield = true;
        this.state.shieldTime = 5000;
        break;
      case 'speedBoost':
        this.state.speed = Math.min(16, this.state.speed + 1.5);
        this.state.score += 80;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 80));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(16, this.state.speed + 0.15);
    }
  }

  private updateLavaLevel(dt: number): void {
    this.state.lavaLevel = Math.min(40, this.state.distance / 100);
  }

  private updateShield(dt: number): void {
    if (this.state.hasShield) {
      this.state.shieldTime -= dt;
      if (this.state.shieldTime <= 0) {
        this.state.hasShield = false;
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
