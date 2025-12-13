export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  speed: number;
  isWheeling: number;
  wheelieTimer: number;
  score: number;
  fuel: number;
  maxFuel: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  type: 'car' | 'truck' | 'roadblock' | 'pedestrian';
  speed: number;
  color: string;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  type: 'fuel' | 'coin' | 'helmet';
  collected: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'exhaust' | 'spark' | 'smoke';
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  gameOver: boolean;
  paused: boolean;
  difficulty: number;
  nextObstacleId: number;
  nextCollectibleId: number;
  nextParticleId: number;
  spawnTimer: number;
  collectibleTimer: number;
  lanes: number[];
  laneWidth: number;
  worldSpeed: number;
  combo: number;
  comboTimer: number;
}

export class MotoRunGame {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private keys: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const laneWidth = 120;
    const lanes = [
      this.canvas.width / 2 - laneWidth - 20,
      this.canvas.width / 2,
      this.canvas.width / 2 + laneWidth + 20
    ];

    return {
      player: {
        x: lanes[1],
        y: this.canvas.height - 150,
        lane: 1,
        width: 60,
        height: 80,
        speed: 8,
        isWheeling: 0,
        wheelieTimer: 0,
        score: 0,
        fuel: 100,
        maxFuel: 100
      },
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      gameOver: false,
      paused: false,
      difficulty: 1,
      nextObstacleId: 1,
      nextCollectibleId: 1,
      nextParticleId: 1,
      spawnTimer: 0,
      collectibleTimer: 0,
      lanes,
      laneWidth,
      worldSpeed: 5,
      combo: 0,
      comboTimer: 0
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

    if (!this.state.paused && !this.state.gameOver) {
      this.update(deltaTime);
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  public update(deltaTime: number): void {
    const { player, obstacles, collectibles, particles } = this.state;

    // Update distance and score
    this.state.distance += this.state.worldSpeed * deltaTime * 0.1;
    this.state.score = Math.floor(this.state.distance);

    // Increase difficulty over time
    this.state.difficulty = 1 + Math.floor(this.state.distance / 500);
    this.state.worldSpeed = 5 + this.state.difficulty * 0.5;

    // Consume fuel
    player.fuel -= 0.05 * deltaTime;
    if (player.fuel <= 0) {
      player.fuel = 0;
      this.state.gameOver = true;
      return;
    }

    // Update wheelie
    if (player.isWheeling > 0) {
      player.wheelieTimer += deltaTime;
      if (player.wheelieTimer >= 60) {
        player.isWheeling = 0;
        player.wheelieTimer = 0;
      } else {
        // Bonus points while wheeling
        this.state.score += Math.floor(deltaTime * 0.5);
      }
    }

    // Update combo timer
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= deltaTime;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 0;
      }
    }

    // Smooth lane movement
    const targetX = this.state.lanes[player.lane];
    const dx = targetX - player.x;
    player.x += dx * 0.2;

    // Spawn obstacles
    this.state.spawnTimer += deltaTime;
    const spawnInterval = Math.max(30, 80 - this.state.difficulty * 5);

    if (this.state.spawnTimer >= spawnInterval) {
      this.spawnObstacle();
      this.state.spawnTimer = 0;
    }

    // Spawn collectibles
    this.state.collectibleTimer += deltaTime;
    if (this.state.collectibleTimer >= 120) {
      this.spawnCollectible();
      this.state.collectibleTimer = 0;
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.y += (this.state.worldSpeed + obstacle.speed) * deltaTime;

      // Remove off-screen obstacles
      if (obstacle.y > this.canvas.height + 100) {
        obstacles.splice(i, 1);
      }
    }

    // Update collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const collectible = collectibles[i];
      collectible.y += this.state.worldSpeed * deltaTime;

      // Check collision with player
      if (!collectible.collected && this.checkCollision(
        player.x - player.width / 2,
        player.y - player.height / 2,
        player.width,
        player.height,
        collectible.x - collectible.width / 2,
        collectible.y - collectible.height / 2,
        collectible.width,
        collectible.height
      )) {
        collectible.collected = true;
        this.collectItem(collectible);
        collectibles.splice(i, 1);
      }

      // Remove off-screen collectibles
      if (collectible.y > this.canvas.height + 50) {
        collectibles.splice(i, 1);
      }
    }

