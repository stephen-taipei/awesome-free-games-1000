/**
 * Color Blocks Game Logic
 * Game #206 - Fast-paced same-color block clearing
 */

export type BlockColor = "red" | "blue" | "green" | "yellow" | "purple" | null;

export interface Block {
  color: BlockColor;
  x: number;
  y: number;
  falling: boolean;
  fallOffset: number;
}

export interface GameState {
  grid: Block[][];
  score: number;
  combo: number;
  level: number;
  timeLeft: number;
  status: "idle" | "playing" | "gameOver";
  selectedBlocks: { x: number; y: number }[];
}

const COLORS: BlockColor[] = ["red", "blue", "green", "yellow", "purple"];
const COLOR_HEX: Record<string, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#27ae60",
  yellow: "#f1c40f",
  purple: "#9b59b6",
};

const GRID_WIDTH = 10;
const GRID_HEIGHT = 12;
const GAME_TIME = 60; // seconds

export class ColorBlocksGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private timerInterval: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      grid: this.createGrid(),
      score: 0,
      combo: 0,
      level: 1,
      timeLeft: GAME_TIME,
      status: "idle",
      selectedBlocks: [],
    };
  }

  private createGrid(): Block[][] {
    const grid: Block[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: Block[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        row.push({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          x,
          y,
          falling: false,
          fallOffset: 0,
        });
      }
      grid.push(row);
    }
    return grid;
  }

  public start(): void {
    this.state = {
      grid: this.createGrid(),
      score: 0,
      combo: 0,
      level: 1,
      timeLeft: GAME_TIME,
      status: "playing",
      selectedBlocks: [],
    };

    this.startTimer();
    this.emitState();
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      if (this.state.status !== "playing") return;

      this.state.timeLeft--;

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }

      this.emitState();
    }, 1000);
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public getColorHex(color: BlockColor): string {
    return color ? COLOR_HEX[color] : "transparent";
  }

  public getGridSize(): { width: number; height: number } {
    return { width: GRID_WIDTH, height: GRID_HEIGHT };
  }

  public clickBlock(x: number, y: number): boolean {
    if (this.state.status !== "playing") return false;

    const block = this.state.grid[y]?.[x];
    if (!block || !block.color) return false;

    // Find all connected blocks of the same color
    const connected = this.findConnected(x, y, block.color);

    if (connected.length < 3) {
      this.state.combo = 0;
      this.emitState();
      return false;
    }

    // Clear the blocks
    this.state.selectedBlocks = connected;
    this.emitState();

    // Calculate score
    this.state.combo++;
    const baseScore = connected.length * 10;
    const comboBonus = Math.floor(baseScore * (this.state.combo * 0.5));
    this.state.score += baseScore + comboBonus;

    // Remove blocks after short delay for visual effect
    setTimeout(() => {
      this.clearBlocks(connected);
      this.dropBlocks();
      this.fillEmpty();
      this.state.selectedBlocks = [];

      // Check level up
      if (this.state.score >= this.state.level * 500) {
        this.state.level++;
      }

      this.emitState();
    }, 150);

    return true;
  }

  private findConnected(startX: number, startY: number, color: BlockColor): { x: number; y: number }[] {
    const visited = new Set<string>();
    const result: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;

      const block = this.state.grid[y][x];
      if (!block || block.color !== color) continue;

      visited.add(key);
      result.push({ x, y });

      // Add neighbors
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }

    return result;
  }

  private clearBlocks(blocks: { x: number; y: number }[]): void {
    for (const { x, y } of blocks) {
      this.state.grid[y][x].color = null;
    }
  }

  private dropBlocks(): void {
    for (let x = 0; x < GRID_WIDTH; x++) {
      let writeY = GRID_HEIGHT - 1;

      for (let readY = GRID_HEIGHT - 1; readY >= 0; readY--) {
        if (this.state.grid[readY][x].color !== null) {
          if (readY !== writeY) {
            this.state.grid[writeY][x].color = this.state.grid[readY][x].color;
            this.state.grid[readY][x].color = null;
          }
          writeY--;
        }
      }
    }
  }

  private fillEmpty(): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.state.grid[y][x].color === null) {
          this.state.grid[y][x].color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
      }
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
