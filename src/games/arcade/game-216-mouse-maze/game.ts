/**
 * Mouse Maze Game Logic
 * Game #216 - Navigate maze without touching walls
 */

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MazeLevel {
  walls: Wall[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
}

export interface GameState {
  phase: "idle" | "playing" | "hitWall" | "levelComplete" | "gameOver";
  level: number;
  lives: number;
  time: number;
  mouseX: number;
  mouseY: number;
  started: boolean;
}

const MAX_LIVES = 3;
const CURSOR_RADIUS = 8;
const GOAL_RADIUS = 20;

export class MouseMazeGame {
  state: GameState;
  currentMaze: MazeLevel | null = null;
  onStateChange: ((state: GameState) => void) | null = null;
  private timerInterval: number | null = null;
  private canvasWidth: number = 450;
  private canvasHeight: number = 400;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      level: 1,
      lives: MAX_LIVES,
      time: 0,
      mouseX: 0,
      mouseY: 0,
      started: false,
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
    };
    this.generateMaze(1);
    this.startTimer();
    this.emitState();
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      this.state.time++;
      this.emitState();
    }, 1000);
  }

  private generateMaze(level: number): void {
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    const walls: Wall[] = [];

    // Border walls
    const borderThickness = 10;
    walls.push({ x: 0, y: 0, width: w, height: borderThickness }); // Top
    walls.push({ x: 0, y: h - borderThickness, width: w, height: borderThickness }); // Bottom
    walls.push({ x: 0, y: 0, width: borderThickness, height: h }); // Left
    walls.push({ x: w - borderThickness, y: 0, width: borderThickness, height: h }); // Right

    // Generate internal walls based on level
    const numWalls = 3 + level * 2;
    const wallThickness = 15;

    for (let i = 0; i < numWalls; i++) {
      const isHorizontal = Math.random() > 0.5;
      const length = 60 + Math.random() * (100 + level * 20);

      if (isHorizontal) {
        const x = borderThickness + 30 + Math.random() * (w - length - borderThickness * 2 - 60);
        const y = borderThickness + 40 + Math.random() * (h - borderThickness * 2 - 80);
        walls.push({ x, y, width: length, height: wallThickness });
      } else {
        const x = borderThickness + 40 + Math.random() * (w - borderThickness * 2 - 80);
        const y = borderThickness + 30 + Math.random() * (h - length - borderThickness * 2 - 60);
        walls.push({ x, y, width: wallThickness, height: length });
      }
    }

    // Start and goal positions
    const start = {
      x: borderThickness + 40,
      y: h / 2,
    };

    const goal = {
      x: w - borderThickness - 40,
      y: h / 2,
    };

    this.currentMaze = { walls, start, goal };
    this.state.mouseX = start.x;
    this.state.mouseY = start.y;
    this.state.started = false;
  }

  public updateMousePosition(x: number, y: number): void {
    if (this.state.phase !== "playing") return;

    // Check if cursor entered the start zone
    if (!this.state.started) {
      const distToStart = Math.sqrt(
        (x - this.currentMaze!.start.x) ** 2 +
        (y - this.currentMaze!.start.y) ** 2
      );
      if (distToStart < 30) {
        this.state.started = true;
      }
      this.state.mouseX = x;
      this.state.mouseY = y;
      this.emitState();
      return;
    }

    this.state.mouseX = x;
    this.state.mouseY = y;

    // Check wall collision
    if (this.checkWallCollision(x, y)) {
      this.handleWallHit();
      return;
    }

    // Check goal reached
    if (this.checkGoalReached(x, y)) {
      this.handleLevelComplete();
      return;
    }

    this.emitState();
  }

  private checkWallCollision(x: number, y: number): boolean {
    if (!this.currentMaze) return false;

    for (const wall of this.currentMaze.walls) {
      if (
        x + CURSOR_RADIUS > wall.x &&
        x - CURSOR_RADIUS < wall.x + wall.width &&
        y + CURSOR_RADIUS > wall.y &&
        y - CURSOR_RADIUS < wall.y + wall.height
      ) {
        return true;
      }
    }
    return false;
  }

  private checkGoalReached(x: number, y: number): boolean {
    if (!this.currentMaze) return false;

    const dist = Math.sqrt(
      (x - this.currentMaze.goal.x) ** 2 +
      (y - this.currentMaze.goal.y) ** 2
    );
    return dist < GOAL_RADIUS;
  }

  private handleWallHit(): void {
    this.state.lives--;

    if (this.state.lives <= 0) {
      this.state.phase = "gameOver";
      this.stopTimer();
    } else {
      this.state.phase = "hitWall";
      this.state.started = false;

      // Reset to start position after delay
      setTimeout(() => {
        if (this.state.phase === "hitWall") {
          this.state.phase = "playing";
          this.state.mouseX = this.currentMaze!.start.x;
          this.state.mouseY = this.currentMaze!.start.y;
          this.emitState();
        }
      }, 1000);
    }

    this.emitState();
  }

  private handleLevelComplete(): void {
    this.state.phase = "levelComplete";
    this.emitState();
  }

  public nextLevel(): void {
    this.state.level++;
    this.state.phase = "playing";
    this.generateMaze(this.state.level);
    this.emitState();
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public getMaze(): MazeLevel | null {
    return this.currentMaze;
  }

  public getState(): GameState {
    return this.state;
  }

  public getCursorRadius(): number {
    return CURSOR_RADIUS;
  }

  public getGoalRadius(): number {
    return GOAL_RADIUS;
  }

  public destroy(): void {
    this.stopTimer();
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
