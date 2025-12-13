/**
 * Hunter Pursuit Game Logic
 * Game #436 - Forest Runner escaping from Hunters
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSliding: boolean;
  jumpVelocity: number;
  groundY: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'log' | 'rock' | 'bush' | 'trap' | 'tree-branch' | 'puddle';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'berry' | 'mushroom' | 'feather';
  lane: number;
  collected: boolean;
}

export interface Hunter {
  x: number;
  distanceFromPlayer: number;
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
  hunter: Hunter;
  score: number;
  distance: number;
  speed: number;
  berries: number;
  feathers: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class HunterPursuitGame {
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
      hunter: { x: -100, distanceFromPlayer: 100 },
      score: 0,
      distance: 0,
      speed: 5,
      berries: 0,
      feathers: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 30,
      height: 50,
      isJumping: false,
      isSliding: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
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
    this.updateHunter(dt);
    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.2;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.9 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Running particles
    if (Math.random() < 0.3 && !player.isJumping) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 20,
        y: player.groundY + 10,
        vx: -2 - Math.random() * 2,
        vy: -Math.random() * 2,
        life: 15,
        maxLife: 15,
        color: '#8B4513',
        size: 2 + Math.random() * 2,
      });
    }
  }

  private updateHunter(dt: number): void {
    const { hunter } = this.state;
    // Hunter gets closer when player hits obstacles
    // Hunter falls behind when player collects items
    hunter.distanceFromPlayer = Math.max(30, Math.min(150, hunter.distanceFromPlayer));

    // If hunter catches up, game over
    if (hunter.distanceFromPlayer <= 30) {
      this.gameOver();
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width - 50;
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

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1400 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['log', 'rock', 'bush', 'trap', 'tree-branch', 'puddle'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 40, yOffset = 0;

      switch (type) {
        case 'log':
          width = 60;
          height = 25;
          break;
        case 'rock':
          width = 45;
          height = 35;
          break;
        case 'bush':
          width = 50;
          height = 40;
          break;
        case 'trap':
          width = 40;
          height = 15;
          yOffset = 20;
          break;
        case 'tree-branch':
          width = 70;
          height = 20;
          yOffset = -60;
          break;
        case 'puddle':
          width = 55;
          height = 10;
          yOffset = 25;
          break;
      }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y + yOffset,
        width,
        height,
        type,
        lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 900) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['berry', 'berry', 'mushroom', 'feather'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 40,
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

      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {

        // Jump over ground obstacles
        if ((obs.type === 'log' || obs.type === 'rock' || obs.type === 'trap' || obs.type === 'puddle') && player.isJumping) {
          this.state.score += 50;
          this.spawnStyleParticles(obs.x, obs.y, '#27ae60');
          obs.x = -200;
          continue;
        }

        // Slide under high obstacles
        if (obs.type === 'tree-branch' && player.isSliding) {
          this.state.score += 50;
          this.spawnStyleParticles(obs.x, obs.y, '#3498db');
          obs.x = -200;
          continue;
        }

        // Collision - hunter gets closer
        this.state.hunter.distanceFromPlayer -= 20;
        this.spawnHitParticles(player.x, player.y);
        obs.x = -200;

        if (this.state.hunter.distanceFromPlayer <= 30) {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 35 && Math.abs(col.y - player.y) < 50) {
        col.collected = true;
        this.collectItem(col.type, col.x, col.y);
      }
    }
  }

  private collectItem(type: string, x: number, y: number): void {
    switch (type) {
      case 'berry':
        this.state.berries++;
        this.state.score += 30;
        this.state.hunter.distanceFromPlayer += 5;
        this.spawnCollectParticles(x, y, '#e74c3c');
        break;
      case 'mushroom':
        this.state.score += 50;
        this.state.speed = Math.min(12, this.state.speed + 0.3);
        this.spawnCollectParticles(x, y, '#9b59b6');
        break;
      case 'feather':
        this.state.feathers++;
        this.state.score += 100;
        this.state.hunter.distanceFromPlayer += 15;
        this.spawnCollectParticles(x, y, '#f1c40f');
        break;
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 20,
        maxLife: 20,
        color,
        size: 3,
      });
    }
  }

  private spawnStyleParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3,
        life: 20,
        maxLife: 20,
        color,
        size: 4,
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 25,
        maxLife: 25,
        color: '#e74c3c',
        size: 4,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 30,
        maxLife: 30,
        color: ['#e74c3c', '#c0392b'][i % 2],
        size: 5,
      });
    }
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
      this.state.player.jumpVelocity = -14;
    }
  }

  public slide(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isSliding) {
      this.state.player.isSliding = true;
      setTimeout(() => {
        this.state.player.isSliding = false;
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
        this.slide();
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
