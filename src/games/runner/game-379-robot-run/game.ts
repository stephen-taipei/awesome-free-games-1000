/**
 * Robot Run Game Logic
 * Game #379 - Mecha Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isBoosting: boolean;
  jumpVelocity: number;
  groundY: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'pipe' | 'fence' | 'gear' | 'crate';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'battery' | 'oil' | 'chip';
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
  energy: number;
  maxEnergy: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class RobotRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private boostCooldown: number = 0;

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
      energy: 100,
      maxEnergy: 100,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 45,
      height: 55,
      isJumping: false,
      isBoosting: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.boostCooldown = 0;
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
    this.updateBoost(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.25;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.8 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Exhaust particles
    if (Math.random() < 0.4) {
      const color = player.isBoosting ? '#ff6600' : '#00d4ff';
      this.state.particles.push({
        x: player.x - 20,
        y: player.y + player.height / 2,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 3,
        life: 18,
        maxLife: 18,
        color,
        size: player.isBoosting ? 5 : 3,
      });
    }

    // Steam particles when boosting
    if (player.isBoosting && Math.random() < 0.3) {
      this.state.particles.push({
        x: player.x,
        y: player.y - player.height / 2,
        vx: -1,
        vy: -2 - Math.random() * 2,
        life: 25,
        maxLife: 25,
        color: '#cccccc',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const baseSpeed = this.state.speed;
    const speed = (this.state.player.isBoosting ? baseSpeed * 1.5 : baseSpeed) * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const baseSpeed = this.state.speed;
    const speed = (this.state.player.isBoosting ? baseSpeed * 1.5 : baseSpeed) * (dt / 16);
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
    const spawnInterval = Math.max(700, 1400 - this.state.distance / 60);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('pipe' | 'fence' | 'gear' | 'crate')[] = ['pipe', 'fence', 'gear', 'crate'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 45, height = 50;
      let yOffset = 0;

      if (type === 'pipe') {
        width = 40;
        height = 60;
        yOffset = -5;
      }
      if (type === 'fence') {
        width = 50;
        height = 70;
        yOffset = -10;
      }
      if (type === 'gear') {
        width = 45;
        height = 45;
        yOffset = -100 - Math.random() * 50; // Falling from above
      }
      if (type === 'crate') {
        width = 50;
        height = 50;
        yOffset = 0;
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
      const types: ('battery' | 'oil' | 'chip')[] = ['battery', 'battery', 'oil', 'chip'];
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
        this.gameOver();
        return;
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && Math.abs(player.y - col.y) < 50) {
        col.collected = true;
        this.collectItem(col.type);
        this.spawnCollectEffect(col.x, col.y);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'battery':
        this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 20);
        this.state.score += 50;
        break;
      case 'oil':
        this.state.score += 100;
        this.state.speed = Math.min(12, this.state.speed + 0.3);
        break;
      case 'chip':
        this.state.score += 150;
        this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 30);
        break;
    }
  }

  private spawnCollectEffect(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 20,
        maxLife: 20,
        color: '#ffd700',
        size: 3 + Math.random() * 2,
      });
    }
  }

  private updateScore(dt: number): void {
    const multiplier = this.state.player.isBoosting ? 1.5 : 1;
    this.state.distance += this.state.speed * multiplier * (dt / 16);
    this.state.score += Math.floor(this.state.speed * multiplier * (dt / 100));

    // Gradually increase speed
    if (this.state.distance % 600 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }
  }

  private updateBoost(dt: number): void {
    if (this.boostCooldown > 0) {
      this.boostCooldown -= dt;
    }

    if (this.state.player.isBoosting) {
      this.state.energy -= dt / 30;
      if (this.state.energy <= 0) {
        this.state.energy = 0;
        this.state.player.isBoosting = false;
      }
    }
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
        color: i % 2 === 0 ? '#ff6600' : '#ffaa00',
        size: 5 + Math.random() * 5,
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

  public boost(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.energy >= 10 && this.boostCooldown <= 0) {
      this.state.player.isBoosting = true;
      this.boostCooldown = 300;
    }
  }

  public stopBoost(): void {
    this.state.player.isBoosting = false;
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
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyB':
        this.boost();
        break;
    }
  }

  public handleKeyUp(code: string): void {
    switch (code) {
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyB':
        this.stopBoost();
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
