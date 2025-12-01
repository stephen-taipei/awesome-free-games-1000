/**
 * 2048 遊戲核心邏輯
 * Game #001 - 經典數字合併遊戲
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  value: number;
  id: number;
  position: Position;
  mergedFrom?: [Tile, Tile];
  isNew?: boolean;
  previousPosition?: Position;
}

export interface GameState {
  grid: (Tile | null)[][];
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
  moveCount: number;
  startTime: number;
}

export interface GameConfig {
  size: number;
  winningTile: number;
}

export class Game2048 {
  private config: GameConfig;
  private state: GameState;
  private tileIdCounter = 0;
  private onStateChange?: (state: GameState) => void;
  private onTileMove?: (tiles: Tile[]) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      size: config.size ?? 4,
      winningTile: config.winningTile ?? 2048,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const grid: (Tile | null)[][] = [];
    for (let i = 0; i < this.config.size; i++) {
      grid[i] = [];
      for (let j = 0; j < this.config.size; j++) {
        grid[i][j] = null;
      }
    }

    return {
      grid,
      score: 0,
      bestScore: this.loadBestScore(),
      gameOver: false,
      won: false,
      keepPlaying: false,
      moveCount: 0,
      startTime: Date.now(),
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_001_2048_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_001_2048_best', score.toString());
    } catch {
      // 忽略儲存錯誤
    }
  }

  /**
   * 設定狀態變更回調
   */
  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 設定方塊移動回調
   */
  setOnTileMove(callback: (tiles: Tile[]) => void): void {
    this.onTileMove = callback;
  }

  /**
   * 取得當前遊戲狀態
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * 開始新遊戲
   */
  newGame(): void {
    this.state = this.createInitialState();
    this.addRandomTile();
    this.addRandomTile();
    this.notifyStateChange();
  }

  /**
   * 繼續遊戲（達到 2048 後可選擇繼續）
   */
  continueGame(): void {
    this.state.keepPlaying = true;
    this.notifyStateChange();
  }

  /**
   * 取得所有空格位置
   */
  private getEmptyCells(): Position[] {
    const cells: Position[] = [];
    for (let row = 0; row < this.config.size; row++) {
      for (let col = 0; col < this.config.size; col++) {
        if (this.state.grid[row][col] === null) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }

  /**
   * 新增隨機方塊
   */
  private addRandomTile(): boolean {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return false;

    const position = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;

    const tile: Tile = {
      value,
      id: ++this.tileIdCounter,
      position,
      isNew: true,
    };

    this.state.grid[position.row][position.col] = tile;
    return true;
  }

  /**
   * 移動方塊
   */
  move(direction: Direction): boolean {
    if (this.state.gameOver && !this.state.keepPlaying) return false;

    // 準備移動
    this.prepareTiles();

    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;

    // 遍歷所有格子
    for (const row of traversals.rows) {
      for (const col of traversals.cols) {
        const tile = this.state.grid[row][col];
        if (tile) {
          const positions = this.findFarthestPosition({ row, col }, vector);
          const next = this.state.grid[positions.next.row]?.[positions.next.col];

          // 檢查是否可以合併
          if (next && next.value === tile.value && !next.mergedFrom) {
            const merged: Tile = {
              value: tile.value * 2,
              id: ++this.tileIdCounter,
              position: positions.next,
              mergedFrom: [tile, next],
            };

            this.state.grid[row][col] = null;
            this.state.grid[positions.next.row][positions.next.col] = merged;
            tile.position = positions.next;

            // 更新分數
            this.state.score += merged.value;

            // 檢查是否獲勝
            if (merged.value === this.config.winningTile && !this.state.keepPlaying) {
              this.state.won = true;
            }

            moved = true;
          } else {
            // 移動到最遠的空位置
            if (positions.farthest.row !== row || positions.farthest.col !== col) {
              this.state.grid[row][col] = null;
              this.state.grid[positions.farthest.row][positions.farthest.col] = tile;
              tile.position = positions.farthest;
              moved = true;
            }
          }
        }
      }
    }

    if (moved) {
      this.state.moveCount++;
      this.addRandomTile();

      // 更新最高分
      if (this.state.score > this.state.bestScore) {
        this.state.bestScore = this.state.score;
        this.saveBestScore(this.state.bestScore);
      }

      // 檢查遊戲是否結束
      if (!this.movesAvailable()) {
        this.state.gameOver = true;
      }

      this.notifyStateChange();
      this.notifyTileMove();
    }

    return moved;
  }

  /**
   * 準備方塊以進行移動
   */
  private prepareTiles(): void {
    for (let row = 0; row < this.config.size; row++) {
      for (let col = 0; col < this.config.size; col++) {
        const tile = this.state.grid[row][col];
        if (tile) {
          tile.mergedFrom = undefined;
          tile.isNew = false;
          tile.previousPosition = { ...tile.position };
        }
      }
    }
  }

  /**
   * 取得方向向量
   */
  private getVector(direction: Direction): Position {
    const vectors: Record<Direction, Position> = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    };
    return vectors[direction];
  }

  /**
   * 建立遍歷順序
   */
  private buildTraversals(vector: Position): { rows: number[]; cols: number[] } {
    const rows: number[] = [];
    const cols: number[] = [];

    for (let i = 0; i < this.config.size; i++) {
      rows.push(i);
      cols.push(i);
    }

    // 根據方向調整遍歷順序
    if (vector.row === 1) rows.reverse();
    if (vector.col === 1) cols.reverse();

    return { rows, cols };
  }

  /**
   * 找到最遠的可達位置
   */
  private findFarthestPosition(
    position: Position,
    vector: Position
  ): { farthest: Position; next: Position } {
    let previous: Position;
    let current = position;

    do {
      previous = current;
      current = {
        row: previous.row + vector.row,
        col: previous.col + vector.col,
      };
    } while (this.withinBounds(current) && this.cellAvailable(current));

    return {
      farthest: previous,
      next: current,
    };
  }

  /**
   * 檢查位置是否在邊界內
   */
  private withinBounds(position: Position): boolean {
    return (
      position.row >= 0 &&
      position.row < this.config.size &&
      position.col >= 0 &&
      position.col < this.config.size
    );
  }

  /**
   * 檢查格子是否可用
   */
  private cellAvailable(position: Position): boolean {
    return this.state.grid[position.row]?.[position.col] === null;
  }

  /**
   * 檢查是否還有可用的移動
   */
  private movesAvailable(): boolean {
    // 檢查是否有空格
    if (this.getEmptyCells().length > 0) return true;

    // 檢查是否有相鄰的相同值可以合併
    for (let row = 0; row < this.config.size; row++) {
      for (let col = 0; col < this.config.size; col++) {
        const tile = this.state.grid[row][col];
        if (tile) {
          // 檢查右邊
          if (col < this.config.size - 1) {
            const right = this.state.grid[row][col + 1];
            if (right && right.value === tile.value) return true;
          }
          // 檢查下面
          if (row < this.config.size - 1) {
            const down = this.state.grid[row + 1][col];
            if (down && down.value === tile.value) return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 取得所有方塊
   */
  getAllTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let row = 0; row < this.config.size; row++) {
      for (let col = 0; col < this.config.size; col++) {
        const tile = this.state.grid[row][col];
        if (tile) tiles.push(tile);
      }
    }
    return tiles;
  }

  /**
   * 通知狀態變更
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  /**
   * 通知方塊移動
   */
  private notifyTileMove(): void {
    this.onTileMove?.(this.getAllTiles());
  }

  /**
   * 取得遊戲時長（秒）
   */
  getPlayTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  /**
   * 取得棋盤大小
   */
  getSize(): number {
    return this.config.size;
  }
}

export default Game2048;
