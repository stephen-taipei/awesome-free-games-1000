export interface Player {
  x: number;
  y: number;
  lane: number; // 0, 1, 2 (left, center, right)
  width: number;
  height: number;
  speed: number;
  velocityY: number;
  hasBoosted: boolean;
  boostCooldown: number;
  health: number;
  maxHealth: number;
  invulnerable: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cone' | 'oil' | 'car' | 'barrier';
  lane: number;
  speed: number;
  carColor?: string;
  hit?: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'nitro' | 'coin' | 'repair';
  lane: number;
  speed: number;
  collected?: boolean;
  rotation?: number;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'smoke' | 'spark' | 'boost' | 'coin';
  color?: string;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  coins: number;
  gameOver: boolean;
  gamePaused: boolean;
  difficulty: number;
  roadOffset: number;
  speedMultiplier: number;
  baseSpeed: number;
  nitroActive: boolean;
  nitroAmount: number;
  maxNitro: number;
}

export class RacingRunGame {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private particleTimer: number = 0;
  private difficultyTimer: number = 0;
  private readonly LANE_WIDTH: number = 120;
  private readonly LANE_POSITIONS: number[] = [0, 1, 2];
  private readonly CAR_COLORS: string[] = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const centerLane = 1;
    return {
      player: {
        x: 0,
        y: this.canvas.height - 180,
        lane: centerLane,
        width: 50,
        height: 90,
        speed: 8,
        velocityY: 0,
        hasBoosted: false,
        boostCooldown: 0,
        health: 100,
        maxHealth: 100,
        invulnerable: 0
      },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      coins: 0,
      gameOver: false,
      gamePaused: false,
      difficulty: 1,
      roadOffset: 0,
      speedMultiplier: 1,
      baseSpeed: 5,
      nitroActive: false,
      nitroAmount: 100,
      maxNitro: 100
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.lastTime = performance.now();
  }

  public update(currentTime: number): void {
    if (this.state.gameOver || this.state.gamePaused) return;

    const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;

    // Update player position
    this.updatePlayer(deltaTime);

    // Update road offset
    const currentSpeed = this.state.baseSpeed * this.state.speedMultiplier * (this.state.nitroActive ? 1.8 : 1);
    this.state.roadOffset += currentSpeed * deltaTime;
    if (this.state.roadOffset > 60) {
      this.state.roadOffset = 0;
    }

    // Update distance and score
    this.state.distance += currentSpeed * deltaTime * 0.1;
    this.state.score = Math.floor(this.state.distance);

    // Spawn obstacles
    this.spawnTimer += deltaTime;
    if (this.spawnTimer > 60 / this.state.difficulty) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // Spawn collectibles
    this.collectibleTimer += deltaTime;
    if (this.collectibleTimer > 120) {
      this.spawnCollectible();
      this.collectibleTimer = 0;
    }

    // Update obstacles
    this.updateObstacles(deltaTime);

    // Update collectibles
    this.updateCollectibles(deltaTime);

    // Update particles
    this.updateParticles(deltaTime);

    // Create tire smoke particles
    this.particleTimer += deltaTime;
    if (this.particleTimer > 3) {
      this.createTireSmoke();
      this.particleTimer = 0;
    }

    // Increase difficulty
    this.difficultyTimer += deltaTime;
    if (this.difficultyTimer > 300) {
      this.state.difficulty = Math.min(5, this.state.difficulty + 0.1);
      this.state.speedMultiplier = Math.min(2, this.state.speedMultiplier + 0.05);
      this.difficultyTimer = 0;
    }

    // Update nitro
    if (this.state.nitroActive) {
      this.state.nitroAmount -= deltaTime * 2;
      if (this.state.nitroAmount <= 0) {
        this.state.nitroAmount = 0;
        this.state.nitroActive = false;
      }
      // Create boost particles
      if (Math.random() < 0.3) {
        this.createBoostParticle();
      }
    } else {
      this.state.nitroAmount = Math.min(this.state.maxNitro, this.state.nitroAmount + deltaTime * 0.5);
    }

    // Update invulnerability
    if (this.state.player.invulnerable > 0) {
      this.state.player.invulnerable -= deltaTime;
    }

    // Update boost cooldown
    if (this.state.player.boostCooldown > 0) {
      this.state.player.boostCooldown -= deltaTime;
    }

    // Check game over
    if (this.state.player.health <= 0) {
      this.state.gameOver = true;
    }
  }

  private updatePlayer(deltaTime: number): void {
    const targetX = this.getLaneX(this.state.player.lane);
    const diff = targetX - this.state.player.x;

    if (Math.abs(diff) > 1) {
      this.state.player.x += diff * 0.2 * deltaTime;
    } else {
      this.state.player.x = targetX;
    }
  }

  private getLaneX(lane: number): number {
    const startX = (this.canvas.width - this.LANE_WIDTH * 3) / 2;
    return startX + lane * this.LANE_WIDTH + this.LANE_WIDTH / 2;
  }

  private spawnObstacle(): void {
    const types: Obstacle['type'][] = ['cone', 'oil', 'car', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);

    let width = 40;
    let height = 40;

    if (type === 'car') {
      width = 50;
      height = 90;
    } else if (type === 'barrier') {
      width = 60;
      height = 50;
    } else if (type === 'oil') {
      width = 50;
      height = 30;
    }

    const obstacle: Obstacle = {
      x: this.getLaneX(lane),
      y: -height,
      width,
      height,
      type,
      lane,
      speed: this.state.baseSpeed * this.state.speedMultiplier,
      carColor: this.CAR_COLORS[Math.floor(Math.random() * this.CAR_COLORS.length)]
    };

    this.state.obstacles.push(obstacle);
  }

