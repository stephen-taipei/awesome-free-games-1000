/**
 * Snowflake Puzzle Game Logic
 * Game #102 - Create symmetric snowflake patterns
 */

export interface Cell {
  row: number;
  col: number;
  active: boolean;
}

export interface Level {
  id: number;
  branches: number;
  layers: number;
  target: boolean[][];
}

export interface GameState {
  branches: number;
  layers: number;
  pattern: boolean[][]; // One branch's pattern
  target: boolean[][];
  level: number;
  status: "playing" | "won";
}

const LEVELS: Level[] = [
  // Level 1: 6 branches, 3 layers, simple
  {
    id: 1,
    branches: 6,
    layers: 3,
    target: [
      [true],
      [true, false],
      [true, true, false],
    ],
  },
  // Level 2: 6 branches, 4 layers
  {
    id: 2,
    branches: 6,
    layers: 4,
    target: [
      [true],
      [false, true],
      [true, false, true],
      [true, true, false, false],
    ],
  },
  // Level 3: 6 branches, 4 layers
  {
    id: 3,
    branches: 6,
    layers: 4,
    target: [
      [true],
      [true, true],
      [false, true, false],
      [true, false, true, true],
    ],
  },
  // Level 4: 8 branches, 4 layers
  {
    id: 4,
    branches: 8,
    layers: 4,
    target: [
      [true],
      [true, false],
      [true, true, true],
      [false, true, false, true],
    ],
  },
  // Level 5: 6 branches, 5 layers
  {
    id: 5,
    branches: 6,
    layers: 5,
    target: [
      [true],
      [false, true],
      [true, true, false],
      [true, false, true, true],
      [false, true, true, false, true],
    ],
  },
  // Level 6: 8 branches, 5 layers
  {
    id: 6,
    branches: 8,
    layers: 5,
    target: [
      [true],
      [true, true],
      [false, true, true],
      [true, false, true, false],
      [true, true, false, true, true],
    ],
  },
  // Level 7: 6 branches, 5 layers
  {
    id: 7,
    branches: 6,
    layers: 5,
    target: [
      [true],
      [true, false],
      [false, true, true],
      [true, true, false, true],
      [true, false, true, false, true],
    ],
  },
  // Level 8: 12 branches, 4 layers
  {
    id: 8,
    branches: 12,
    layers: 4,
    target: [
      [true],
      [false, true],
      [true, false, true],
      [true, true, true, false],
    ],
  },
  // Level 9: 6 branches, 6 layers
  {
    id: 9,
    branches: 6,
    layers: 6,
    target: [
      [true],
      [true, true],
      [true, false, true],
      [false, true, true, false],
      [true, true, false, true, true],
      [true, false, true, false, true, true],
    ],
  },
  // Level 10: 8 branches, 6 layers
  {
    id: 10,
    branches: 8,
    layers: 6,
    target: [
      [true],
      [false, true],
      [true, true, false],
      [true, false, true, true],
      [false, true, true, false, true],
      [true, true, false, true, true, false],
    ],
  },
];

export class SnowflakeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    // Create empty pattern
    const pattern: boolean[][] = [];
    for (let layer = 0; layer < level.layers; layer++) {
      pattern.push(new Array(layer + 1).fill(false));
    }

    return {
      branches: level.branches,
      layers: level.layers,
      pattern,
      target: level.target.map((row) => [...row]),
      level: levelNum,
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

  public toggleCell(layer: number, index: number): void {
    if (this.state.status !== "playing") return;
    if (layer < 0 || layer >= this.state.layers) return;
    if (index < 0 || index > layer) return;

    this.state.pattern[layer][index] = !this.state.pattern[layer][index];

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
    }

    this.emitState();
  }

  public rotate(): void {
    if (this.state.status !== "playing") return;

    // Rotate each layer's pattern
    this.state.pattern = this.state.pattern.map((row) => {
      const last = row.pop()!;
      row.unshift(last);
      return row;
    });

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
    }

    this.emitState();
  }

  public clear(): void {
    if (this.state.status !== "playing") return;

    this.state.pattern = this.state.pattern.map((row) =>
      row.map(() => false)
    );

    this.emitState();
  }

  private checkWin(): boolean {
    for (let layer = 0; layer < this.state.layers; layer++) {
      for (let i = 0; i <= layer; i++) {
        if (this.state.pattern[layer][i] !== this.state.target[layer][i]) {
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
