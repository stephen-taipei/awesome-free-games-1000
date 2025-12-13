/**
 * 復仇者遊戲核心邏輯
 * Game #352 - The Avenger
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
  rage: number;
  maxRage: number;
  speed: number;
  attackDamage: number;
  isInvincible: boolean;
  invincibleTimer: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  speed: number;
  type: 'normal' | 'fast' | 'tank' | 'shooter';
  color: string;
  damage: number;
  shootTimer?: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  isPlayerBullet: boolean;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  score: number;
  bestScore: number;
  killStreak: number;
  killStreakTimer: number;
  scoreMultiplier: number;
  wave: number;
  gameOver: boolean;
  isPlaying: boolean;
  nextEnemyId: number;
  nextBulletId: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  playerMaxHealth: number;
  playerSpeed: number;
  enemySpawnInterval: number;
  rageDecayRate: number;
  killStreakTimeout: number;
}

const ENEMY_TYPES = {
  normal: { health: 30, speed: 80, damage: 10, color: '#ff6b6b', radius: 15 },
  fast: { health: 20, speed: 150, damage: 8, color: '#feca57', radius: 12 },
  tank: { health: 80, speed: 50, damage: 15, color: '#8b00ff', radius: 20 },
  shooter: { health: 25, speed: 60, damage: 5, color: '#48dbfb', radius: 14 },
};

export class AvengerGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private rageDecayTimer: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 16,
      playerMaxHealth: config.playerMaxHealth ?? 100,
      playerSpeed: config.playerSpeed ?? 200,
      enemySpawnInterval: config.enemySpawnInterval ?? 1.5,
      rageDecayRate: config.rageDecayRate ?? 5,
      killStreakTimeout: config.killStreakTimeout ?? 3,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        radius: this.config.playerRadius,
        health: this.config.playerMaxHealth,
        maxHealth: this.config.playerMaxHealth,
        rage: 0,
        maxRage: 100,
        speed: this.config.playerSpeed,
        attackDamage: 20,
        isInvincible: false,
        invincibleTimer: 0,
      },
      enemies: [],
      bullets: [],
      particles: [],
      score: 0,
      bestScore: this.loadBestScore(),
      killStreak: 0,
      killStreakTimer: 0,
      scoreMultiplier: 1,
      wave: 1,
      gameOver: false,
      isPlaying: false,
      nextEnemyId: 1,
      nextBulletId: 1,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_352_the_avenger_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_352_the_avenger_best', score.toString());
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
    this.rageDecayTimer = 0;
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
    // 更新玩家位置（移向鼠標）
    this.updatePlayerMovement(deltaTime);

    // 更新無敵狀態
    if (this.state.player.isInvincible) {
      this.state.player.invincibleTimer -= deltaTime;
      if (this.state.player.invincibleTimer <= 0) {
        this.state.player.isInvincible = false;
      }
    }

    // 更新憤怒值衰減
    this.rageDecayTimer += deltaTime;
    if (this.rageDecayTimer >= 1) {
      this.state.player.rage = Math.max(0, this.state.player.rage - this.config.rageDecayRate);
      this.rageDecayTimer = 0;
    }

    // 更新連殺計時器
    if (this.state.killStreakTimer > 0) {
      this.state.killStreakTimer -= deltaTime;
      if (this.state.killStreakTimer <= 0) {
        this.state.killStreak = 0;
        this.state.scoreMultiplier = 1;
      }
    }

    // 更新分數倍率（基於連殺）
    this.state.scoreMultiplier = 1 + Math.floor(this.state.killStreak / 5) * 0.5;

    // 生成敵人
    this.spawnTimer += deltaTime;
    const spawnInterval = Math.max(0.5, this.config.enemySpawnInterval - this.state.wave * 0.05);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新子彈
    this.updateBullets(deltaTime);

    // 更新粒子效果
    this.updateParticles(deltaTime);

    // 檢查碰撞
    this.checkCollisions();

    // 更新波次
    if (this.state.enemies.length === 0 && this.spawnTimer > spawnInterval / 2) {
      this.state.wave++;
    }
  }

  private updatePlayerMovement(deltaTime: number): void {
    const dx = this.mouseX - this.state.player.x;
    const dy = this.mouseY - this.state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const moveX = (dx / dist) * this.state.player.speed * deltaTime;
      const moveY = (dy / dist) * this.state.player.speed * deltaTime;

      this.state.player.x = Math.max(
        this.state.player.radius,
        Math.min(this.config.canvasWidth - this.state.player.radius, this.state.player.x + moveX)
      );
      this.state.player.y = Math.max(
        this.state.player.radius,
        Math.min(this.config.canvasHeight - this.state.player.radius, this.state.player.y + moveY)
      );
    }
  }

  private spawnEnemy(): void {
    const types = ['normal', 'fast', 'tank', 'shooter'] as const;
    const weights = [5, 3, 1, 2]; // 權重
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const random = Math.random() * totalWeight;

    let cumWeight = 0;
    let selectedType: keyof typeof ENEMY_TYPES = 'normal';
    for (let i = 0; i < types.length; i++) {
      cumWeight += weights[i];
      if (random <= cumWeight) {
        selectedType = types[i];
        break;
      }
    }

    const enemyConfig = ENEMY_TYPES[selectedType];
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -enemyConfig.radius;
        break;
      case 1: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + enemyConfig.radius;
        break;
      case 2: // 左
        x = -enemyConfig.radius;
        y = Math.random() * this.config.canvasHeight;
        break;
      default: // 右
        x = this.config.canvasWidth + enemyConfig.radius;
        y = Math.random() * this.config.canvasHeight;
    }

    const healthMultiplier = 1 + (this.state.wave - 1) * 0.1;

    this.state.enemies.push({
      id: this.state.nextEnemyId++,
      x,
      y,
      radius: enemyConfig.radius,
      health: enemyConfig.health * healthMultiplier,
      maxHealth: enemyConfig.health * healthMultiplier,
      speed: enemyConfig.speed,
      type: selectedType,
      color: enemyConfig.color,
      damage: enemyConfig.damage,
      shootTimer: selectedType === 'shooter' ? 2 : undefined,
    });
  }

  private updateEnemies(deltaTime: number): void {
    this.state.enemies.forEach((enemy) => {
      // 移向玩家
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * deltaTime;
        enemy.y += (dy / dist) * enemy.speed * deltaTime;
      }

      // 射擊類型敵人發射子彈
      if (enemy.type === 'shooter' && enemy.shootTimer !== undefined) {
        enemy.shootTimer -= deltaTime;
        if (enemy.shootTimer <= 0) {
          this.enemyShoot(enemy);
          enemy.shootTimer = 2 + Math.random();
        }
      }
    });
  }

  private enemyShoot(enemy: Enemy): void {
    const dx = this.state.player.x - enemy.x;
    const dy = this.state.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 250;

    this.state.bullets.push({
      id: this.state.nextBulletId++,
      x: enemy.x,
      y: enemy.y,
      velocityX: (dx / dist) * speed,
      velocityY: (dy / dist) * speed,
      radius: 5,
      damage: enemy.damage,
      isPlayerBullet: false,
    });
  }

  private updateBullets(deltaTime: number): void {
    this.state.bullets.forEach((bullet) => {
      bullet.x += bullet.velocityX * deltaTime;
      bullet.y += bullet.velocityY * deltaTime;
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
  }

  private updateParticles(deltaTime: number): void {
    this.state.particles.forEach((particle) => {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life -= deltaTime;
    });

    this.state.particles = this.state.particles.filter((p) => p.life > 0);
  }

  private checkCollisions(): void {
    // 玩家攻擊敵人（近戰）
    this.state.enemies = this.state.enemies.filter((enemy) => {
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.state.player.radius + enemy.radius) {
        // 憤怒加成攻擊力
        const rageDamage = this.state.player.attackDamage * (1 + this.state.player.rage / 50);
        enemy.health -= rageDamage;

        if (enemy.health <= 0) {
          this.onEnemyKilled(enemy);
          return false;
        }

        // 敵人攻擊玩家
        if (!this.state.player.isInvincible) {
          this.state.player.health -= enemy.damage;
          this.onPlayerHit(enemy.damage);

          if (this.state.player.health <= 0) {
            this.gameOver();
          }
        }
      }
      return true;
    });

    // 子彈碰撞
    this.state.bullets = this.state.bullets.filter((bullet) => {
      if (bullet.isPlayerBullet) {
        // 玩家子彈打敵人
        for (let i = this.state.enemies.length - 1; i >= 0; i--) {
          const enemy = this.state.enemies[i];
          const dx = enemy.x - bullet.x;
          const dy = enemy.y - bullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < enemy.radius + bullet.radius) {
            enemy.health -= bullet.damage;
            this.createParticles(bullet.x, bullet.y, enemy.color, 5);

            if (enemy.health <= 0) {
              this.onEnemyKilled(enemy);
              this.state.enemies.splice(i, 1);
            }
            return false;
          }
        }
      } else {
        // 敵人子彈打玩家
        if (!this.state.player.isInvincible) {
          const dx = this.state.player.x - bullet.x;
          const dy = this.state.player.y - bullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.state.player.radius + bullet.radius) {
            this.state.player.health -= bullet.damage;
            this.onPlayerHit(bullet.damage);
            this.createParticles(bullet.x, bullet.y, '#ff0000', 8);

            if (this.state.player.health <= 0) {
              this.gameOver();
            }
            return false;
          }
        }
      }
      return true;
    });
  }

  private onEnemyKilled(enemy: Enemy): void {
    // 增加分數（帶倍率）
    const baseScore = enemy.maxHealth;
    this.state.score += Math.floor(baseScore * this.state.scoreMultiplier);

    // 增加連殺
    this.state.killStreak++;
    this.state.killStreakTimer = this.config.killStreakTimeout;

    // 創建粒子效果
    this.createParticles(enemy.x, enemy.y, enemy.color, 12);
  }

  private onPlayerHit(damage: number): void {
    // 受傷增加憤怒值
    const rageGain = damage * 2;
    this.state.player.rage = Math.min(this.state.player.maxRage, this.state.player.rage + rageGain);

    // 創建受傷粒子
    this.createParticles(this.state.player.x, this.state.player.y, '#ff0000', 10);
  }

  private createParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  // 復仇技能：憤怒爆發（清除附近敵人）
  useRageBurst(): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.player.rage < 50) return;

    this.state.player.rage -= 50;
    const burstRadius = 150;

    this.state.enemies = this.state.enemies.filter((enemy) => {
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < burstRadius) {
        this.onEnemyKilled(enemy);
        return false;
      }
      return true;
    });

    // 創建爆發效果
    this.createParticles(this.state.player.x, this.state.player.y, '#ff0000', 30);
  }

  // 復仇技能：不死之身（短時無敵）
  useInvincibility(): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.player.rage < 75) return;

    this.state.player.rage -= 75;
    this.state.player.isInvincible = true;
    this.state.player.invincibleTimer = 3;
  }

  // 射擊（消耗憤怒值）
  shoot(): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.player.rage < 10) return;

    this.state.player.rage -= 10;

    // 找最近的敵人
    let nearestEnemy: Enemy | null = null;
    let minDist = Infinity;

    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - this.state.player.x;
      const dy = enemy.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const dx = nearestEnemy.x - this.state.player.x;
      const dy = nearestEnemy.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 400;

      this.state.bullets.push({
        id: this.state.nextBulletId++,
        x: this.state.player.x,
        y: this.state.player.y,
        velocityX: (dx / dist) * speed,
        velocityY: (dy / dist) * speed,
        radius: 6,
        damage: 40,
        isPlayerBullet: true,
      });
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

export default AvengerGame;
