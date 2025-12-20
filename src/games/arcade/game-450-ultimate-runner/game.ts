/**
 * Ultimate Runner Game Logic
 * Game #450 - Ultimate endless runner challenge with multiple mechanics
 */

export type PowerUpType = 'speed' | 'magnet' | 'shield' | 'double';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isGrounded: boolean;
  isSliding: boolean;
  lane: number;
  powerUp: PowerUpType | null;
  powerUpTime: number;
  multiplier: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  type: 'barrier' | 'spike' | 'beam' | 'wall';
  passed: boolean;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  lane: number;
  type: 'coin' | 'gem' | 'powerup';
  powerUpType?: PowerUpType;
  collected: boolean;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameOver';
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  gameSpeed: number;
  groundY: number;
  lanePositions: number[];
  combo: number;
  comboTimer: number;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const LANE_WIDTH = 70;

export class UltimateRunnerGame {
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
    const savedHighScore = localStorage.getItem('ultimateRunnerHighScore');
    const groundY = 320;
    const centerX = 300;
    const lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];

    return {
      phase: 'idle',
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      distance: 0,
      coins: 0,
      player: {
        x: centerX - 20,
        y: groundY - 50,
        width: 35,
        height: 50,
        velocityY: 0,
        isGrounded: true,
        isSliding: false,
        lane: 1,
        powerUp: null,
        powerUpTime: 0,
        multiplier: 1,
      },
      obstacles: [],
      collectibles: [],
      gameSpeed: 8,
      groundY,
      lanePositions,
      combo: 0,
      comboTimer: 0,
    };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.groundY = height - 80;
    const centerX = width / 2;
    this.state.lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];
    this.state.player.x = this.state.lanePositions[this.state.player.lane] - 17;
  }

  start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: 'playing',
      groundY: this.canvasHeight - 80,
    };
    const centerX = this.canvasWidth / 2;
    this.state.lanePositions = [centerX - LANE_WIDTH, centerX, centerX + LANE_WIDTH];
    this.state.player.x = this.state.lanePositions[1] - 17;
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

  moveLeft(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
      this.state.player.x = this.state.lanePositions[this.state.player.lane] - 17;
    }
    this.emitState();
  }

  moveRight(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
      this.state.player.x = this.state.lanePositions[this.state.player.lane] - 17;
    }
    this.emitState();
  }

  update(): void {
    if (this.state.phase !== 'playing') return;

    this.gameTime++;
    const player = this.state.player;

    // Speed increases over time, faster with speed powerup
    const speedBonus = player.powerUp === 'speed' ? 3 : 0;
    this.state.gameSpeed = 8 + Math.floor(this.gameTime / 300) * 0.5 + speedBonus;
    this.state.distance += this.state.gameSpeed / 10;

    // Power-up timer
    if (player.powerUpTime > 0) {
      player.powerUpTime -= 1 / 60;
      if (player.powerUpTime <= 0) {
        player.powerUp = null;
        player.multiplier = 1;
      }
    }

    // Combo timer
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= 1 / 60;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 0;
      }
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
        this.state.score += 10 * player.multiplier;
        this.state.combo++;
        this.state.comboTimer = 2;
      }
      return obs.x > -obs.width;
    });

    // Update collectibles
    const magnetRange = player.powerUp === 'magnet' ? 100 : 30;
    this.state.collectibles = this.state.collectibles.filter(col => {
      col.x -= this.state.gameSpeed;

      // Magnet effect
      if (player.powerUp === 'magnet' && !col.collected) {
        const dx = (player.x + player.width / 2) - col.x;
        const dy = (player.y + player.height / 2) - col.y;
        const dist = Math.hypot(dx, dy);
        if (dist < magnetRange && dist > 5) {
          col.x += (dx / dist) * 8;
          col.y += (dy / dist) * 8;
        }
      }

      if (!col.collected && this.isCollectibleCollision(player, col, magnetRange)) {
        col.collected = true;
        this.state.combo++;
        this.state.comboTimer = 2;

        if (col.type === 'coin') {
          this.state.coins++;
          this.state.score += 5 * player.multiplier;
        } else if (col.type === 'gem') {
          this.state.coins += 5;
          this.state.score += 25 * player.multiplier;
        } else if (col.type === 'powerup' && col.powerUpType) {
          player.powerUp = col.powerUpType;
          player.powerUpTime = 8;
          if (col.powerUpType === 'double') {
            player.multiplier = 2;
          }
        }
      }
      return col.x > -20 && !col.collected;
    });

    // Spawn
    this.spawnTimer++;
    if (this.spawnTimer >= 60) {
      this.spawnObstacle();
      if (Math.random() > 0.3) this.spawnCollectible();
      this.spawnTimer = 0;
    }

    // Check collisions
    for (const obs of this.state.obstacles) {
      if (this.isObstacleCollision(player, obs)) {
        if (player.powerUp === 'shield') {
          player.powerUp = null;
          player.powerUpTime = 0;
          obs.passed = true;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    this.emitState();
  }

  private isObstacleCollision(player: Player, obs: Obstacle): boolean {
    if (player.lane !== obs.lane) return false;
    const px = player.x + 5;
    const py = player.y + 5;
    const pw = player.width - 10;
    const ph = player.height - 10;

    return px < obs.x + obs.width &&
           px + pw > obs.x &&
           py < obs.y + obs.height &&
           py + ph > obs.y;
  }

  private isCollectibleCollision(player: Player, col: Collectible, range: number): boolean {
    const dx = (player.x + player.width / 2) - col.x;
    const dy = (player.y + player.height / 2) - col.y;
    return Math.hypot(dx, dy) < range;
  }

  private spawnObstacle(): void {
    const types: Array<'barrier' | 'spike' | 'beam' | 'wall'> = ['barrier', 'spike', 'beam', 'wall'];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * 3);
    const groundY = this.state.groundY;
    const laneX = this.state.lanePositions[lane];

    let obs: Obstacle;
    switch (type) {
      case 'barrier':
        obs = { id: this.obstacleId++, x: laneX - 25, y: groundY - 50, width: 50, height: 50, lane, type, passed: false };
        break;
      case 'spike':
        obs = { id: this.obstacleId++, x: laneX - 20, y: groundY - 35, width: 40, height: 35, lane, type, passed: false };
        break;
      case 'beam':
        obs = { id: this.obstacleId++, x: laneX - 30, y: groundY - 100, width: 60, height: 15, lane, type, passed: false };
        break;
      default:
        obs = { id: this.obstacleId++, x: laneX - 25, y: groundY - 80, width: 50, height: 80, lane, type, passed: false };
    }
    obs.x += this.canvasWidth / 2;
    this.state.obstacles.push(obs);
  }

  private spawnCollectible(): void {
    const lane = Math.floor(Math.random() * 3);
    const heights = [this.state.groundY - 40, this.state.groundY - 90, this.state.groundY - 140];
    const rand = Math.random();

    let col: Collectible;
    if (rand > 0.9) {
      const powerUps: PowerUpType[] = ['speed', 'magnet', 'shield', 'double'];
      col = {
        id: this.collectibleId++,
        x: this.state.lanePositions[lane] + this.canvasWidth / 2,
        y: heights[Math.floor(Math.random() * heights.length)],
        lane,
        type: 'powerup',
        powerUpType: powerUps[Math.floor(Math.random() * powerUps.length)],
        collected: false,
      };
    } else if (rand > 0.7) {
      col = {
        id: this.collectibleId++,
        x: this.state.lanePositions[lane] + this.canvasWidth / 2,
        y: heights[Math.floor(Math.random() * heights.length)],
        lane,
        type: 'gem',
        collected: false,
      };
    } else {
      col = {
        id: this.collectibleId++,
        x: this.state.lanePositions[lane] + this.canvasWidth / 2,
        y: heights[Math.floor(Math.random() * heights.length)],
        lane,
        type: 'coin',
        collected: false,
      };
    }
    this.state.collectibles.push(col);
  }

  private gameOver(): void {
    this.state.phase = 'gameOver';
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem('ultimateRunnerHighScore', this.state.highScore.toString());
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
