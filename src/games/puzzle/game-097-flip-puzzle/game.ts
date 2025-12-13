/**
 * Flip Puzzle Game Logic
 * Game #097
 */

export interface Level {
  id: number;
  size: number;
  target: boolean[][];
  initial?: boolean[][];
}

export interface GameState {
  board: boolean[][];
  target: boolean[][];
  size: number;
  moves: number;
  level: number;
  status: "playing" | "won";
}

// Predefined puzzle levels
const LEVELS: Level[] = [
  // Level 1: 3x3, simple cross
  {
    id: 1,
    size: 3,
    target: [
      [false, true, false],
      [true, true, true],
      [false, true, false],
    ],
  },
  // Level 2: 3x3, corners
  {
    id: 2,
    size: 3,
    target: [
      [true, false, true],
      [false, false, false],
      [true, false, true],
    ],
  },
  // Level 3: 3x3, diagonal
  {
    id: 3,
    size: 3,
    target: [
      [true, false, false],
      [false, true, false],
      [false, false, true],
    ],
  },
  // Level 4: 4x4, frame
  {
    id: 4,
    size: 4,
    target: [
      [true, true, true, true],
      [true, false, false, true],
      [true, false, false, true],
      [true, true, true, true],
    ],
  },
  // Level 5: 4x4, checkerboard
  {
    id: 5,
    size: 4,
    target: [
      [true, false, true, false],
      [false, true, false, true],
      [true, false, true, false],
      [false, true, false, true],
    ],
  },
  // Level 6: 4x4, diamond
  {
    id: 6,
    size: 4,
    target: [
      [false, true, true, false],
      [true, true, true, true],
      [true, true, true, true],
      [false, true, true, false],
    ],
  },
  // Level 7: 4x4, arrow
  {
    id: 7,
    size: 4,
    target: [
      [false, true, true, false],
      [true, true, true, true],
      [false, true, true, false],
      [false, true, true, false],
    ],
  },
  // Level 8: 5x5, star
  {
    id: 8,
    size: 5,
    target: [
      [false, false, true, false, false],
      [false, true, true, true, false],
      [true, true, true, true, true],
      [false, true, true, true, false],
      [false, false, true, false, false],
    ],
  },
  // Level 9: 5x5, X pattern
  {
    id: 9,
    size: 5,
    target: [
      [true, false, false, false, true],
      [false, true, false, true, false],
      [false, false, true, false, false],
      [false, true, false, true, false],
      [true, false, false, false, true],
    ],
  },
  // Level 10: 5x5, complex
  {
    id: 10,
    size: 5,
    target: [
      [true, true, false, true, true],
      [true, false, true, false, true],
      [false, true, true, true, false],
      [true, false, true, false, true],
      [true, true, false, true, true],
    ],
  },
];

export class FlipGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  bestScores: Map<number, number> = new Map();

  constructor() {
    this.loadBestScores();
    this.state = this.createInitialState(1);
  }

  private loadBestScores(): void {
    try {
      const saved = localStorage.getItem("flipPuzzle_bestScores");
      if (saved) {
        const data = JSON.parse(saved);
        this.bestScores = new Map(Object.entries(data).map(([k, v]) => [parseInt(k), v as number]));
      }
    } catch (e) {
      // Ignore
    }
  }

  private saveBestScores(): void {
    try {
      const obj: Record<string, number> = {};
      this.bestScores.forEach((v, k) => {
        obj[k.toString()] = v;
      });
      localStorage.setItem("flipPuzzle_bestScores", JSON.stringify(obj));
    } catch (e) {
      // Ignore
    }
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];
    const size = level.size;

    // Start with all tiles off
    const board: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      board.push(Array(size).fill(false));
    }

    return {
      board,
      target: level.target.map((row) => [...row]),
      size,
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

  public getBestScore(level: number): number | null {
    return this.bestScores.get(level) ?? null;
  }

  public flipTile(row: number, col: number): void {
    if (this.state.status !== "playing") return;

    const { board, size } = this.state;

    // Flip clicked tile
    board[row][col] = !board[row][col];

    // Flip adjacent tiles (up, down, left, right)
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        board[nr][nc] = !board[nr][nc];
      }
    }

    this.state.moves++;

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
      // Update best score
      const currentBest = this.bestScores.get(this.state.level);
      if (!currentBest || this.state.moves < currentBest) {
        this.bestScores.set(this.state.level, this.state.moves);
        this.saveBestScores();
      }
    }

    this.emitState();
  }

  private checkWin(): boolean {
    const { board, target, size } = this.state;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== target[r][c]) {
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

  public getHint(): [number, number] | null {
    // Simple BFS to find minimum moves solution
    // For small grids this is feasible
    const { board, target, size } = this.state;

    // Convert board state to string for hashing
    const stateToString = (b: boolean[][]): string => {
      return b.map((row) => row.map((c) => (c ? "1" : "0")).join("")).join("");
    };

    const targetStr = stateToString(target);
    const currentStr = stateToString(board);

    if (currentStr === targetStr) return null;

    // BFS
    const queue: { board: boolean[][]; moves: [number, number][] }[] = [];
    const visited = new Set<string>();

    queue.push({ board: board.map((row) => [...row]), moves: [] });
    visited.add(currentStr);

    while (queue.length > 0 && queue.length < 10000) {
      const current = queue.shift()!;
      const currStr = stateToString(current.board);

      if (currStr === targetStr) {
        return current.moves.length > 0 ? current.moves[0] : null;
      }

      // Try all possible flips
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const newBoard = current.board.map((row) => [...row]);

          // Flip
          newBoard[r][c] = !newBoard[r][c];
          const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              newBoard[nr][nc] = !newBoard[nr][nc];
            }
          }

          const newStr = stateToString(newBoard);
          if (!visited.has(newStr)) {
            visited.add(newStr);
            queue.push({
              board: newBoard,
              moves: [...current.moves, [r, c]],
            });
          }
        }
      }
    }

    // Couldn't find solution, return random valid move
    return [Math.floor(size / 2), Math.floor(size / 2)];
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
