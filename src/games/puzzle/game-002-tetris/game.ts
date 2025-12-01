/**
 * 俄羅斯方塊 (Tetris) 遊戲核心邏輯
 * Game #002 - 經典方塊消除遊戲
 */

// 方塊類型
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// 方塊形狀定義（每種方塊的旋轉狀態）
export const TETROMINOES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

// 方塊顏色
export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00f0f0', // 青色
  O: '#f0f000', // 黃色
  T: '#a000f0', // 紫色
  S: '#00f000', // 綠色
  Z: '#f00000', // 紅色
  J: '#0000f0', // 藍色
  L: '#f0a000', // 橘色
};

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: TetrominoType;
  rotation: number;
  position: Position;
}

export interface GameState {
  board: (TetrominoType | null)[][];
  currentPiece: Piece | null;
  nextPiece: TetrominoType;
  holdPiece: TetrominoType | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  isPaused: boolean;
  startTime: number;
}

export interface GameConfig {
  width: number;
  height: number;
  initialLevel: number;
}

// 計分規則
const SCORE_TABLE = {
  1: 100,   // 消除 1 行
  2: 300,   // 消除 2 行
  3: 500,   // 消除 3 行
  4: 800,   // 消除 4 行 (Tetris!)
  softDrop: 1,
  hardDrop: 2,
};

// 每級速度（毫秒/格）
const LEVEL_SPEEDS = [
  800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
  80, 80, 80, 70, 70, 70, 50, 50, 50, 30,
];

export class TetrisGame {
  private config: GameConfig;
  private state: GameState;
  private dropInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (state: GameState) => void;
  private onLineClear?: (lines: number) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      width: config.width ?? 10,
      height: config.height ?? 20,
      initialLevel: config.initialLevel ?? 1,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board: (TetrominoType | null)[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      board[y] = new Array(this.config.width).fill(null);
    }

