/**
 * 方塊堆疊遊戲核心邏輯
 * Game #227 - 堆疊方塊越高越好
 */

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  velocity: number;
  direction: 1 | -1;
  placed: boolean;
}

export interface GameState {
  blocks: Block[];
  currentBlock: Block | null;
  score: number;
  bestScore: number;
  gameOver: boolean;
  isPlaying: boolean;
  perfectCount: number;
  combo: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  blockHeight: number;
  initialBlockWidth: number;
  baseSpeed: number;
  maxSpeed: number;
}

const COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1',
  '#5f27cd', '#ff9ff3', '#54a0ff', '#00d2d3',
];

export class BlockStackGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      blockHeight: config.blockHeight ?? 30,
      initialBlockWidth: config.initialBlockWidth ?? 200,
      baseSpeed: config.baseSpeed ?? 3,
      maxSpeed: config.maxSpeed ?? 10,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      blocks: [],
      currentBlock: null,
      score: 0,
      bestScore: this.loadBestScore(),
      gameOver: false,
      isPlaying: false,
      perfectCount: 0,
      combo: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_227_block_stack_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_227_block_stack_best', score.toString());
    } catch {
      // 忽略錯誤
    }
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getConfig(): GameConfig {
    return { ...this.config };
  }

  newGame(): void {
    this.state = this.createInitialState();

    // 建立基座
    const baseBlock: Block = {
      x: (this.config.canvasWidth - this.config.initialBlockWidth) / 2,
      y: this.config.canvasHeight - this.config.blockHeight,
      width: this.config.initialBlockWidth,
      height: this.config.blockHeight,
      color: COLORS[0],
      velocity: 0,
      direction: 1,
      placed: true,
    };
    this.state.blocks.push(baseBlock);

    // 建立第一個移動方塊
    this.createNewBlock();

    this.state.isPlaying = true;
    this.gameLoop();
    this.notifyStateChange();
  }

  private createNewBlock(): void {
    const topBlock = this.state.blocks[this.state.blocks.length - 1];
    const speed = Math.min(
      this.config.maxSpeed,
      this.config.baseSpeed + this.state.score * 0.1
    );

    const colorIndex = this.state.blocks.length % COLORS.length;

    this.state.currentBlock = {
      x: 0,
      y: topBlock.y - this.config.blockHeight,
      width: topBlock.width,
      height: this.config.blockHeight,
      color: COLORS[colorIndex],
      velocity: speed,
      direction: 1,
      placed: false,
    };
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    this.update();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (!this.state.currentBlock) return;

    const block = this.state.currentBlock;

    // 移動方塊
    block.x += block.velocity * block.direction;

    // 邊界反彈
    if (block.x + block.width >= this.config.canvasWidth) {
      block.x = this.config.canvasWidth - block.width;
      block.direction = -1;
    } else if (block.x <= 0) {
      block.x = 0;
      block.direction = 1;
    }
  }

  placeBlock(): void {
    if (!this.state.currentBlock || this.state.gameOver) return;

    const currentBlock = this.state.currentBlock;
    const topBlock = this.state.blocks[this.state.blocks.length - 1];

    // 計算重疊區域
    const overlapLeft = Math.max(currentBlock.x, topBlock.x);
    const overlapRight = Math.min(
      currentBlock.x + currentBlock.width,
      topBlock.x + topBlock.width
    );
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // 完全沒有重疊，遊戲結束
      this.gameOver();
      return;
    }

    // 判斷是否完美放置
    const perfectThreshold = 5;
    const isPerfect = Math.abs(currentBlock.x - topBlock.x) < perfectThreshold;

    if (isPerfect) {
      // 完美放置，保持寬度
      currentBlock.x = topBlock.x;
      this.state.perfectCount++;
      this.state.combo++;

      // 連續完美獎勵
      if (this.state.combo >= 3) {
        this.state.score += this.state.combo;
      }
    } else {
      // 切掉未重疊的部分
      currentBlock.x = overlapLeft;
      currentBlock.width = overlapWidth;
      this.state.combo = 0;
    }

    currentBlock.placed = true;
    this.state.blocks.push(currentBlock);
    this.state.score++;

    // 如果方塊太寬，需要收縮視角
    // 這裡簡化處理，當方塊太小時結束遊戲
    if (currentBlock.width < 10) {
      this.gameOver();
      return;
    }

    // 當方塊堆疊太高時，下移所有方塊
    if (this.state.blocks.length > 15) {
      this.state.blocks.forEach(block => {
        block.y += this.config.blockHeight;
      });
      // 移除超出畫面的方塊
      this.state.blocks = this.state.blocks.filter(
        block => block.y < this.config.canvasHeight + this.config.blockHeight
      );
    }

    // 建立新方塊
    this.createNewBlock();
    this.notifyStateChange();
  }

  private gameOver(): void {
    this.state.gameOver = true;
    this.state.isPlaying = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      this.saveBestScore(this.state.bestScore);
    }

    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export default BlockStackGame;
