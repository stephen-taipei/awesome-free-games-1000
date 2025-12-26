/**
 * Grapple Run Game Logic
 * Game #425 - Grapple Runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isSwinging: boolean;
  grapplePoint: { x: number; y: number } | null;
  ropeLength: number;
  angle: number;
  angularVel: number;
}

export interface GrapplePoint {
  x: number;
  y: number;
  active: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'pit' | 'wall';
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'gem' | 'star';
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
  grapplePoints: GrapplePoint[];
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

export class GrappleRunGame {
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
      player: {
        x: 80, y: GROUND_Y - 25, width: 25, height: 40,
        vx: 0, vy: 0, isSwinging: false, grapplePoint: null,
        ropeLength: 0, angle: 0, angularVel: 0
      },
      grapplePoints: [],
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
    // Initial grapple points
    for (let i = 0; i < 5; i++) {
      this.state.grapplePoints.push({ x: 200 + i * 150, y: 60 + Math.random() * 60, active: true });
    }
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
    this.updateGrapplePoints(dt);
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

    if (player.isSwinging && player.grapplePoint) {
      // Pendulum physics
      const gravity = 0.015;
      player.angularVel += Math.sin(player.angle) * gravity * speed;
      player.angularVel *= 0.995; // Damping
      player.angle += player.angularVel * speed;

      player.x = player.grapplePoint.x + Math.sin(player.angle) * player.ropeLength;
      player.y = player.grapplePoint.y + Math.cos(player.angle) * player.ropeLength;

      // Move grapple point with world
      player.grapplePoint.x -= this.state.speed * speed;
    } else {
      // Normal physics
      player.vy += 0.5 * speed;
      player.x += player.vx * speed;
      player.y += player.vy * speed;
      player.vx *= 0.98;

      // Ground collision
      if (player.y >= GROUND_Y - 20) {
        player.y = GROUND_Y - 20;
        player.vy = 0;
        player.vx = 0;
      }
    }

    // Keep player in bounds
    if (player.x < 50) player.x = 50;
    if (player.y < 20) { player.y = 20; player.vy = 0; }

    // Fall death
    if (player.y > ARENA_HEIGHT) {
      this.gameOver();
    }
  }

  private updateGrapplePoints(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.grapplePoints = this.state.grapplePoints.filter(gp => {
      gp.x -= speed;
      return gp.x > -50;
    });

    // Spawn new grapple points
    const lastPoint = this.state.grapplePoints[this.state.grapplePoints.length - 1];
    if (!lastPoint || lastPoint.x < ARENA_WIDTH - 100) {
      this.state.grapplePoints.push({
        x: ARENA_WIDTH + 50,
        y: 50 + Math.random() * 80,
        active: true,
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
    if (this.spawnTimer >= 2000) {
      this.spawnTimer = 0;

      // Spawn pit obstacle
      if (Math.random() < 0.4) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50, y: GROUND_Y - 10, width: 80, height: 60, type: 'pit'
        });
      }

      // Spawn collectibles
      if (Math.random() < 0.6) {
        const types: ('coin' | 'gem' | 'star')[] = ['coin', 'coin', 'gem', 'star'];
        this.state.collectibles.push({
          x: ARENA_WIDTH + 50, y: 100 + Math.random() * 150,
          type: types[Math.floor(Math.random() * types.length)],
          collected: false,
        });
      }
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;

    for (const obs of obstacles) {
      if (obs.type === 'pit' && player.y > GROUND_Y - 30 && player.x > obs.x - 30 && player.x < obs.x + obs.width + 30) {
        this.gameOver();
        return;
      }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.hypot(col.x - player.x, col.y - player.y);
      if (dist < 35) {
        col.collected = true;
        if (col.type === 'coin') { this.state.coins++; this.state.score += 50; }
        else if (col.type === 'gem') { this.state.score += 150; }
        else { this.state.score += 250; }
      }
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));
    if (this.state.distance % 500 < this.state.speed) this.state.speed = Math.min(10, this.state.speed + 0.1);
  }

  private gameOver(): void { this.state.phase = 'gameover'; this.stopGameLoop(); }

  public grapple(): void {
    const { player, grapplePoints } = this.state;
    if (player.isSwinging) {
      // Release grapple
      player.isSwinging = false;
      player.vx = Math.cos(player.angle - Math.PI/2) * player.angularVel * player.ropeLength * 0.3;
      player.vy = Math.sin(player.angle - Math.PI/2) * player.angularVel * player.ropeLength * 0.3 - 5;
      player.grapplePoint = null;

      // Release particles
      for (let i = 0; i < 5; i++) {
        this.state.particles.push({
          x: player.x, y: player.y,
          vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2,
          life: 15, maxLife: 15, color: '#f39c12', size: 3,
        });
      }
    } else {
      // Find nearest grapple point ahead
      const nearestPoint = grapplePoints
        .filter(gp => gp.x > player.x && gp.x < player.x + 200)
        .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];

      if (nearestPoint) {
        player.isSwinging = true;
        player.grapplePoint = { x: nearestPoint.x, y: nearestPoint.y };
        player.ropeLength = Math.hypot(nearestPoint.x - player.x, nearestPoint.y - player.y);
        player.angle = Math.atan2(player.x - nearestPoint.x, player.y - nearestPoint.y);
        player.angularVel = 0.05;
      }
    }
  }

  public handleKeyDown(code: string): void {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.grapple();
  }

  private stopGameLoop(): void { if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; } }
  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
