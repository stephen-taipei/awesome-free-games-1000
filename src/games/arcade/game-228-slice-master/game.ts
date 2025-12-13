/**
 * 切割大師遊戲核心邏輯
 * Game #228 - 精準切割得分
 */

export interface Point {
  x: number;
  y: number;
}

export interface SliceableObject {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: 'fruit' | 'bomb';
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  sliceParts?: SlicePart[];
}

export interface SlicePart {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

export interface SliceLine {
  points: Point[];
  timestamp: number;
}

export interface GameState {
  objects: SliceableObject[];
  sliceParts: SlicePart[];
  sliceLines: SliceLine[];
  score: number;
  bestScore: number;
  lives: number;
  gameOver: boolean;
  isPlaying: boolean;
  combo: number;
  maxCombo: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gravity: number;
  spawnInterval: number;
  maxLives: number;
}

const FRUIT_COLORS = [
  '#ff6b6b', // 紅色 (蘋果)
  '#ffd93d', // 黃色 (香蕉)
  '#6bcb77', // 綠色 (西瓜)
  '#ff9f43', // 橙色 (橘子)
  '#a55eea', // 紫色 (葡萄)
];

export class SliceMasterGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastSpawnTime: number = 0;
  private objectIdCounter: number = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      gravity: config.gravity ?? 0.3,
      spawnInterval: config.spawnInterval ?? 1500,
      maxLives: config.maxLives ?? 3,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      objects: [],
      sliceParts: [],
      sliceLines: [],
      score: 0,
      bestScore: this.loadBestScore(),
      lives: this.config.maxLives,
      gameOver: false,
      isPlaying: false,
      combo: 0,
      maxCombo: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_228_slice_master_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_228_slice_master_best', score.toString());
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

  newGame(): void {
    this.state = this.createInitialState();
    this.state.isPlaying = true;
    this.lastSpawnTime = Date.now();
    this.gameLoop();
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    this.update();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    const now = Date.now();

    // 生成新物件
    if (now - this.lastSpawnTime > this.config.spawnInterval) {
      this.spawnObjects();
      this.lastSpawnTime = now;
    }

    // 更新物件位置
    this.state.objects.forEach((obj) => {
      if (!obj.sliced) {
        obj.x += obj.velocityX;
        obj.y += obj.velocityY;
        obj.velocityY += this.config.gravity;
        obj.rotation += obj.rotationSpeed;
      }
    });

    // 更新切片部分
    this.state.sliceParts.forEach((part) => {
      part.x += part.velocityX;
      part.y += part.velocityY;
      part.velocityY += this.config.gravity;
      part.rotation += part.rotationSpeed;
    });

    // 檢查未切割水果掉落
    this.state.objects = this.state.objects.filter((obj) => {
      if (!obj.sliced && obj.y > this.config.canvasHeight + 50) {
        if (obj.type === 'fruit') {
          this.state.lives--;
          this.state.combo = 0;
          if (this.state.lives <= 0) {
            this.gameOver();
          }
        }
        return false;
      }
      return true;
    });

    // 移除超出畫面的切片
    this.state.sliceParts = this.state.sliceParts.filter(
      (part) => part.y < this.config.canvasHeight + 100
    );

    // 清理舊的切割線
    this.state.sliceLines = this.state.sliceLines.filter(
      (line) => now - line.timestamp < 200
    );
  }

  private spawnObjects(): void {
    const count = 1 + Math.floor(Math.random() * 3);
    const baseDelay = 200;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnSingleObject();
      }, i * baseDelay);
    }
  }

  private spawnSingleObject(): void {
    const isBomb = Math.random() < 0.15;
    const side = Math.random() < 0.5 ? 'left' : 'right';

    const x = side === 'left'
      ? Math.random() * (this.config.canvasWidth / 3)
      : this.config.canvasWidth - Math.random() * (this.config.canvasWidth / 3);

    const velocityX = side === 'left'
      ? 2 + Math.random() * 3
      : -(2 + Math.random() * 3);

    const obj: SliceableObject = {
      id: ++this.objectIdCounter,
      x: x,
      y: this.config.canvasHeight + 50,
      radius: 30 + Math.random() * 20,
      color: isBomb ? '#2c3e50' : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
      type: isBomb ? 'bomb' : 'fruit',
      velocityX: velocityX,
      velocityY: -(12 + Math.random() * 5),
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      sliced: false,
    };

    this.state.objects.push(obj);
  }

  startSlice(x: number, y: number): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    this.state.sliceLines.push({
      points: [{ x, y }],
      timestamp: Date.now(),
    });
  }

  continueSlice(x: number, y: number): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentLine = this.state.sliceLines[this.state.sliceLines.length - 1];
    if (!currentLine) return;

    const lastPoint = currentLine.points[currentLine.points.length - 1];

    // 檢查切割碰撞
    this.checkSliceCollisions(lastPoint.x, lastPoint.y, x, y);

    currentLine.points.push({ x, y });
    currentLine.timestamp = Date.now();
  }

  endSlice(): void {
    this.state.combo = 0;
  }

  private checkSliceCollisions(x1: number, y1: number, x2: number, y2: number): void {
    this.state.objects.forEach((obj) => {
      if (obj.sliced) return;

      // 簡單的線段與圓碰撞檢測
      const dx = x2 - x1;
      const dy = y2 - y1;
      const fx = x1 - obj.x;
      const fy = y1 - obj.y;

      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - obj.radius * obj.radius;

      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t >= 0 && t <= 1) {
          this.sliceObject(obj);
        }
      }
    });
  }

  private sliceObject(obj: SliceableObject): void {
    obj.sliced = true;

    if (obj.type === 'bomb') {
      // 切到炸彈，遊戲結束
      this.gameOver();
      return;
    }

    // 計算得分
    this.state.combo++;
    const points = 10 * this.state.combo;
    this.state.score += points;

    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }

    // 創建切片部分
    const angle = Math.random() * Math.PI;
    for (let i = 0; i < 2; i++) {
      const direction = i === 0 ? 1 : -1;
      this.state.sliceParts.push({
        x: obj.x,
        y: obj.y,
        width: obj.radius,
        height: obj.radius,
        velocityX: obj.velocityX + direction * 3,
        velocityY: obj.velocityY - 2,
        rotation: angle + direction * Math.PI / 2,
        rotationSpeed: direction * 0.1,
        color: obj.color,
      });
    }

    // 移除原物件
    const index = this.state.objects.indexOf(obj);
    if (index > -1) {
      this.state.objects.splice(index, 1);
    }
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

export default SliceMasterGame;
