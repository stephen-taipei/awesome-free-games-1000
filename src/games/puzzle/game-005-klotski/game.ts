/**
 * 華容道遊戲核心邏輯
 * Klotski/Sliding Block Puzzle - Core Game Logic
 */

// Block types
export enum BlockType {
  CAOCAO = 'caocao',     // 2x2 - Main target piece
  GENERAL_V = 'general_v', // 1x2 vertical - 張飛、趙雲、馬超、黃忠
  GENERAL_H = 'general_h', // 2x1 horizontal - 關羽
  SOLDIER = 'soldier',   // 1x1 - 小兵
}

export interface Block {
  id: string;
  type: BlockType;
  x: number;      // Column (0-3)
  y: number;      // Row (0-4)
  width: number;  // 1 or 2
  height: number; // 1 or 2
  name: string;   // Character name for display
}

export interface Puzzle {
  id: string;
  name: string;
  blocks: Block[];
  minMoves: number; // Optimal solution moves
}

export interface GameState {
  puzzle: Puzzle;
  blocks: Block[];
  moves: number;
  startTime: number;
  isWon: boolean;
  moveHistory: Block[][];
}

// Board dimensions: 4 columns x 5 rows
export const BOARD_WIDTH = 4;
export const BOARD_HEIGHT = 5;

// Exit position: bottom center (columns 1-2, row 5)
export const EXIT_X = 1;
export const EXIT_Y = 5;

