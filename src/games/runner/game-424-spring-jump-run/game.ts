/**
 * Spring Jump Run Game Logic
 * Game #424 - Spring Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isCharging: boolean;
  chargeTime: number;
  lane: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'block' | 'spike' | 'gap' | 'wall';
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'spring' | 'star';
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

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  coins: number;
  springs: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const GROUND_Y = ARENA_HEIGHT - 50;
const LANES = [ARENA_WIDTH * 0.25, ARENA_WIDTH * 0.5, ARENA_WIDTH * 0.75];

export class SpringJumpRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: { x: LANES[1], y: GROUND_Y - 25, width: 30, height: 50, vy: 0, isCharging: false, chargeTime: 0, lane: 1 },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      coins: 0,
      springs: 3,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
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
    this.spawnObjects(dt);
    this.checkCollisions();
    this.updateScore(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const speed = dt / 16;

    // Lane switching
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.15;

    // Charging
    if (player.isCharging && player.y >= GROUND_Y - 25) {
      player.chargeTime = Math.min(player.chargeTime + speed * 2, 100);
    }

    // Gravity and jumping
    player.vy += 0.6 * speed;
    player.y += player.vy * speed;

    if (player.y >= GROUND_Y - 25) {
      player.y = GROUND_Y - 25;
      player.vy = 0;
    }

    // Spring compression visual
    if (player.isCharging && player.y >= GROUND_Y - 25) {
      player.height = 50 - player.chargeTime * 0.2;
    } else {
      player.height = 50;
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
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed; p.y += p.vy * speed; p.vy += 0.2 * speed; p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnObjects(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1000) {
      this.spawnTimer = 0;

      const lane = Math.floor(Math.random() * 3);
      const types: ('block' | 'spike' | 'wall')[] = ['block', 'spike', 'wall'];
      const type = types[Math.floor(Math.random() * types.length)];
      let width = 40, height = 40;

      if (type === 'wall') { height = 80; }
      else if (type === 'spike') { height = 30; }

      this.state.obstacles.push({ x: ARENA_WIDTH + 50, y: GROUND_Y - height/2, width, height, type, lane } as any);

      if (Math.random() < 0.5) {
        const colTypes: ('coin' | 'spring' | 'star')[] = ['coin', 'coin', 'spring', 'star'];
        this.state.collectibles.push({
          x: ARENA_WIDTH + 100, y: GROUND_Y - 80 - Math.random() * 100,
          type: colTypes[Math.floor(Math.random() * colTypes.length)],
          collected: false,
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;

    for (const obs of obstacles) {
      const obsLane = (obs as any).lane;
      if (obsLane !== undefined && obsLane !== player.lane) continue;

      if (this.rectCollision(
        { x: player.x, y: player.y, width: player.width - 10, height: player.height - 10 },
        obs
      )) {
        this.gameOver();
        return;
      }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 40) {
        col.collected = true;
        if (col.type === 'coin') { this.state.coins++; this.state.score += 50; }
        else if (col.type === 'spring') { this.state.springs++; this.state.score += 100; }
        else { this.state.score += 200; }
        this.spawnSparkles(col.x, col.y);
      }
    }
  }

  private rectCollision(a: any, b: any): boolean {
    return a.x - a.width/2 < b.x + b.width/2 && a.x + a.width/2 > b.x - b.width/2 &&
           a.y - a.height/2 < b.y + b.height/2 && a.y + a.height/2 > b.y - b.height/2;
  }

  private spawnSparkles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 3,
        life: 20, maxLife: 20, color: '#27ae60', size: 3,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));
    if (this.state.distance % 500 < this.state.speed) this.state.speed = Math.min(12, this.state.speed + 0.1);
  }

  private gameOver(): void { this.state.phase = 'gameover'; this.stopGameLoop(); }

  public moveLeft(): void { if (this.state.player.lane > 0) this.state.player.lane--; }
  public moveRight(): void { if (this.state.player.lane < 2) this.state.player.lane++; }

  public chargeStart(): void {
    const { player } = this.state;
    if (player.y >= GROUND_Y - 30) {
      player.isCharging = true;
      player.chargeTime = 0;
    }
  }

  public chargeRelease(): void {
    const { player } = this.state;
    if (player.isCharging) {
      const jumpPower = 8 + (player.chargeTime / 100) * 12;
      player.vy = -jumpPower;
      player.isCharging = false;
      player.chargeTime = 0;

      // Jump particles
      for (let i = 0; i < 8; i++) {
        this.state.particles.push({
          x: player.x + (Math.random() - 0.5) * 20, y: player.y + 20,
          vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 2,
          life: 15, maxLife: 15, color: '#27ae60', size: 4,
        });
      }
    }
  }

  public handleKeyDown(code: string): void {
    if (code === 'ArrowLeft' || code === 'KeyA') this.moveLeft();
    if (code === 'ArrowRight' || code === 'KeyD') this.moveRight();
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.chargeStart();
  }

  public handleKeyUp(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.chargeRelease();
  }

  private stopGameLoop(): void { if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; } }
  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
