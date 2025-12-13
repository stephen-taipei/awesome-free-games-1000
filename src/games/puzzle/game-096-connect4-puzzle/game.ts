/**
 * Connect 4 Puzzle Game Logic
 * Game #096
 */

export type CellState = "empty" | "red" | "yellow";

export interface Level {
  id: number;
  board: CellState[][];
  maxMoves: number;
  description?: string;
}

export interface GameState {
  board: CellState[][];
  currentPiece: "red" | "yellow";
  moves: number;
  level: number;
  status: "playing" | "won" | "lost";
  history: CellState[][][];
}

const ROWS = 6;
const COLS = 7;

// Puzzle levels with pre-set pieces
const LEVELS: Level[] = [
  {
    id: 1,
    maxMoves: 1,
    board: createEmptyBoard([
      { row: 5, col: 2, color: "red" },
      { row: 5, col: 3, color: "red" },
      { row: 5, col: 4, color: "red" },
    ]),
  },
  {
    id: 2,
    maxMoves: 2,
    board: createEmptyBoard([
      { row: 5, col: 1, color: "red" },
      { row: 5, col: 2, color: "yellow" },
      { row: 5, col: 3, color: "red" },
      { row: 5, col: 5, color: "red" },
    ]),
  },
  {
    id: 3,
    maxMoves: 2,
    board: createEmptyBoard([
      { row: 5, col: 3, color: "red" },
      { row: 4, col: 3, color: "red" },
      { row: 3, col: 3, color: "red" },
    ]),
  },
  {
    id: 4,
    maxMoves: 3,
    board: createEmptyBoard([
      { row: 5, col: 0, color: "red" },
      { row: 5, col: 1, color: "yellow" },
      { row: 5, col: 2, color: "red" },
      { row: 4, col: 1, color: "red" },
      { row: 4, col: 2, color: "yellow" },
      { row: 3, col: 2, color: "red" },
    ]),
  },
  {
    id: 5,
    maxMoves: 3,
    board: createEmptyBoard([
      { row: 5, col: 2, color: "yellow" },
      { row: 5, col: 3, color: "red" },
      { row: 5, col: 4, color: "red" },
      { row: 4, col: 3, color: "yellow" },
      { row: 4, col: 4, color: "red" },
    ]),
  },
  {
    id: 6,
    maxMoves: 4,
    board: createEmptyBoard([
      { row: 5, col: 1, color: "red" },
      { row: 5, col: 2, color: "yellow" },
      { row: 5, col: 3, color: "yellow" },
      { row: 5, col: 4, color: "red" },
      { row: 4, col: 2, color: "red" },
      { row: 4, col: 3, color: "red" },
    ]),
  },
  {
    id: 7,
    maxMoves: 4,
    board: createEmptyBoard([
      { row: 5, col: 0, color: "yellow" },
      { row: 5, col: 1, color: "red" },
      { row: 5, col: 2, color: "red" },
      { row: 5, col: 3, color: "yellow" },
      { row: 4, col: 1, color: "yellow" },
      { row: 4, col: 2, color: "red" },
      { row: 3, col: 2, color: "yellow" },
    ]),
  },
  {
    id: 8,
    maxMoves: 5,
    board: createEmptyBoard([
      { row: 5, col: 2, color: "red" },
      { row: 5, col: 3, color: "yellow" },
      { row: 5, col: 4, color: "red" },
      { row: 4, col: 3, color: "red" },
      { row: 4, col: 4, color: "yellow" },
      { row: 3, col: 4, color: "red" },
    ]),
  },
  {
    id: 9,
    maxMoves: 5,
    board: createEmptyBoard([
      { row: 5, col: 1, color: "yellow" },
      { row: 5, col: 2, color: "red" },
      { row: 5, col: 3, color: "red" },
      { row: 5, col: 4, color: "yellow" },
      { row: 5, col: 5, color: "red" },
      { row: 4, col: 2, color: "yellow" },
      { row: 4, col: 3, color: "red" },
      { row: 4, col: 4, color: "yellow" },
    ]),
  },
  {
    id: 10,
    maxMoves: 6,
    board: createEmptyBoard([
      { row: 5, col: 0, color: "red" },
      { row: 5, col: 1, color: "yellow" },
      { row: 5, col: 2, color: "red" },
      { row: 5, col: 3, color: "yellow" },
      { row: 5, col: 4, color: "red" },
      { row: 4, col: 1, color: "red" },
      { row: 4, col: 2, color: "yellow" },
      { row: 4, col: 3, color: "red" },
      { row: 3, col: 2, color: "red" },
    ]),
  },
];