// Classic Klotski puzzles
export const PUZZLES: Puzzle[] = [
  {
    id: 'hengdaolima',
    name: '横刀立马',
    minMoves: 81,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 1, y: 2, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 0, y: 4, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 1, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 2, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 3, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'zhihuiruoding',
    name: '指挥若定',
    minMoves: 70,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 0, y: 4, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 1, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 2, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 2, y: 4, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 3, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'jiangyongcaoying',
    name: '将拥曹营',
    minMoves: 72,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 1, y: 2, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 3, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 3, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 0, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 3, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 1, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 2, y: 3, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'qitouibingjin',
    name: '齐头并进',
    minMoves: 60,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 1, y: 4, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 1, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 2, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 1, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 2, y: 3, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'bingfensanlu',
    name: '兵分三路',
    minMoves: 73,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 0, y: 2, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 2, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 0, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 1, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 0, y: 4, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 1, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'cengcengshefang',
    name: '层层设防',
    minMoves: 84,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 1, y: 3, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 1, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 2, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 0, y: 4, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 3, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'chachinianfei',
    name: '插翅难飞',
    minMoves: 62,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 0, y: 3, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 2, width: 1, height: 1, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 1, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 2, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 2, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 3, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'shoukouruping',
    name: '守口如瓶',
    minMoves: 100,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 1, y: 4, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 1, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 1, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 3, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 3, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 0, y: 0, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 3, y: 0, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 1, y: 2, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 2, y: 2, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'jinzaizhichi',
    name: '近在咫尺',
    minMoves: 100,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 1, y: 3, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 0, y: 0, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 0, y: 1, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 0, y: 3, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 2, y: 0, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 1, y: 1, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 2, y: 1, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 3, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
  {
    id: 'zoutouwulu',
    name: '走投无路',
    minMoves: 81,
    blocks: [
      { id: 'caocao', type: BlockType.CAOCAO, x: 0, y: 0, width: 2, height: 2, name: '曹操' },
      { id: 'guanyu', type: BlockType.GENERAL_H, x: 0, y: 2, width: 2, height: 1, name: '關羽' },
      { id: 'zhangfei', type: BlockType.GENERAL_V, x: 2, y: 0, width: 1, height: 2, name: '張飛' },
      { id: 'zhaoyun', type: BlockType.GENERAL_V, x: 3, y: 0, width: 1, height: 2, name: '趙雲' },
      { id: 'machao', type: BlockType.GENERAL_V, x: 2, y: 2, width: 1, height: 2, name: '馬超' },
      { id: 'huangzhong', type: BlockType.GENERAL_V, x: 3, y: 2, width: 1, height: 2, name: '黃忠' },
      { id: 'bing1', type: BlockType.SOLDIER, x: 0, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing2', type: BlockType.SOLDIER, x: 1, y: 3, width: 1, height: 1, name: '兵' },
      { id: 'bing3', type: BlockType.SOLDIER, x: 0, y: 4, width: 1, height: 1, name: '兵' },
      { id: 'bing4', type: BlockType.SOLDIER, x: 1, y: 4, width: 1, height: 1, name: '兵' },
    ],
  },
];

export class KlotskiGame {
  private state: GameState;
  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(puzzleIndex: number = 0) {
    const puzzle = PUZZLES[puzzleIndex] || PUZZLES[0];
    this.state = this.initializeState(puzzle);
  }

  private initializeState(puzzle: Puzzle): GameState {
    return {
      puzzle,
      blocks: JSON.parse(JSON.stringify(puzzle.blocks)),
      moves: 0,
      startTime: Date.now(),
      isWon: false,
      moveHistory: [],
    };
  }

  public setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getPuzzles(): Puzzle[] {
    return PUZZLES;
  }

  public selectPuzzle(puzzleIndex: number): void {
    const puzzle = PUZZLES[puzzleIndex];
    if (puzzle) {
      this.state = this.initializeState(puzzle);
      this.notifyStateChange();
    }
  }

  public reset(): void {
    this.state = this.initializeState(this.state.puzzle);
    this.notifyStateChange();
  }

  public undo(): boolean {
    if (this.state.moveHistory.length === 0) {
      return false;
    }

    const previousState = this.state.moveHistory.pop()!;
    this.state.blocks = previousState;
    this.state.moves = Math.max(0, this.state.moves - 1);
    this.notifyStateChange();
    return true;
  }

  // Get board occupancy grid
  private getOccupancyGrid(): (string | null)[][] {
    const grid: (string | null)[][] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      grid[y] = [];
      for (let x = 0; x < BOARD_WIDTH; x++) {
        grid[y][x] = null;
      }
    }

    for (const block of this.state.blocks) {
      for (let dy = 0; dy < block.height; dy++) {
        for (let dx = 0; dx < block.width; dx++) {
          const px = block.x + dx;
          const py = block.y + dy;
          if (py < BOARD_HEIGHT && px < BOARD_WIDTH) {
            grid[py][px] = block.id;
          }
        }
      }
    }

    return grid;
  }

  // Check if a block can move in a direction
  public canMove(blockId: string, dx: number, dy: number): boolean {
    const block = this.state.blocks.find(b => b.id === blockId);
    if (!block || this.state.isWon) return false;

    const newX = block.x + dx;
    const newY = block.y + dy;

    // Check board boundaries
    if (newX < 0 || newX + block.width > BOARD_WIDTH) return false;
    if (newY < 0 || newY + block.height > BOARD_HEIGHT) return false;

    // Check for collision with other blocks
    const grid = this.getOccupancyGrid();
    for (let by = 0; by < block.height; by++) {
      for (let bx = 0; bx < block.width; bx++) {
        const checkX = newX + bx;
        const checkY = newY + by;

        if (checkY < BOARD_HEIGHT && checkX < BOARD_WIDTH) {
          const occupant = grid[checkY][checkX];
          if (occupant && occupant !== block.id) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Get valid moves for a block
  public getValidMoves(blockId: string): { dx: number; dy: number }[] {
    const moves: { dx: number; dy: number }[] = [];

    if (this.canMove(blockId, -1, 0)) moves.push({ dx: -1, dy: 0 });
    if (this.canMove(blockId, 1, 0)) moves.push({ dx: 1, dy: 0 });
    if (this.canMove(blockId, 0, -1)) moves.push({ dx: 0, dy: -1 });
    if (this.canMove(blockId, 0, 1)) moves.push({ dx: 0, dy: 1 });

    return moves;
  }

  // Move a block
  public moveBlock(blockId: string, dx: number, dy: number): boolean {
    if (!this.canMove(blockId, dx, dy)) return false;

    // Save history
    this.state.moveHistory.push(JSON.parse(JSON.stringify(this.state.blocks)));

    // Move block
    const block = this.state.blocks.find(b => b.id === blockId)!;
    block.x += dx;
    block.y += dy;
    this.state.moves++;

    // Check win condition
    this.checkWinCondition();
    this.notifyStateChange();

    return true;
  }

  // Check if Cao Cao has escaped
  private checkWinCondition(): void {
    const caocao = this.state.blocks.find(b => b.type === BlockType.CAOCAO);
    if (caocao && caocao.x === EXIT_X && caocao.y === BOARD_HEIGHT - 2) {
      // Cao Cao is at position where it can exit (x: 1, y: 3 means bottom center)
      this.state.isWon = true;
    }
  }

  // Get elapsed time in seconds
  public getElapsedTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  // Get block at position
  public getBlockAt(x: number, y: number): Block | null {
    for (const block of this.state.blocks) {
      if (
        x >= block.x &&
        x < block.x + block.width &&
        y >= block.y &&
        y < block.y + block.height
      ) {
        return block;
      }
    }
    return null;
  }
}

export default KlotskiGame;
