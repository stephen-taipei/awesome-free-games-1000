/**
 * Brick Stacker Game Logic
 * Game #219 - Stack bricks to build the highest tower
 */

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  placed: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  currentBrick: Brick | null;
  placedBricks: Brick[];
  direction: 1 | -1;
  speed: number;
  perfectStreak: number;
}

const BRICK_HEIGHT = 25;
const INITIAL_WIDTH = 120;
const INITIAL_SPEED = 3;
const MAX_SPEED = 8;
const PERFECT_THRESHOLD = 5;

const COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e91e63",
  "#00bcd4",
  "#8bc34a",
];

export class BrickStackerGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 350;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("brickStackerHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      currentBrick: null,
      placedBricks: [],
      direction: 1,
      speed: INITIAL_SPEED,
      perfectStreak: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      placedBricks: [
        {
          x: this.canvasWidth / 2 - INITIAL_WIDTH / 2,
          y: this.canvasHeight - BRICK_HEIGHT - 50,
          width: INITIAL_WIDTH,
          height: BRICK_HEIGHT,
          color: COLORS[0],
          placed: true,
        },
      ],
    };

    this.spawnBrick();
    this.emitState();
  }

  private spawnBrick(): void {
    const lastBrick = this.state.placedBricks[this.state.placedBricks.length - 1];
    const colorIndex = this.state.placedBricks.length % COLORS.length;

    this.state.currentBrick = {
      x: this.state.direction === 1 ? -lastBrick.width : this.canvasWidth,
      y: lastBrick.y - BRICK_HEIGHT,
      width: lastBrick.width,
      height: BRICK_HEIGHT,
      color: COLORS[colorIndex],
      placed: false,
    };

    // Increase speed based on score
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.score * 0.15);
  }

  public update(): void {
    if (this.state.phase !== "playing" || !this.state.currentBrick) return;

    const brick = this.state.currentBrick;

    // Move brick
    brick.x += this.state.speed * this.state.direction;

    // Reverse direction at edges
    if (brick.x + brick.width > this.canvasWidth) {
      this.state.direction = -1;
    } else if (brick.x < 0) {
      this.state.direction = 1;
    }

    this.emitState();
  }

  public placeBrick(): void {
    if (this.state.phase !== "playing" || !this.state.currentBrick) return;

    const current = this.state.currentBrick;
    const last = this.state.placedBricks[this.state.placedBricks.length - 1];

    // Calculate overlap
    const overlapLeft = Math.max(current.x, last.x);
    const overlapRight = Math.min(current.x + current.width, last.x + last.width);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // No overlap - game over
      this.gameOver();
      return;
    }

    // Check for perfect placement
    const isPerfect = Math.abs(current.x - last.x) < PERFECT_THRESHOLD;

    if (isPerfect) {
      this.state.perfectStreak++;
      // Perfect placement - keep same width and add bonus
      current.x = last.x;
      this.state.score += 2;
    } else {
      this.state.perfectStreak = 0;
      // Trim the brick to the overlap area
      current.x = overlapLeft;
      current.width = overlapWidth;
      this.state.score += 1;
    }

    current.placed = true;
    this.state.placedBricks.push({ ...current });

    // Spawn new brick
    this.state.direction = Math.random() > 0.5 ? 1 : -1;
    this.spawnBrick();

    this.emitState();
  }

  private gameOver(): void {
    this.state.phase = "gameOver";
    this.state.currentBrick = null;

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("brickStackerHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getCameraOffset(): number {
    if (this.state.placedBricks.length <= 5) return 0;

    const topBrick = this.state.placedBricks[this.state.placedBricks.length - 1];
    const targetY = this.canvasHeight - 200;
    return Math.max(0, targetY - topBrick.y);
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
