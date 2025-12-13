/**
 * 引力彈射遊戲核心邏輯
 * Game #229 - 利用引力彈射
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Planet {
  x: number;
  y: number;
  radius: number;
  mass: number;
  color: string;
}

export interface Projectile {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  trail: Vector[];
}

export interface Target {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface GameState {
  planets: Planet[];
  projectile: Projectile | null;
  targets: Target[];
  aiming: boolean;
  aimStart: Vector | null;
  aimEnd: Vector | null;
  score: number;
  bestScore: number;
  level: number;
  shots: number;
  gameOver: boolean;
  isPlaying: boolean;
  levelComplete: boolean;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gravityConstant: number;
  maxTrailLength: number;
  launchPower: number;
}

const PLANET_COLORS = ['#e74c3c', '#3498db', '#9b59b6', '#f39c12', '#1abc9c'];

export class GravitySlingshotGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      gravityConstant: config.gravityConstant ?? 500,
      maxTrailLength: config.maxTrailLength ?? 50,
      launchPower: config.launchPower ?? 0.15,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      planets: [],
      projectile: null,
      targets: [],
      aiming: false,
      aimStart: null,
      aimEnd: null,
      score: 0,
      bestScore: this.loadBestScore(),
      level: 1,
      shots: 0,
      gameOver: false,
      isPlaying: false,
      levelComplete: false,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_229_gravity_slingshot_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_229_gravity_slingshot_best', score.toString());
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
    this.state.planets = [];
    this.state.targets = [];
    this.state.projectile = null;
    this.state.levelComplete = false;

    const level = this.state.level;
    const planetCount = Math.min(1 + Math.floor(level / 2), 4);
    const targetCount = Math.min(1 + Math.floor(level / 3), 3);

    // 生成行星
    for (let i = 0; i < planetCount; i++) {
      let planet: Planet;
      let attempts = 0;
      do {
        planet = {
          x: 100 + Math.random() * (this.config.canvasWidth - 200),
          y: 150 + Math.random() * (this.config.canvasHeight - 350),
          radius: 30 + Math.random() * 30,
          mass: 50 + Math.random() * 100,
          color: PLANET_COLORS[i % PLANET_COLORS.length],
        };
        attempts++;
      } while (this.checkPlanetOverlap(planet) && attempts < 50);

      if (attempts < 50) {
        this.state.planets.push(planet);
      }
    }

    // 生成目標
    for (let i = 0; i < targetCount; i++) {
      let target: Target;
      let attempts = 0;
      do {
        target = {
          x: 50 + Math.random() * (this.config.canvasWidth - 100),
          y: 100 + Math.random() * (this.config.canvasHeight - 250),
          radius: 15,
          collected: false,
        };
        attempts++;
      } while (this.checkTargetOverlap(target) && attempts < 50);

      if (attempts < 50) {
        this.state.targets.push(target);
      }
    }
  }

  private checkPlanetOverlap(planet: Planet): boolean {
    for (const p of this.state.planets) {
      const dx = planet.x - p.x;
      const dy = planet.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < planet.radius + p.radius + 50) {
        return true;
      }
    }
    return false;
  }

  private checkTargetOverlap(target: Target): boolean {
    for (const p of this.state.planets) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < target.radius + p.radius + 30) {
        return true;
      }
    }
    for (const t of this.state.targets) {
      const dx = target.x - t.x;
      const dy = target.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < target.radius + t.radius + 20) {
        return true;
      }
    }
    return false;
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    this.update();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (!this.state.projectile) return;

    const proj = this.state.projectile;

    // 應用引力
    for (const planet of this.state.planets) {
      const dx = planet.x - proj.x;
      const dy = planet.y - proj.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // 碰撞檢測
      if (dist < planet.radius + proj.radius) {
        this.resetProjectile();
        return;
      }

      // 引力加速度
      const force = (this.config.gravityConstant * planet.mass) / distSq;
      const ax = (force * dx) / dist;
      const ay = (force * dy) / dist;

      proj.velocityX += ax * 0.016;
      proj.velocityY += ay * 0.016;
    }

    // 更新位置
    proj.x += proj.velocityX;
    proj.y += proj.velocityY;

    // 更新軌跡
    proj.trail.push({ x: proj.x, y: proj.y });
    if (proj.trail.length > this.config.maxTrailLength) {
      proj.trail.shift();
    }

    // 檢查目標碰撞
    this.state.targets.forEach((target) => {
      if (target.collected) return;

      const dx = proj.x - target.x;
      const dy = proj.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < target.radius + proj.radius) {
        target.collected = true;
        this.state.score += 100;
      }
    });

    // 檢查是否完成關卡
    if (this.state.targets.every(t => t.collected)) {
      this.state.levelComplete = true;
      this.state.score += 500; // 關卡獎勵
    }

    // 檢查邊界
    if (
      proj.x < -50 ||
      proj.x > this.config.canvasWidth + 50 ||
      proj.y < -50 ||
      proj.y > this.config.canvasHeight + 50
    ) {
      this.resetProjectile();
    }
  }

  private resetProjectile(): void {
    this.state.projectile = null;
  }

  startAim(x: number, y: number): void {
    if (!this.state.isPlaying || this.state.projectile || this.state.levelComplete) return;

    // 只能從底部發射
    if (y < this.config.canvasHeight - 100) return;

    this.state.aiming = true;
    this.state.aimStart = { x, y };
    this.state.aimEnd = { x, y };
    this.notifyStateChange();
  }

  updateAim(x: number, y: number): void {
    if (!this.state.aiming || !this.state.aimStart) return;

    this.state.aimEnd = { x, y };
    this.notifyStateChange();
  }

  endAim(): void {
    if (!this.state.aiming || !this.state.aimStart || !this.state.aimEnd) return;

    const dx = this.state.aimStart.x - this.state.aimEnd.x;
    const dy = this.state.aimStart.y - this.state.aimEnd.y;

    // 最小發射距離
    if (Math.sqrt(dx * dx + dy * dy) > 20) {
      this.state.projectile = {
        x: this.state.aimStart.x,
        y: this.state.aimStart.y,
        velocityX: dx * this.config.launchPower,
        velocityY: dy * this.config.launchPower,
        radius: 8,
        trail: [],
      };
      this.state.shots++;
    }

    this.state.aiming = false;
    this.state.aimStart = null;
    this.state.aimEnd = null;
    this.notifyStateChange();
  }

  nextLevel(): void {
    if (!this.state.levelComplete) return;

    this.state.level++;
    this.generateLevel();
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      this.saveBestScore(this.state.bestScore);
    }
    this.onStateChange?.(this.getState());
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export default GravitySlingshotGame;