    return {
      board,
      currentPiece: null,
      nextPiece: this.randomPiece(),
      holdPiece: null,
      canHold: true,
      score: 0,
      level: this.config.initialLevel,
      lines: 0,
      gameOver: false,
      isPaused: false,
      startTime: Date.now(),
    };
  }

  /**
   * 設定狀態變更回調
   */
  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 設定消行回調
   */
  setOnLineClear(callback: (lines: number) => void): void {
    this.onLineClear = callback;
  }

  /**
   * 取得當前遊戲狀態
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * 取得設定
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }

  /**
   * 開始新遊戲
   */
  newGame(): void {
    this.stopDropInterval();
    this.state = this.createInitialState();
    this.spawnPiece();
    this.startDropInterval();
    this.notifyStateChange();
  }

  /**
   * 暫停/繼續遊戲
   */
  togglePause(): void {
    if (this.state.gameOver) return;

    this.state.isPaused = !this.state.isPaused;
    if (this.state.isPaused) {
      this.stopDropInterval();
    } else {
      this.startDropInterval();
    }
    this.notifyStateChange();
  }

  /**
   * 隨機產生方塊類型
   */
  private randomPiece(): TetrominoType {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 產生新方塊
   */
  private spawnPiece(): void {
    const type = this.state.nextPiece;
    const shape = TETROMINOES[type][0];
    const x = Math.floor((this.config.width - shape[0].length) / 2);

    this.state.currentPiece = {
      type,
      rotation: 0,
      position: { x, y: 0 },
    };
    this.state.nextPiece = this.randomPiece();
    this.state.canHold = true;

    // 檢查是否能放置，否則遊戲結束
    if (!this.isValidPosition(this.state.currentPiece)) {
      this.state.gameOver = true;
      this.stopDropInterval();
    }
  }

  /**
   * 取得方塊形狀
   */
  private getShape(piece: Piece): number[][] {
    return TETROMINOES[piece.type][piece.rotation];
  }

  /**
   * 檢查位置是否有效
   */
  private isValidPosition(piece: Piece, offsetX = 0, offsetY = 0, newRotation?: number): boolean {
    const rotation = newRotation ?? piece.rotation;
    const shape = TETROMINOES[piece.type][rotation];
    const newX = piece.position.x + offsetX;
    const newY = piece.position.y + offsetY;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          // 檢查邊界
          if (boardX < 0 || boardX >= this.config.width || boardY >= this.config.height) {
            return false;
          }

          // 檢查與已放置方塊的碰撞
          if (boardY >= 0 && this.state.board[boardY][boardX] !== null) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 移動方塊
   */
  move(direction: 'left' | 'right' | 'down'): boolean {
    if (!this.state.currentPiece || this.state.isPaused || this.state.gameOver) {
      return false;
    }

    const offsets = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 },
    };

    const offset = offsets[direction];

    if (this.isValidPosition(this.state.currentPiece, offset.x, offset.y)) {
      this.state.currentPiece.position.x += offset.x;
      this.state.currentPiece.position.y += offset.y;

      if (direction === 'down') {
        this.state.score += SCORE_TABLE.softDrop;
      }

      this.notifyStateChange();
      return true;
    }

    // 如果向下移動失敗，則鎖定方塊
    if (direction === 'down') {
      this.lockPiece();
    }

    return false;
  }

  /**
   * 旋轉方塊
   */
  rotate(clockwise = true): boolean {
    if (!this.state.currentPiece || this.state.isPaused || this.state.gameOver) {
      return false;
    }

    const piece = this.state.currentPiece;
    const rotations = TETROMINOES[piece.type].length;
    const newRotation = clockwise
      ? (piece.rotation + 1) % rotations
      : (piece.rotation - 1 + rotations) % rotations;

    // 嘗試基本旋轉
    if (this.isValidPosition(piece, 0, 0, newRotation)) {
      piece.rotation = newRotation;
      this.notifyStateChange();
      return true;
    }

    // 牆踢（Wall Kick）嘗試
    const kicks = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ];

    for (const kick of kicks) {
      if (this.isValidPosition(piece, kick.x, kick.y, newRotation)) {
        piece.position.x += kick.x;
        piece.position.y += kick.y;
        piece.rotation = newRotation;
        this.notifyStateChange();
        return true;
      }
    }

    return false;
  }

  /**
   * 硬降（直接落到底部）
   */
  hardDrop(): void {
    if (!this.state.currentPiece || this.state.isPaused || this.state.gameOver) {
      return;
    }

    let dropDistance = 0;
    while (this.isValidPosition(this.state.currentPiece, 0, dropDistance + 1)) {
      dropDistance++;
    }

    this.state.currentPiece.position.y += dropDistance;
    this.state.score += dropDistance * SCORE_TABLE.hardDrop;
    this.lockPiece();
  }

  /**
   * 暫存方塊
   */
  hold(): void {
    if (!this.state.currentPiece || !this.state.canHold || this.state.isPaused || this.state.gameOver) {
      return;
    }

    const currentType = this.state.currentPiece.type;

    if (this.state.holdPiece) {
      // 交換暫存方塊
      const holdType = this.state.holdPiece;
      this.state.holdPiece = currentType;

      const shape = TETROMINOES[holdType][0];
      const x = Math.floor((this.config.width - shape[0].length) / 2);

      this.state.currentPiece = {
        type: holdType,
        rotation: 0,
        position: { x, y: 0 },
      };
    } else {
      // 首次暫存
      this.state.holdPiece = currentType;
      this.spawnPiece();
    }

    this.state.canHold = false;
    this.notifyStateChange();
  }

  /**
   * 鎖定方塊到棋盤
   */
  private lockPiece(): void {
    if (!this.state.currentPiece) return;

    const piece = this.state.currentPiece;
    const shape = this.getShape(piece);

    // 將方塊添加到棋盤
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = piece.position.x + x;
          const boardY = piece.position.y + y;
          if (boardY >= 0) {
            this.state.board[boardY][boardX] = piece.type;
          }
        }
      }
    }

    // 檢查並消除完整行
    const clearedLines = this.clearLines();
    if (clearedLines > 0) {
      this.onLineClear?.(clearedLines);
    }

    // 產生新方塊
    this.spawnPiece();
    this.notifyStateChange();
  }

  /**
   * 消除完整行
   */
  private clearLines(): number {
    let linesCleared = 0;

    for (let y = this.config.height - 1; y >= 0; y--) {
      if (this.state.board[y].every((cell) => cell !== null)) {
        // 移除該行
        this.state.board.splice(y, 1);
        // 在頂部添加新的空行
        this.state.board.unshift(new Array(this.config.width).fill(null));
        linesCleared++;
        y++; // 重新檢查當前位置
      }
    }

    if (linesCleared > 0) {
      // 更新分數
      const lineScore = SCORE_TABLE[linesCleared as 1 | 2 | 3 | 4] || 0;
      this.state.score += lineScore * this.state.level;

      // 更新消除行數
      this.state.lines += linesCleared;

      // 更新等級（每 10 行升一級）
      const newLevel = Math.floor(this.state.lines / 10) + 1;
      if (newLevel > this.state.level) {
        this.state.level = Math.min(newLevel, 20);
        this.restartDropInterval();
      }
    }

    return linesCleared;
  }

  /**
   * 取得當前下落速度
   */
  private getDropSpeed(): number {
    const levelIndex = Math.min(this.state.level - 1, LEVEL_SPEEDS.length - 1);
    return LEVEL_SPEEDS[levelIndex];
  }

  /**
   * 開始自動下落
   */
  private startDropInterval(): void {
    this.stopDropInterval();
    this.dropInterval = setInterval(() => {
      this.move('down');
    }, this.getDropSpeed());
  }

  /**
   * 停止自動下落
   */
  private stopDropInterval(): void {
    if (this.dropInterval) {
      clearInterval(this.dropInterval);
      this.dropInterval = null;
    }
  }

  /**
   * 重新啟動下落間隔（用於升級時）
   */
  private restartDropInterval(): void {
    if (!this.state.isPaused && !this.state.gameOver) {
      this.startDropInterval();
    }
  }

  /**
   * 取得影子位置（預覽落點）
   */
  getGhostPosition(): Position | null {
    if (!this.state.currentPiece) return null;

    let ghostY = this.state.currentPiece.position.y;
    while (this.isValidPosition(this.state.currentPiece, 0, ghostY - this.state.currentPiece.position.y + 1)) {
      ghostY++;
    }

    return {
      x: this.state.currentPiece.position.x,
      y: ghostY,
    };
  }

  /**
   * 取得遊戲時長（秒）
   */
  getPlayTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  /**
   * 通知狀態變更
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  /**
   * 清理資源
   */
  destroy(): void {
    this.stopDropInterval();
  }
}

export default TetrisGame;
