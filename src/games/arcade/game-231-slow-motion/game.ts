/**
 * 時間慢動作遊戲核心邏輯
 * Game #231 - 慢動作閃避子彈
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
}

export interface Bullet {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  color: string;
}

export interface GameState {
  player: Player;
  bullets: Bullet[];
  score: number;
  bestScore: number;
  slowMotionEnergy: number;
  maxEnergy: number;
  isSlowMotion: boolean;
  timeScale: number;
  gameOver: boolean;
  isPlaying: boolean;
  survivalTime: number;
  difficulty: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  bulletRadius: number;
  normalTimeScale: number;
  slowTimeScale: number;
  energyDrainRate: number;
  energyRechargeRate: number;
}

const BULLET_COLORS = ['#ff6b6b', '#ff9ff3', '#feca57', '#48dbfb', '#1dd1a1'];

export class SlowMotionGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 15,
      bulletRadius: config.bulletRadius ?? 8,
      normalTimeScale: config.normalTimeScale ?? 1,
      slowTimeScale: config.slowTimeScale ?? 0.2,
      energyDrainRate: config.energyDrainRate ?? 30,
      energyRechargeRate: config.energyRechargeRate ?? 10,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        radius: this.config.playerRadius,
      },
      bullets: [],
      score: 0,
      bestScore: this.loadBestScore(),
      slowMotionEnergy: 100,
      maxEnergy: 100,
      isSlowMotion: false,
      timeScale: this.config.normalTimeScale,
      gameOver: false,
      isPlaying: false,
      survivalTime: 0,
      difficulty: 1,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_231_slow_motion_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_231_slow_motion_best', score.toString());
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
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.gameLoop();
    this.notifyStateChange();
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
    const effectiveDelta = deltaTime * this.state.timeScale;

    // 更新生存時間和難度
    this.state.survivalTime += deltaTime;
    this.state.difficulty = 1 + Math.floor(this.state.survivalTime / 10) * 0.2;
    this.state.score = Math.floor(this.state.survivalTime * 10);

    // 更新慢動作能量
    if (this.state.isSlowMotion) {
      this.state.slowMotionEnergy -= this.config.energyDrainRate * deltaTime;
      if (this.state.slowMotionEnergy <= 0) {
        this.state.slowMotionEnergy = 0;
        this.state.isSlowMotion = false;
        this.state.timeScale = this.config.normalTimeScale;
      }
    } else {
      this.state.slowMotionEnergy = Math.min(
        this.state.maxEnergy,
        this.state.slowMotionEnergy + this.config.energyRechargeRate * deltaTime
      );
    }

    // 生成子彈
    this.spawnTimer += deltaTime;
    const spawnInterval = Math.max(0.3, 1.5 - this.state.difficulty * 0.1);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnBullet();
      this.spawnTimer = 0;
    }

    // 更新子彈位置
    this.state.bullets.forEach((bullet) => {
      bullet.x += bullet.velocityX * effectiveDelta;
      bullet.y += bullet.velocityY * effectiveDelta;
    });

    // 移除超出畫面的子彈
    this.state.bullets = this.state.bullets.filter((bullet) => {
      return (
        bullet.x > -50 &&
        bullet.x < this.config.canvasWidth + 50 &&
        bullet.y > -50 &&
        bullet.y < this.config.canvasHeight + 50
      );
    });

    // 碰撞檢測
    this.checkCollisions();
  }

  private spawnBullet(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number, velocityX: number, velocityY: number;
    const baseSpeed = 150 + this.state.difficulty * 30;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -20;
        velocityX = (Math.random() - 0.5) * baseSpeed;
        velocityY = baseSpeed * (0.5 + Math.random() * 0.5);
        break;
      case 1: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + 20;
        velocityX = (Math.random() - 0.5) * baseSpeed;
        velocityY = -baseSpeed * (0.5 + Math.random() * 0.5);
        break;
      case 2: // 左
        x = -20;
        y = Math.random() * this.config.canvasHeight;
        velocityX = baseSpeed * (0.5 + Math.random() * 0.5);
        velocityY = (Math.random() - 0.5) * baseSpeed;
        break;
      default: // 右
        x = this.config.canvasWidth + 20;
        y = Math.random() * this.config.canvasHeight;
        velocityX = -baseSpeed * (0.5 + Math.random() * 0.5);
        velocityY = (Math.random() - 0.5) * baseSpeed;
    }

    // 隨機瞄準玩家
    if (Math.random() < 0.3) {
      const dx = this.state.player.x - x;
      const dy = this.state.player.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      velocityX = (dx / dist) * baseSpeed;
      velocityY = (dy / dist) * baseSpeed;
    }

    this.state.bullets.push({
      x,
      y,
      velocityX,
      velocityY,
      radius: this.config.bulletRadius,
      color: BULLET_COLORS[Math.floor(Math.random() * BULLET_COLORS.length)],
    });
  }

  private checkCollisions(): void {
    for (const bullet of this.state.bullets) {
      const dx = this.state.player.x - bullet.x;
      const dy = this.state.player.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.state.player.radius + bullet.radius) {
        this.gameOver();
        return;
      }
    }
  }

  setPlayerPosition(x: number, y: number): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    this.state.player.x = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasWidth - this.state.player.radius, x)
    );
    this.state.player.y = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasHeight - this.state.player.radius, y)
    );
  }

  setSlowMotion(active: boolean): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    if (active && this.state.slowMotionEnergy > 0) {
      this.state.isSlowMotion = true;
      this.state.timeScale = this.config.slowTimeScale;
    } else {
      this.state.isSlowMotion = false;
      this.state.timeScale = this.config.normalTimeScale;
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

export default SlowMotionGame;
