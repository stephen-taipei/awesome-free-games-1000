/**
 * 傳送帶工廠 (Conveyor Factory) 遊戲核心邏輯
 * Game #232 - 街機遊戲
 */

// 物品類型
export type ItemType = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

// 物品顏色
export const ITEM_COLORS: Record<ItemType, string> = {
  red: '#ff4444',
  blue: '#4444ff',
  green: '#44ff44',
  yellow: '#ffdd44',
  purple: '#dd44ff',
};

// 容器位置 (從左到右對應數字鍵 1-5)
export const CONTAINER_POSITIONS = [0, 1, 2, 3, 4];

export interface Item {
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Container {
  type: ItemType;
  position: number;
  count: number;
}

export interface GameState {
  items: Item[];
  containers: Container[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  speed: number;
  spawnTimer: number;
  gameOver: boolean;
  isPaused: boolean;
  startTime: number;
  itemsSorted: number;
}

export interface GameConfig {
  conveyorY: number;
  itemSize: number;
  containerSize: number;
  initialSpeed: number;
  speedIncrement: number;
  spawnInterval: number;
  maxLives: number;
}

// 計分規則
const SCORE_TABLE = {
  correct: 10,
  combo: 5,
  levelBonus: 50,
};

const ITEM_TYPES: ItemType[] = ['red', 'blue', 'green', 'yellow', 'purple'];

export class ConveyorFactoryGame {
  private config: GameConfig;
  private state: GameState;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private spawnInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange?: (state: GameState) => void;
  private onItemSorted?: (correct: boolean) => void;
  private onLevelUp?: (level: number) => void;
  private combo: number = 0;
  private lastUpdateTime: number = 0;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      conveyorY: config.conveyorY ?? 200,
      itemSize: config.itemSize ?? 40,
      containerSize: config.containerSize ?? 60,
      initialSpeed: config.initialSpeed ?? 1,
      speedIncrement: config.speedIncrement ?? 0.2,
      spawnInterval: config.spawnInterval ?? 2000,
      maxLives: config.maxLives ?? 5,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const highScore = this.loadHighScore();

    return {
      items: [],
      containers: this.initializeContainers(),
      score: 0,
      highScore,
      lives: this.config.maxLives,
      level: 1,
      speed: this.config.initialSpeed,
      spawnTimer: 0,
      gameOver: false,
      isPaused: false,
      startTime: Date.now(),
      itemsSorted: 0,
    };
  }

  /**
   * 初始化容器
   */
  private initializeContainers(): Container[] {
    return ITEM_TYPES.map((type, index) => ({
      type,
      position: index,
      count: 0,
    }));
  }

  /**
   * 設定狀態變更回調
   */
  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 設定物品分類回調
   */
  setOnItemSorted(callback: (correct: boolean) => void): void {
    this.onItemSorted = callback;
  }

  /**
   * 設定升級回調
   */
  setOnLevelUp(callback: (level: number) => void): void {
    this.onLevelUp = callback;
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
    this.stopIntervals();
    this.state = this.createInitialState();
    this.combo = 0;
    this.lastUpdateTime = Date.now();
    this.startIntervals();
    this.notifyStateChange();
  }

  /**
   * 暫停/繼續遊戲
   */
  togglePause(): void {
    if (this.state.gameOver) return;

    this.state.isPaused = !this.state.isPaused;

    if (this.state.isPaused) {
      this.stopIntervals();
    } else {
      this.lastUpdateTime = Date.now();
      this.startIntervals();
    }

    this.notifyStateChange();
  }

  /**
   * 開始遊戲循環
   */
  private startIntervals(): void {
    // 主更新循環（60 FPS）
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000 / 60);

    // 物品生成循環
    this.spawnInterval = setInterval(() => {
      this.spawnItem();
    }, this.config.spawnInterval / this.state.speed);
  }

  /**
   * 停止遊戲循環
   */
  private stopIntervals(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
  }

