/**
 * Lightning Sprint Game Logic
 * Game #428 - Lightning Speed Runner
 *
 * A super-fast runner where lightning strikes create obstacles
 * and the player must dash through at lightning speed.
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isDashing: boolean;
  jumpVelocity: number;
  groundY: number;
  dashCooldown: number;
  invincible: boolean;
  invincibleTime: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'thunder_cloud' | 'lightning_strike' | 'static_charge' | 'storm_debris';
  lane: number;
  strikeTimer?: number;
  striking?: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'lightning_orb' | 'speed_boost' | 'thunder_shield';
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

export interface LightningStrike {
  x: number;
  startY: number;
  endY: number;
  life: number;
  segments: number[];
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  lightningStrikes: LightningStrike[];
  score: number;
  distance: number;
  speed: number;
  orbs: number;
  stormIntensity: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class LightningSprintGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private lightningTimer: number = 0;

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
      lightningStrikes: [],
      score: 0,
      distance: 0,
      speed: 6,
      orbs: 0,
      stormIntensity: 1,
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
      isDashing: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      dashCooldown: 0,
      invincible: false,
      invincibleTime: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.lightningTimer = 0;
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
    this.updateLightningStrikes(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.spawnRandomLightning(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateStormIntensity();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const factor = dt / 16;
    const targetX = LANES[player.lane];

    // Smooth lane transition (faster when dashing)
    const transitionSpeed = player.isDashing ? 0.4 : 0.2;
    player.x += (targetX - player.x) * transitionSpeed;

    // Jump physics
    if (player.isJumping) {
      player.y += player.jumpVelocity * factor;
      player.jumpVelocity += 0.9 * factor;
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Dash cooldown
    if (player.dashCooldown > 0) {
      player.dashCooldown -= dt;
    }

    // Update dash state
    if (player.isDashing) {
      // Dash particles
      for (let i = 0; i < 3; i++) {
        this.state.particles.push({
          x: player.x - 20,
          y: player.y + (Math.random() - 0.5) * 30,
          vx: -8 - Math.random() * 4,
          vy: (Math.random() - 0.5) * 2,
          life: 10,
          maxLife: 10,
          color: '#ffff00',
          size: 4 + Math.random() * 3,
        });
      }
    }

    // Invincibility
    if (player.invincible) {
      player.invincibleTime -= dt;
      if (player.invincibleTime <= 0) {
        player.invincible = false;
      }
    }

    // Trail particles
    if (Math.random() < 0.4) {
      this.state.particles.push({
        x: player.x - 15,
        y: player.y + 10,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 12,
        maxLife: 12,
        color: '#8888ff',
        size: 2 + Math.random() * 2,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;

      // Thunder cloud logic
      if (obs.type === 'thunder_cloud' && obs.strikeTimer !== undefined) {
        obs.strikeTimer -= dt;
        if (obs.strikeTimer <= 0 && !obs.striking) {
          obs.striking = true;
          // Create lightning strike
          this.createLightningStrike(obs.x, obs.y + 30, GROUND_Y + 20);
        }
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

  private updateParticles(dt: number): void {
    const factor = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.life -= factor;
      return p.life > 0;
    });
  }

  private updateLightningStrikes(dt: number): void {
    this.state.lightningStrikes = this.state.lightningStrikes.filter(strike => {
      strike.life -= dt;
      return strike.life > 0;
    });
  }

  private createLightningStrike(x: number, startY: number, endY: number): void {
    const segments: number[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      segments.push((Math.random() - 0.5) * 40);
    }
    this.state.lightningStrikes.push({
      x,
      startY,
      endY,
      life: 300,
      segments,
    });
  }

  private spawnRandomLightning(dt: number): void {
    this.lightningTimer += dt;
    const interval = Math.max(1500, 3000 - this.state.stormIntensity * 200);

    if (this.lightningTimer >= interval) {
      this.lightningTimer = 0;
      // Random lightning in background
      const x = Math.random() * ARENA_WIDTH;
      this.createLightningStrike(x, 0, GROUND_Y + 20);
    }
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1200 - this.state.distance / 70);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const rand = Math.random();

      if (rand < 0.3) {
        // Thunder cloud (will strike)
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: 60,
          width: 60,
          height: 40,
          type: 'thunder_cloud',
          lane,
          strikeTimer: 800 + Math.random() * 400,
          striking: false,
        });
      } else if (rand < 0.55) {
        // Static charge (ground obstacle)
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 20,
          width: 35,
          height: 40,
          type: 'static_charge',
          lane,
        });
      } else if (rand < 0.8) {
        // Lightning strike zone
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 50,
          width: 40,
          height: 100,
          type: 'lightning_strike',
          lane,
        });
      } else {
        // Storm debris
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 30 - Math.random() * 40,
          width: 30,
          height: 30,
          type: 'storm_debris',
          lane,
        });
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 900) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('lightning_orb' | 'speed_boost' | 'thunder_shield')[] =
        ['lightning_orb', 'lightning_orb', 'lightning_orb', 'speed_boost', 'thunder_shield'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 50,
        type,
        lane,
        collected: false,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles, lightningStrikes } = this.state;

    if (player.invincible) {
      // Skip obstacle collision when invincible
    } else {
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

          if (player.isDashing && obs.type !== 'lightning_strike') {
            // Dash through destroyable obstacles
            this.spawnExplosion(obs.x, obs.y);
            obs.x = -100;
            this.state.score += 150;
          } else {
            this.gameOver();
            return;
          }
        }
      }

      // Check lightning strike collisions
      for (const strike of lightningStrikes) {
        if (Math.abs(strike.x - player.x) < 30 && strike.life > 100) {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && Math.abs(col.y - player.y) < 50) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'lightning_orb':
        this.state.orbs++;
        this.state.score += 40;
        break;
      case 'speed_boost':
        this.state.speed = Math.min(18, this.state.speed + 1);
        this.state.score += 100;
        break;
      case 'thunder_shield':
        this.state.player.invincible = true;
        this.state.player.invincibleTime = 5000;
        this.state.score += 150;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 80));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(18, this.state.speed + 0.15);
    }
  }

  private updateStormIntensity(): void {
    this.state.stormIntensity = Math.min(10, 1 + Math.floor(this.state.distance / 1000));
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 3),
        vy: Math.sin(angle) * (4 + Math.random() * 3),
        life: 20,
        maxLife: 20,
        color: '#ffff88',
        size: 4 + Math.random() * 4,
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

  public dash(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.dashCooldown <= 0) {
      this.state.player.isDashing = true;
      this.state.player.dashCooldown = 2000;
      setTimeout(() => {
        this.state.player.isDashing = false;
      }, 500);
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
        this.dash();
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
