/**
 * Wingsuit Run Game Logic
 * Game #421 - Wingsuit Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isGliding: boolean;
  rotation: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cliff' | 'tree' | 'bird' | 'balloon';
}

export interface Collectible {
  x: number;
  y: number;
  type: 'ring' | 'star' | 'boost';
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
  rings: number;
  altitude: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class WingsuitRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private isGliding: boolean = false;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: { x: 100, y: 200, width: 50, height: 20, vy: 0, isGliding: false, rotation: 0 },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      rings: 0,
      altitude: 1000,
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
    const gravity = this.isGliding ? 0.15 : 0.4;
    const maxFall = this.isGliding ? 3 : 8;

    player.vy += gravity * (dt / 16);
    player.vy = Math.min(player.vy, maxFall);
    player.y += player.vy * (dt / 16);

    player.isGliding = this.isGliding;
    player.rotation = Math.min(45, Math.max(-30, player.vy * 5));

    // Boundaries
    if (player.y < 30) { player.y = 30; player.vy = 0; }
    if (player.y > ARENA_HEIGHT - 60) {
      this.gameOver();
      return;
    }

    // Wind trail
    if (Math.random() < 0.4) {
      this.state.particles.push({
        x: player.x - 20, y: player.y,
        vx: -3 - Math.random() * 2, vy: (Math.random() - 0.5) * 2,
        life: 15, maxLife: 15, color: 'rgba(255,255,255,0.5)', size: 2 + Math.random() * 2,
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
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnObjects(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1200) {
      this.spawnTimer = 0;

      // Spawn obstacle
      const types: ('cliff' | 'tree' | 'bird' | 'balloon')[] = ['cliff', 'tree', 'bird', 'balloon'];
      const type = types[Math.floor(Math.random() * types.length)];
      let width = 40, height = 60, y = 300;

      if (type === 'cliff') { width = 80; height = 150; y = ARENA_HEIGHT - 75; }
      else if (type === 'tree') { width = 50; height = 100; y = ARENA_HEIGHT - 100; }
      else if (type === 'bird') { width = 30; height = 20; y = 80 + Math.random() * 200; }
      else { width = 40; height = 50; y = 60 + Math.random() * 150; }

      this.state.obstacles.push({ x: ARENA_WIDTH + 50, y, width, height, type });

      // Spawn collectible
      if (Math.random() < 0.6) {
        const colTypes: ('ring' | 'star' | 'boost')[] = ['ring', 'ring', 'star', 'boost'];
        this.state.collectibles.push({
          x: ARENA_WIDTH + 100 + Math.random() * 100,
          y: 80 + Math.random() * 200,
          type: colTypes[Math.floor(Math.random() * colTypes.length)],
          collected: false,
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;

    for (const obs of obstacles) {
      if (this.rectCollision(player, obs)) {
        this.gameOver();
        return;
      }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 35) {
        col.collected = true;
        if (col.type === 'ring') { this.state.rings++; this.state.score += 50; }
        else if (col.type === 'star') { this.state.score += 100; }
        else { this.state.speed = Math.min(12, this.state.speed + 0.5); this.state.score += 75; }
        this.spawnSparkles(col.x, col.y);
      }
    }
  }

  private rectCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x - a.width/2 < b.x + b.width/2 && a.x + a.width/2 > b.x - b.width/2 &&
           a.y - a.height/2 < b.y + b.height/2 && a.y + a.height/2 > b.y - b.height/2;
  }

  private spawnSparkles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x, y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
        life: 20, maxLife: 20, color: '#ffd700', size: 3,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));
    this.state.altitude = Math.max(0, 1000 - Math.floor(this.state.distance / 10));
    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(12, this.state.speed + 0.1);
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
  }

  public glideStart(): void { this.isGliding = true; }
  public glideEnd(): void { this.isGliding = false; }
  public dive(): void { if (this.state.phase === 'playing') this.state.player.vy = 5; }

  public handleKeyDown(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.glideStart();
    if (code === 'ArrowDown' || code === 'KeyS') this.dive();
  }

  public handleKeyUp(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.glideEnd();
  }

  private stopGameLoop(): void { if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; } }
  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
