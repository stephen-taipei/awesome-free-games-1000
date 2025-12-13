/**
 * Zoo Escape Game Logic
 * Game #446 - Zoo-themed endless runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isGrounded: boolean;
  isSliding: boolean;
  animal: 'monkey' | 'elephant' | 'giraffe';
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cage' | 'zookeeper' | 'fence' | 'tree';
  passed: boolean;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'banana' | 'peanut' | 'leaf';
  collected: boolean;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameOver';
  score: number;
  highScore: number;
  distance: number;
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  gameSpeed: number;
  groundY: number;
}

const GRAVITY = 0.7;
const JUMP_FORCE = -14;

export class ZooEscapeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth = 600;
  private canvasHeight = 400;
  private obstacleId = 0;
  private collectibleId = 0;
  private spawnTimer = 0;
  private gameTime = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem('zooEscapeHighScore');
    const groundY = 320;

    return {
      phase: 'idle',
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      player: {
        x: 80,
        y: groundY - 50,
        width: 40,
        height: 50,
        velocityY: 0,
        isGrounded: true,
        isSliding: false,
        animal: 'monkey',
      },
      obstacles: [],
      collectibles: [],
      gameSpeed: 6,
      groundY,
    };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.groundY = height - 80;
  }

  start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: 'playing',
      groundY: this.canvasHeight - 80,
    };
    this.state.player.y = this.state.groundY - 50;
    this.obstacleId = 0;
    this.collectibleId = 0;
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.emitState();
  }

  jump(): void {
    if (this.state.phase !== 'playing') return;
    const player = this.state.player;

    if (player.isGrounded && !player.isSliding) {
      player.velocityY = JUMP_FORCE;
      player.isGrounded = false;
    }
    this.emitState();
  }

  slide(active: boolean): void {
    if (this.state.phase !== 'playing') return;
    const player = this.state.player;

    if (active && player.isGrounded) {
      player.isSliding = true;
      player.height = 25;
    } else {
      player.isSliding = false;
      player.height = 50;
    }
    this.emitState();
  }

  switchAnimal(): void {
    if (this.state.phase !== 'playing') return;
    const animals: Array<'monkey' | 'elephant' | 'giraffe'> = ['monkey', 'elephant', 'giraffe'];
    const currentIdx = animals.indexOf(this.state.player.animal);
    this.state.player.animal = animals[(currentIdx + 1) % animals.length];
    this.emitState();
  }

  update(): void {
    if (this.state.phase !== 'playing') return;

    this.gameTime++;
    const player = this.state.player;

    // Increase speed over time
    this.state.gameSpeed = 6 + Math.floor(this.gameTime / 500) * 0.5;

    // Update distance
    this.state.distance += this.state.gameSpeed / 10;

    // Physics
    if (!player.isGrounded) {
      player.velocityY += GRAVITY;
      player.y += player.velocityY;
    }

    // Ground collision
    const groundLevel = this.state.groundY - player.height;
    if (player.y >= groundLevel) {
      player.y = groundLevel;
      player.velocityY = 0;
      player.isGrounded = true;
    }

    // Update obstacles
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= this.state.gameSpeed;
      if (!obs.passed && obs.x + obs.width < player.x) {
        obs.passed = true;
        this.state.score += 10;
      }
      return obs.x > -obs.width;
    });

    // Update collectibles
    this.state.collectibles = this.state.collectibles.filter(col => {
      col.x -= this.state.gameSpeed;
      if (!col.collected && this.isCollectibleCollision(player, col)) {
        col.collected = true;
        this.state.score += col.type === 'banana' ? 5 : col.type === 'peanut' ? 10 : 15;
      }
      return col.x > -20 && !col.collected;
    });

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= 90) {
      this.spawnObstacle();
      if (Math.random() > 0.4) this.spawnCollectible();
      this.spawnTimer = 0;
    }

    // Check collisions
    for (const obs of this.state.obstacles) {
      if (this.isObstacleCollision(player, obs)) {
        this.gameOver();
        return;
      }
    }

    this.emitState();
  }

  private isObstacleCollision(player: Player, obs: Obstacle): boolean {
    // Smaller hitbox for fairness
    const px = player.x + 5;
    const py = player.y + 5;
    const pw = player.width - 10;
    const ph = player.height - 10;

    return px < obs.x + obs.width &&
           px + pw > obs.x &&
           py < obs.y + obs.height &&
           py + ph > obs.y;
  }

  private isCollectibleCollision(player: Player, col: Collectible): boolean {
    const dx = (player.x + player.width / 2) - col.x;
    const dy = (player.y + player.height / 2) - col.y;
    return Math.hypot(dx, dy) < 30;
  }

  private spawnObstacle(): void {
    const types: Array<'cage' | 'zookeeper' | 'fence' | 'tree'> = ['cage', 'zookeeper', 'fence', 'tree'];
    const type = types[Math.floor(Math.random() * types.length)];
    const groundY = this.state.groundY;

    let obs: Obstacle;
    switch (type) {
      case 'cage':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 60, width: 50, height: 60, type, passed: false };
        break;
      case 'zookeeper':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 70, width: 35, height: 70, type, passed: false };
        break;
      case 'fence':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 40, width: 60, height: 40, type, passed: false };
        break;
      default:
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 100, width: 40, height: 100, type, passed: false };
    }
    this.state.obstacles.push(obs);
  }

  private spawnCollectible(): void {
    const types: Array<'banana' | 'peanut' | 'leaf'> = ['banana', 'peanut', 'leaf'];
    const type = types[Math.floor(Math.random() * types.length)];
    const heights = [this.state.groundY - 50, this.state.groundY - 100, this.state.groundY - 150];

    this.state.collectibles.push({
      id: this.collectibleId++,
      x: this.canvasWidth + 50,
      y: heights[Math.floor(Math.random() * heights.length)],
      type,
      collected: false,
    });
  }

  private gameOver(): void {
    this.state.phase = 'gameOver';
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem('zooEscapeHighScore', this.state.highScore.toString());
    }
    this.emitState();
  }

  getState(): GameState {
    return this.state;
  }

  destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
