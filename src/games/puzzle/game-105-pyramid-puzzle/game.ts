/**
 * Pyramid Puzzle Game Logic
 * Game #105 - Triangle grid puzzle where clicking flips adjacent triangles
 */

export interface Triangle {
  row: number;
  col: number;
  color: number; // 0 or 1
  pointUp: boolean;
}

export interface Level {
  id: number;
  rows: number;
  initial: number[][]; // 2D array of colors (0 or 1)
  targetColor: number;
}

export interface GameState {
  triangles: Triangle[][];
  level: number;
  moves: number;
  targetColor: number;
  rows: number;
  status: "playing" | "won";
}

const COLORS = ["#f39c12", "#9b59b6"]; // Gold and Purple

// Generate triangles for a pyramid with n rows
function generatePyramid(rows: number, initial: number[][]): Triangle[][] {
  const result: Triangle[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowTriangles: Triangle[] = [];
    const trianglesInRow = row * 2 + 1;

    for (let col = 0; col < trianglesInRow; col++) {
      const pointUp = col % 2 === 0;
      const color = initial[row]?.[col] ?? 0;
      rowTriangles.push({ row, col, color, pointUp });
    }
    result.push(rowTriangles);
  }

  return result;
}

const LEVELS: Level[] = [
  // Level 1: Simple 2-row pyramid
  {
    id: 1,
    rows: 2,
    initial: [
      [1],
      [0, 1, 0],
    ],
    targetColor: 0,
  },
  // Level 2: 2-row pyramid different pattern
  {
    id: 2,
    rows: 2,
    initial: [
      [0],
      [1, 0, 1],
    ],
    targetColor: 1,
  },
  // Level 3: 3-row pyramid
  {
    id: 3,
    rows: 3,
    initial: [
      [1],
      [0, 1, 0],
      [1, 0, 1, 0, 1],
    ],
    targetColor: 0,
  },
  // Level 4: 3-row pyramid mixed
  {
    id: 4,
    rows: 3,
    initial: [
      [0],
      [1, 1, 1],
      [0, 0, 0, 0, 0],
    ],
    targetColor: 1,
  },
  // Level 5: 4-row pyramid
  {
    id: 5,
    rows: 4,
    initial: [
      [1],
      [0, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0, 1, 0],
    ],
    targetColor: 0,
  },
  // Level 6: 4-row pyramid challenge
  {
    id: 6,
    rows: 4,
    initial: [
      [0],
      [1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1],
    ],
    targetColor: 1,
  },
  // Level 7: 5-row pyramid
  {
    id: 7,
    rows: 5,
    initial: [
      [1],
      [0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
    targetColor: 0,
  },
  // Level 8: 5-row pyramid harder
  {
    id: 8,
    rows: 5,
    initial: [
      [0],
      [1, 1, 1],
      [0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0, 1, 0],
    ],
    targetColor: 1,
  },
  // Level 9: 6-row pyramid
  {
    id: 9,
    rows: 6,
    initial: [
      [1],
      [0, 1, 0],
      [1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    ],
    targetColor: 0,
  },
  // Level 10: Ultimate 6-row pyramid
  {
    id: 10,
    rows: 6,
    initial: [
      [0],
      [1, 0, 1],
      [0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
    targetColor: 1,
  },
];

export class PyramidGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    return {
      triangles: generatePyramid(level.rows, level.initial),
      level: levelNum,
      moves: 0,
      targetColor: level.targetColor,
      rows: level.rows,
      status: "playing",
    };
  }

  public start(levelNum: number = 1): void {
    this.state = this.createInitialState(levelNum);
    this.emitState();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getColor(colorIndex: number): string {
    return COLORS[colorIndex];
  }

  public clickTriangle(row: number, col: number): boolean {
    if (this.state.status !== "playing") return false;

    const triangle = this.state.triangles[row]?.[col];
    if (!triangle) return false;

    // Flip clicked triangle
    triangle.color = 1 - triangle.color;

    // Flip adjacent triangles
    this.flipAdjacent(row, col);

    this.state.moves++;

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
    }

    this.emitState();
    return true;
  }

  private flipAdjacent(row: number, col: number): void {
    const triangle = this.state.triangles[row][col];
    const trianglesInRow = row * 2 + 1;

    // Adjacent triangles depend on whether current triangle points up or down
    if (triangle.pointUp) {
      // Points up: adjacent are left, right (same row) and one below
      // Left
      if (col > 0) {
        this.state.triangles[row][col - 1].color = 1 - this.state.triangles[row][col - 1].color;
      }
      // Right
      if (col < trianglesInRow - 1) {
        this.state.triangles[row][col + 1].color = 1 - this.state.triangles[row][col + 1].color;
      }
      // Below (for upward pointing, the triangle below is at col+1 in next row)
      if (row < this.state.rows - 1) {
        const belowCol = col + 1;
        if (this.state.triangles[row + 1][belowCol]) {
          this.state.triangles[row + 1][belowCol].color = 1 - this.state.triangles[row + 1][belowCol].color;
        }
      }
    } else {
      // Points down: adjacent are left, right (same row) and one above
      // Left
      if (col > 0) {
        this.state.triangles[row][col - 1].color = 1 - this.state.triangles[row][col - 1].color;
      }
      // Right
      if (col < trianglesInRow - 1) {
        this.state.triangles[row][col + 1].color = 1 - this.state.triangles[row][col + 1].color;
      }
      // Above (for downward pointing, the triangle above is at col-1 in previous row)
      if (row > 0) {
        const aboveCol = col - 1;
        if (aboveCol >= 0 && this.state.triangles[row - 1][aboveCol]) {
          this.state.triangles[row - 1][aboveCol].color = 1 - this.state.triangles[row - 1][aboveCol].color;
        }
      }
    }
  }

  private checkWin(): boolean {
    for (const row of this.state.triangles) {
      for (const triangle of row) {
        if (triangle.color !== this.state.targetColor) {
          return false;
        }
      }
    }
    return true;
  }

  public reset(): void {
    this.start(this.state.level);
  }

  public nextLevel(): boolean {
    if (this.state.level >= LEVELS.length) return false;
    this.start(this.state.level + 1);
    return true;
  }

  public getState(): GameState {
    return this.state;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