function createEmptyBoard(
  pieces: { row: number; col: number; color: CellState }[] = []
): CellState[][] {
  const board: CellState[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(Array(COLS).fill("empty"));
  }
  pieces.forEach((p) => {
    if (p.color !== "empty") {
      board[p.row][p.col] = p.color;
    }
  });
  return board;
}

export class Connect4Game {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  onWin: ((winningCells: [number, number][]) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];
    return {
      board: level.board.map((row) => [...row]),
      currentPiece: "red",
      moves: 0,
      level: levelNum,
      status: "playing",
      history: [],
    };
  }

  public start(levelNum: number = 1): void {
    this.state = this.createInitialState(levelNum);
    this.emitState();
  }

  public getMaxMoves(): number {
    const level = LEVELS[this.state.level - 1];
    return level ? level.maxMoves : 10;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public dropPiece(col: number): boolean {
    if (this.state.status !== "playing") return false;

    // Find lowest empty row
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.state.board[r][col] === "empty") {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return false; // Column full

    // Save history for undo
    this.state.history.push(this.state.board.map((row) => [...row]));

    // Place piece
    this.state.board[targetRow][col] = this.state.currentPiece;
    this.state.moves++;

    // Check win
    const winResult = this.checkWin(targetRow, col);
    if (winResult) {
      this.state.status = "won";
      if (this.onWin) {
        this.onWin(winResult);
      }
    } else if (this.state.moves >= this.getMaxMoves()) {
      // Out of moves but didn't win - can reset
      this.state.status = "lost";
    }

    this.emitState();
    return true;
  }

  public switchPiece(): void {
    this.state.currentPiece =
      this.state.currentPiece === "red" ? "yellow" : "red";
    this.emitState();
  }

  public undo(): boolean {
    if (this.state.history.length === 0) return false;

    const previousBoard = this.state.history.pop()!;
    this.state.board = previousBoard;
    this.state.moves--;
    this.state.status = "playing";
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

  public getHint(): number | null {
    // Simple hint: find a column that could lead to 4 in a row
    const piece = this.state.currentPiece;

    for (let col = 0; col < COLS; col++) {
      // Find where piece would land
      let targetRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.state.board[r][col] === "empty") {
          targetRow = r;
          break;
        }
      }

      if (targetRow === -1) continue;

      // Temporarily place and check
      this.state.board[targetRow][col] = piece;
      const win = this.checkWin(targetRow, col);
      this.state.board[targetRow][col] = "empty";

      if (win) return col;
    }

    // No winning move, suggest a strategic column
    // Prefer center columns
    const preferredOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const col of preferredOrder) {
      let hasEmpty = false;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.state.board[r][col] === "empty") {
          hasEmpty = true;
          break;
        }
      }
      if (hasEmpty) return col;
    }

    return null;
  }

  private checkWin(row: number, col: number): [number, number][] | null {
    const piece = this.state.board[row][col];
    if (piece === "empty") return null;

    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonal down-right
      [1, -1], // diagonal down-left
    ];

    for (const [dr, dc] of directions) {
      const cells: [number, number][] = [[row, col]];

      // Check positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          this.state.board[r][c] === piece
        ) {
          cells.push([r, c]);
        } else {
          break;
        }
      }

      // Check negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          this.state.board[r][c] === piece
        ) {
          cells.push([r, c]);
        } else {
          break;
        }
      }

      if (cells.length >= 4) {
        return cells;
      }
    }

    return null;
  }

  public getBoard(): CellState[][] {
    return this.state.board;
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
