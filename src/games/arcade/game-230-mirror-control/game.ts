/**
 * 鏡像控制遊戲核心邏輯
 * Game #230 - 同時控制鏡像角色
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  mirrored: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Goal {
  x: number;
  y: number;
  radius: number;
  reached: boolean;
  mirrored: boolean;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  player1: Player;
  player2: Player;
  platforms: Platform[];
  goals: Goal[];
  obstacles: Obstacle[];
  score: number;
  bestScore: number;
  level: number;
  gameOver: boolean;
  isPlaying: boolean;
  levelComplete: boolean;
  velocityY1: number;
  velocityY2: number;
  isJumping1: boolean;
  isJumping2: boolean;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  playerSize: number;
}

export class MirrorControlGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      gravity: config.gravity ?? 0.5,
      jumpForce: config.jumpForce ?? 12,
      moveSpeed: config.moveSpeed ?? 5,
      playerSize: config.playerSize ?? 30,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const midX = this.config.canvasWidth / 2;

    return {
      player1: {
        x: midX / 2 - this.config.playerSize / 2,
        y: this.config.canvasHeight - 100,
        width: this.config.playerSize,
        height: this.config.playerSize,
        color: '#3498db',
        mirrored: false,
      },
      player2: {
        x: midX + midX / 2 - this.config.playerSize / 2,
        y: this.config.canvasHeight - 100,
        width: this.config.playerSize,
        height: this.config.playerSize,
        color: '#e74c3c',
        mirrored: true,
      },
      platforms: [],
      goals: [],
      obstacles: [],
      score: 0,
      bestScore: this.loadBestScore(),
      level: 1,
      gameOver: false,
      isPlaying: false,
      levelComplete: false,
      velocityY1: 0,
      velocityY2: 0,
      isJumping1: false,
      isJumping2: false,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_230_mirror_control_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_230_mirror_control_best', score.toString());
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
    this.generateLevel();
    this.gameLoop();
    this.notifyStateChange();
  }

  private generateLevel(): void {
    const midX = this.config.canvasWidth / 2;
    const level = this.state.level;

    this.state.platforms = [];
    this.state.goals = [];
    this.state.obstacles = [];

    // 底部平台
    this.state.platforms.push({
      x: 0,
      y: this.config.canvasHeight - 50,
      width: this.config.canvasWidth,
      height: 50,
    });

    // 分隔線平台
    this.state.platforms.push({
      x: midX - 2,
      y: 0,
      width: 4,
      height: this.config.canvasHeight,
    });

    // 根據關卡生成平台
    const platformCount = 3 + level;
    for (let i = 0; i < platformCount; i++) {
      const y = this.config.canvasHeight - 150 - i * 80;
      if (y < 100) break;

      // 左側平台
      const leftX = 20 + Math.random() * (midX - 120);
      this.state.platforms.push({
        x: leftX,
        y: y,
        width: 80,
        height: 15,
      });

      // 右側鏡像平台
      this.state.platforms.push({
        x: this.config.canvasWidth - leftX - 80,
        y: y,
        width: 80,
        height: 15,
      });
    }

    // 目標
    const goalY = 100;
    this.state.goals.push({
      x: midX / 2,
      y: goalY,
      radius: 20,
      reached: false,
      mirrored: false,
    });
    this.state.goals.push({
      x: midX + midX / 2,
      y: goalY,
      radius: 20,
      reached: false,
      mirrored: true,
    });

    // 障礙物
    if (level > 1) {
      const obstacleCount = Math.min(level - 1, 3);
      for (let i = 0; i < obstacleCount; i++) {
        const y = this.config.canvasHeight - 200 - i * 150;
        if (y < 150) break;

        const leftX = 50 + Math.random() * (midX - 100);
        this.state.obstacles.push({
          x: leftX,
          y: y,
          width: 30,
          height: 30,
        });
        this.state.obstacles.push({
          x: this.config.canvasWidth - leftX - 30,
          y: y,
          width: 30,
          height: 30,
        });
      }
    }

    // 重置玩家位置
    this.state.player1.x = midX / 2 - this.config.playerSize / 2;
    this.state.player1.y = this.config.canvasHeight - 100;
    this.state.player2.x = midX + midX / 2 - this.config.playerSize / 2;
    this.state.player2.y = this.config.canvasHeight - 100;
    this.state.velocityY1 = 0;
    this.state.velocityY2 = 0;
    this.state.levelComplete = false;
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver || this.state.levelComplete) return;

    this.update();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    const midX = this.config.canvasWidth / 2;

    // 處理水平移動
    let moveX = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      moveX = -this.config.moveSpeed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      moveX = this.config.moveSpeed;
    }

    // 玩家1正常移動
    this.state.player1.x += moveX;
    // 玩家2鏡像移動
    this.state.player2.x -= moveX;

    // 限制玩家1在左半區
    this.state.player1.x = Math.max(0, Math.min(midX - this.state.player1.width - 5, this.state.player1.x));
    // 限制玩家2在右半區
    this.state.player2.x = Math.max(midX + 5, Math.min(this.config.canvasWidth - this.state.player2.width, this.state.player2.x));

    // 應用重力
    this.state.velocityY1 += this.config.gravity;
    this.state.velocityY2 += this.config.gravity;

    // 更新垂直位置
    this.state.player1.y += this.state.velocityY1;
    this.state.player2.y += this.state.velocityY2;

    // 平台碰撞
    this.checkPlatformCollisions();

    // 障礙物碰撞
    this.checkObstacleCollisions();

    // 目標碰撞
    this.checkGoalCollisions();

    // 檢查是否完成
    if (this.state.goals.every(g => g.reached)) {
      this.state.levelComplete = true;
      this.state.score += 100 * this.state.level;
    }

    // 檢查掉落
    if (this.state.player1.y > this.config.canvasHeight || this.state.player2.y > this.config.canvasHeight) {
      this.gameOver();
    }
  }

  private checkPlatformCollisions(): void {
    for (const platform of this.state.platforms) {
      // 玩家1
      if (this.checkCollision(this.state.player1, platform) && this.state.velocityY1 > 0) {
        if (this.state.player1.y + this.state.player1.height - this.state.velocityY1 <= platform.y) {
          this.state.player1.y = platform.y - this.state.player1.height;
          this.state.velocityY1 = 0;
          this.state.isJumping1 = false;
        }
      }

      // 玩家2
      if (this.checkCollision(this.state.player2, platform) && this.state.velocityY2 > 0) {
        if (this.state.player2.y + this.state.player2.height - this.state.velocityY2 <= platform.y) {
          this.state.player2.y = platform.y - this.state.player2.height;
          this.state.velocityY2 = 0;
          this.state.isJumping2 = false;
        }
      }
    }
  }

  private checkObstacleCollisions(): void {
    for (const obstacle of this.state.obstacles) {
      if (this.checkCollision(this.state.player1, obstacle) ||
          this.checkCollision(this.state.player2, obstacle)) {
        this.gameOver();
        return;
      }
    }
  }

  private checkGoalCollisions(): void {
    for (const goal of this.state.goals) {
      if (goal.reached) continue;

      const player = goal.mirrored ? this.state.player2 : this.state.player1;
      const dx = (player.x + player.width / 2) - goal.x;
      const dy = (player.y + player.height / 2) - goal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < goal.radius + player.width / 2) {
        goal.reached = true;
      }
    }
  }

  private checkCollision(a: { x: number; y: number; width: number; height: number },
                         b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  jump(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    if (!this.state.isJumping1) {
      this.state.velocityY1 = -this.config.jumpForce;
      this.state.isJumping1 = true;
    }
    if (!this.state.isJumping2) {
      this.state.velocityY2 = -this.config.jumpForce;
      this.state.isJumping2 = true;
    }
  }

  setKey(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  nextLevel(): void {
    if (!this.state.levelComplete) return;

    this.state.level++;
    this.generateLevel();
    this.state.isPlaying = true;
    this.gameLoop();
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

export default MirrorControlGame;
