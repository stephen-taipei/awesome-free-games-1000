/**
 * 星辰使者遊戲核心邏輯
 * Game #348 - 星辰使者
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
  starEnergy: number;
  maxStarEnergy: number;
  attackPower: number;
  selectedConstellation: ConstellationType;
  isShieldActive: boolean;
  shieldCooldown: number;
}

export interface StarProjectile {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  color: string;
  trail: Vector[];
}

export interface Enemy {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  health: number;
  maxHealth: number;
  type: EnemyType;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

export type ConstellationType = 'aries' | 'leo' | 'sagittarius' | 'gemini';
export type EnemyType = 'basic' | 'fast' | 'tank' | 'shooter';

export interface GameState {
  player: Player;
  projectiles: StarProjectile[];
  enemies: Enemy[];
  particles: Particle[];
  score: number;
  bestScore: number;
  wave: number;
  enemiesDefeated: number;
  gameOver: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  survivalTime: number;
  nextWaveTimer: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  projectileSpeed: number;
  energyRechargeRate: number;
  shieldDuration: number;
  shieldCooldownTime: number;
}

const CONSTELLATION_ABILITIES = {
  aries: { attackBonus: 1.5, energyCost: 15, projectileCount: 1, speed: 1.2 }, // 白羊座：高傷害
  leo: { attackBonus: 1.0, energyCost: 10, projectileCount: 3, speed: 1.0 }, // 獅子座：三重射擊
  sagittarius: { attackBonus: 0.8, energyCost: 8, projectileCount: 1, speed: 2.0 }, // 射手座：極速射擊
  gemini: { attackBonus: 1.2, energyCost: 12, projectileCount: 2, speed: 1.1 }, // 雙子座：雙重射擊
};

const ENEMY_CONFIGS = {
  basic: { health: 30, speed: 80, radius: 15, color: '#ff6b6b', score: 10 },
  fast: { health: 20, speed: 150, radius: 12, color: '#feca57', score: 15 },
  tank: { health: 80, speed: 50, radius: 20, color: '#48dbfb', score: 25 },
  shooter: { health: 40, speed: 60, radius: 14, color: '#ff9ff3', score: 20 },
};

export class StarMessengerGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private lastFireTime: number = 0;
  private fireRate: number = 250; // 毫秒
  private onStateChange?: (state: GameState) => void;
  private mousePosition: Vector = { x: 0, y: 0 };
  private isFiring: boolean = false;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 18,
      projectileSpeed: config.projectileSpeed ?? 400,
      energyRechargeRate: config.energyRechargeRate ?? 20,
      shieldDuration: config.shieldDuration ?? 3,
      shieldCooldownTime: config.shieldCooldownTime ?? 10,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 80,
        radius: this.config.playerRadius,
        health: 100,
        maxHealth: 100,
        starEnergy: 100,
        maxStarEnergy: 100,
        attackPower: 20,
        selectedConstellation: 'leo',
        isShieldActive: false,
        shieldCooldown: 0,
      },
      projectiles: [],
      enemies: [],
      particles: [],
      score: 0,
      bestScore: this.loadBestScore(),
      wave: 1,
      enemiesDefeated: 0,
      gameOver: false,
      isPlaying: false,
      isPaused: false,
      survivalTime: 0,
      nextWaveTimer: 3,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_348_star_messenger_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_348_star_messenger_best', score.toString());
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
    this.lastFireTime = 0;
    this.isFiring = false;
    this.gameLoop();
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.state.isPaused) {
      this.update(deltaTime);

      // 自動射擊
      if (this.isFiring && currentTime - this.lastFireTime >= this.fireRate) {
        this.fireProjectile();
        this.lastFireTime = currentTime;
      }
    }

    this.notifyStateChange();
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // 更新生存時間
    this.state.survivalTime += deltaTime;

    // 更新能量恢復
    this.state.player.starEnergy = Math.min(
      this.state.player.maxStarEnergy,
      this.state.player.starEnergy + this.config.energyRechargeRate * deltaTime
    );

    // 更新護盾冷卻
    if (this.state.player.shieldCooldown > 0) {
      this.state.player.shieldCooldown -= deltaTime;
      if (this.state.player.shieldCooldown < 0) {
        this.state.player.shieldCooldown = 0;
        this.state.player.isShieldActive = false;
      }
    }

    // 更新波次計時器
    if (this.state.enemies.length === 0) {
      this.state.nextWaveTimer -= deltaTime;
      if (this.state.nextWaveTimer <= 0) {
        this.spawnWave();
      }
    }

    // 更新星辰彈幕
    this.state.projectiles.forEach((proj) => {
      proj.x += proj.velocityX * deltaTime;
      proj.y += proj.velocityY * deltaTime;

      // 更新軌跡
      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > 10) {
        proj.trail.shift();
      }
    });

    // 移除超出畫面的彈幕
    this.state.projectiles = this.state.projectiles.filter((proj) => {
      return proj.y > -50 && proj.y < this.config.canvasHeight + 50 &&
             proj.x > -50 && proj.x < this.config.canvasWidth + 50;
    });

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新粒子
    this.updateParticles(deltaTime);

    // 碰撞檢測
    this.checkCollisions();
  }

  private updateEnemies(deltaTime: number): void {
    this.state.enemies.forEach((enemy) => {
      // 追蹤玩家
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const config = ENEMY_CONFIGS[enemy.type];
        enemy.velocityX = (dx / dist) * config.speed;
        enemy.velocityY = (dy / dist) * config.speed;
      }

      enemy.x += enemy.velocityX * deltaTime;
      enemy.y += enemy.velocityY * deltaTime;

      // 保持在畫面內
      enemy.x = Math.max(enemy.radius, Math.min(this.config.canvasWidth - enemy.radius, enemy.x));
      enemy.y = Math.max(enemy.radius, Math.min(this.config.canvasHeight - enemy.radius, enemy.y));
    });
  }

  private updateParticles(deltaTime: number): void {
    this.state.particles.forEach((particle) => {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life);
    });

    this.state.particles = this.state.particles.filter((p) => p.life > 0);
  }

  private spawnWave(): void {
    const enemyCount = 3 + this.state.wave * 2;
    const types: EnemyType[] = ['basic', 'fast', 'tank', 'shooter'];

    for (let i = 0; i < enemyCount; i++) {
      const type = types[Math.min(Math.floor(this.state.wave / 2), types.length - 1)];
      const config = ENEMY_CONFIGS[type];

      // 從畫面上方或側邊生成
      const side = Math.random();
      let x: number, y: number;

      if (side < 0.5) {
        x = Math.random() * this.config.canvasWidth;
        y = -config.radius;
      } else {
        x = Math.random() < 0.5 ? -config.radius : this.config.canvasWidth + config.radius;
        y = Math.random() * this.config.canvasHeight * 0.5;
      }

      this.state.enemies.push({
        x,
        y,
        velocityX: 0,
        velocityY: 0,
        radius: config.radius,
        health: config.health * (1 + this.state.wave * 0.1),
        maxHealth: config.health * (1 + this.state.wave * 0.1),
        type,
        color: config.color,
      });
    }

    this.state.wave++;
    this.state.nextWaveTimer = 3;
  }

  private checkCollisions(): void {
    // 彈幕擊中敵人
    this.state.projectiles.forEach((proj, pIndex) => {
      this.state.enemies.forEach((enemy, eIndex) => {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + enemy.radius) {
          // 造成傷害
          enemy.health -= proj.damage;
          this.state.projectiles.splice(pIndex, 1);

          // 創建粒子效果
          this.createExplosion(enemy.x, enemy.y, enemy.color, 8);

          // 敵人死亡
          if (enemy.health <= 0) {
            this.state.enemies.splice(eIndex, 1);
            this.state.enemiesDefeated++;
            this.state.score += ENEMY_CONFIGS[enemy.type].score;
            this.createExplosion(enemy.x, enemy.y, enemy.color, 20);
          }
        }
      });
    });

    // 敵人碰撞玩家
    if (!this.state.player.isShieldActive) {
      this.state.enemies.forEach((enemy) => {
        const dx = this.state.player.x - enemy.x;
        const dy = this.state.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.state.player.radius + enemy.radius) {
          this.state.player.health -= 10;
          this.createExplosion(this.state.player.x, this.state.player.y, '#ffffff', 12);

          if (this.state.player.health <= 0) {
            this.state.player.health = 0;
            this.gameOver();
          }
        }
      });
    }
  }

  private createExplosion(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 100;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }

  setPlayerPosition(x: number, y: number): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;

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
    this.mousePosition = { x, y };
  }

  startFiring(): void {
    this.isFiring = true;
  }

  stopFiring(): void {
    this.isFiring = false;
  }

  fireProjectile(): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;

    const ability = CONSTELLATION_ABILITIES[this.state.player.selectedConstellation];

    if (this.state.player.starEnergy < ability.energyCost) return;

    this.state.player.starEnergy -= ability.energyCost;

    const angle = Math.atan2(
      this.mousePosition.y - this.state.player.y,
      this.mousePosition.x - this.state.player.x
    );

    const speed = this.config.projectileSpeed * ability.speed;
    const spreadAngle = 0.2;

    for (let i = 0; i < ability.projectileCount; i++) {
      const offsetAngle = ability.projectileCount > 1
        ? angle + ((i - (ability.projectileCount - 1) / 2) * spreadAngle)
        : angle;

      this.state.projectiles.push({
        x: this.state.player.x,
        y: this.state.player.y,
        velocityX: Math.cos(offsetAngle) * speed,
        velocityY: Math.sin(offsetAngle) * speed,
        radius: 5,
        damage: this.state.player.attackPower * ability.attackBonus,
        color: this.getConstellationColor(this.state.player.selectedConstellation),
        trail: [],
      });
    }
  }

  activateShield(): void {
    if (!this.state.isPlaying || this.state.gameOver || this.state.isPaused) return;
    if (this.state.player.shieldCooldown > 0) return;

    this.state.player.isShieldActive = true;
    this.state.player.shieldCooldown = this.config.shieldDuration + this.config.shieldCooldownTime;
  }

  selectConstellation(type: ConstellationType): void {
    if (!this.state.isPlaying || this.state.gameOver) {
      this.state.player.selectedConstellation = type;
    }
  }

  private getConstellationColor(type: ConstellationType): string {
    const colors = {
      aries: '#ff6b6b',
      leo: '#ffd700',
      sagittarius: '#00ffff',
      gemini: '#ff9ff3',
    };
    return colors[type];
  }

  togglePause(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    this.state.isPaused = !this.state.isPaused;
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

export default StarMessengerGame;
