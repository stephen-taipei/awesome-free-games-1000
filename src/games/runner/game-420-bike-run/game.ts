export interface Player {
  lane: number; // 0, 1, or 2
  y: number;
  velocityY: number;
  isJumping: boolean;
  wheelRotation: number;
  leanAngle: number;
}

export interface Obstacle {
  lane: number;
  y: number;
  type: 'rock' | 'log' | 'puddle' | 'hiker';
  width: number;
  height: number;
}

export interface Collectible {
  lane: number;
  y: number;
  type: 'water' | 'energy' | 'medal';
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
  type: 'leaf' | 'dust' | 'splash';
  rotation: number;
  rotationSpeed: number;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  gameSpeed: number;
  isRunning: boolean;
  gameOver: boolean;
  waterBottles: number;
  energyBars: number;
  medals: number;
  lastObstacleY: number;
  lastCollectibleY: number;
  frameCount: number;
}

export class BikeRunGame {
  private state: GameState;
  private readonly LANES = 3;
  private readonly LANE_WIDTH = 120;
  private readonly GRAVITY = 0.8;
  private readonly JUMP_FORCE = -16;
  private readonly GROUND_Y = 400;
  private readonly MIN_OBSTACLE_GAP = 200;
  private readonly MIN_COLLECTIBLE_GAP = 150;
  private readonly INITIAL_SPEED = 4;
  private readonly MAX_SPEED = 12;
  private readonly SPEED_INCREMENT = 0.002;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        lane: 1,
        y: this.GROUND_Y,
        velocityY: 0,
        isJumping: false,
        wheelRotation: 0,
        leanAngle: 0
      },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      gameSpeed: this.INITIAL_SPEED,
      isRunning: false,
      gameOver: false,
      waterBottles: 0,
      energyBars: 0,
      medals: 0,
      lastObstacleY: 0,
      lastCollectibleY: 0,
      frameCount: 0
    };
  }

  start(): void {
    this.state = this.createInitialState();
    this.state.isRunning = true;
    this.generateInitialObstacles();
    this.generateInitialCollectibles();
    this.spawnAmbientParticles();
  }

  private generateInitialObstacles(): void {
    for (let i = 0; i < 5; i++) {
      const y = -200 - i * 300;
      this.createObstacle(y);
    }
  }

  private generateInitialCollectibles(): void {
    for (let i = 0; i < 8; i++) {
      const y = -150 - i * 250;
      this.createCollectible(y);
    }
  }

  private createObstacle(y: number): void {
    const types: Obstacle['type'][] = ['rock', 'log', 'puddle', 'hiker'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * this.LANES);

    let width = 60;
    let height = 40;

    switch (type) {
      case 'rock':
        width = 50;
        height = 50;
        break;
      case 'log':
        width = 80;
        height = 35;
        break;
      case 'puddle':
        width = 70;
        height = 20;
        break;
      case 'hiker':
        width = 45;
        height = 70;
        break;
    }

    this.state.obstacles.push({ lane, y, type, width, height });
    this.state.lastObstacleY = y;
  }

  private createCollectible(y: number): void {
    const types: Collectible['type'][] = ['water', 'energy', 'medal'];
    const weights = [0.5, 0.35, 0.15]; // water is most common, medal is rare

    let random = Math.random();
    let type: Collectible['type'] = 'water';

    if (random < weights[0]) {
      type = 'water';
    } else if (random < weights[0] + weights[1]) {
      type = 'energy';
    } else {
      type = 'medal';
    }

    const lane = Math.floor(Math.random() * this.LANES);

    this.state.collectibles.push({
      lane,
      y,
      type,
      collected: false
    });

    this.state.lastCollectibleY = y;
  }

  private spawnAmbientParticles(): void {
    if (Math.random() < 0.3) {
      const x = Math.random() * 500;
      const y = -50;

      this.state.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: Math.random() * 2 + 1,
        size: Math.random() * 8 + 4,
        life: 100,
        maxLife: 100,
        type: 'leaf',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  private spawnDustParticles(): void {
    const playerX = this.getPlayerX();

    for (let i = 0; i < 3; i++) {
      this.state.particles.push({
        x: playerX + (Math.random() - 0.5) * 30,
        y: this.state.player.y + 50,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * -2 - 1,
        size: Math.random() * 4 + 2,
        life: 30,
        maxLife: 30,
        type: 'dust',
        rotation: 0,
        rotationSpeed: 0
      });
    }
  }

  private spawnSplashParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * 4,
        velocityY: Math.sin(angle) * 4 - 2,
        size: Math.random() * 6 + 3,
        life: 40,
        maxLife: 40,
        type: 'splash',
        rotation: 0,
        rotationSpeed: 0
      });
    }
  }

  update(): void {
    if (!this.state.isRunning || this.state.gameOver) return;

    this.state.frameCount++;

    // Update player physics
    this.updatePlayer();

    // Update wheel rotation
    this.state.player.wheelRotation += this.state.gameSpeed * 0.15;

    // Update lean angle based on lane changes
    const targetLean = 0;
    this.state.player.leanAngle += (targetLean - this.state.player.leanAngle) * 0.1;

    // Spawn dust particles while on ground
    if (!this.state.player.isJumping && this.state.frameCount % 5 === 0) {
      this.spawnDustParticles();
    }

    // Update obstacles
    this.updateObstacles();

    // Update collectibles
    this.updateCollectibles();

    // Update particles
    this.updateParticles();

    // Spawn ambient particles
    this.spawnAmbientParticles();

    // Increase game speed
    if (this.state.gameSpeed < this.MAX_SPEED) {
      this.state.gameSpeed += this.SPEED_INCREMENT;
    }

    // Update distance and score
    this.state.distance += this.state.gameSpeed;
    this.state.score = Math.floor(this.state.distance / 10);

    // Generate new obstacles
    if (this.state.lastObstacleY > -1000) {
      const gap = Math.random() * 200 + this.MIN_OBSTACLE_GAP;
      this.createObstacle(this.state.lastObstacleY - gap);
    }

    // Generate new collectibles
    if (this.state.lastCollectibleY > -1500) {
      const gap = Math.random() * 150 + this.MIN_COLLECTIBLE_GAP;
      this.createCollectible(this.state.lastCollectibleY - gap);
    }

    // Check collisions
    this.checkCollisions();
  }

  private updatePlayer(): void {
    const player = this.state.player;

    // Apply gravity
    if (player.isJumping || player.y < this.GROUND_Y) {
      player.velocityY += this.GRAVITY;
      player.y += player.velocityY;

      // Land on ground
      if (player.y >= this.GROUND_Y) {
        player.y = this.GROUND_Y;
        player.velocityY = 0;
        player.isJumping = false;
      }
    }
  }

  private updateObstacles(): void {
    // Move obstacles
    for (const obstacle of this.state.obstacles) {
      obstacle.y += this.state.gameSpeed;
    }

    // Remove off-screen obstacles
    this.state.obstacles = this.state.obstacles.filter(
      obstacle => obstacle.y < 700
    );
  }

  private updateCollectibles(): void {
    // Move collectibles
    for (const collectible of this.state.collectibles) {
      if (!collectible.collected) {
        collectible.y += this.state.gameSpeed;
      }
    }

    // Remove off-screen collectibles
    this.state.collectibles = this.state.collectibles.filter(
      collectible => collectible.y < 700
    );
  }

  private updateParticles(): void {
    for (const particle of this.state.particles) {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.rotation += particle.rotationSpeed;
      particle.life--;

      // Gravity for splash particles
      if (particle.type === 'splash') {
        particle.velocityY += 0.3;
      }
    }

    // Remove dead particles
    this.state.particles = this.state.particles.filter(
      particle => particle.life > 0 && particle.y < 700
    );
  }

  private checkCollisions(): void {
    const playerLane = this.state.player.lane;
    const playerY = this.state.player.y;
    const playerX = this.getPlayerX();

    // Check obstacle collisions
    for (const obstacle of this.state.obstacles) {
      if (obstacle.lane === playerLane) {
        const obstacleX = this.getLaneX(obstacle.lane);

        // Check if player overlaps with obstacle
        if (Math.abs(obstacle.y - playerY) < 60 &&
            Math.abs(obstacleX - playerX) < 50) {

          // Puddles slow down, others end game
          if (obstacle.type === 'puddle') {
            this.state.gameSpeed = Math.max(this.INITIAL_SPEED, this.state.gameSpeed * 0.7);
            this.spawnSplashParticles(playerX, playerY + 40);
            // Remove puddle after splash
            const index = this.state.obstacles.indexOf(obstacle);
            if (index > -1) {
              this.state.obstacles.splice(index, 1);
            }
          } else {
            this.gameOver();
            return;
          }
        }
      }
    }

    // Check collectible collisions
    for (const collectible of this.state.collectibles) {
      if (!collectible.collected && collectible.lane === playerLane) {
        const collectibleX = this.getLaneX(collectible.lane);

        if (Math.abs(collectible.y - playerY) < 50 &&
            Math.abs(collectibleX - playerX) < 40) {
          collectible.collected = true;

          switch (collectible.type) {
            case 'water':
              this.state.waterBottles++;
              this.state.score += 10;
              break;
            case 'energy':
              this.state.energyBars++;
              this.state.score += 25;
              break;
            case 'medal':
              this.state.medals++;
              this.state.score += 100;
              break;
          }
        }
      }
    }
  }

  private getPlayerX(): number {
    return this.getLaneX(this.state.player.lane);
  }

  private getLaneX(lane: number): number {
    const centerX = 250;
    return centerX + (lane - 1) * this.LANE_WIDTH;
  }

  moveLeft(): void {
    if (!this.state.isRunning || this.state.gameOver) return;

    if (this.state.player.lane > 0) {
      this.state.player.lane--;
      this.state.player.leanAngle = -15;
      this.spawnDustParticles();
    }
  }

  moveRight(): void {
    if (!this.state.isRunning || this.state.gameOver) return;

    if (this.state.player.lane < this.LANES - 1) {
      this.state.player.lane++;
      this.state.player.leanAngle = 15;
      this.spawnDustParticles();
    }
  }

  jump(): void {
    if (!this.state.isRunning || this.state.gameOver) return;

    if (!this.state.player.isJumping && this.state.player.y === this.GROUND_Y) {
      this.state.player.velocityY = this.JUMP_FORCE;
      this.state.player.isJumping = true;
      this.spawnDustParticles();
    }
  }

  private gameOver(): void {
    this.state.gameOver = true;
    this.state.isRunning = false;
  }

  handleKeyDown(key: string): void {
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

  getState(): Readonly<GameState> {
    return this.state;
  }
}
