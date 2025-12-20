/**
 * Electric Run Game Logic
 * Game #427 - Electric Speed Runner
 *
 * A high-speed runner where player collects electricity
 * to boost speed and must avoid obstacles.
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
  charge: number;
  maxCharge: number;
  isCharged: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'electric_fence' | 'spark' | 'generator';
  lane: number;
  active?: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'bolt' | 'battery' | 'surge';
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

export interface LightningBolt {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  life: number;
  segments: { x: number; y: number }[];
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  lightningBolts: LightningBolt[];
  score: number;
  distance: number;
  speed: number;
  boltsCollected: number;
  isOvercharged: boolean;
  overchargeTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class ElectricRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private fenceToggleTimer: number = 0;

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
      lightningBolts: [],
      score: 0,
      distance: 0,
      speed: 5,
      boltsCollected: 0,
      isOvercharged: false,
      overchargeTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 40,
      height: 50,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      charge: 50,
      maxCharge: 100,
      isCharged: false,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.fenceToggleTimer = 0;
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
    this.updateLightning(dt);
    this.toggleElectricFences(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateCharge(dt);
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

    // Electric trail particles
    if (Math.random() < 0.5) {
      const chargeRatio = player.charge / player.maxCharge;
      this.state.particles.push({
        x: player.x - 15,
        y: player.y + Math.random() * 20 - 10,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 15,
        maxLife: 15,
        color: chargeRatio > 0.7 ? '#ffff00' : '#00ffff',
        size: 2 + Math.random() * 3,
      });
    }

    // Overcharge sparks
    if (this.state.isOvercharged && Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      this.state.particles.push({
        x: player.x + Math.cos(angle) * 25,
        y: player.y + Math.sin(angle) * 25,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 10,
        maxLife: 10,
        color: '#ffffff',
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
    const factor = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.life -= factor;
      return p.life > 0;
    });
  }

  private updateLightning(dt: number): void {
    this.state.lightningBolts = this.state.lightningBolts.filter(bolt => {
      bolt.life -= dt;
      return bolt.life > 0;
    });
  }

  private toggleElectricFences(dt: number): void {
    this.fenceToggleTimer += dt;
    if (this.fenceToggleTimer >= 1000) {
      this.fenceToggleTimer = 0;
      this.state.obstacles.forEach(obs => {
        if (obs.type === 'electric_fence') {
          obs.active = !obs.active;
        }
      });
    }
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(700, 1400 - this.state.distance / 60);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const rand = Math.random();

      if (rand < 0.35) {
        // Static obstacle
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 25,
          width: 40,
          height: 50,
          type: 'static',
          lane,
        });
      } else if (rand < 0.6) {
        // Electric fence (toggles on/off)
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 50,
          width: 20,
          height: 100,
          type: 'electric_fence',
          lane,
          active: true,
        });
      } else if (rand < 0.8) {
        // Spark (flying)
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 60 - Math.random() * 50,
          width: 30,
          height: 30,
          type: 'spark',
          lane,
        });
      } else {
        // Generator (dangerous)
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 35,
          width: 50,
          height: 70,
          type: 'generator',
          lane,
        });
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 800) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('bolt' | 'battery' | 'surge')[] = ['bolt', 'bolt', 'bolt', 'battery', 'surge'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 40 - Math.random() * 30,
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

    // Check obstacle collisions
    for (const obs of obstacles) {
      if (obs.lane !== player.lane) continue;
      if (obs.type === 'electric_fence' && !obs.active) continue;

      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {

        if (this.state.isOvercharged) {
          // Overcharged can destroy obstacles
          this.spawnExplosion(obs.x, obs.y, '#ffff00');
          this.createLightningBolt(player.x, player.y, obs.x, obs.y);
          obs.x = -100;
          this.state.score += 200;
        } else {
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
      case 'bolt':
        this.state.boltsCollected++;
        this.state.score += 30;
        this.state.player.charge = Math.min(this.state.player.maxCharge, this.state.player.charge + 10);
        break;
      case 'battery':
        this.state.player.charge = Math.min(this.state.player.maxCharge, this.state.player.charge + 30);
        this.state.score += 100;
        break;
      case 'surge':
        this.state.isOvercharged = true;
        this.state.overchargeTime = 5000;
        this.state.player.charge = this.state.player.maxCharge;
        this.state.score += 150;
        break;
    }
  }

  private updateScore(dt: number): void {
    const speedMultiplier = this.state.isOvercharged ? 1.5 : 1;
    this.state.distance += this.state.speed * speedMultiplier * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(15, this.state.speed + 0.1);
    }
  }

  private updateCharge(dt: number): void {
    // Charge slowly decreases
    if (!this.state.isOvercharged) {
      this.state.player.charge = Math.max(0, this.state.player.charge - 0.5 * (dt / 100));
      if (this.state.player.charge <= 0) {
        this.state.speed = Math.max(3, this.state.speed - 0.1);
      }
    }

    // Update overcharge
    if (this.state.isOvercharged) {
      this.state.overchargeTime -= dt;
      if (this.state.overchargeTime <= 0) {
        this.state.isOvercharged = false;
      }
    }
  }

  private createLightningBolt(x1: number, y1: number, x2: number, y2: number): void {
    const segments: { x: number; y: number }[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30 * (i > 0 && i < steps ? 1 : 0);
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30 * (i > 0 && i < steps ? 1 : 0);
      segments.push({ x, y });
    }
    this.state.lightningBolts.push({
      startX: x1, startY: y1, endX: x2, endY: y2,
      life: 200,
      segments,
    });
  }

  private spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 3),
        vy: Math.sin(angle) * (4 + Math.random() * 3),
        life: 25,
        maxLife: 25,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y, '#00ffff');
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