    // Check collisions with obstacles
    for (const obstacle of obstacles) {
      if (this.checkCollision(
        player.x - player.width / 2,
        player.y - player.height / 2,
        player.width,
        player.height - 10,
        obstacle.x - obstacle.width / 2,
        obstacle.y - obstacle.height / 2,
        obstacle.width,
        obstacle.height
      )) {
        // Wheelie can jump over pedestrians
        if (player.isWheeling > 0 && obstacle.type === 'pedestrian') {
          this.state.score += 50;
          this.createSparkParticles(obstacle.x, obstacle.y);
          continue;
        }
        this.state.gameOver = true;
        this.createCrashParticles(player.x, player.y);
        return;
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Generate exhaust particles
    if (Math.random() < 0.3) {
      this.createExhaustParticle();
    }
  }

  private spawnObstacle(): void {
    const lane = Math.floor(Math.random() * 3);
    const types: Array<'car' | 'truck' | 'roadblock' | 'pedestrian'> = [
      'car', 'car', 'truck', 'roadblock', 'pedestrian'
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    let width = 60;
    let height = 100;
    let speed = 0;
    let color = '#e74c3c';

    switch (type) {
      case 'car':
        width = 60;
        height = 100;
        speed = Math.random() * 2 - 1;
        color = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'][Math.floor(Math.random() * 4)];
        break;
      case 'truck':
        width = 70;
        height = 140;
        speed = -1;
        color = '#95a5a6';
        break;
      case 'roadblock':
        width = 80;
        height = 40;
        speed = 0;
        color = '#e67e22';
        break;
      case 'pedestrian':
        width = 30;
        height = 50;
        speed = 1;
        color = '#9b59b6';
        break;
    }

    this.state.obstacles.push({
      id: this.state.nextObstacleId++,
      x: this.state.lanes[lane],
      y: -height - 20,
      lane,
      width,
      height,
      type,
      speed,
      color
    });
  }

  private spawnCollectible(): void {
    const lane = Math.floor(Math.random() * 3);
    const types: Array<'fuel' | 'coin' | 'helmet'> = ['fuel', 'coin', 'coin', 'helmet'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.state.collectibles.push({
      id: this.state.nextCollectibleId++,
      x: this.state.lanes[lane],
      y: -30,
      lane,
      width: 30,
      height: 30,
      type,
      collected: false
    });
  }

  private collectItem(collectible: Collectible): void {
    switch (collectible.type) {
      case 'fuel':
        this.state.player.fuel = Math.min(
          this.state.player.maxFuel,
          this.state.player.fuel + 20
        );
        this.state.score += 30;
        break;
      case 'coin':
        this.state.score += 50;
        this.state.combo++;
        this.state.comboTimer = 60;
        if (this.state.combo > 1) {
          this.state.score += this.state.combo * 10;
        }
        break;
      case 'helmet':
        this.state.score += 100;
        this.state.player.fuel = Math.min(
          this.state.player.maxFuel,
          this.state.player.fuel + 10
        );
        break;
    }
    this.createCollectParticles(collectible.x, collectible.y, collectible.type);
  }

  private createExhaustParticle(): void {
    const { player } = this.state;
    this.state.particles.push({
      id: this.state.nextParticleId++,
      x: player.x - 10,
      y: player.y + 30,
      vx: Math.random() * 2 - 1,
      vy: 2 + Math.random() * 2,
      life: 20 + Math.random() * 10,
      maxLife: 30,
      size: 4 + Math.random() * 4,
      color: '#7f8c8d',
      type: 'exhaust'
    });
  }

  private createSparkParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        id: this.state.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 15,
        maxLife: 15,
        size: 3,
        color: '#f39c12',
        type: 'spark'
      });
    }
  }

  private createCrashParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.state.particles.push({
        id: this.state.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        size: 4 + Math.random() * 6,
        color: ['#e74c3c', '#e67e22', '#95a5a6'][Math.floor(Math.random() * 3)],
        type: 'smoke'
      });
    }
  }

  private createCollectParticles(x: number, y: number, type: string): void {
    const color = type === 'fuel' ? '#2ecc71' : type === 'coin' ? '#f39c12' : '#9b59b6';
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.state.particles.push({
        id: this.state.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 20,
        maxLife: 20,
        size: 4,
        color,
        type: 'spark'
      });
    }
  }

  private checkCollision(
    x1: number,
    y1: number,
    w1: number,
    h1: number,
    x2: number,
    y2: number,
    w2: number,
    h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
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

  public wheelie(): void {
    if (this.state.player.isWheeling === 0) {
      this.state.player.isWheeling = 1;
      this.state.player.wheelieTimer = 0;
    }
  }

  public handleKeyDown(key: string): void {
    if (this.state.gameOver || this.state.paused) return;

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
        this.wheelie();
        break;
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public pause(): void {
    this.state.paused = !this.state.paused;
  }

  public cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
