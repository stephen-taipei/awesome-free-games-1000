/**
 * 數獨 (Sudoku) 遊戲核心邏輯
 * Game #003 - 經典 9x9 數字邏輯推理遊戲
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Cell {
  value: number | null;
  isFixed: boolean;
  notes: Set<number>;
  isError: boolean;
  isHighlighted: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface GameState {
  grid: Cell[][];
  solution: number[][];
  selectedCell: Position | null;
  difficulty: Difficulty;
  mistakes: number;
  maxMistakes: number;
  hintsRemaining: number;
  gameOver: boolean;
  isWon: boolean;
  startTime: number;
  completedCells: number;
  totalEmptyCells: number;
}

// 難度對應的空格數量
const DIFFICULTY_EMPTY_CELLS: Record<Difficulty, [number, number]> = {
  easy: [35, 40],
  medium: [41, 48],
  hard: [49, 54],
  expert: [55, 60],
};

export class SudokuGame {
  private state: GameState;
  private onStateChange?: (state: GameState) => void;

  constructor() {
    this.state = this.createInitialState('easy');
  }

  private createInitialState(difficulty: Difficulty): GameState {
    const grid: Cell[][] = [];
    for (let i = 0; i < 9; i++) {
      grid[i] = [];
      for (let j = 0; j < 9; j++) {
        grid[i][j] = {
          value: null,
          isFixed: false,
          notes: new Set(),
          isError: false,
          isHighlighted: false,
        };
      }
    }

    return {
      grid,
      solution: [],
      selectedCell: null,
      difficulty,
      mistakes: 0,
      maxMistakes: 3,
      hintsRemaining: 3,
      gameOver: false,
      isWon: false,
      startTime: Date.now(),
      completedCells: 0,
      totalEmptyCells: 0,
    };
  }

  /**
   * 設定狀態變更回調
   */
  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 取得當前遊戲狀態
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * 開始新遊戲
   */
  newGame(difficulty: Difficulty): void {
    this.state = this.createInitialState(difficulty);
    this.generatePuzzle(difficulty);
    this.notifyStateChange();
  }

  /**
   * 生成數獨謎題
   */
  private generatePuzzle(difficulty: Difficulty): void {
    // 1. 生成完整的有效數獨解
    const solution = this.generateSolution();
    this.state.solution = solution;

    // 2. 複製到遊戲網格
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        this.state.grid[i][j].value = solution[i][j];
        this.state.grid[i][j].isFixed = true;
      }
    }

    // 3. 根據難度移除數字
    const [minEmpty, maxEmpty] = DIFFICULTY_EMPTY_CELLS[difficulty];
    const emptyCells = minEmpty + Math.floor(Math.random() * (maxEmpty - minEmpty + 1));
    this.state.totalEmptyCells = emptyCells;

    const positions: Position[] = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push({ row: i, col: j });
      }
    }

    // 隨機打亂位置
    this.shuffleArray(positions);

    // 移除數字
    let removed = 0;
    for (const pos of positions) {
      if (removed >= emptyCells) break;

      this.state.grid[pos.row][pos.col].value = null;
      this.state.grid[pos.row][pos.col].isFixed = false;
      removed++;
    }
  }

  /**
   * 生成完整的數獨解
   */
  private generateSolution(): number[][] {
    const grid: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));

    // 使用回溯法填充
    this.fillGrid(grid);

    return grid;
  }

  /**
   * 使用回溯法填充網格
   */
  private fillGrid(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

          for (const num of numbers) {
            if (this.isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;

              if (this.fillGrid(grid)) {
                return true;
              }

              grid[row][col] = 0;
            }
          }

          return false;
        }
      }
    }

    return true;
  }

  /**
   * 檢查數字放置是否有效
   */
  private isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
    // 檢查行
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false;
    }

    // 檢查列
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }

    // 檢查 3x3 宮格
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r][c] === num) return false;
      }
    }

    return true;
  }

  /**
   * 陣列洗牌
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 選擇格子
   */
  selectCell(row: number, col: number): void {
    if (this.state.gameOver) return;

    this.clearHighlights();
    this.state.selectedCell = { row, col };
    this.highlightRelatedCells(row, col);
    this.notifyStateChange();
  }

  /**
   * 清除所有高亮
   */
  private clearHighlights(): void {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        this.state.grid[i][j].isHighlighted = false;
        this.state.grid[i][j].isError = false;
      }
    }
  }

  /**
   * 高亮相關格子（同行、同列、同宮格、相同數字）
   */
  private highlightRelatedCells(row: number, col: number): void {
    const selectedValue = this.state.grid[row][col].value;

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        // 同行、同列
        if (i === row || j === col) {
          this.state.grid[i][j].isHighlighted = true;
        }

        // 同宮格
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        if (i >= boxRow && i < boxRow + 3 && j >= boxCol && j < boxCol + 3) {
          this.state.grid[i][j].isHighlighted = true;
        }

        // 相同數字
        if (selectedValue && this.state.grid[i][j].value === selectedValue) {
          this.state.grid[i][j].isHighlighted = true;
        }
      }
    }
  }

  /**
   * 輸入數字
   */
  inputNumber(num: number): void {
    if (this.state.gameOver || !this.state.selectedCell) return;

    const { row, col } = this.state.selectedCell;
    const cell = this.state.grid[row][col];

    if (cell.isFixed) return;

    // 清除筆記模式
    cell.notes.clear();

    // 檢查答案是否正確
    if (num !== this.state.solution[row][col]) {
      this.state.mistakes++;
      cell.isError = true;

      if (this.state.mistakes >= this.state.maxMistakes) {
        this.state.gameOver = true;
        this.state.isWon = false;
      }
    } else {
      cell.value = num;
      cell.isError = false;
      this.state.completedCells++;

      // 檢查是否完成
      if (this.checkWin()) {
        this.state.gameOver = true;
        this.state.isWon = true;
      }
    }

    this.highlightRelatedCells(row, col);
    this.notifyStateChange();
  }

  /**
   * 切換筆記
   */
  toggleNote(num: number): void {
    if (this.state.gameOver || !this.state.selectedCell) return;

    const { row, col } = this.state.selectedCell;
    const cell = this.state.grid[row][col];

    if (cell.isFixed || cell.value !== null) return;

    if (cell.notes.has(num)) {
      cell.notes.delete(num);
    } else {
      cell.notes.add(num);
    }

    this.notifyStateChange();
  }

  /**
   * 清除格子
   */
  clearCell(): void {
    if (this.state.gameOver || !this.state.selectedCell) return;

    const { row, col } = this.state.selectedCell;
    const cell = this.state.grid[row][col];

    if (cell.isFixed) return;

    if (cell.value !== null) {
      this.state.completedCells--;
    }

    cell.value = null;
    cell.notes.clear();
    cell.isError = false;

    this.notifyStateChange();
  }

  /**
   * 使用提示
   */
  useHint(): boolean {
    if (this.state.gameOver || this.state.hintsRemaining <= 0) return false;

    // 找到一個空格子或錯誤格子
    let targetCell: Position | null = null;

    // 優先填充選中的格子
    if (this.state.selectedCell) {
      const { row, col } = this.state.selectedCell;
      const cell = this.state.grid[row][col];
      if (!cell.isFixed && cell.value !== this.state.solution[row][col]) {
        targetCell = this.state.selectedCell;
      }
    }

    // 如果選中的格子已填正確，找其他空格子
    if (!targetCell) {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          const cell = this.state.grid[i][j];
          if (!cell.isFixed && cell.value === null) {
            targetCell = { row: i, col: j };
            break;
          }
        }
        if (targetCell) break;
      }
    }

    if (!targetCell) return false;

    const { row, col } = targetCell;
    const cell = this.state.grid[row][col];
    const wasEmpty = cell.value === null;

    cell.value = this.state.solution[row][col];
    cell.isFixed = false;
    cell.isError = false;
    cell.notes.clear();

    if (wasEmpty) {
      this.state.completedCells++;
    }

    this.state.hintsRemaining--;
    this.state.selectedCell = targetCell;
    this.clearHighlights();
    this.highlightRelatedCells(row, col);

    // 檢查是否完成
    if (this.checkWin()) {
      this.state.gameOver = true;
      this.state.isWon = true;
    }

    this.notifyStateChange();
    return true;
  }

  /**
   * 檢查是否獲勝
   */
  private checkWin(): boolean {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.state.grid[i][j].value !== this.state.solution[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 取得遊戲時長（秒）
   */
  getPlayTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  /**
   * 取得完成進度
   */
  getProgress(): number {
    if (this.state.totalEmptyCells === 0) return 100;
    return Math.round((this.state.completedCells / this.state.totalEmptyCells) * 100);
  }

  /**
   * 驗證當前網格（顯示所有錯誤）
   */
  validateGrid(): number {
    let errorCount = 0;

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = this.state.grid[i][j];
        if (cell.value !== null && cell.value !== this.state.solution[i][j]) {
          cell.isError = true;
          errorCount++;
        } else {
          cell.isError = false;
        }
      }
    }

    this.notifyStateChange();
    return errorCount;
  }

  /**
   * 通知狀態變更
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }
}

export default SudokuGame;
