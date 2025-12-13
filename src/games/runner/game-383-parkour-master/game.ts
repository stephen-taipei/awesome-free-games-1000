/**
 * Parkour Master Game Logic
 * Game #383 - Parkour Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSliding: boolean;
  isVaulting: boolean;
  isWallRunning: boolean;
  jumpVelocity: number;
  groundY: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'gap' | 'ac-unit' | 'antenna' | 'fence' | 'billboard' | 'water-tank';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'energy-drink' | 'medal' | 'skill-point';
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

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  skillPoints: number;
  medals: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class ParkourMasterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private comboMultiplier: number = 1;
  private lastMoveTime: number = 0;

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
      speed: 6,
      skillPoints: 0,
      medals: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 35,
      height: 55,
      isJumping: false,
      isSliding: false,
      isVaulting: false,
      isWallRunning: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.comboMultiplier = 1;
    this.lastMoveTime = 0;
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
    this.updateCombo(dt);
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
        player.isVaulting = false;
      }
    }

    // Motion blur particles when running fast
    if (Math.random() < 0.4 && this.state.speed > 8) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 20,
        y: player.y + (Math.random() - 0.5) * 40,
        vx: -3 - Math.random() * 3,
        vy: (Math.random() - 0.5) * 2,
        life: 15,
        maxLife: 15,
        color: '#f39c12',
        size: 2 + Math.random() * 2,
      });
    }

    // Dust particles when landing
    if (!player.isJumping && Math.random() < 0.2) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 30,
        y: player.groundY + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        life: 10,
        maxLife: 10,
        color: '#95a5a6',
        size: 2 + Math.random() * 2,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width - 100;
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
    const spawnInterval = Math.max(700, 1600 - this.state.distance / 40);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('gap' | 'ac-unit' | 'antenna' | 'fence' | 'billboard' | 'water-tank')[] =
        ['gap', 'ac-unit', 'antenna', 'fence', 'billboard', 'water-tank'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 45, height = 45, yOffset = 0;

      switch (type) {
        case 'gap':
          width = 80;
          height = 20;
          yOffset = 50;
          break;
        case 'ac-unit':
          width = 50;
          height = 40;
          break;
        case 'antenna':
          width = 15;
          height = 80;
          yOffset = -40;
          break;
        case 'fence':
          width = 40;
          height = 60;
          yOffset = -10;
          break;
        case 'billboard':
          width = 60;
          height = 50;
          yOffset = -50;
          break;
        case 'water-tank':
          width = 55;
          height = 45;
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
    if (this.collectibleTimer >= 1100) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('energy-drink' | 'medal' | 'skill-point')[] =
        ['energy-drink', 'energy-drink', 'medal', 'medal', 'skill-point'];
      const type = types[Math.floor(Math.random() * types.length)];

      const yOffset = type === 'skill-point' ? -80 : -50;

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y + yOffset,
        type,
        lane,
        collected: false,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 8,
      right: player.x + player.width / 2 - 8,
      top: player.y - player.height / 2 + 8,
      bottom: player.y + player.height / 2 - 8,
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

        // Special handling for gap obstacles
        if (obs.type === 'gap' && !player.isJumping) {
          this.gameOver();
          return;
        }

        // Vaulting over low obstacles
        if ((obs.type === 'ac-unit' || obs.type === 'fence') && player.isVaulting) {
          this.comboMultiplier += 0.5;
          this.state.score += Math.floor(100 * this.comboMultiplier);
          this.spawnStyleParticles(obs.x, obs.y, '#27ae60');
          obs.x = -200; // Remove obstacle
          continue;
        }

        // Sliding under high obstacles
        if ((obs.type === 'billboard' || obs.type === 'antenna') && player.isSliding) {
          this.comboMultiplier += 0.5;
          this.state.score += Math.floor(100 * this.comboMultiplier);
          this.spawnStyleParticles(obs.x, obs.y, '#3498db');
          obs.x = -200;
          continue;
        }

        // Regular collision
        if (!player.isSliding || obs.type !== 'billboard') {
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
    this.comboMultiplier += 0.2;
    this.lastMoveTime = performance.now();

    switch (type) {
      case 'energy-drink':
        this.state.score += Math.floor(50 * this.comboMultiplier);
        this.state.speed = Math.min(14, this.state.speed + 0.3);
        this.spawnCollectParticles(x, y, '#3498db');
        break;
      case 'medal':
        this.state.medals++;
        this.state.score += Math.floor(100 * this.comboMultiplier);
        this.spawnCollectParticles(x, y, '#f1c40f');
        break;
      case 'skill-point':
        this.state.skillPoints++;
        this.state.score += Math.floor(200 * this.comboMultiplier);
        this.spawnCollectParticles(x, y, '#e74c3c');
        break;
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 20,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private spawnStyleParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4,
        life: 25,
        maxLife: 25,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * this.comboMultiplier * (dt / 100));

    // Gradually increase speed
    if (this.state.distance % 600 < this.state.speed) {
      this.state.speed = Math.min(16, this.state.speed + 0.08);
    }
  }

  private updateCombo(dt: number): void {
    // Reduce combo multiplier if no action for a while
    if (performance.now() - this.lastMoveTime > 2000) {
      this.comboMultiplier = Math.max(1, this.comboMultiplier - 0.01);
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 4),
        vy: Math.sin(angle) * (3 + Math.random() * 4),
        life: 35,
        maxLife: 35,
        color: ['#e74c3c', '#f39c12', '#f1c40f'][i % 3],
        size: 4 + Math.random() * 5,
      });
    }
  }

  public moveLeft(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
      this.lastMoveTime = performance.now();
      this.comboMultiplier = Math.min(3, this.comboMultiplier + 0.1);
    }
  }

  public moveRight(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
      this.lastMoveTime = performance.now();
      this.comboMultiplier = Math.min(3, this.comboMultiplier + 0.1);
    }
  }

  public jump(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isJumping) {
      this.state.player.isJumping = true;
      this.state.player.jumpVelocity = -16;
      this.state.player.isVaulting = true;
      this.lastMoveTime = performance.now();
      this.comboMultiplier = Math.min(3, this.comboMultiplier + 0.15);

      // Jump dust particles
      for (let i = 0; i < 5; i++) {
        this.state.particles.push({
          x: this.state.player.x + (Math.random() - 0.5) * 30,
          y: this.state.player.groundY + 10,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3,
          life: 15,
          maxLife: 15,
          color: '#95a5a6',
          size: 3 + Math.random() * 3,
        });
      }
    }
  }

  public slide(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isSliding) {
      this.state.player.isSliding = true;
      this.lastMoveTime = performance.now();
      this.comboMultiplier = Math.min(3, this.comboMultiplier + 0.15);

      setTimeout(() => {
        this.state.player.isSliding = false;
      }, 600);
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
