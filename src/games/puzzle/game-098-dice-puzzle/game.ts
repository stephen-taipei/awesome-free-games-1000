/**
 * Dice Puzzle Game Logic
 * Game #098
 */

export type CellType = "empty" | "blocked" | "goal";
export type Direction = "up" | "down" | "left" | "right";

export interface DiceState {
  top: number;
  bottom: number;
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface Level {
  id: number;
  rows: number;
  cols: number;
  grid: CellType[][];
  start: [number, number];
  goal: [number, number];
  targetValue: number;
}

export interface GameState {
  grid: CellType[][];
  dice: DiceState;
  dicePos: [number, number];
  targetValue: number;
  goal: [number, number];
  moves: number;
  level: number;
  status: "playing" | "won";
}

// Standard dice: opposite faces sum to 7
function createStandardDice(): DiceState {
  return {
    top: 1,
    bottom: 6,
    front: 2,
    back: 5,
    left: 3,
    right: 4,
  };
}

// Roll dice in direction
function rollDice(dice: DiceState, dir: Direction): DiceState {
  const { top, bottom, front, back, left, right } = dice;

  switch (dir) {
    case "up":
      return { top: front, bottom: back, front: bottom, back: top, left, right };
    case "down":
      return { top: back, bottom: front, front: top, back: bottom, left, right };
    case "left":
      return { top: right, bottom: left, front, back, left: top, right: bottom };
    case "right":
      return { top: left, bottom: right, front, back, left: bottom, right: top };
  }
}

const LEVELS: Level[] = [
  // Level 1: Simple straight path
  {
    id: 1,
    rows: 3,
    cols: 5,
    grid: [
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "goal"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    start: [1, 0],
    goal: [1, 4],
    targetValue: 6,
  },
  // Level 2: L-shape
  {
    id: 2,
    rows: 4,
    cols: 4,
    grid: [
      ["empty", "blocked", "blocked", "blocked"],
      ["empty", "empty", "empty", "empty"],
      ["blocked", "blocked", "blocked", "empty"],
      ["blocked", "blocked", "blocked", "goal"],
    ],
    start: [0, 0],
    goal: [3, 3],
    targetValue: 1,
  },
  // Level 3: Zigzag
  {
    id: 3,
    rows: 5,
    cols: 5,
    grid: [
      ["empty", "empty", "blocked", "blocked", "blocked"],
      ["blocked", "empty", "blocked", "blocked", "blocked"],
      ["blocked", "empty", "empty", "empty", "blocked"],
      ["blocked", "blocked", "blocked", "empty", "blocked"],
      ["blocked", "blocked", "blocked", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [4, 4],
    targetValue: 3,
  },
  // Level 4: Wider path
  {
    id: 4,
    rows: 5,
    cols: 5,
    grid: [
      ["empty", "empty", "empty", "blocked", "blocked"],
      ["empty", "empty", "empty", "empty", "blocked"],
      ["blocked", "empty", "empty", "empty", "empty"],
      ["blocked", "blocked", "empty", "empty", "empty"],
      ["blocked", "blocked", "empty", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [4, 4],
    targetValue: 2,
  },
  // Level 5: Spiral
  {
    id: 5,
    rows: 5,
    cols: 5,
    grid: [
      ["empty", "empty", "empty", "empty", "empty"],
      ["blocked", "blocked", "blocked", "blocked", "empty"],
      ["goal", "empty", "empty", "blocked", "empty"],
      ["blocked", "empty", "blocked", "blocked", "empty"],
      ["blocked", "empty", "empty", "empty", "empty"],
    ],
    start: [0, 0],
    goal: [2, 0],
    targetValue: 4,
  },
  // Level 6: Maze
  {
    id: 6,
    rows: 6,
    cols: 6,
    grid: [
      ["empty", "empty", "empty", "blocked", "empty", "empty"],
      ["blocked", "blocked", "empty", "blocked", "empty", "blocked"],
      ["empty", "empty", "empty", "empty", "empty", "empty"],
      ["empty", "blocked", "blocked", "blocked", "blocked", "empty"],
      ["empty", "empty", "empty", "empty", "empty", "empty"],
      ["blocked", "blocked", "blocked", "blocked", "blocked", "goal"],
    ],
    start: [0, 0],
    goal: [5, 5],
    targetValue: 5,
  },
  // Level 7: Complex path
  {
    id: 7,
    rows: 6,
    cols: 6,
    grid: [
      ["empty", "blocked", "empty", "empty", "empty", "blocked"],
      ["empty", "blocked", "empty", "blocked", "empty", "empty"],
      ["empty", "empty", "empty", "blocked", "blocked", "empty"],
      ["blocked", "blocked", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "blocked", "empty", "blocked"],
      ["empty", "blocked", "blocked", "blocked", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [5, 5],
    targetValue: 6,
  },
  // Level 8: Strategic route
  {
    id: 8,
    rows: 5,
    cols: 7,
    grid: [
      ["empty", "empty", "blocked", "empty", "empty", "empty", "empty"],
      ["blocked", "empty", "blocked", "empty", "blocked", "blocked", "empty"],
      ["empty", "empty", "empty", "empty", "empty", "empty", "empty"],
      ["empty", "blocked", "blocked", "blocked", "empty", "blocked", "empty"],
      ["empty", "empty", "empty", "empty", "empty", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [4, 6],
    targetValue: 1,
  },
  // Level 9: Multiple paths
  {
    id: 9,
    rows: 6,
    cols: 6,
    grid: [
      ["empty", "empty", "empty", "empty", "empty", "empty"],
      ["empty", "blocked", "blocked", "empty", "blocked", "empty"],
      ["empty", "empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "blocked", "blocked", "empty", "empty"],
      ["blocked", "empty", "empty", "empty", "empty", "blocked"],
      ["blocked", "blocked", "empty", "empty", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [5, 5],
    targetValue: 3,
  },
  // Level 10: Final challenge
  {
    id: 10,
    rows: 7,
    cols: 7,
    grid: [
      ["empty", "empty", "blocked", "blocked", "blocked", "empty", "empty"],
      ["blocked", "empty", "empty", "empty", "blocked", "empty", "blocked"],
      ["blocked", "blocked", "blocked", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "blocked", "blocked", "empty"],
      ["empty", "blocked", "blocked", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "blocked", "empty", "blocked"],
      ["blocked", "blocked", "empty", "empty", "empty", "empty", "goal"],
    ],
    start: [0, 0],
    goal: [6, 6],
    targetValue: 2,
  },
];

export class DiceGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    return {
      grid: level.grid.map((row) => [...row]),
      dice: createStandardDice(),
      dicePos: [...level.start] as [number, number],
      targetValue: level.targetValue,
      goal: [...level.goal] as [number, number],
      moves: 0,
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

  public getGridSize(): { rows: number; cols: number } {
    const level = LEVELS[this.state.level - 1] || LEVELS[0];
    return { rows: level.rows, cols: level.cols };
  }

  public move(dir: Direction): boolean {
    if (this.state.status !== "playing") return false;

    const [row, col] = this.state.dicePos;
    let newRow = row;
    let newCol = col;

    switch (dir) {
      case "up":
        newRow--;
        break;
      case "down":
        newRow++;
        break;
      case "left":
        newCol--;
        break;
      case "right":
        newCol++;
        break;
    }

    // Check bounds
    const { rows, cols } = this.getGridSize();
    if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) {
      return false;
    }

    // Check blocked
    if (this.state.grid[newRow][newCol] === "blocked") {
      return false;
    }

    // Move dice
    this.state.dicePos = [newRow, newCol];
    this.state.dice = rollDice(this.state.dice, dir);
    this.state.moves++;

    // Check win
    const [goalRow, goalCol] = this.state.goal;
    if (
      newRow === goalRow &&
      newCol === goalCol &&
      this.state.dice.top === this.state.targetValue
    ) {
      this.state.status = "won";
    }

    this.emitState();
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

  public getDice(): DiceState {
    return this.state.dice;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
