/**
 * Rocket Boot Run Game Logic
 * Game #423 - Rocket Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  fuel: number;
  maxFuel: number;
  isBoosting: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'platform' | 'spike' | 'laser' | 'drone';
}

export interface Collectible {
  x: number;
  y: number;
  type: 'fuel' | 'coin' | 'star';
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
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const GROUND_Y = ARENA_HEIGHT - 50;

export class RocketBootRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private isBoosting: boolean = false;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: { x: 80, y: GROUND_Y - 25, width: 30, height: 50, vy: 0, fuel: 100, maxFuel: 100, isBoosting: false },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      coins: 0,
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

    player.isBoosting = this.isBoosting && player.fuel > 0;

    if (player.isBoosting) {
      player.vy -= 0.8 * speed;
      player.fuel -= 0.5 * speed;
      // Rocket particles
      for (let i = 0; i < 2; i++) {
        this.state.particles.push({
          x: player.x - 5 + Math.random() * 10, y: player.y + 25,
          vx: (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 2,
          life: 15, maxLife: 15, color: Math.random() < 0.5 ? '#ff6b35' : '#ffd700', size: 3 + Math.random() * 3,
        });
      }
    }

    player.vy += 0.5 * speed; // Gravity
    player.vy = Math.max(-10, Math.min(10, player.vy));
    player.y += player.vy * speed;

    // Regenerate fuel on ground
    if (player.y >= GROUND_Y - 25) {
      player.y = GROUND_Y - 25;
      player.vy = 0;
      player.fuel = Math.min(player.maxFuel, player.fuel + 0.3 * speed);
    }

    if (player.y < 20) { player.y = 20; player.vy = 0; }
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
      p.x += p.vx * speed; p.y += p.vy * speed; p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnObjects(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1200) {
      this.spawnTimer = 0;

      const types: ('platform' | 'spike' | 'laser' | 'drone')[] = ['spike', 'spike', 'laser', 'drone', 'platform'];
      const type = types[Math.floor(Math.random() * types.length)];
      let width = 40, height = 40, y = GROUND_Y - 20;

      if (type === 'spike') { width = 30; height = 30; y = GROUND_Y - 15; }
      else if (type === 'laser') { width = 20; height = 80; y = GROUND_Y - 60; }
      else if (type === 'drone') { width = 35; height = 25; y = 80 + Math.random() * 150; }
      else { width = 80; height = 20; y = 150 + Math.random() * 100; }

      this.state.obstacles.push({ x: ARENA_WIDTH + 50, y, width, height, type });

      if (Math.random() < 0.6) {
        const colTypes: ('fuel' | 'coin' | 'star')[] = ['fuel', 'coin', 'coin', 'star'];
        this.state.collectibles.push({
          x: ARENA_WIDTH + 100 + Math.random() * 80, y: 60 + Math.random() * 200,
          type: colTypes[Math.floor(Math.random() * colTypes.length)],
          collected: false,
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;

    for (const obs of obstacles) {
      if (obs.type === 'platform') continue;
      if (this.rectCollision(player, obs)) { this.gameOver(); return; }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 35) {
        col.collected = true;
        if (col.type === 'fuel') { player.fuel = Math.min(player.maxFuel, player.fuel + 30); this.state.score += 25; }
        else if (col.type === 'coin') { this.state.coins++; this.state.score += 50; }
        else { this.state.score += 150; }
      }
    }
  }

  private rectCollision(a: any, b: any): boolean {
    return a.x - a.width/2 < b.x + b.width/2 && a.x + a.width/2 > b.x - b.width/2 &&
           a.y - a.height/2 < b.y + b.height/2 && a.y + a.height/2 > b.y - b.height/2;
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));
    if (this.state.distance % 500 < this.state.speed) this.state.speed = Math.min(12, this.state.speed + 0.1);
  }

  private gameOver(): void { this.state.phase = 'gameover'; this.stopGameLoop(); }

  public boostStart(): void { this.isBoosting = true; }
  public boostEnd(): void { this.isBoosting = false; }

  public handleKeyDown(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.boostStart();
  }
  public handleKeyUp(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.boostEnd();
  }

  private stopGameLoop(): void { if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; } }
  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