  private spawnCollectible(): void {
    const types: Collectible['type'][] = ['nitro', 'coin', 'coin', 'coin', 'repair'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);

    const collectible: Collectible = {
      x: this.getLaneX(lane),
      y: -30,
      width: 30,
      height: 30,
      type,
      lane,
      speed: this.state.baseSpeed * this.state.speedMultiplier,
      rotation: 0
    };

    this.state.collectibles.push(collectible);
  }

  private updateObstacles(deltaTime: number): void {
    const currentSpeed = this.state.baseSpeed * this.state.speedMultiplier * (this.state.nitroActive ? 1.8 : 1);

    for (let i = this.state.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.state.obstacles[i];
      obstacle.y += currentSpeed * deltaTime;

      // Check collision with player
      if (!this.state.player.invulnerable && this.checkCollision(
        this.state.player.x - this.state.player.width / 2,
        this.state.player.y,
        this.state.player.width,
        this.state.player.height,
        obstacle.x - obstacle.width / 2,
        obstacle.y,
        obstacle.width,
        obstacle.height
      )) {
        if (!obstacle.hit) {
          this.handleObstacleCollision(obstacle);
          obstacle.hit = true;
        }
      }

      // Remove off-screen obstacles
      if (obstacle.y > this.canvas.height + 50) {
        this.state.obstacles.splice(i, 1);
      }
    }
  }

  private updateCollectibles(deltaTime: number): void {
    const currentSpeed = this.state.baseSpeed * this.state.speedMultiplier * (this.state.nitroActive ? 1.8 : 1);

    for (let i = this.state.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.state.collectibles[i];
      collectible.y += currentSpeed * deltaTime;
      collectible.rotation = (collectible.rotation || 0) + 0.05 * deltaTime;

      // Check collision with player
      if (!collectible.collected && this.checkCollision(
        this.state.player.x - this.state.player.width / 2,
        this.state.player.y,
        this.state.player.width,
        this.state.player.height,
        collectible.x - collectible.width / 2,
        collectible.y,
        collectible.width,
        collectible.height
      )) {
        this.handleCollectiblePickup(collectible);
        collectible.collected = true;
      }

      // Remove off-screen or collected collectibles
      if (collectible.y > this.canvas.height + 50 || collectible.collected) {
        this.state.collectibles.splice(i, 1);
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const particle = this.state.particles[i];
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private checkCollision(x1: number, y1: number, w1: number, h1: number,
                        x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
  }

  private handleObstacleCollision(obstacle: Obstacle): void {
    let damage = 0;

    switch (obstacle.type) {
      case 'cone':
        damage = 5;
        break;
      case 'oil':
        damage = 10;
        break;
      case 'car':
        damage = 25;
        break;
      case 'barrier':
        damage = 30;
        break;
    }

    this.state.player.health = Math.max(0, this.state.player.health - damage);
    this.state.player.invulnerable = 60; // 1 second invulnerability

    // Create impact particles
    for (let i = 0; i < 10; i++) {
      this.state.particles.push({
        x: obstacle.x,
        y: obstacle.y,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: (Math.random() - 0.5) * 4,
        life: 30,
        maxLife: 30,
        size: Math.random() * 4 + 2,
        type: 'spark',
        color: '#ff6b6b'
      });
    }
  }

  private handleCollectiblePickup(collectible: Collectible): void {
    switch (collectible.type) {
      case 'nitro':
        this.state.nitroAmount = Math.min(this.state.maxNitro, this.state.nitroAmount + 30);
        break;
      case 'coin':
        this.state.coins += 1;
        this.state.score += 10;
        break;
      case 'repair':
        this.state.player.health = Math.min(this.state.player.maxHealth, this.state.player.health + 20);
        break;
    }

    // Create collection particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x: collectible.x,
        y: collectible.y,
        velocityX: Math.cos(angle) * 2,
        velocityY: Math.sin(angle) * 2,
        life: 20,
        maxLife: 20,
        size: 3,
        type: 'coin',
        color: collectible.type === 'coin' ? '#f1c40f' : collectible.type === 'nitro' ? '#3498db' : '#2ecc71'
      });
    }
  }

  private createTireSmoke(): void {
    const leftX = this.state.player.x - this.state.player.width / 2 + 10;
    const rightX = this.state.player.x + this.state.player.width / 2 - 10;
    const y = this.state.player.y + this.state.player.height;

    for (const x of [leftX, rightX]) {
      this.state.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 0.5,
        velocityY: 1,
        life: 30,
        maxLife: 30,
        size: Math.random() * 8 + 4,
        type: 'smoke',
        color: '#95a5a6'
      });
    }
  }

  private createBoostParticle(): void {
    const x = this.state.player.x + (Math.random() - 0.5) * this.state.player.width;
    const y = this.state.player.y + this.state.player.height;

    this.state.particles.push({
      x,
      y,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: 3,
      life: 20,
      maxLife: 20,
      size: Math.random() * 6 + 3,
      type: 'boost',
      color: '#3498db'
    });
  }

  public moveLeft(): void {
    if (this.state.gameOver || this.state.gamePaused) return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  public moveRight(): void {
    if (this.state.gameOver || this.state.gamePaused) return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
    }
  }

  public boost(): void {
    if (this.state.gameOver || this.state.gamePaused) return;
    if (this.state.nitroAmount >= 20 && !this.state.nitroActive) {
      this.state.nitroActive = true;
    }
  }

  public handleKeyDown(key: string): void {
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.moveRight();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.boost();
        break;
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public pause(): void {
    this.state.gamePaused = true;
  }

  public resume(): void {
    this.state.gamePaused = false;
    this.lastTime = performance.now();
  }

  public togglePause(): void {
    if (this.state.gamePaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
