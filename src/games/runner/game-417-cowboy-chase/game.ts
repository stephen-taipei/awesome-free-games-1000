export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number; // 0, 1, or 2
  velocityY: number;
  isJumping: boolean;
  speed: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'cactus' | 'tumbleweed' | 'boulder' | 'bandit';
  passed: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'gold' | 'star' | 'horseshoe';
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  isGameOver: boolean;
  isPaused: boolean;
  gameSpeed: number;
  obstacleSpawnTimer: number;
  collectibleSpawnTimer: number;
  difficultyMultiplier: number;
}

export class CowboyChaseGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private readonly GRAVITY = 0.6;
  private readonly JUMP_FORCE = -14;
  private readonly LANE_WIDTH: number;
  private readonly LANE_Y = 450;
  private readonly LANES = [150, 300, 450]; // X positions for 3 lanes
  private readonly BASE_SPEED = 5;
  private readonly OBSTACLE_SPAWN_INTERVAL = 120;
  private readonly COLLECTIBLE_SPAWN_INTERVAL = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.LANE_WIDTH = this.canvas.width / 3;

    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.LANES[1],
        y: this.LANE_Y,
        width: 60,
        height: 80,
        lane: 1,
        velocityY: 0,
        isJumping: false,
        speed: this.BASE_SPEED
      },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      isGameOver: false,
      isPaused: false,
      gameSpeed: 1,
      obstacleSpawnTimer: 0,
      collectibleSpawnTimer: 0,
      difficultyMultiplier: 1
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
    this.lastTime = currentTime;

    if (!this.state.isPaused && !this.state.isGameOver) {
      this.update(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public update(deltaTime: number): void {
    const player = this.state.player;

    // Update difficulty
    this.state.difficultyMultiplier = 1 + this.state.distance / 5000;
    this.state.gameSpeed = this.BASE_SPEED * this.state.difficultyMultiplier;

    // Update distance
    this.state.distance += this.state.gameSpeed * deltaTime;

    // Update player physics (jumping)
    if (player.isJumping) {
      player.velocityY += this.GRAVITY * deltaTime;
      player.y += player.velocityY * deltaTime;

      if (player.y >= this.LANE_Y) {
        player.y = this.LANE_Y;
        player.velocityY = 0;
        player.isJumping = false;
      }
    }

    // Smooth lane transition
    const targetX = this.LANES[player.lane];
    if (player.x !== targetX) {
      const diff = targetX - player.x;
      player.x += diff * 0.2 * deltaTime;
      if (Math.abs(diff) < 1) {
        player.x = targetX;
      }
    }

    // Spawn obstacles
    this.state.obstacleSpawnTimer += deltaTime;
    if (this.state.obstacleSpawnTimer >= this.OBSTACLE_SPAWN_INTERVAL / this.state.difficultyMultiplier) {
      this.spawnObstacle();
      this.state.obstacleSpawnTimer = 0;
    }

    // Spawn collectibles
    this.state.collectibleSpawnTimer += deltaTime;
    if (this.state.collectibleSpawnTimer >= this.COLLECTIBLE_SPAWN_INTERVAL) {
      this.spawnCollectible();
      this.state.collectibleSpawnTimer = 0;
    }

    // Update obstacles
    this.state.obstacles = this.state.obstacles.filter(obstacle => {
      obstacle.x -= this.state.gameSpeed * deltaTime;

      // Check if passed
      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
        obstacle.passed = true;
        this.state.score += 10;
      }

      // Check collision
      if (this.checkCollision(player, obstacle)) {
        this.state.isGameOver = true;
      }

      return obstacle.x + obstacle.width > -50;
    });

    // Update collectibles
    this.state.collectibles = this.state.collectibles.filter(collectible => {
      if (!collectible.collected) {
        collectible.x -= this.state.gameSpeed * deltaTime;

        // Check collection
        if (this.checkCollision(player, collectible)) {
          collectible.collected = true;
          this.collectItem(collectible);
          return false;
        }
      }

      return collectible.x + collectible.width > -50;
    });

    // Generate dust particles
    if (Math.random() < 0.3 * deltaTime) {
      this.createDustParticle();
    }

    // Update particles
    this.state.particles = this.state.particles.filter(particle => {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life += deltaTime;
      particle.velocityY += 0.1 * deltaTime; // Slight gravity
      return particle.life < particle.maxLife;
    });
  }

  private spawnObstacle(): void {
    const types: Obstacle['type'][] = ['cactus', 'tumbleweed', 'boulder', 'bandit'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);

    let width = 40;
    let height = 60;

    switch (type) {
      case 'cactus':
        width = 40;
        height = 70;
        break;
      case 'tumbleweed':
        width = 50;
        height = 50;
        break;
      case 'boulder':
        width = 60;
        height = 55;
        break;
      case 'bandit':
        width = 45;
        height = 75;
        break;
    }

    this.state.obstacles.push({
      x: this.canvas.width + 50,
      y: this.LANE_Y - height + 80,
      width,
      height,
      lane,
      type,
      passed: false
    });
  }

  private spawnCollectible(): void {
    const types: Collectible['type'][] = ['gold', 'star', 'horseshoe'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);

    // Sometimes spawn in air
    const isAirborne = Math.random() < 0.3;
    const yOffset = isAirborne ? -100 - Math.random() * 80 : -20;

    this.state.collectibles.push({
      x: this.canvas.width + 50,
      y: this.LANE_Y + yOffset,
      width: 30,
      height: 30,
      lane,
      type,
      collected: false
    });
  }

  private collectItem(collectible: Collectible): void {
    let points = 0;

    switch (collectible.type) {
      case 'gold':
        points = 50;
        break;
      case 'star':
        points = 100;
        break;
      case 'horseshoe':
        points = 75;
        break;
    }

    this.state.score += points;

    // Create collection particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x: collectible.x + collectible.width / 2,
        y: collectible.y + collectible.height / 2,
        velocityX: Math.cos(angle) * 3,
        velocityY: Math.sin(angle) * 3,
        size: 4,
        life: 0,
        maxLife: 30,
        color: collectible.type === 'gold' ? '#FFD700' :
               collectible.type === 'star' ? '#FFA500' : '#C0C0C0'
      });
    }
  }

  private createDustParticle(): void {
    this.state.particles.push({
      x: this.state.player.x + Math.random() * 20 - 10,
      y: this.LANE_Y + 70 + Math.random() * 10,
      velocityX: -2 - Math.random() * 2,
      velocityY: -1 - Math.random() * 2,
      size: 3 + Math.random() * 4,
      life: 0,
      maxLife: 40 + Math.random() * 20,
      color: '#d4a574'
    });
  }

  private checkCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    // Add some margin for more forgiving collision
    const margin = 10;
    return (
      rect1.x + margin < rect2.x + rect2.width - margin &&
      rect1.x + rect1.width - margin > rect2.x + margin &&
      rect1.y + margin < rect2.y + rect2.height - margin &&
      rect1.y + rect1.height - margin > rect2.y + margin
    );
  }

  public moveLeft(): void {
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  public moveRight(): void {
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
    }
  }

  public jump(): void {
    if (!this.state.player.isJumping) {
      this.state.player.isJumping = true;
      this.state.player.velocityY = this.JUMP_FORCE;
    }
  }

  public handleKeyDown(key: string): void {
    if (this.state.isGameOver || this.state.isPaused) return;

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
        this.jump();
        break;
    }
  }

  public pause(): void {
    this.state.isPaused = !this.state.isPaused;
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
