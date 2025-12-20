/**
 * Lab Escape Game Logic
 * Game #449 - Laboratory-themed endless runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isGrounded: boolean;
  isSliding: boolean;
  shield: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'laser' | 'chemical' | 'robot' | 'electricity' | 'gas';
  passed: boolean;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'serum' | 'data' | 'antidote';
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

export class LabEscapeGame {
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
    const savedHighScore = localStorage.getItem('labEscapeHighScore');
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
        shield: 0,
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

    this.state.gameSpeed = 7 + Math.floor(this.gameTime / 350) * 0.5;
    this.state.distance += this.state.gameSpeed / 10;

    // Shield decay
    if (player.shield > 0) {
      player.shield -= 0.02;
    }

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
        if (col.type === 'serum') {
          this.state.score += 5;
        } else if (col.type === 'data') {
          this.state.score += 15;
        } else {
          player.shield = 3; // 3 seconds of shield
          this.state.score += 10;
        }
      }
      return col.x > -20 && !col.collected;
    });

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= 75) {
      this.spawnObstacle();
      if (Math.random() > 0.4) this.spawnCollectible();
      this.spawnTimer = 0;
    }

    // Check collisions
    for (const obs of this.state.obstacles) {
      if (this.isObstacleCollision(player, obs)) {
        if (player.shield > 0) {
          player.shield = 0;
          obs.passed = true;
          this.state.score += 5;
        } else {
          this.gameOver();
          return;
        }
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
    const types: Array<'laser' | 'chemical' | 'robot' | 'electricity' | 'gas'> = ['laser', 'chemical', 'robot', 'electricity', 'gas'];
    const type = types[Math.floor(Math.random() * types.length)];
    const groundY = this.state.groundY;

    let obs: Obstacle;
    switch (type) {
      case 'laser':
        // Horizontal laser - need to jump
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 30, width: 80, height: 10, type, passed: false };
        break;
      case 'chemical':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 50, width: 40, height: 50, type, passed: false };
        break;
      case 'robot':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 70, width: 50, height: 70, type, passed: false };
        break;
      case 'electricity':
        // Vertical electricity - need to slide
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: 50, width: 20, height: groundY - 80, type, passed: false };
        break;
      default:
        // Gas cloud from top
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: 0, width: 70, height: groundY - 30, type, passed: false };
    }
    this.state.obstacles.push(obs);
  }

  private spawnCollectible(): void {
    const types: Array<'serum' | 'data' | 'antidote'> = ['serum', 'serum', 'data', 'antidote'];
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
      localStorage.setItem('labEscapeHighScore', this.state.highScore.toString());
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
