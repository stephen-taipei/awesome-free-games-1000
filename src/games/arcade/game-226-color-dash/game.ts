/**
 * 色彩衝刺遊戲核心邏輯
 * Game #226 - 穿越同色障礙
 */

export interface Position {
  x: number;
  y: number;
}

export type ColorType = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  x: number;
  y: number;
  color: ColorType;
  size: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: ColorType;
  passed: boolean;
}

export interface ColorSwitch {
  x: number;
  y: number;
  radius: number;
  colors: ColorType[];
  rotation: number;
}

export interface GameState {
  player: Player;
  obstacles: Obstacle[];
  colorSwitches: ColorSwitch[];
  score: number;
  bestScore: number;
  gameOver: boolean;
  isPlaying: boolean;
  scrollY: number;
  speed: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerSize: number;
  initialSpeed: number;
  maxSpeed: number;
  obstacleGap: number;
}

const COLORS: ColorType[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_VALUES: Record<ColorType, string> = {
  red: '#f44336',
  blue: '#2196f3',
  green: '#4caf50',
  yellow: '#ffeb3b',
};

export class ColorDashGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerSize: config.playerSize ?? 20,
      initialSpeed: config.initialSpeed ?? 3,
      maxSpeed: config.maxSpeed ?? 8,
      obstacleGap: config.obstacleGap ?? 200,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: this.config.playerSize,
      },
      obstacles: [],
      colorSwitches: [],
      score: 0,
      bestScore: this.loadBestScore(),
      gameOver: false,
      isPlaying: false,
      scrollY: 0,
      speed: this.config.initialSpeed,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_226_color_dash_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_226_color_dash_best', score.toString());
    } catch {
      // 忽略儲存錯誤
    }
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getColorValue(color: ColorType): string {
    return COLOR_VALUES[color];
  }

  newGame(): void {
    this.state = this.createInitialState();
    this.generateInitialObstacles();
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    this.gameLoop();
    this.notifyStateChange();
  }

  private generateInitialObstacles(): void {
    for (let i = 0; i < 5; i++) {
      this.addObstacle(this.config.canvasHeight - 300 - i * this.config.obstacleGap);
      this.addColorSwitch(this.config.canvasHeight - 200 - i * this.config.obstacleGap);
    }
  }

  private addObstacle(y: number): void {
    const obstacleTypes = ['horizontal', 'vertical', 'rotating'];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    if (type === 'horizontal') {
      // 水平障礙物：四種顏色的橫條
      const segmentWidth = this.config.canvasWidth / 4;
      const shuffledColors = this.shuffleColors();
      for (let i = 0; i < 4; i++) {
        this.state.obstacles.push({
          x: i * segmentWidth,
          y: y,
          width: segmentWidth,
          height: 30,
          color: shuffledColors[i],
          passed: false,
        });
      }
    } else if (type === 'vertical') {
      // 垂直障礙物：左右兩側不同顏色
      const shuffledColors = this.shuffleColors();
      const gapWidth = 80;
      const sideWidth = (this.config.canvasWidth - gapWidth) / 2;

      this.state.obstacles.push({
        x: 0,
        y: y,
        width: sideWidth,
        height: 60,
        color: shuffledColors[0],
        passed: false,
      });
      this.state.obstacles.push({
        x: this.config.canvasWidth - sideWidth,
        y: y,
        width: sideWidth,
        height: 60,
        color: shuffledColors[1],
        passed: false,
      });
    } else {
      // 十字旋轉障礙物
      const centerX = this.config.canvasWidth / 2;
      const armLength = 60;
      const armWidth = 25;
      const shuffledColors = this.shuffleColors();

      // 上
      this.state.obstacles.push({
        x: centerX - armWidth / 2,
        y: y - armLength,
        width: armWidth,
        height: armLength,
        color: shuffledColors[0],
        passed: false,
      });
      // 下
      this.state.obstacles.push({
        x: centerX - armWidth / 2,
        y: y,
        width: armWidth,
        height: armLength,
        color: shuffledColors[1],
        passed: false,
      });
      // 左
      this.state.obstacles.push({
        x: centerX - armLength - armWidth / 2,
        y: y - armWidth / 2,
        width: armLength,
        height: armWidth,
        color: shuffledColors[2],
        passed: false,
      });
      // 右
      this.state.obstacles.push({
        x: centerX + armWidth / 2,
        y: y - armWidth / 2,
        width: armLength,
        height: armWidth,
        color: shuffledColors[3],
        passed: false,
      });
    }
  }

  private addColorSwitch(y: number): void {
    this.state.colorSwitches.push({
      x: this.config.canvasWidth / 2,
      y: y,
      radius: 25,
      colors: this.shuffleColors(),
      rotation: 0,
    });
  }

  private shuffleColors(): ColorType[] {
    const colors = [...COLORS];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors;
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // 更新滾動
    this.state.scrollY += this.state.speed;

    // 更新玩家位置（向上移動效果）
    this.state.player.y -= this.state.speed;

    // 限制玩家在畫面內
    if (this.state.player.y < 100) {
      this.state.player.y = 100;
    }

    // 更新顏色切換器旋轉
    this.state.colorSwitches.forEach(cs => {
      cs.rotation += deltaTime * 2;
    });

    // 檢查碰撞
    this.checkCollisions();

    // 生成新障礙物
    const topObstacleY = Math.min(...this.state.obstacles.map(o => o.y));
    if (topObstacleY > -this.config.obstacleGap) {
      this.addObstacle(topObstacleY - this.config.obstacleGap);
      this.addColorSwitch(topObstacleY - this.config.obstacleGap + 100);
    }

    // 移除超出畫面的障礙物和計分
    this.state.obstacles = this.state.obstacles.filter(obstacle => {
      if (obstacle.y > this.config.canvasHeight) {
        if (!obstacle.passed) {
          this.state.score++;
          obstacle.passed = true;
        }
        return false;
      }
      return true;
    });

    this.state.colorSwitches = this.state.colorSwitches.filter(
      cs => cs.y < this.config.canvasHeight + 50
    );

    // 增加速度
    this.state.speed = Math.min(
      this.config.maxSpeed,
      this.config.initialSpeed + this.state.score * 0.05
    );
  }

  private checkCollisions(): void {
    const player = this.state.player;
    const playerBounds = {
      left: player.x - player.size / 2,
      right: player.x + player.size / 2,
      top: player.y - player.size / 2,
      bottom: player.y + player.size / 2,
    };

    // 檢查與障礙物碰撞
    for (const obstacle of this.state.obstacles) {
      if (this.rectsIntersect(playerBounds, {
        left: obstacle.x,
        right: obstacle.x + obstacle.width,
        top: obstacle.y,
        bottom: obstacle.y + obstacle.height,
      })) {
        // 碰撞到不同顏色的障礙物
        if (obstacle.color !== player.color) {
          this.gameOver();
          return;
        }
      }
    }

    // 檢查與顏色切換器碰撞
    for (const colorSwitch of this.state.colorSwitches) {
      const dx = player.x - colorSwitch.x;
      const dy = player.y - colorSwitch.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.size / 2 + colorSwitch.radius) {
        // 隨機切換顏色
        const newColor = colorSwitch.colors[Math.floor(Math.random() * colorSwitch.colors.length)];
        if (newColor !== player.color) {
          player.color = newColor;
        }
        // 移除已使用的切換器
        const index = this.state.colorSwitches.indexOf(colorSwitch);
        if (index > -1) {
          this.state.colorSwitches.splice(index, 1);
        }
        break;
      }
    }
  }

  private rectsIntersect(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number }
  ): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  moveLeft(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    this.state.player.x = Math.max(this.state.player.size / 2, this.state.player.x - 30);
    this.notifyStateChange();
  }

  moveRight(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    this.state.player.x = Math.min(
      this.config.canvasWidth - this.state.player.size / 2,
      this.state.player.x + 30
    );
    this.notifyStateChange();
  }

  setPlayerX(x: number): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    this.state.player.x = Math.max(
      this.state.player.size / 2,
      Math.min(this.config.canvasWidth - this.state.player.size / 2, x)
    );
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

export default ColorDashGame;
