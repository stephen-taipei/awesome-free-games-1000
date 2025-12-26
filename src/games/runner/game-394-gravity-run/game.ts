/**
 * Gravity Run Game Logic
 * Game #394 - Gravity Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  velocityY: number;
  gravityDirection: 1 | -1;
  groundY: number;
  ceilingY: number;
  isFlipping: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'laser' | 'block' | 'portal';
  lane: number;
  position: 'floor' | 'ceiling' | 'both';
  color: string;
  active?: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'orb' | 'antigrav' | 'shield';
  lane: number;
  collected: boolean;
  yOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
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
  orbs: number;
  flips: number;
  hasShield: boolean;
  shieldTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 65;
const CEILING_Y = 65;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];
const GRAVITY_COLORS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];

export class GravityRunGame {
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
      orbs: 0,
      flips: 0,
      hasShield: false,
      shieldTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 30,
      height: 40,
      velocityY: 0,
      gravityDirection: 1,
      groundY: GROUND_Y,
      ceilingY: CEILING_Y,
      isFlipping: false,
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
    this.updateParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateShield(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.18;

    // Apply gravity
    const gravity = 0.8 * player.gravityDirection;
    player.velocityY += gravity * (dt / 16);
    player.y += player.velocityY * (dt / 16);

    // Check ground/ceiling collision
    if (player.gravityDirection === 1) {
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.velocityY = 0;
        player.isFlipping = false;
      }
    } else {
      if (player.y <= player.ceilingY) {
        player.y = player.ceilingY;
        player.velocityY = 0;
        player.isFlipping = false;
      }
    }

    // Emit gravity particles when flipping
    if (player.isFlipping && Math.random() < 0.3) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 20,
        y: player.y,
        vx: (Math.random() - 0.5) * 2,
        vy: -player.gravityDirection * Math.random() * 3,
        life: 300,
        color: GRAVITY_COLORS[Math.floor(Math.random() * GRAVITY_COLORS.length)],
        size: 3 + Math.random() * 3,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      // Laser toggle
      if (obs.type === 'laser') {
        obs.active = Math.sin(Date.now() * 0.005) > 0;
      }
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) {
        col.x -= speed;
        col.yOffset = Math.sin(Date.now() * 0.008 + col.x * 0.01) * 8;
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
      const types: Obstacle['type'][] = ['spike', 'laser', 'block', 'portal'];
      const type = types[Math.floor(Math.random() * types.length)];
      const positions: Obstacle['position'][] = ['floor', 'ceiling', 'both'];
      const position = type === 'portal' ? 'both' : positions[Math.floor(Math.random() * 2)];

      let width = 35, height = 35;
      if (type === 'spike') { width = 30; height = 40; }
      if (type === 'laser') { width = 10; height = position === 'both' ? GROUND_Y - CEILING_Y : 80; }
      if (type === 'block') { width = 40; height = 40; }
      if (type === 'portal') { width = 50; height = GROUND_Y - CEILING_Y; }

      const y = position === 'floor' ? GROUND_Y - height / 2 :
                position === 'ceiling' ? CEILING_Y + height / 2 :
                (GROUND_Y + CEILING_Y) / 2;

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y,
        width,
        height,
        type,
        lane,
        position,
        color: GRAVITY_COLORS[Math.floor(Math.random() * GRAVITY_COLORS.length)],
        active: type === 'laser' ? true : undefined,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 800) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['orb', 'orb', 'orb', 'antigrav', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      const yPos = Math.random() > 0.5 ? GROUND_Y - 50 : CEILING_Y + 50;

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: yPos,
        type,
        lane,
        collected: false,
        yOffset: 0,
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
      if (obs.type === 'laser' && !obs.active) continue;
      if (obs.type === 'portal') continue;

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
          // Create shield break particles
          for (let i = 0; i < 10; i++) {
            this.state.particles.push({
              x: player.x,
              y: player.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 400,
              color: '#00FFFF',
              size: 4,
            });
          }
        } else {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.sqrt(Math.pow(col.x - player.x, 2) + Math.pow((col.y + col.yOffset) - player.y, 2));
      if (dist < 35) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'orb':
        this.state.orbs++;
        this.state.score += 30;
        break;
      case 'antigrav':
        // Auto flip gravity
        this.flipGravity();
        this.state.score += 50;
        break;
      case 'shield':
        this.state.hasShield = true;
        this.state.shieldTime = 8000;
        this.state.score += 75;
        break;
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

  public flipGravity(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    player.gravityDirection = player.gravityDirection === 1 ? -1 : 1;
    player.velocityY = player.gravityDirection * -8;
    player.isFlipping = true;
    this.state.flips++;
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
      case 'ArrowDown':
      case 'KeyW':
      case 'KeyS':
      case 'Space':
        this.flipGravity();
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
