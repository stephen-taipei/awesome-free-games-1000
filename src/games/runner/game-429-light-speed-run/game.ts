/**
 * Light Speed Run Game Logic
 * Game #429 - Light Speed Runner
 *
 * An ultra-fast runner with light-speed effects,
 * warping through space at incredible speeds.
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
  warpCharge: number;
  maxWarpCharge: number;
  isWarping: boolean;
  warpTime: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'asteroid' | 'wormhole' | 'dark_matter' | 'photon_barrier';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'light_crystal' | 'photon_boost' | 'warp_fuel';
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
}

export interface StarStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  brightness: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  starStreaks: StarStreak[];
  score: number;
  distance: number;
  speed: number;
  crystals: number;
  lightYear: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 70;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class LightSpeedRunGame {
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
      starStreaks: this.createStarStreaks(),
      score: 0,
      distance: 0,
      speed: 7,
      crystals: 0,
      lightYear: 0,
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
      warpCharge: 50,
      maxWarpCharge: 100,
      isWarping: false,
      warpTime: 0,
    };
  }

  private createStarStreaks(): StarStreak[] {
    const streaks: StarStreak[] = [];
    for (let i = 0; i < 40; i++) {
      streaks.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        length: 20 + Math.random() * 60,
        speed: 5 + Math.random() * 10,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
    return streaks;
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
    this.updateParticles(dt);
    this.updateStarStreaks(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateWarp(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const factor = dt / 16;
    const targetX = LANES[player.lane];

    // Ultra-smooth lane transition
    const transitionSpeed = player.isWarping ? 0.5 : 0.25;
    player.x += (targetX - player.x) * transitionSpeed;

    // Jump physics
    if (player.isJumping) {
      player.y += player.jumpVelocity * factor;
      player.jumpVelocity += 0.85 * factor;
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Light trail particles
    const trailIntensity = player.isWarping ? 0.8 : 0.4;
    if (Math.random() < trailIntensity) {
      const colors = player.isWarping ?
        ['#ffffff', '#ffff88', '#88ffff'] :
        ['#8888ff', '#aa88ff', '#88aaff'];
      this.state.particles.push({
        x: player.x - 20,
        y: player.y + (Math.random() - 0.5) * 20,
        vx: player.isWarping ? -12 : -5,
        vy: (Math.random() - 0.5) * 2,
        life: player.isWarping ? 20 : 12,
        maxLife: player.isWarping ? 20 : 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: player.isWarping ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speedMultiplier = this.state.player.isWarping ? 1.8 : 1;
    const speed = this.state.speed * speedMultiplier * (dt / 16);

    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speedMultiplier = this.state.player.isWarping ? 1.8 : 1;
    const speed = this.state.speed * speedMultiplier * (dt / 16);

    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateParticles(dt: number): void {
    const factor = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.life -= factor;
      return p.life > 0;
    });
  }

  private updateStarStreaks(dt: number): void {
    const speedMultiplier = this.state.player.isWarping ? 3 : 1;
    const factor = dt / 16 * speedMultiplier;

    this.state.starStreaks.forEach(streak => {
      streak.x -= streak.speed * factor;
      if (streak.x < -streak.length) {
        streak.x = ARENA_WIDTH + streak.length;
        streak.y = Math.random() * ARENA_HEIGHT;
      }
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(500, 1100 - this.state.distance / 80);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const rand = Math.random();

      if (rand < 0.35) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 25,
          width: 40,
          height: 50,
          type: 'asteroid',
          lane,
        });
      } else if (rand < 0.55) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 40,
          width: 50,
          height: 80,
          type: 'wormhole',
          lane,
        });
      } else if (rand < 0.75) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 30,
          width: 45,
          height: 45,
          type: 'dark_matter',
          lane,
        });
      } else {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 60,
          width: 20,
          height: 120,
          type: 'photon_barrier',
          lane,
        });
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 700) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('light_crystal' | 'photon_boost' | 'warp_fuel')[] =
        ['light_crystal', 'light_crystal', 'light_crystal', 'photon_boost', 'warp_fuel'];
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

    // Check obstacle collisions (warping makes you invincible)
    if (!player.isWarping) {
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
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 45 && Math.abs(col.y - player.y) < 50) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'light_crystal':
        this.state.crystals++;
        this.state.score += 50;
        this.state.player.warpCharge = Math.min(
          this.state.player.maxWarpCharge,
          this.state.player.warpCharge + 5
        );
        break;
      case 'photon_boost':
        this.state.speed = Math.min(20, this.state.speed + 1.5);
        this.state.score += 150;
        break;
      case 'warp_fuel':
        this.state.player.warpCharge = Math.min(
          this.state.player.maxWarpCharge,
          this.state.player.warpCharge + 30
        );
        this.state.score += 100;
        break;
    }
  }

  private updateScore(dt: number): void {
    const speedMultiplier = this.state.player.isWarping ? 2 : 1;
    this.state.distance += this.state.speed * speedMultiplier * (dt / 16);
    this.state.score += Math.floor(this.state.speed * speedMultiplier * (dt / 70));

    // Calculate light years (for display)
    this.state.lightYear = Math.floor(this.state.distance / 1000);

    if (this.state.distance % 350 < this.state.speed) {
      this.state.speed = Math.min(20, this.state.speed + 0.12);
    }
  }

  private updateWarp(dt: number): void {
    const { player } = this.state;

    if (player.isWarping) {
      player.warpTime -= dt;
      player.warpCharge = Math.max(0, player.warpCharge - 0.8 * (dt / 16));

      if (player.warpTime <= 0 || player.warpCharge <= 0) {
        player.isWarping = false;
      }
    } else {
      // Slowly regenerate warp charge
      player.warpCharge = Math.min(player.maxWarpCharge, player.warpCharge + 0.1 * (dt / 16));
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (5 + Math.random() * 4),
        vy: Math.sin(angle) * (5 + Math.random() * 4),
        life: 25,
        maxLife: 25,
        color: ['#ffffff', '#88ffff', '#ffff88'][Math.floor(Math.random() * 3)],
        size: 4 + Math.random() * 5,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
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

  public warp(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.warpCharge >= 20 && !this.state.player.isWarping) {
      this.state.player.isWarping = true;
      this.state.player.warpTime = 3000;

      // Warp activation particles
      for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        this.state.particles.push({
          x: this.state.player.x,
          y: this.state.player.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          life: 15,
          maxLife: 15,
          color: '#ffffff',
          size: 6,
        });
      }
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
      case 'ArrowDown':
      case 'KeyS':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.warp();
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