  /**
   * 更新遊戲狀態
   */
  private update(): void {
    if (this.state.isPaused || this.state.gameOver) return;

    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // 更新所有物品位置
    this.state.items = this.state.items.filter((item) => {
      item.y += item.speed * deltaTime * 60; // 移動物品

      // 檢查是否超出螢幕底部
      if (item.y > 600) {
        this.loseLife();
        return false;
      }

      return true;
    });

    this.notifyStateChange();
  }

  /**
   * 生成新物品
   */
  private spawnItem(): void {
    if (this.state.isPaused || this.state.gameOver) return;

    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const containerPos = this.state.containers.find((c) => c.type === type)!.position;

    // 計算物品的 x 位置（對應容器位置，加上一些隨機偏移）
    const baseX = 50 + containerPos * 100;
    const randomOffset = (Math.random() - 0.5) * 60;

    const item: Item = {
      type,
      x: baseX + randomOffset,
      y: -this.config.itemSize,
      width: this.config.itemSize,
      height: this.config.itemSize,
      speed: this.state.speed,
    };

    this.state.items.push(item);
  }

  /**
   * 點擊容器來分類物品
   */
  sortItem(containerIndex: number): void {
    if (this.state.isPaused || this.state.gameOver) return;

    const container = this.state.containers[containerIndex];
    if (!container) return;

    // 找到距離容器最近的物品
    const sortableItems = this.state.items.filter((item) => {
      const containerX = 50 + container.position * 100;
      const distance = Math.abs(item.x - containerX);
      // 物品必須在容器附近且在底部區域
      return distance < 80 && item.y > 400 && item.y < 550;
    });

    if (sortableItems.length === 0) return;

    // 選擇最接近的物品
    const targetItem = sortableItems.reduce((closest, item) => {
      const containerX = 50 + container.position * 100;
      const closestDistance = Math.abs(closest.x - containerX);
      const itemDistance = Math.abs(item.x - containerX);
      return itemDistance < closestDistance ? item : closest;
    });

    // 檢查分類是否正確
    const correct = targetItem.type === container.type;

    if (correct) {
      this.handleCorrectSort(container);
    } else {
      this.handleIncorrectSort();
    }

    // 移除已分類的物品
    this.state.items = this.state.items.filter((item) => item !== targetItem);

    this.onItemSorted?.(correct);
    this.notifyStateChange();
  }

  /**
   * 處理正確分類
   */
  private handleCorrectSort(container: Container): void {
    this.combo++;
    container.count++;

    // 計算分數
    let points = SCORE_TABLE.correct;
    if (this.combo > 1) {
      points += SCORE_TABLE.combo * (this.combo - 1);
    }
    points *= this.state.level;

    this.state.score += points;
    this.state.itemsSorted++;

    // 檢查是否升級（每 20 個物品升一級）
    if (this.state.itemsSorted % 20 === 0) {
      this.levelUp();
    }

    // 更新最高分
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveHighScore(this.state.highScore);
    }
  }

  /**
   * 處理錯誤分類
   */
  private handleIncorrectSort(): void {
    this.combo = 0;
    this.loseLife();
  }

  /**
   * 失去生命
   */
  private loseLife(): void {
    this.combo = 0;
    this.state.lives--;

    if (this.state.lives <= 0) {
      this.gameOver();
    }
  }

  /**
   * 升級
   */
  private levelUp(): void {
    this.state.level++;
    this.state.speed += this.config.speedIncrement;
    this.state.score += SCORE_TABLE.levelBonus * this.state.level;

    // 重新啟動生成循環以反映新速度
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = setInterval(() => {
        this.spawnItem();
      }, this.config.spawnInterval / this.state.speed);
    }

    this.onLevelUp?.(this.state.level);
  }

  /**
   * 遊戲結束
   */
  private gameOver(): void {
    this.state.gameOver = true;
    this.stopIntervals();
    this.notifyStateChange();
  }

  /**
   * 取得遊戲時長（秒）
   */
  getPlayTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }

  /**
   * 載入最高分
   */
  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('conveyor-factory-high-score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * 儲存最高分
   */
  private saveHighScore(score: number): void {
    try {
      localStorage.setItem('conveyor-factory-high-score', score.toString());
    } catch {
      // 忽略儲存錯誤
    }
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
    this.stopIntervals();
  }
}

export default ConveyorFactoryGame;
