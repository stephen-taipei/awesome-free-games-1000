/**
 * Paraglide Run Game Logic
 * Game #422 - Paraglide Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  rotation: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cloud' | 'bird' | 'plane' | 'mountain';
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'thermal' | 'star';
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

export class ParaglideRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private keys: Set<string> = new Set();

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: { x: 100, y: 200, width: 60, height: 40, vy: 0, rotation: 0 },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 4,
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

    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) player.vy -= 0.3 * speed;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) player.vy += 0.3 * speed;

    player.vy += 0.1 * speed; // Gentle gravity
    player.vy = Math.max(-4, Math.min(4, player.vy));
    player.y += player.vy * speed;
    player.rotation = player.vy * 8;

    if (player.y < 30) { player.y = 30; player.vy = 0; }
    if (player.y > ARENA_HEIGHT - 50) { this.gameOver(); return; }

    // Wind particles
    if (Math.random() < 0.3) {
      this.state.particles.push({
        x: player.x + 30, y: player.y,
        vx: -2 - Math.random(), vy: player.vy * 0.5,
        life: 15, maxLife: 15, color: 'rgba(255,255,255,0.4)', size: 2,
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
      p.x += p.vx * speed; p.y += p.vy * speed; p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnObjects(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1500) {
      this.spawnTimer = 0;

      const types: ('cloud' | 'bird' | 'plane' | 'mountain')[] = ['cloud', 'bird', 'plane', 'mountain'];
      const type = types[Math.floor(Math.random() * types.length)];
      let width = 50, height = 30, y = 100 + Math.random() * 200;

      if (type === 'cloud') { width = 80; height = 40; }
      else if (type === 'mountain') { width = 100; height = 200; y = ARENA_HEIGHT - 100; }
      else if (type === 'plane') { width = 60; height = 25; }

      this.state.obstacles.push({ x: ARENA_WIDTH + 50, y, width, height, type });

      if (Math.random() < 0.5) {
        const colTypes: ('coin' | 'thermal' | 'star')[] = ['coin', 'coin', 'thermal', 'star'];
        this.state.collectibles.push({
          x: ARENA_WIDTH + 150, y: 60 + Math.random() * 250,
          type: colTypes[Math.floor(Math.random() * colTypes.length)],
          collected: false,
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;

    for (const obs of obstacles) {
      if (this.rectCollision(player, obs)) { this.gameOver(); return; }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 40) {
        col.collected = true;
        if (col.type === 'coin') { this.state.coins++; this.state.score += 50; }
        else if (col.type === 'thermal') { this.state.player.vy = -3; this.state.score += 75; }
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
    if (this.state.distance % 500 < this.state.speed) this.state.speed = Math.min(10, this.state.speed + 0.1);
  }

  private gameOver(): void { this.state.phase = 'gameover'; this.stopGameLoop(); }

  public handleKeyDown(code: string): void { this.keys.add(code); }
  public handleKeyUp(code: string): void { this.keys.delete(code); }

  private stopGameLoop(): void { if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; } }
  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); this.keys.clear(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
