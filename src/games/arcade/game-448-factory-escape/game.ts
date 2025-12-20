/**
 * Factory Escape Game Logic
 * Game #448 - Factory-themed endless runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isGrounded: boolean;
  isSliding: boolean;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'crate' | 'machine' | 'pipe' | 'gear' | 'steam';
  passed: boolean;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'bolt' | 'gear' | 'battery';
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

const GRAVITY = 0.75;
const JUMP_FORCE = -14;

export class FactoryEscapeGame {
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
    const savedHighScore = localStorage.getItem('factoryEscapeHighScore');
    const groundY = 320;

    return {
      phase: 'idle',
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      player: {
        x: 80,
        y: groundY - 50,
        width: 35,
        height: 50,
        velocityY: 0,
        isGrounded: true,
        isSliding: false,
      },
      obstacles: [],
      collectibles: [],
      gameSpeed: 7,
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

  update(): void {
    if (this.state.phase !== 'playing') return;

    this.gameTime++;
    const player = this.state.player;

    this.state.gameSpeed = 7 + Math.floor(this.gameTime / 400) * 0.6;
    this.state.distance += this.state.gameSpeed / 10;

    // Physics
    if (!player.isGrounded) {
      player.velocityY += GRAVITY;
      player.y += player.velocityY;
    }

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
        this.state.score += col.type === 'bolt' ? 5 : col.type === 'gear' ? 10 : 20;
      }
      return col.x > -20 && !col.collected;
    });

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= 80) {
      this.spawnObstacle();
      if (Math.random() > 0.35) this.spawnCollectible();
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
    const types: Array<'crate' | 'machine' | 'pipe' | 'gear' | 'steam'> = ['crate', 'machine', 'pipe', 'gear', 'steam'];
    const type = types[Math.floor(Math.random() * types.length)];
    const groundY = this.state.groundY;

    let obs: Obstacle;
    switch (type) {
      case 'crate':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 50, width: 50, height: 50, type, passed: false };
        break;
      case 'machine':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 80, width: 60, height: 80, type, passed: false };
        break;
      case 'pipe':
        // Low pipe - need to jump
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 40, width: 80, height: 40, type, passed: false };
        break;
      case 'gear':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 70, width: 45, height: 70, type, passed: false };
        break;
      default:
        // Steam from ceiling - need to slide
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: 0, width: 60, height: groundY - 30, type, passed: false };
    }
    this.state.obstacles.push(obs);
  }

  private spawnCollectible(): void {
    const types: Array<'bolt' | 'gear' | 'battery'> = ['bolt', 'gear', 'battery'];
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
      localStorage.setItem('factoryEscapeHighScore', this.state.highScore.toString());
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
