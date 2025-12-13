/**
 * Farm Run Game Logic
 * Game #447 - Farm-themed endless runner
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isGrounded: boolean;
  lane: number; // 0, 1, 2
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'haybale' | 'tractor' | 'fence' | 'cow';
  passed: boolean;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  lane: number;
  type: 'corn' | 'carrot' | 'egg';
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
  lanePositions: number[];
}

const GRAVITY = 0.8;
const JUMP_FORCE = -13;
const LANE_WIDTH = 80;

export class FarmRunGame {
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
    const savedHighScore = localStorage.getItem('farmRunHighScore');
    const groundY = 320;
    const centerX = 300;
    const lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];

    return {
      phase: 'idle',
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      player: {
        x: centerX - 20,
        y: groundY - 50,
        width: 40,
        height: 50,
        velocityY: 0,
        isGrounded: true,
        lane: 1,
      },
      obstacles: [],
      collectibles: [],
      gameSpeed: 7,
      groundY,
      lanePositions,
    };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.groundY = height - 80;
    const centerX = width / 2;
    this.state.lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];
    this.state.player.x = this.state.lanePositions[this.state.player.lane] - 20;
  }

  start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: 'playing',
      groundY: this.canvasHeight - 80,
    };
    const centerX = this.canvasWidth / 2;
    this.state.lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];
    this.state.player.x = this.state.lanePositions[1] - 20;
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

    if (player.isGrounded) {
      player.velocityY = JUMP_FORCE;
      player.isGrounded = false;
    }
    this.emitState();
  }

  moveLeft(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
      this.state.player.x = this.state.lanePositions[this.state.player.lane] - 20;
    }
    this.emitState();
  }

  moveRight(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
      this.state.player.x = this.state.lanePositions[this.state.player.lane] - 20;
    }
    this.emitState();
  }

  update(): void {
    if (this.state.phase !== 'playing') return;

    this.gameTime++;
    const player = this.state.player;

    this.state.gameSpeed = 7 + Math.floor(this.gameTime / 400) * 0.5;
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
        this.state.score += col.type === 'corn' ? 5 : col.type === 'carrot' ? 10 : 15;
      }
      return col.x > -20 && !col.collected;
    });

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= 70) {
      this.spawnObstacle();
      if (Math.random() > 0.3) this.spawnCollectible();
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
    if (player.lane !== obs.lane) return false;
    const px = player.x + 8;
    const py = player.y + 5;
    const pw = player.width - 16;
    const ph = player.height - 10;

    return px < obs.x + obs.width &&
           px + pw > obs.x &&
           py < obs.y + obs.height &&
           py + ph > obs.y;
  }

  private isCollectibleCollision(player: Player, col: Collectible): boolean {
    if (player.lane !== col.lane) return false;
    const dx = (player.x + player.width / 2) - col.x;
    const dy = (player.y + player.height / 2) - col.y;
    return Math.hypot(dx, dy) < 35;
  }

  private spawnObstacle(): void {
    const types: Array<'haybale' | 'tractor' | 'fence' | 'cow'> = ['haybale', 'tractor', 'fence', 'cow'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    const groundY = this.state.groundY;
    const laneX = this.state.lanePositions[lane];

    let obs: Obstacle;
    switch (type) {
      case 'haybale':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 45, width: 50, height: 45, lane, type, passed: false };
        break;
      case 'tractor':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 60, width: 70, height: 60, lane, type, passed: false };
        break;
      case 'fence':
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 35, width: 45, height: 35, lane, type, passed: false };
        break;
      default:
        obs = { id: this.obstacleId++, x: this.canvasWidth + 50, y: groundY - 50, width: 50, height: 50, lane, type, passed: false };
    }
    obs.x = laneX - obs.width / 2 + this.canvasWidth / 2;
    this.state.obstacles.push(obs);
  }

  private spawnCollectible(): void {
    const types: Array<'corn' | 'carrot' | 'egg'> = ['corn', 'carrot', 'egg'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    const heights = [this.state.groundY - 40, this.state.groundY - 90, this.state.groundY - 140];

    this.state.collectibles.push({
      id: this.collectibleId++,
      x: this.state.lanePositions[lane] + this.canvasWidth / 2,
      y: heights[Math.floor(Math.random() * heights.length)],
      lane,
      type,
      collected: false,
    });
  }

  private gameOver(): void {
    this.state.phase = 'gameOver';
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem('farmRunHighScore', this.state.highScore.toString());
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
