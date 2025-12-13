export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  velocityY: number;
  isJumping: boolean;
  frame: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'barrel' | 'cannon' | 'rope' | 'mast' | 'enemy';
  frame: number;
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'coin' | 'map' | 'rum';
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
  type: 'splash' | 'sparkle' | 'wood';
  color: string;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  coins: number;
  speed: number;
  gameOver: boolean;
  frameCount: number;
  wave1Offset: number;
  wave2Offset: number;
  nextObstacleDistance: number;
  nextCollectibleDistance: number;
}

export class PirateEscapeGame {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private readonly GRAVITY = 0.8;
  private readonly JUMP_FORCE = -15;
  private readonly LANE_POSITIONS = [150, 250, 350];
  private readonly LANE_WIDTH = 100;
  private readonly GROUND_Y = 400;
  private readonly INITIAL_SPEED = 5;
  private readonly MAX_SPEED = 12;
  private readonly SPEED_INCREMENT = 0.002;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: 100,
        y: this.GROUND_Y - 60,
        width: 50,
        height: 60,
        lane: 1,
        velocityY: 0,
        isJumping: false,
        frame: 0
      },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      coins: 0,
      speed: this.INITIAL_SPEED,
      gameOver: false,
      frameCount: 0,
      wave1Offset: 0,
      wave2Offset: 0,
      nextObstacleDistance: 100,
      nextCollectibleDistance: 50
    };
  }

  start(): void {
    this.state = this.createInitialState();
  }

  update(): void {
    if (this.state.gameOver) return;

    this.state.frameCount++;

    // Update distance and score
    this.state.distance += this.state.speed * 0.1;
    this.state.score = Math.floor(this.state.distance);

    // Increase speed gradually
    if (this.state.speed < this.MAX_SPEED) {
      this.state.speed += this.SPEED_INCREMENT;
    }

    // Update wave animation
    this.state.wave1Offset -= this.state.speed * 0.3;
    this.state.wave2Offset -= this.state.speed * 0.5;

    // Update player animation
    if (this.state.frameCount % 8 === 0) {
      this.state.player.frame = (this.state.player.frame + 1) % 4;
    }

    // Update player physics
    this.updatePlayer();

    // Spawn obstacles
    this.spawnObstacles();

    // Spawn collectibles
    this.spawnCollectibles();

    // Update obstacles
    this.updateObstacles();

    // Update collectibles
    this.updateCollectibles();

    // Update particles
    this.updateParticles();

    // Check collisions
    this.checkCollisions();
  }

  private updatePlayer(): void {
    const player = this.state.player;

    // Apply gravity
    if (player.isJumping || player.y < this.GROUND_Y - player.height) {
      player.velocityY += this.GRAVITY;
      player.y += player.velocityY;

      // Landing
      if (player.y >= this.GROUND_Y - player.height) {
        player.y = this.GROUND_Y - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        this.createSplashParticles(player.x + player.width / 2, this.GROUND_Y);
      }
    }

    // Smooth lane transition
    const targetX = this.LANE_POSITIONS[player.lane] - player.width / 2;
    player.x += (targetX - player.x) * 0.2;
  }

  private spawnObstacles(): void {
    this.state.nextObstacleDistance -= this.state.speed;

    if (this.state.nextObstacleDistance <= 0) {
      const types: Obstacle['type'][] = ['barrel', 'cannon', 'rope', 'mast', 'enemy'];
      const type = types[Math.floor(Math.random() * types.length)];
      const lane = Math.floor(Math.random() * 3);

      let width = 50;
      let height = 50;
      let y = this.GROUND_Y - height;

      switch (type) {
        case 'barrel':
          width = 45;
          height = 50;
          break;
        case 'cannon':
          width = 60;
          height = 45;
          break;
        case 'rope':
          width = 40;
          height = 80;
          y = this.GROUND_Y - height;
          break;
        case 'mast':
          width = 30;
          height = 120;
          y = this.GROUND_Y - height;
          break;
        case 'enemy':
          width = 50;
          height = 60;
          break;
      }

      this.state.obstacles.push({
        x: this.canvas.width,
        y,
        width,
        height,
        lane,
        type,
        frame: 0
      });

      this.state.nextObstacleDistance = 150 + Math.random() * 100 - this.state.speed * 2;
    }
  }

  private spawnCollectibles(): void {
    this.state.nextCollectibleDistance -= this.state.speed;

    if (this.state.nextCollectibleDistance <= 0) {
      const types: Collectible['type'][] = ['coin', 'coin', 'coin', 'map', 'rum'];
      const type = types[Math.floor(Math.random() * types.length)];
      const lane = Math.floor(Math.random() * 3);
      const height = Math.random() > 0.5 ? 100 : 50;

      this.state.collectibles.push({
        x: this.canvas.width,
        y: this.GROUND_Y - height - 30,
        width: 30,
        height: 30,
        lane,
        type,
        collected: false
      });

      this.state.nextCollectibleDistance = 80 + Math.random() * 120;
    }
  }

  private updateObstacles(): void {
    // Update obstacle animation
    if (this.state.frameCount % 10 === 0) {
      this.state.obstacles.forEach(obs => {
        if (obs.type === 'enemy') {
          obs.frame = (obs.frame + 1) % 2;
        }
      });
    }

    this.state.obstacles = this.state.obstacles.filter(obstacle => {
      obstacle.x -= this.state.speed;
      return obstacle.x + obstacle.width > 0;
    });
  }

  private updateCollectibles(): void {
    this.state.collectibles = this.state.collectibles.filter(collectible => {
      if (!collectible.collected) {
        collectible.x -= this.state.speed;
      }
      return collectible.x + collectible.width > 0 && !collectible.collected;
    });
  }

  private updateParticles(): void {
    this.state.particles = this.state.particles.filter(particle => {
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.velocityY += 0.3; // Gravity for particles
      particle.life--;
      return particle.life > 0;
    });
  }

  private checkCollisions(): void {
    const player = this.state.player;
    const playerLane = player.lane;

    // Check obstacle collisions
    for (const obstacle of this.state.obstacles) {
      if (obstacle.lane === playerLane) {
        const obstacleX = this.LANE_POSITIONS[obstacle.lane] - obstacle.width / 2;

        if (
          player.x < obstacleX + obstacle.width - 10 &&
          player.x + player.width > obstacleX + 10 &&
          player.y < obstacle.y + obstacle.height - 10 &&
          player.y + player.height > obstacle.y + 10
        ) {
          this.state.gameOver = true;
          this.createExplosionParticles(player.x + player.width / 2, player.y + player.height / 2);
          return;
        }
      }
    }

    // Check collectible collisions
    for (const collectible of this.state.collectibles) {
      if (!collectible.collected && collectible.lane === playerLane) {
        const collectibleX = this.LANE_POSITIONS[collectible.lane] - collectible.width / 2;

        if (
          player.x < collectibleX + collectible.width &&
          player.x + player.width > collectibleX &&
          player.y < collectible.y + collectible.height &&
          player.y + player.height > collectible.y
        ) {
          collectible.collected = true;

          switch (collectible.type) {
            case 'coin':
              this.state.coins += 1;
              this.state.score += 10;
              break;
            case 'map':
              this.state.coins += 5;
              this.state.score += 50;
              break;
            case 'rum':
              this.state.coins += 3;
              this.state.score += 30;
              break;
          }

          this.createSparkleParticles(collectibleX + collectible.width / 2, collectible.y + collectible.height / 2);
        }
      }
    }
  }

  private createSplashParticles(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.state.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: -Math.random() * 3,
        size: 3 + Math.random() * 3,
        life: 20,
        maxLife: 20,
        type: 'splash',
        color: '#3498db'
      });
    }
  }

  private createSparkleParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 6,
        velocityY: (Math.random() - 0.5) * 6,
        size: 3 + Math.random() * 3,
        life: 30,
        maxLife: 30,
        type: 'sparkle',
        color: '#f1c40f'
      });
    }
  }

  private createExplosionParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.state.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: (Math.random() - 0.5) * 8,
        size: 4 + Math.random() * 4,
        life: 40,
        maxLife: 40,
        type: 'wood',
        color: '#8b4513'
      });
    }
  }

  moveLeft(): void {
    if (this.state.gameOver) return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  moveRight(): void {
    if (this.state.gameOver) return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
    }
  }

  jump(): void {
    if (this.state.gameOver) return;
    if (!this.state.player.isJumping && this.state.player.y >= this.GROUND_Y - this.state.player.height) {
      this.state.player.velocityY = this.JUMP_FORCE;
      this.state.player.isJumping = true;
    }
  }

  handleKeyDown(key: string): void {
    switch (key) {
      case 'ArrowLeft':
        this.moveLeft();
        break;
      case 'ArrowRight':
        this.moveRight();
        break;
      case 'ArrowUp':
      case ' ':
        this.jump();
        break;
    }
  }

  getState(): GameState {
    return this.state;
  }
}
