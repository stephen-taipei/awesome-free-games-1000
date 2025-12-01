/**
 * 掃雷 (Minesweeper) 遊戲核心邏輯
 * Game #004 - 經典邏輯推理遊戲
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

export interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface Position {
  row: number;
  col: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  grid: Cell[][];
  rows: number;
  cols: number;
  totalMines: number;
  flagsUsed: number;
  revealedCount: number;
  status: GameStatus;
  isFirstClick: boolean;
  startTime: number | null;
  endTime: number | null;
}

export class MinesweeperGame {
  private state: GameState;
  private difficulty: Difficulty;
  private onStateChange?: (state: GameState) => void;
  private onGameEnd?: (won: boolean) => void;

  constructor(difficulty: Difficulty = 'easy') {
    this.difficulty = difficulty;
    this.state = this.createInitialState(difficulty);
  }

  private createInitialState(difficulty: Difficulty): GameState {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const grid: Cell[][] = [];

    for (let row = 0; row < config.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < config.cols; col++) {
        grid[row][col] = {
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        };
      }
    }

    return {
      grid,
      rows: config.rows,
      cols: config.cols,
      totalMines: config.mines,
      flagsUsed: 0,
      revealedCount: 0,
      status: 'playing',
      isFirstClick: true,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * 設定狀態變更回調
   */
  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 設定遊戲結束回調
   */
  setOnGameEnd(callback: (won: boolean) => void): void {
    this.onGameEnd = callback;
  }

  /**
   * 取得當前遊戲狀態
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * 取得難度
   */
  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  /**
   * 開始新遊戲
   */
  newGame(difficulty?: Difficulty): void {
    if (difficulty) {
      this.difficulty = difficulty;
    }
    this.state = this.createInitialState(this.difficulty);
    this.notifyStateChange();
  }

  /**
   * 放置地雷（首次點擊後觸發，避開首次點擊位置）
   */
  private placeMines(excludeRow: number, excludeCol: number): void {
    const { rows, cols, totalMines } = this.state;
    const excludePositions = this.getAdjacentPositions(excludeRow, excludeCol);
    excludePositions.push({ row: excludeRow, col: excludeCol });

    const allPositions: Position[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isExcluded = excludePositions.some(
          (p) => p.row === row && p.col === col
        );
        if (!isExcluded) {
          allPositions.push({ row, col });
        }
      }
    }

    // 隨機打亂
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    // 放置地雷
    const minesToPlace = Math.min(totalMines, allPositions.length);
    for (let i = 0; i < minesToPlace; i++) {
      const { row, col } = allPositions[i];
      this.state.grid[row][col].isMine = true;
    }

    // 計算相鄰地雷數
    this.calculateAdjacentMines();
  }

  /**
   * 計算所有格子的相鄰地雷數
   */
  private calculateAdjacentMines(): void {
    const { rows, cols, grid } = this.state;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!grid[row][col].isMine) {
          const adjacent = this.getAdjacentPositions(row, col);
          grid[row][col].adjacentMines = adjacent.filter(
            (p) => grid[p.row][p.col].isMine
          ).length;
        }
      }
    }
  }

  /**
   * 取得相鄰位置
   */
  private getAdjacentPositions(row: number, col: number): Position[] {
    const positions: Position[] = [];
    const { rows, cols } = this.state;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
          positions.push({ row: newRow, col: newCol });
        }
      }
    }

    return positions;
  }

  /**
   * 揭開格子
   */
  reveal(row: number, col: number): void {
    if (this.state.status !== 'playing') return;

    const cell = this.state.grid[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    // 首次點擊：放置地雷並開始計時
    if (this.state.isFirstClick) {
      this.state.isFirstClick = false;
      this.state.startTime = Date.now();
      this.placeMines(row, col);
    }

    // 踩到地雷
    if (cell.isMine) {
      this.gameOver(false);
      return;
    }

    // 揭開格子
    this.revealCell(row, col);

    // 檢查勝利
    this.checkWin();

    this.notifyStateChange();
  }

  /**
   * 揭開單個格子（遞迴展開空白區域）
   */
  private revealCell(row: number, col: number): void {
    const cell = this.state.grid[row][col];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) return;

    cell.isRevealed = true;
    this.state.revealedCount++;

    // 如果是空白格（周圍沒有地雷），連鎖展開
    if (cell.adjacentMines === 0) {
      const adjacent = this.getAdjacentPositions(row, col);
      for (const pos of adjacent) {
        this.revealCell(pos.row, pos.col);
      }
    }
  }

  /**
   * 切換旗標
   */
  toggleFlag(row: number, col: number): void {
    if (this.state.status !== 'playing') return;

    const cell = this.state.grid[row][col];
    if (cell.isRevealed) return;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      this.state.flagsUsed--;
    } else {
      cell.isFlagged = true;
      this.state.flagsUsed++;
    }

    this.notifyStateChange();
  }

  /**
   * 快速揭開（雙擊已揭開的數字格）
   */
  chordReveal(row: number, col: number): void {
    if (this.state.status !== 'playing') return;

    const cell = this.state.grid[row][col];
    if (!cell.isRevealed || cell.adjacentMines === 0) return;

    // 計算周圍旗標數
    const adjacent = this.getAdjacentPositions(row, col);
    const flagCount = adjacent.filter(
      (p) => this.state.grid[p.row][p.col].isFlagged
    ).length;

    // 如果旗標數等於相鄰地雷數，揭開其他格子
    if (flagCount === cell.adjacentMines) {
      for (const pos of adjacent) {
        const adjCell = this.state.grid[pos.row][pos.col];
        if (!adjCell.isFlagged && !adjCell.isRevealed) {
          if (adjCell.isMine) {
            this.gameOver(false);
            return;
          }
          this.revealCell(pos.row, pos.col);
        }
      }
      this.checkWin();
      this.notifyStateChange();
    }
  }

  /**
   * 檢查勝利條件
   */
  private checkWin(): void {
    const { rows, cols, totalMines, revealedCount } = this.state;
    const totalCells = rows * cols;
    const safeCells = totalCells - totalMines;

    if (revealedCount === safeCells) {
      this.gameOver(true);
    }
  }

  /**
   * 遊戲結束
   */
  private gameOver(won: boolean): void {
    this.state.status = won ? 'won' : 'lost';
    this.state.endTime = Date.now();

    // 如果輸了，揭開所有地雷
    if (!won) {
      for (let row = 0; row < this.state.rows; row++) {
        for (let col = 0; col < this.state.cols; col++) {
          const cell = this.state.grid[row][col];
          if (cell.isMine) {
            cell.isRevealed = true;
          }
        }
      }
    }

    this.onGameEnd?.(won);
    this.notifyStateChange();
  }

  /**
   * 取得遊戲時長（秒）
   */
  getPlayTime(): number {
    if (!this.state.startTime) return 0;
    const endTime = this.state.endTime || Date.now();
    return Math.floor((endTime - this.state.startTime) / 1000);
  }

  /**
   * 取得剩餘地雷數（總地雷 - 已標記旗標）
   */
  getRemainingMines(): number {
    return this.state.totalMines - this.state.flagsUsed;
  }

  /**
   * 通知狀態變更
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }
}

export default MinesweeperGame;
