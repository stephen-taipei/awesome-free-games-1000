/**
 * 命運戰士遊戲核心邏輯
 * Game #347 - 命運戰士
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
  health: number;
  maxHealth: number;
  fateEnergy: number;
  maxFateEnergy: number;
  attackPower: number;
  isInvulnerable: boolean;
  invulnerableTime: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackPower: number;
  type: EnemyType;
  color: string;
  isDead: boolean;
  attackCooldown: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  isPlayerProjectile: boolean;
  color: string;
}

export enum EnemyType {
  GRUNT = 'grunt',
  TANK = 'tank',
  FAST = 'fast',
  BOSS = 'boss',
}

export enum FateSkill {
  TIME_REWIND = 'timeRewind',
  FATE_COUNTER = 'fateCounter',
  FATE_FINISHER = 'fateFinisher',
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  wave: number;
  score: number;
  bestScore: number;
  kills: number;
  isPlaying: boolean;
  gameOver: boolean;
  waveStartTime: number;
  activeFateSkill: FateSkill | null;
  fateCounterActive: boolean;
  timeSinceWaveStart: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerWidth: number;
  playerHeight: number;
  playerSpeed: number;
  fateEnergyGainRate: number;
  enemySpawnInterval: number;
}

const ENEMY_CONFIGS = {
  [EnemyType.GRUNT]: {
    width: 30,
    height: 30,
    health: 50,
    speed: 80,
    attackPower: 10,
    color: '#ff6b6b',
    points: 10,
  },
  [EnemyType.TANK]: {
    width: 40,
    height: 40,
    health: 150,
    speed: 40,
    attackPower: 20,
    color: '#4ecdc4',
    points: 30,
  },
  [EnemyType.FAST]: {
    width: 25,
    height: 25,
    health: 30,
    speed: 150,
    attackPower: 5,
    color: '#ffe66d',
    points: 15,
  },
  [EnemyType.BOSS]: {
    width: 60,
    height: 60,
    health: 500,
    speed: 30,
    attackPower: 30,
    color: '#a06cd5',
    points: 100,
  },
};

const FATE_SKILL_COSTS = {
  [FateSkill.TIME_REWIND]: 30,
  [FateSkill.FATE_COUNTER]: 50,
  [FateSkill.FATE_FINISHER]: 100,
};

export class FateWarriorGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private nextEnemyId: number = 0;
  private nextProjectileId: number = 0;
  private onStateChange?: (state: GameState) => void;
  private keys: Set<string> = new Set();
  private savedPlayerState: { health: number; x: number; y: number } | null = null;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerWidth: config.playerWidth ?? 40,
      playerHeight: config.playerHeight ?? 40,
      playerSpeed: config.playerSpeed ?? 200,
      fateEnergyGainRate: config.fateEnergyGainRate ?? 5,
      enemySpawnInterval: config.enemySpawnInterval ?? 2,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2 - this.config.playerWidth / 2,
        y: this.config.canvasHeight - 100,
        width: this.config.playerWidth,
        height: this.config.playerHeight,
        health: 100,
        maxHealth: 100,
        fateEnergy: 0,
        maxFateEnergy: 100,
        attackPower: 25,
        isInvulnerable: false,
        invulnerableTime: 0,
      },
      enemies: [],
      projectiles: [],
      wave: 1,
      score: 0,
      bestScore: this.loadBestScore(),
      kills: 0,
      isPlaying: false,
      gameOver: false,
      waveStartTime: 0,
      activeFateSkill: null,
      fateCounterActive: false,
      timeSinceWaveStart: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_347_fate_warrior_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_347_fate_warrior_best', score.toString());
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
    this.nextEnemyId = 0;
    this.nextProjectileId = 0;
    this.keys.clear();
    this.savedPlayerState = null;
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
    this.state.timeSinceWaveStart += deltaTime;

    // 更新玩家無敵時間
    if (this.state.player.isInvulnerable) {
      this.state.player.invulnerableTime -= deltaTime;
      if (this.state.player.invulnerableTime <= 0) {
        this.state.player.isInvulnerable = false;
      }
    }

    // 更新玩家移動
    this.updatePlayerMovement(deltaTime);

    // 更新命運能量
    this.state.player.fateEnergy = Math.min(
      this.state.player.maxFateEnergy,
      this.state.player.fateEnergy + this.config.fateEnergyGainRate * deltaTime
    );

    // 生成敵人
    this.spawnTimer += deltaTime;
    const spawnInterval = Math.max(
      0.8,
      this.config.enemySpawnInterval - this.state.wave * 0.1
    );
    if (this.spawnTimer >= spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新投射物
    this.updateProjectiles(deltaTime);

    // 碰撞檢測
    this.checkCollisions();

    // 移除死亡的敵人
    this.state.enemies = this.state.enemies.filter((enemy) => !enemy.isDead);

    // 檢查波次完成
    if (this.state.enemies.length === 0 && this.state.timeSinceWaveStart > 5) {
      this.startNextWave();
    }
  }

  private updatePlayerMovement(deltaTime: number): void {
    const player = this.state.player;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s')) dy += 1;

    // 正規化對角移動
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    player.x += dx * this.config.playerSpeed * deltaTime;
    player.y += dy * this.config.playerSpeed * deltaTime;

    // 限制在畫面內
    player.x = Math.max(0, Math.min(this.config.canvasWidth - player.width, player.x));
    player.y = Math.max(0, Math.min(this.config.canvasHeight - player.height, player.y));
  }

  private spawnEnemy(): void {
    const waveMultiplier = 1 + (this.state.wave - 1) * 0.2;

    // 根據波次決定敵人類型
    let type: EnemyType;
    const rand = Math.random();

    if (this.state.wave % 5 === 0 && this.state.timeSinceWaveStart < 1) {
      type = EnemyType.BOSS;
    } else if (rand < 0.5) {
      type = EnemyType.GRUNT;
    } else if (rand < 0.8) {
      type = EnemyType.FAST;
    } else {
      type = EnemyType.TANK;
    }

    const config = ENEMY_CONFIGS[type];
    const side = Math.floor(Math.random() * 3); // 0: 上, 1: 左, 2: 右
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * (this.config.canvasWidth - config.width);
        y = -config.height;
        break;
      case 1: // 左
        x = -config.width;
        y = Math.random() * (this.config.canvasHeight / 2);
        break;
      default: // 右
        x = this.config.canvasWidth;
        y = Math.random() * (this.config.canvasHeight / 2);
    }

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      x,
      y,
      width: config.width,
      height: config.height,
      health: config.health * waveMultiplier,
      maxHealth: config.health * waveMultiplier,
      speed: config.speed,
      attackPower: config.attackPower * waveMultiplier,
      type,
      color: config.color,
      isDead: false,
      attackCooldown: 0,
    };

    this.state.enemies.push(enemy);
  }

  private updateEnemies(deltaTime: number): void {
    const player = this.state.player;

    this.state.enemies.forEach((enemy) => {
      // 移動朝向玩家
      const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
      const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * deltaTime;
        enemy.y += (dy / dist) * enemy.speed * deltaTime;
      }

      // 攻擊冷卻
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime;
      }

      // 發射投射物
      if (enemy.attackCooldown <= 0 && dist < 300) {
        this.enemyShoot(enemy);
        enemy.attackCooldown = enemy.type === EnemyType.FAST ? 1.5 : 2.5;
      }
    });
  }

  private enemyShoot(enemy: Enemy): void {
    const player = this.state.player;
    const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
    const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const speed = 200;
    const projectile: Projectile = {
      id: this.nextProjectileId++,
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
      velocityX: (dx / dist) * speed,
      velocityY: (dy / dist) * speed,
      radius: 6,
      damage: enemy.attackPower,
      isPlayerProjectile: false,
      color: enemy.color,
    };

    this.state.projectiles.push(projectile);
  }

  private updateProjectiles(deltaTime: number): void {
    this.state.projectiles.forEach((projectile) => {
      projectile.x += projectile.velocityX * deltaTime;
      projectile.y += projectile.velocityY * deltaTime;
    });

    // 移除超出畫面的投射物
    this.state.projectiles = this.state.projectiles.filter((projectile) => {
      return (
        projectile.x > -50 &&
        projectile.x < this.config.canvasWidth + 50 &&
        projectile.y > -50 &&
        projectile.y < this.config.canvasHeight + 50
      );
    });
  }

  private checkCollisions(): void {
    const player = this.state.player;

    // 投射物碰撞
    this.state.projectiles = this.state.projectiles.filter((projectile) => {
      if (projectile.isPlayerProjectile) {
        // 玩家投射物打到敵人
        for (const enemy of this.state.enemies) {
          if (this.checkProjectileEnemyCollision(projectile, enemy)) {
            enemy.health -= projectile.damage;
            if (enemy.health <= 0) {
              enemy.isDead = true;
              this.state.kills++;
              this.state.score += ENEMY_CONFIGS[enemy.type].points;
              this.state.player.fateEnergy = Math.min(
                this.state.player.maxFateEnergy,
                this.state.player.fateEnergy + 10
              );
            }
            return false;
          }
        }
      } else {
        // 敵人投射物打到玩家
        if (this.checkProjectilePlayerCollision(projectile, player)) {
          if (!player.isInvulnerable) {
            if (this.state.fateCounterActive) {
              // 命運反擊：反彈傷害
              this.state.enemies.forEach((enemy) => {
                enemy.health -= projectile.damage * 2;
                if (enemy.health <= 0) {
                  enemy.isDead = true;
                  this.state.kills++;
                  this.state.score += ENEMY_CONFIGS[enemy.type].points;
                }
              });
            } else {
              player.health -= projectile.damage;
              player.isInvulnerable = true;
              player.invulnerableTime = 0.5;
              if (player.health <= 0) {
                this.gameOver();
              }
            }
          }
          return false;
        }
      }
      return true;
    });

    // 敵人與玩家碰撞
    if (!player.isInvulnerable) {
      for (const enemy of this.state.enemies) {
        if (this.checkPlayerEnemyCollision(player, enemy)) {
          player.health -= enemy.attackPower;
          player.isInvulnerable = true;
          player.invulnerableTime = 1;

          // 擊退敵人
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            enemy.x += (dx / dist) * 50;
            enemy.y += (dy / dist) * 50;
          }

          if (player.health <= 0) {
            this.gameOver();
            break;
          }
        }
      }
    }
  }

  private checkProjectileEnemyCollision(projectile: Projectile, enemy: Enemy): boolean {
    return (
      projectile.x + projectile.radius > enemy.x &&
      projectile.x - projectile.radius < enemy.x + enemy.width &&
      projectile.y + projectile.radius > enemy.y &&
      projectile.y - projectile.radius < enemy.y + enemy.height
    );
  }

  private checkProjectilePlayerCollision(projectile: Projectile, player: Player): boolean {
    return (
      projectile.x + projectile.radius > player.x &&
      projectile.x - projectile.radius < player.x + player.width &&
      projectile.y + projectile.radius > player.y &&
      projectile.y - projectile.radius < player.y + player.height
    );
  }

  private checkPlayerEnemyCollision(player: Player, enemy: Enemy): boolean {
    return (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    );
  }

  private startNextWave(): void {
    this.state.wave++;
    this.state.timeSinceWaveStart = 0;
    this.state.score += this.state.wave * 50;
  }

  playerShoot(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const player = this.state.player;
    const projectile: Projectile = {
      id: this.nextProjectileId++,
      x: player.x + player.width / 2,
      y: player.y,
      velocityX: 0,
      velocityY: -400,
      radius: 8,
      damage: player.attackPower,
      isPlayerProjectile: true,
      color: '#ffd700',
    };

    this.state.projectiles.push(projectile);
  }

  useFateSkill(skill: FateSkill): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const cost = FATE_SKILL_COSTS[skill];
    if (this.state.player.fateEnergy < cost) return;

    this.state.player.fateEnergy -= cost;
    this.state.activeFateSkill = skill;

    switch (skill) {
      case FateSkill.TIME_REWIND:
        this.executeTimeRewind();
        break;
      case FateSkill.FATE_COUNTER:
        this.executeFateCounter();
        break;
      case FateSkill.FATE_FINISHER:
        this.executeFateFinisher();
        break;
    }

    setTimeout(() => {
      this.state.activeFateSkill = null;
      this.state.fateCounterActive = false;
    }, 100);
  }

  private executeTimeRewind(): void {
    // 恢復生命值
    this.state.player.health = Math.min(
      this.state.player.maxHealth,
      this.state.player.health + 30
    );
  }

  private executeFateCounter(): void {
    // 啟動命運反擊，持續5秒
    this.state.fateCounterActive = true;
    setTimeout(() => {
      this.state.fateCounterActive = false;
    }, 5000);
  }

  private executeFateFinisher(): void {
    // 對所有敵人造成大量傷害
    this.state.enemies.forEach((enemy) => {
      enemy.health -= 200;
      if (enemy.health <= 0) {
        enemy.isDead = true;
        this.state.kills++;
        this.state.score += ENEMY_CONFIGS[enemy.type].points;
      }
    });
  }

  setKeyDown(key: string): void {
    this.keys.add(key);
  }

  setKeyUp(key: string): void {
    this.keys.delete(key);
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
    this.keys.clear();
  }
}

export default FateWarriorGame;
