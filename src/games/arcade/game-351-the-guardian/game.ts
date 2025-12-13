/**
 * 守護者遊戲核心邏輯
 * Game #351 - 守護者 (The Guardian)
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Core {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
}

export interface Player {
  angle: number;
  radius: number;
  orbitRadius: number;
  speed: number;
}

export interface Enemy {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  health: number;
  speed: number;
  color: string;
  type: 'basic' | 'fast' | 'heavy';
}

export interface Projectile {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameState {
  core: Core;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  score: number;
  bestScore: number;
  wave: number;
  enemiesInWave: number;
  enemiesRemaining: number;
  skillCooldowns: {
    shield: number;
    defense: number;
    storm: number;
  };
  skillDurations: {
    shield: number;
    defense: number;
    storm: number;
  };
  activeSkills: {
    shield: boolean;
    defense: boolean;
    storm: boolean;
  };
  gameOver: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  timePlayed: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  coreRadius: number;
  coreMaxHealth: number;
  playerRadius: number;
  playerOrbitRadius: number;
  playerSpeed: number;
}

const ENEMY_TYPES = {
  basic: { health: 1, speed: 80, color: '#ff6b6b', radius: 12 },
  fast: { health: 1, speed: 140, color: '#feca57', radius: 10 },
  heavy: { health: 3, speed: 50, color: '#ff00ff', radius: 16 },
};

export class GuardianGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private autoFireTimer: number = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      coreRadius: config.coreRadius ?? 30,
      coreMaxHealth: config.coreMaxHealth ?? 100,
      playerRadius: config.playerRadius ?? 12,
      playerOrbitRadius: config.playerOrbitRadius ?? 80,
      playerSpeed: config.playerSpeed ?? 2,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      core: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        radius: this.config.coreRadius,
        health: this.config.coreMaxHealth,
        maxHealth: this.config.coreMaxHealth,
        shield: this.config.coreMaxHealth,
        maxShield: this.config.coreMaxHealth,
      },
      player: {
        angle: 0,
        radius: this.config.playerRadius,
        orbitRadius: this.config.playerOrbitRadius,
        speed: this.config.playerSpeed,
      },
      enemies: [],
      projectiles: [],
      particles: [],
      score: 0,
      bestScore: this.loadBestScore(),
      wave: 1,
      enemiesInWave: 5,
      enemiesRemaining: 5,
      skillCooldowns: {
        shield: 0,
        defense: 0,
        storm: 0,
      },
      skillDurations: {
        shield: 0,
        defense: 0,
        storm: 0,
      },
      activeSkills: {
        shield: false,
        defense: false,
        storm: false,
      },
      gameOver: false,
      isPlaying: false,
      isPaused: false,
      timePlayed: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_351_guardian_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_351_guardian_best', score.toString());
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
    this.autoFireTimer = 0;
    this.gameLoop();
    this.notifyStateChange();
  }

  togglePause(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    this.state.isPaused = !this.state.isPaused;
    if (!this.state.isPaused) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.state.timePlayed += deltaTime;

    // 更新技能冷卻和持續時間
    this.updateSkills(deltaTime);

    // 更新玩家自動旋轉
    this.updatePlayer(deltaTime);

    // 自動射擊
    this.autoFireTimer += deltaTime;
    if (this.autoFireTimer >= 0.3) {
      this.fireProjectile();
      this.autoFireTimer = 0;
    }

    // 生成敵人
    if (this.state.enemiesRemaining > 0 && this.state.enemies.length < 10) {
      this.spawnTimer += deltaTime;
      const spawnInterval = Math.max(0.5, 2 - this.state.wave * 0.1);
      if (this.spawnTimer >= spawnInterval) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
    }

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新投射物
    this.updateProjectiles(deltaTime);

    // 更新粒子效果
    this.updateParticles(deltaTime);

    // 檢查碰撞
    this.checkCollisions();

    // 護盾恢復
    if (!this.state.activeSkills.shield) {
      this.state.core.shield = Math.min(
        this.state.core.maxShield,
        this.state.core.shield + 5 * deltaTime
      );
    }

    // 檢查波次結束
    if (this.state.enemiesRemaining === 0 && this.state.enemies.length === 0) {
      this.nextWave();
    }
  }

  private updateSkills(deltaTime: number): void {
    // 更新冷卻時間
    Object.keys(this.state.skillCooldowns).forEach((skill) => {
      const key = skill as keyof typeof this.state.skillCooldowns;
      if (this.state.skillCooldowns[key] > 0) {
        this.state.skillCooldowns[key] = Math.max(0, this.state.skillCooldowns[key] - deltaTime);
      }
    });

    // 更新持續時間
    Object.keys(this.state.skillDurations).forEach((skill) => {
      const key = skill as keyof typeof this.state.skillDurations;
      if (this.state.skillDurations[key] > 0) {
        this.state.skillDurations[key] = Math.max(0, this.state.skillDurations[key] - deltaTime);
        this.state.activeSkills[key] = this.state.skillDurations[key] > 0;
      }
    });
  }

  private updatePlayer(deltaTime: number): void {
    // 自動順時針旋轉
    this.state.player.angle += this.state.player.speed * deltaTime;
    if (this.state.player.angle >= Math.PI * 2) {
      this.state.player.angle -= Math.PI * 2;
    }
  }

  private updateEnemies(deltaTime: number): void {
    this.state.enemies.forEach((enemy) => {
      // 移動向核心
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const moveX = (dx / dist) * enemy.speed * deltaTime;
        const moveY = (dy / dist) * enemy.speed * deltaTime;
        enemy.x += moveX;
        enemy.y += moveY;
      }
    });
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

  private updateParticles(deltaTime: number): void {
    this.state.particles.forEach((particle) => {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life -= deltaTime;
    });

    this.state.particles = this.state.particles.filter((p) => p.life > 0);
  }

  private spawnEnemy(): void {
    const types: Array<'basic' | 'fast' | 'heavy'> = ['basic', 'fast', 'heavy'];
    let type: 'basic' | 'fast' | 'heavy';

    // 根據波次調整敵人類型
    const rand = Math.random();
    if (this.state.wave < 3) {
      type = 'basic';
    } else if (this.state.wave < 6) {
      type = rand < 0.7 ? 'basic' : 'fast';
    } else if (this.state.wave < 10) {
      type = rand < 0.5 ? 'basic' : rand < 0.8 ? 'fast' : 'heavy';
    } else {
      type = rand < 0.3 ? 'basic' : rand < 0.65 ? 'fast' : 'heavy';
    }

    const enemyConfig = ENEMY_TYPES[type];
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -20;
        break;
      case 1: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + 20;
        break;
      case 2: // 左
        x = -20;
        y = Math.random() * this.config.canvasHeight;
        break;
      default: // 右
        x = this.config.canvasWidth + 20;
        y = Math.random() * this.config.canvasHeight;
    }

    this.state.enemies.push({
      x,
      y,
      targetX: this.state.core.x,
      targetY: this.state.core.y,
      radius: enemyConfig.radius,
      health: enemyConfig.health,
      speed: enemyConfig.speed,
      color: enemyConfig.color,
      type,
    });

    this.state.enemiesRemaining--;
  }

  private fireProjectile(): void {
    const playerX = this.state.core.x + Math.cos(this.state.player.angle) * this.state.player.orbitRadius;
    const playerY = this.state.core.y + Math.sin(this.state.player.angle) * this.state.player.orbitRadius;

    // 尋找最近的敵人
    let nearestEnemy: Enemy | null = null;
    let minDist = Infinity;

    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - playerX;
      const dy = enemy.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const dx = nearestEnemy.x - playerX;
      const dy = nearestEnemy.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 400;

      this.state.projectiles.push({
        x: playerX,
        y: playerY,
        velocityX: (dx / dist) * speed,
        velocityY: (dy / dist) * speed,
        radius: 5,
        damage: 1,
        fromPlayer: true,
      });
    }

    // 反擊風暴技能：向所有方向發射
    if (this.state.activeSkills.storm) {
      const directions = 8;
      for (let i = 0; i < directions; i++) {
        const angle = (Math.PI * 2 * i) / directions;
        const speed = 350;
        this.state.projectiles.push({
          x: playerX,
          y: playerY,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          radius: 4,
          damage: 1,
          fromPlayer: true,
        });
      }
    }
  }

  private checkCollisions(): void {
    // 投射物與敵人碰撞
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      if (!proj.fromPlayer) continue;

      for (let j = this.state.enemies.length - 1; j >= 0; j--) {
        const enemy = this.state.enemies[j];
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + enemy.radius) {
          // 擊中敵人
          enemy.health -= proj.damage;
          this.state.projectiles.splice(i, 1);

          // 創建粒子效果
          this.createParticles(enemy.x, enemy.y, enemy.color, 5);

          if (enemy.health <= 0) {
            // 敵人死亡
            this.state.enemies.splice(j, 1);
            this.state.score += enemy.type === 'heavy' ? 30 : enemy.type === 'fast' ? 20 : 10;
            this.createParticles(enemy.x, enemy.y, enemy.color, 15);
          }
          break;
        }
      }
    }

    // 敵人與核心碰撞
    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];
      const dx = enemy.x - this.state.core.x;
      const dy = enemy.y - this.state.core.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + this.state.core.radius) {
        // 敵人攻擊核心
        const damage = enemy.type === 'heavy' ? 20 : enemy.type === 'fast' ? 10 : 15;

        // 全方位防禦技能：減少50%傷害
        const actualDamage = this.state.activeSkills.defense ? damage * 0.5 : damage;

        if (this.state.activeSkills.shield) {
          // 護盾強化：吸收傷害
          this.state.core.shield = Math.max(0, this.state.core.shield - actualDamage);
        } else {
          // 先扣護盾再扣生命
          const shieldDamage = Math.min(this.state.core.shield, actualDamage);
          this.state.core.shield -= shieldDamage;
          const healthDamage = actualDamage - shieldDamage;
          this.state.core.health = Math.max(0, this.state.core.health - healthDamage);
        }

        this.state.enemies.splice(i, 1);
        this.createParticles(enemy.x, enemy.y, '#ff0000', 10);

        if (this.state.core.health <= 0) {
          this.gameOver();
        }
      }
    }
  }

  private createParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
      });
    }
  }

  private nextWave(): void {
    this.state.wave++;
    this.state.enemiesInWave = 5 + this.state.wave * 2;
    this.state.enemiesRemaining = this.state.enemiesInWave;
    this.state.score += this.state.wave * 50;

    // 恢復核心生命和護盾
    this.state.core.health = Math.min(
      this.state.core.maxHealth,
      this.state.core.health + 20
    );
    this.state.core.shield = this.state.core.maxShield;
  }

  movePlayer(direction: 'left' | 'right'): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;

    const speedMultiplier = 3;
    if (direction === 'left') {
      this.state.player.angle -= this.state.player.speed * speedMultiplier * 0.016;
    } else {
      this.state.player.angle += this.state.player.speed * speedMultiplier * 0.016;
    }

    if (this.state.player.angle < 0) {
      this.state.player.angle += Math.PI * 2;
    }
    if (this.state.player.angle >= Math.PI * 2) {
      this.state.player.angle -= Math.PI * 2;
    }
  }

  useSkill(skill: 'shield' | 'defense' | 'storm'): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;
    if (this.state.skillCooldowns[skill] > 0) return;

    switch (skill) {
      case 'shield':
        // 護盾強化：5秒無敵，冷卻20秒
        this.state.skillDurations.shield = 5;
        this.state.skillCooldowns.shield = 20;
        this.state.activeSkills.shield = true;
        this.state.core.shield = this.state.core.maxShield;
        break;
      case 'defense':
        // 全方位防禦：8秒減傷50%，冷卻15秒
        this.state.skillDurations.defense = 8;
        this.state.skillCooldowns.defense = 15;
        this.state.activeSkills.defense = true;
        break;
      case 'storm':
        // 反擊風暴：6秒多方向射擊，冷卻25秒
        this.state.skillDurations.storm = 6;
        this.state.skillCooldowns.storm = 25;
        this.state.activeSkills.storm = true;
        break;
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

export default GuardianGame;
