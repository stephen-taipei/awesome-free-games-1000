/**
 * 太陽戰士遊戲核心邏輯
 * Game #350 - Sun Warrior
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  solarEnergy: number;
  maxSolarEnergy: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  velocityX: number;
  velocityY: number;
  burnDamage: number;
  burnDuration: number;
  type: 'normal' | 'fast' | 'tank' | 'elite';
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  isSolarBlast: boolean;
}

export interface SolarStorm {
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  maxDuration: number;
}

export interface BurningField {
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  maxDuration: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  solarStorms: SolarStorm[];
  burningFields: BurningField[];
  score: number;
  bestScore: number;
  wave: number;
  enemiesKilled: number;
  gameOver: boolean;
  isPlaying: boolean;
  difficulty: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  playerMaxHealth: number;
  playerMaxSolarEnergy: number;
  solarEnergyRegenRate: number;
}

const ENEMY_TYPES = {
  normal: { health: 50, speed: 80, radius: 15, color: '#ff6b6b', score: 10 },
  fast: { health: 30, speed: 140, radius: 12, color: '#feca57', score: 15 },
  tank: { health: 150, speed: 50, radius: 25, color: '#ee5a6f', score: 30 },
  elite: { health: 200, speed: 100, radius: 20, color: '#c44569', score: 50 },
};

let nextEnemyId = 0;
let nextProjectileId = 0;

export class SunWarriorGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private waveTimer: number = 0;
  private onStateChange?: (state: GameState) => void;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 20,
      playerMaxHealth: config.playerMaxHealth ?? 100,
      playerMaxSolarEnergy: config.playerMaxSolarEnergy ?? 100,
      solarEnergyRegenRate: config.solarEnergyRegenRate ?? 15,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 80,
        radius: this.config.playerRadius,
        health: this.config.playerMaxHealth,
        maxHealth: this.config.playerMaxHealth,
        solarEnergy: this.config.playerMaxSolarEnergy,
        maxSolarEnergy: this.config.playerMaxSolarEnergy,
      },
      enemies: [],
      projectiles: [],
      solarStorms: [],
      burningFields: [],
      score: 0,
      bestScore: this.loadBestScore(),
      wave: 1,
      enemiesKilled: 0,
      gameOver: false,
      isPlaying: false,
      difficulty: 1,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_350_sun_warrior_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_350_sun_warrior_best', score.toString());
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
    nextEnemyId = 0;
    nextProjectileId = 0;
    this.state = this.createInitialState();
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    this.waveTimer = 0;
    this.spawnWave();
    this.gameLoop();
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // 更新太陽能量恢復
    this.state.player.solarEnergy = Math.min(
      this.state.player.maxSolarEnergy,
      this.state.player.solarEnergy + this.config.solarEnergyRegenRate * deltaTime
    );

    // 更新投射物
    this.updateProjectiles(deltaTime);

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新太陽風暴
    this.updateSolarStorms(deltaTime);

    // 更新燃燒領域
    this.updateBurningFields(deltaTime);

    // 檢查碰撞
    this.checkCollisions();

    // 更新波次
    if (this.state.enemies.length === 0) {
      this.waveTimer += deltaTime;
      if (this.waveTimer >= 2) {
        this.state.wave++;
        this.state.difficulty = 1 + (this.state.wave - 1) * 0.15;
        this.spawnWave();
        this.waveTimer = 0;
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    this.state.projectiles.forEach((proj) => {
      proj.x += proj.velocityX * deltaTime;
      proj.y += proj.velocityY * deltaTime;
    });

    // 移除超出畫面的投射物
    this.state.projectiles = this.state.projectiles.filter((proj) => {
      return (
        proj.x > -50 &&
        proj.x < this.config.canvasWidth + 50 &&
        proj.y > -50 &&
        proj.y < this.config.canvasHeight + 50
      );
    });
  }

  private updateEnemies(deltaTime: number): void {
    this.state.enemies.forEach((enemy) => {
      // 移動向玩家
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.velocityX * deltaTime;
        enemy.y += (dy / dist) * enemy.velocityY * deltaTime;
      }

      // 燒傷傷害
      if (enemy.burnDuration > 0) {
        enemy.burnDuration -= deltaTime;
        enemy.health -= enemy.burnDamage * deltaTime;
      }
    });

    // 移除死亡的敵人
    const beforeCount = this.state.enemies.length;
    this.state.enemies = this.state.enemies.filter((enemy) => {
      if (enemy.health <= 0) {
        const enemyType = ENEMY_TYPES[enemy.type];
        this.state.score += enemyType.score;
        this.state.enemiesKilled++;
        return false;
      }
      return true;
    });

    // 如果有敵人被擊殺，給予太陽能量獎勵
    const killedCount = beforeCount - this.state.enemies.length;
    if (killedCount > 0) {
      this.state.player.solarEnergy = Math.min(
        this.state.player.maxSolarEnergy,
        this.state.player.solarEnergy + killedCount * 5
      );
    }
  }

  private updateSolarStorms(deltaTime: number): void {
    this.state.solarStorms.forEach((storm) => {
      storm.duration -= deltaTime;
      storm.radius += 50 * deltaTime;
    });

    this.state.solarStorms = this.state.solarStorms.filter(
      (storm) => storm.duration > 0
    );
  }

  private updateBurningFields(deltaTime: number): void {
    this.state.burningFields.forEach((field) => {
      field.duration -= deltaTime;
    });

    this.state.burningFields = this.state.burningFields.filter(
      (field) => field.duration > 0
    );
  }

  private checkCollisions(): void {
    // 投射物與敵人碰撞
    this.state.projectiles.forEach((proj) => {
      this.state.enemies.forEach((enemy) => {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + enemy.radius) {
          enemy.health -= proj.damage;

          // 太陽爆破造成燃燒
          if (proj.isSolarBlast) {
            const energyBonus = this.state.player.solarEnergy / this.state.player.maxSolarEnergy;
            enemy.burnDamage = 10 + energyBonus * 20;
            enemy.burnDuration = 3;
          }

          proj.radius = 0; // 標記為刪除
        }
      });
    });

    // 移除已碰撞的投射物
    this.state.projectiles = this.state.projectiles.filter((proj) => proj.radius > 0);

    // 太陽風暴與敵人碰撞
    this.state.solarStorms.forEach((storm) => {
      this.state.enemies.forEach((enemy) => {
        const dx = storm.x - enemy.x;
        const dy = storm.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < storm.radius + enemy.radius) {
          enemy.health -= storm.damage * 0.016; // 每幀傷害
          enemy.burnDamage = 15;
          enemy.burnDuration = 5;
        }
      });
    });

    // 燃燒領域與敵人碰撞
    this.state.burningFields.forEach((field) => {
      this.state.enemies.forEach((enemy) => {
        const dx = field.x - enemy.x;
        const dy = field.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < field.radius) {
          enemy.health -= field.damage * 0.016;
          enemy.burnDamage = 25;
          enemy.burnDuration = 4;
        }
      });
    });

    // 敵人與玩家碰撞
    this.state.enemies.forEach((enemy) => {
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.state.player.radius + enemy.radius) {
        this.state.player.health -= 0.5; // 持續傷害
      }
    });

    // 檢查玩家是否死亡
    if (this.state.player.health <= 0) {
      this.gameOver();
    }
  }

  private spawnWave(): void {
    const wave = this.state.wave;
    const enemyCount = Math.min(5 + wave * 2, 25);

    for (let i = 0; i < enemyCount; i++) {
      const types: Array<keyof typeof ENEMY_TYPES> = ['normal', 'fast', 'tank', 'elite'];
      let type: keyof typeof ENEMY_TYPES = 'normal';

      const rand = Math.random();
      if (wave >= 5 && rand < 0.1) {
        type = 'elite';
      } else if (wave >= 3 && rand < 0.2) {
        type = 'tank';
      } else if (rand < 0.3) {
        type = 'fast';
      }

      const enemyData = ENEMY_TYPES[type];
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (side) {
        case 0: // 上
          x = Math.random() * this.config.canvasWidth;
          y = -30;
          break;
        case 1: // 右
          x = this.config.canvasWidth + 30;
          y = Math.random() * this.config.canvasHeight;
          break;
        case 2: // 左
          x = -30;
          y = Math.random() * this.config.canvasHeight;
          break;
        default: // 下（較少）
          x = Math.random() * this.config.canvasWidth;
          y = this.config.canvasHeight + 30;
      }

      this.state.enemies.push({
        id: nextEnemyId++,
        x,
        y,
        radius: enemyData.radius,
        health: enemyData.health * this.state.difficulty,
        maxHealth: enemyData.health * this.state.difficulty,
        velocityX: enemyData.speed * this.state.difficulty * 0.5,
        velocityY: enemyData.speed * this.state.difficulty * 0.5,
        burnDamage: 0,
        burnDuration: 0,
        type,
      });
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

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  shootSolarBlast(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.player.solarEnergy < 5) return;

    this.state.player.solarEnergy -= 5;

    const dx = this.mouseX - this.state.player.x;
    const dy = this.mouseY - this.state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const speed = 400;
    const energyBonus = this.state.player.solarEnergy / this.state.player.maxSolarEnergy;
    const baseDamage = 20 + energyBonus * 30;

    this.state.projectiles.push({
      id: nextProjectileId++,
      x: this.state.player.x,
      y: this.state.player.y,
      velocityX: (dx / dist) * speed,
      velocityY: (dy / dist) * speed,
      radius: 8 + energyBonus * 4,
      damage: baseDamage,
      isSolarBlast: true,
    });
  }

  useSolarStorm(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.player.solarEnergy < 40) return;

    this.state.player.solarEnergy -= 40;

    this.state.solarStorms.push({
      x: this.state.player.x,
      y: this.state.player.y,
      radius: 30,
      damage: 50,
      duration: 2,
      maxDuration: 2,
    });
  }

  useBurningField(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.player.solarEnergy < 60) return;

    this.state.player.solarEnergy -= 60;

    this.state.burningFields.push({
      x: this.mouseX,
      y: this.mouseY,
      radius: 80,
      damage: 30,
      duration: 5,
      maxDuration: 5,
    });
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

export default SunWarriorGame;
